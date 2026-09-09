/**
 * Server Deployment Execution Engine (SRV-4)
 * Handles atomic staging, hash verification, execution of reconciliation plans,
 * and automatic compensation rollback upon failure.
 */

import crypto from "node:crypto";
import type {
  WritableFileTransport,
  ReconciliationPlan,
  DeploymentReport,
  DeploymentStepResult,
  DeploymentExecutionOptions,
  DeploymentExecutionState,
  ServerSnapshot,
} from "@mim/contracts-core/server";
import type { InstanceManifest } from "@mim/contracts-core/instances";
import { createPreMutationSnapshot } from "./snapshot";
import { executeRollback } from "./rollback";
import type { ISnapshotStore } from "./snapshotStore";
import { getActionTargetPath, getReplacedSourcePath } from "./actionPaths";

// Active deployment locks per serverId to prevent concurrent executions
const activeServerLocks = new Set<string>();

/**
 * Checks if a server is currently running a deployment
 */
export function isServerDeploymentLocked(serverId: string): boolean {
  return activeServerLocks.has(serverId);
}

/**
 * Executes a full server deployment plan with staging, verification, and rollback protection.
 */
export async function executeServerDeployment(
  transport: WritableFileTransport,
  plan: ReconciliationPlan,
  desiredManifest: InstanceManifest,
  observedManifest: InstanceManifest,
  snapshotStore?: ISnapshotStore,
  filePayloadProvider?: (actionIdentity: string) => Promise<Uint8Array | null>,
  options: DeploymentExecutionOptions = {}
): Promise<DeploymentReport> {
  const deploymentId = `dep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const serverId = plan.actualInstanceId || observedManifest.instanceId;
  const steps: DeploymentStepResult[] = [];
  let status: DeploymentExecutionState = "idle";
  let appliedActions = 0;
  let rolledBackActions = 0;
  let snapshot: ServerSnapshot | undefined;

  // 1. Concurrency Lock
  if (activeServerLocks.has(serverId)) {
    return {
      deploymentId,
      serverId,
      status: "failed",
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      steps: [{
        step: "lock-acquisition",
        success: false,
        durationMs: 0,
        error: `Server ${serverId} is currently locked by another active deployment.`,
      }],
      appliedActions: 0,
      rolledBackActions: 0,
      error: "Concurrent deployment rejected.",
    };
  }

  activeServerLocks.add(serverId);
  const startTime = Date.now();

  try {
    // 2. Preflight & Plan Check
    const stepStartPreflight = Date.now();
    status = "preflight";

    if (plan.blocked && !options.force) {
      throw new Error(`Plan is blocked: ${plan.blockReasons.join("; ")}`);
    }

    steps.push({
      step: "preflight-validation",
      success: true,
      durationMs: Date.now() - stepStartPreflight,
      message: `Preflight passed with ${plan.actions.length} action(s).`,
    });

    // 3. Snapshot Creation
    const stepStartSnapshot = Date.now();
    status = "snapshotting";

    snapshot = await createPreMutationSnapshot({
      plan,
      transport,
      serverId,
      desiredManifest,
      observedManifest,
      operationId: deploymentId,
    });

    if (snapshotStore) {
      await snapshotStore.saveSnapshot(snapshot);
    }

    steps.push({
      step: "snapshot-creation",
      success: true,
      durationMs: Date.now() - stepStartSnapshot,
      message: `Snapshot ${snapshot.snapshotId} created with ${snapshot.entries.length} entries.`,
    });

    // 4. Staging & Execution of Actions
    const stagingDir = options.stagingDir || `.mim_staging/${deploymentId}`;
    status = "staging";

    for (const action of plan.actions) {
      if (action.type === "manual-review") continue;
      if (options.signal?.aborted) {
        throw new Error("Deployment aborted by user signal.");
      }

      const actionStart = Date.now();
      const targetPath = getActionTargetPath(action);

      if (action.type === "install" || action.type === "replace") {
        status = "staging";
        let payload: Uint8Array | null = null;
        if (filePayloadProvider) {
          payload = await filePayloadProvider(action.identity);
        }

        // Missing downloads are failures, never placeholders. An empty JAR is
        // invalid even when optional hash verification is disabled.
        if (!payload || payload.byteLength === 0) {
          throw new Error(`Missing or empty artifact payload for ${action.identity}`);
        }

        // Verify hash if requested
        const expectedSha = action.desired?.hashes?.sha256;
        if (options.verifyHashes && expectedSha) {
          const actualSha = crypto.createHash("sha256").update(payload).digest("hex");
          if (actualSha !== expectedSha) {
            throw new Error(
              `Integrity check failed for ${action.identity}: expected sha256 ${expectedSha}, calculated ${actualSha}`
            );
          }
        }

        // Staged upload path
        const stagedPath = `${stagingDir}/${action.desired?.fileName || action.identity}`;
        if (transport.mkdir) {
          try { await transport.mkdir(stagingDir); } catch { /* benign */ }
        }
        await transport.write(stagedPath, payload);

        // Atomic move to final location
        status = "applying";
        await transport.move(stagedPath, targetPath);
        const replacedSource = getReplacedSourcePath(action);
        if (replacedSource) await transport.remove(replacedSource);
      } else if (action.type === "remove") {
        status = "applying";
        await transport.remove(targetPath);
      } else if (action.type === "sync-config") {
        status = "applying";
        let configPayload: Uint8Array | null = null;
        if (filePayloadProvider) {
          configPayload = await filePayloadProvider(action.identity);
        }
        if (!configPayload) throw new Error(`Missing config payload for ${action.identity}`);
        // Empty configuration files are valid; null means the download failed.
        await transport.write(targetPath, configPayload);
      }

      appliedActions++;
      steps.push({
        step: `action-${action.type}-${action.identity}`,
        success: true,
        durationMs: Date.now() - actionStart,
        message: `Successfully executed ${action.type} for ${action.identity}`,
      });
    }

    // 5. Post-verification
    status = "verifying";
    const stepStartVerify = Date.now();
    if (transport.stat) {
      for (const action of plan.actions) {
        if (action.type === "install" || action.type === "replace") {
          const targetPath = getActionTargetPath(action);
          const stat = await transport.stat(targetPath);
          if (!stat) {
            throw new Error(`Post-execution verification failed: ${targetPath} does not exist on remote.`);
          }
        }
      }
    }

    steps.push({
      step: "post-verification",
      success: true,
      durationMs: Date.now() - stepStartVerify,
      message: "Post-execution verification completed successfully.",
    });

    status = "completed";

    // Clean up staging directory if supported
    try {
      await transport.remove(stagingDir);
    } catch {
      // benign cleanup
    }

    if (snapshotStore) {
      await snapshotStore.recordChange({
        id: `chg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        serverId,
        type: "reconciliation-planned",
        timestamp: new Date().toISOString(),
        summary: `Successfully applied deployment ${deploymentId} (${appliedActions} actions).`,
      });
    }

    return {
      deploymentId,
      serverId,
      status,
      startedAt: new Date(startTime).toISOString(),
      completedAt: new Date().toISOString(),
      snapshotId: snapshot?.snapshotId,
      steps,
      appliedActions,
      rolledBackActions,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const autoRollback = options.autoRollbackOnError !== false;

    if (autoRollback && snapshot) {
      status = "rolling-back";
      const rbStart = Date.now();
      const rbResult = await executeRollback(transport, snapshot, { verifyHashes: options.verifyHashes });

      steps.push({
        step: "automatic-rollback",
        success: rbResult.success,
        durationMs: Date.now() - rbStart,
        message: `Rollback completed: restored ${rbResult.restoredEntries}, deleted ${rbResult.deletedEntries}`,
        error: rbResult.failedEntries.length > 0 ? JSON.stringify(rbResult.failedEntries) : undefined,
      });

      rolledBackActions = rbResult.restoredEntries + rbResult.deletedEntries;

      if (rbResult.success) {
        status = "rolled-back";
      } else {
        status = "recovery-required";
      }

      if (snapshotStore) {
        await snapshotStore.recordChange({
          id: `chg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          serverId,
          type: "rollback-applied",
          timestamp: new Date().toISOString(),
          summary: `Deployment ${deploymentId} failed (${errorMsg}). Auto-rollback status: ${status}`,
        });
      }
    } else {
      status = "failed";
    }

    return {
      deploymentId,
      serverId,
      status,
      startedAt: new Date(startTime).toISOString(),
      completedAt: new Date().toISOString(),
      snapshotId: snapshot?.snapshotId,
      steps,
      appliedActions,
      rolledBackActions,
      error: errorMsg,
    };
  } finally {
    activeServerLocks.delete(serverId);
  }
}
