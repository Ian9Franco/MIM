import type { InspectServerRequest } from "./inspectSchema";
import { discoverRemoteServerState } from "@mim/server-engine/discovery";
import { auditServerInstance } from "@mim/server-engine/audit";
import { loadPendingServerOperations } from "@mim/server-engine/pendingOperations";
import { openBuildReadTransport } from "./transport/buildReadTransport";
import { openSftpReadTransport, SftpAuditError } from "./transport/sftpReadTransport";
import { acquireServerSession } from "./sessionLock";
import { REMOTE_SERVER_INSTANCE_ID } from "./serverIdentity";
import { createServerSnapshotStore } from "./snapshotStoreFactory";

async function performInspection(input: InspectServerRequest, buildsBase: string, signal: AbortSignal) {
  let desired;
  try {
    const transport = await openBuildReadTransport(buildsBase, input.project.name);
    desired = await discoverRemoteServerState(transport, {
      scanServerProperties: false, minecraftVersion: input.project.version, loader: input.project.loader, signal,
    });
    if (desired.isPartialAudit) throw new Error("Incomplete build");
  } catch {
    signal.throwIfAborted();
    throw new SftpAuditError("BUILD_UNAVAILABLE", "Generá primero el build de servidor (AllHost) del proyecto. Debe existir y poder leerse completo.");
  }
  desired.manifest.instanceId = `build:${input.project.name}`;
  const session = await openSftpReadTransport(input.connection, signal);
  try {
    const observed = await discoverRemoteServerState(session.transport, { ...input.runtime, scanServerProperties: false, signal });
    const report = observed.isPartialAudit ? null : auditServerInstance(desired.manifest, observed.manifest);
    const runtimeMismatch = input.runtime.loader !== input.project.loader || input.runtime.minecraftVersion !== input.project.version;
    const warnings = [...(observed.warnings || [])];
    if (runtimeMismatch) warnings.push("La versión o el loader indicado para el servidor no coincide con el proyecto.");
    // Missing rows in a partial inventory cannot authorize installation/removal.
    if (report && runtimeMismatch) report.readyForPlanning = false;
    const pending = await loadPendingServerOperations(createServerSnapshotStore(), REMOTE_SERVER_INSTANCE_ID);
    return {
      report,
      warnings,
      isPartialAudit: Boolean(observed.isPartialAudit),
      runtimeMismatch,
      scope: "mods" as const,
      scannedMods: observed.manifest.mods.length,
      totalJarFiles: observed.totalJarFiles,
      pendingOperations: pending.pendingOperationCount,
    };
  } finally { session.close(); }
}
export type ServerInspectionResult = Awaited<ReturnType<typeof inspectServer>>;

/** Bound remote reads and deploys across concurrent requests in the Desktop backend. */
export async function inspectServer(input: InspectServerRequest, buildsBase: string, signal: AbortSignal) {
  const release = acquireServerSession("Ya hay una operación de servidor en curso. Esperá a que termine.");
  try { return await performInspection(input, buildsBase, signal); } finally { release(); }
}
