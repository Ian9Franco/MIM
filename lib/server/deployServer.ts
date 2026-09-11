import type { DeployServerRequest } from "./deploySchema";
import { discoverRemoteServerState } from "@mim/server-engine/discovery";
import { auditServerInstance } from "@mim/server-engine/audit";
import { buildReconciliationPlan } from "@mim/server-engine/reconciliation";
import { executeServerDeployment } from "@mim/server-engine/executor";
import { assertSafeToMutate } from "@mim/server-engine/safety";
import type { DeploymentReport, ReconciliationAction, ReconciliationPlan } from "@mim/contracts-core/server";
import { openBuildReadTransport } from "./transport/buildReadTransport";
import { openSftpWritableTransport } from "./transport/sftpWritableTransport";
import { SftpAuditError } from "./transport/sftpReadTransport";
import { acquireServerSession } from "./sessionLock";
import { isCompleteDeployableAudit, summarizeReconciliationPlan, type DeployPlanCounts } from "./deployEligibility";

export interface ServerDeploymentResult {
  deployment: DeploymentReport;
  plan: {
    fingerprint?: string;
    blocked: boolean;
    blockReasons: string[];
    counts: DeployPlanCounts;
  };
}

function payloadPathForAction(action: ReconciliationAction): string | null {
  if (action.type === "install" || action.type === "replace") {
    const fileName = action.desired?.fileName;
    return fileName ? `mods/${fileName}` : null;
  }
  if (action.type === "sync-config") return action.targetPath ?? null;
  return null;
}

async function performDeployment(input: DeployServerRequest, buildsBase: string, signal: AbortSignal): Promise<ServerDeploymentResult> {
  let desired;
  try {
    const build = await openBuildReadTransport(buildsBase, input.project.name);
    desired = await discoverRemoteServerState(build, {
      scanServerProperties: false, minecraftVersion: input.project.version, loader: input.project.loader, signal,
    });
    if (desired.isPartialAudit) throw new Error("Incomplete build");
  } catch {
    signal.throwIfAborted();
    throw new SftpAuditError("BUILD_UNAVAILABLE", "Generá primero el build de servidor (AllHost) del proyecto. Debe existir y poder leerse completo.");
  }
  desired.manifest.instanceId = `build:${input.project.name}`;

  const session = await openSftpWritableTransport(input.connection, signal);
  try {
    const observed = await discoverRemoteServerState(session.transport, { ...input.runtime, scanServerProperties: false, signal });
    const runtimeMismatch = input.runtime.loader !== input.project.loader || input.runtime.minecraftVersion !== input.project.version;
    const report = observed.isPartialAudit ? null : auditServerInstance(desired.manifest, observed.manifest);
    const inspection = { report, isPartialAudit: Boolean(observed.isPartialAudit), runtimeMismatch };
    if (!isCompleteDeployableAudit(inspection) || !report) {
      throw new SftpAuditError(
        "DEPLOY_NOT_READY",
        observed.isPartialAudit
          ? "No se puede aplicar un inventario incompleto. Corregí las lecturas fallidas y repetí la auditoría."
          : runtimeMismatch
            ? "La versión o el loader del servidor no coincide con el proyecto. No se aplica el plan."
            : report && !report.readyForPlanning
              ? "El plan requiere revisión manual (duplicados o incompatibles). No se modifica el servidor."
              : "No hay cambios de mods para aplicar."
      );
    }

    const plan: ReconciliationPlan = buildReconciliationPlan(report.diff);
    if (plan.blocked) {
      throw new SftpAuditError("PLAN_BLOCKED", "El plan requiere revisión manual. No se modifica el servidor.");
    }
    const safety = await assertSafeToMutate(plan);
    if (!safety.safe) {
      throw new SftpAuditError("UNSAFE", "No es seguro aplicar el plan en este momento.");
    }

    const buildTransport = await openBuildReadTransport(buildsBase, input.project.name);
    const deployment = await executeServerDeployment(
      session.transport,
      plan,
      desired.manifest,
      observed.manifest,
      undefined,
      async (identity) => {
        const action = plan.actions.find((item) => item.identity === identity);
        if (!action) return null;
        const relative = payloadPathForAction(action);
        if (!relative) return null;
        try {
          return await buildTransport.read(relative);
        } catch {
          return null;
        }
      },
      { signal, verifyHashes: true }
    );

    return {
      deployment,
      plan: {
        fingerprint: plan.planFingerprint,
        blocked: plan.blocked,
        blockReasons: plan.blockReasons,
        counts: summarizeReconciliationPlan(plan),
      },
    };
  } finally {
    session.close();
  }
}

export async function deployServer(input: DeployServerRequest, buildsBase: string, signal: AbortSignal): Promise<ServerDeploymentResult> {
  const release = acquireServerSession("Ya hay una operación de servidor en curso. Esperá a que termine.");
  try {
    return await performDeployment(input, buildsBase, signal);
  } finally {
    release();
  }
}
