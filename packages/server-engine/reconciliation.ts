import crypto from "node:crypto";
import type { InstanceManifestDiff } from "@mim/contracts-core/instances";
import type {
  ReconciliationAction,
  ReconciliationPlan,
} from "@mim/contracts-core/server";

/**
 * Converts a pure manifest diff into an explicit plan without performing I/O.
 * Remote execution belongs to a later transactional layer with snapshot,
 * verification and rollback guarantees.
 */
export function buildReconciliationPlan(diff: InstanceManifestDiff): ReconciliationPlan {
  const actions: ReconciliationAction[] = [];
  const blockReasons: string[] = [];

  for (const artifact of diff.additions) {
    actions.push({
      type: "install",
      identity: artifact.modId !== "unknown" ? `mod:${artifact.modId}` : `file:${artifact.fileName}`,
      targetPath: `mods/${artifact.fileName}`,
      desired: artifact,
      reason: "Artifact exists in desired state but not actual state",
      destructive: false,
    });
  }

  for (const artifact of diff.removals) {
    actions.push({
      type: "remove",
      identity: artifact.modId !== "unknown" ? `mod:${artifact.modId}` : `file:${artifact.fileName}`,
      targetPath: `mods/${artifact.fileName}`,
      actual: artifact,
      reason: "Artifact exists in actual state but not desired state",
      destructive: true,
    });
  }

  for (const update of diff.updates) {
    actions.push({
      type: "replace",
      identity: update.identity,
      targetPath: `mods/${update.desired.fileName}`,
      desired: update.desired,
      actual: update.actual,
      reason: `Artifact differs by ${update.reasons.join(", ")}`,
      destructive: true,
    });
  }

  // Handle configuration file reconciliations
  if (diff.configDiffs) {
    for (const configDiff of diff.configDiffs) {
      if (configDiff.type === "addition") {
        actions.push({
          type: "sync-config",
          identity: `config:${configDiff.relativePath}`,
          targetPath: configDiff.relativePath,
          reason: "Configuration file exists in desired state but not actual state",
          destructive: false,
        });
      } else if (configDiff.type === "removal") {
        actions.push({
          type: "remove",
          identity: `config:${configDiff.relativePath}`,
          targetPath: configDiff.relativePath,
          reason: "Configuration file removed from desired state",
          destructive: true,
        });
      } else if (configDiff.type === "modified") {
        actions.push({
          type: "sync-config",
          identity: `config:${configDiff.relativePath}`,
          targetPath: configDiff.relativePath,
          reason: "Configuration content differs between desired and actual state",
          destructive: true,
        });
      }
    }
  }

  for (const duplicate of diff.duplicates.desired) {
    blockReasons.push(`Desired state contains duplicate identity ${duplicate.identity}`);
    actions.push({
      type: "manual-review",
      identity: duplicate.identity,
      reason: "Desired state contains multiple artifacts with the same identity",
      destructive: false,
    });
  }

  for (const duplicate of diff.duplicates.actual) {
    blockReasons.push(`Actual state contains duplicate identity ${duplicate.identity}`);
    actions.push({
      type: "manual-review",
      identity: duplicate.identity,
      reason: "Actual state contains multiple artifacts with the same identity",
      destructive: false,
    });
  }

  for (const mismatch of diff.environmentMismatches) {
    const identity = mismatch.artifact.modId !== "unknown"
      ? `mod:${mismatch.artifact.modId}`
      : `file:${mismatch.artifact.fileName}`;
    blockReasons.push(mismatch.reason);
    actions.push({
      type: "manual-review",
      identity,
      desired: mismatch.artifact,
      reason: mismatch.reason,
      destructive: false,
    });
  }

  // Any mutating action (install, remove, replace, sync-config) mandates a prior snapshot
  const hasMutatingActions = actions.some(
    (action) =>
      action.type === "install" ||
      action.type === "remove" ||
      action.type === "replace" ||
      action.type === "sync-config"
  );

  const planFingerprint = crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        desiredInstanceId: diff.desiredInstanceId,
        actualInstanceId: diff.actualInstanceId,
        actionIdentities: actions.map((a) => `${a.type}:${a.identity}:${a.targetPath || ""}`),
      })
    )
    .digest("hex");

  return {
    desiredInstanceId: diff.desiredInstanceId,
    actualInstanceId: diff.actualInstanceId,
    actions,
    blocked: blockReasons.length > 0,
    blockReasons,
    requiresSnapshot: hasMutatingActions,
    planFingerprint,
  };
}
