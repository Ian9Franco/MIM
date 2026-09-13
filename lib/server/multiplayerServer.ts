import { discoverRemoteServerState } from "@mim/server-engine/discovery";
import {
  generateDistributableManifest,
  reconcileClientWithServerManifest,
} from "@mim/server-engine/multiplayerSync";
import type { ClientSyncDiffResult, DistributableServerManifest } from "@mim/contracts-core/server";
import type { SyncClientServerRequest } from "./multiplayerSchema";
import { openSftpReadTransport, SftpAuditError } from "./transport/sftpReadTransport";
import { openAllUserReadTransport } from "./transport/allUserReadTransport";
import { acquireServerSession } from "./sessionLock";
import { REMOTE_SERVER_INSTANCE_ID } from "./serverIdentity";

export interface ServerMultiplayerSyncResult {
  distributable: DistributableServerManifest;
  diff: ClientSyncDiffResult;
  clientModCount: number;
  serverModCount: number;
  warnings: string[];
}

async function loadClientManifest(input: SyncClientServerRequest, buildsBase: string, signal: AbortSignal) {
  let clientTransport;
  try {
    clientTransport = await openAllUserReadTransport(buildsBase, input.project.name);
  } catch {
    signal.throwIfAborted();
    throw new SftpAuditError(
      "BUILD_UNAVAILABLE",
      "Generá primero el build alluser del proyecto. Debe existir como ZIP y poder leerse completo."
    );
  }
  const clientState = await discoverRemoteServerState(clientTransport, {
    minecraftVersion: input.project.version,
    loader: input.project.loader,
    scanServerProperties: false,
    signal,
  });
  if (clientState.isPartialAudit) {
    throw new SftpAuditError("BUILD_UNAVAILABLE", "El build alluser está incompleto o no se pudo leer por completo.");
  }
  clientState.manifest.instanceId = `client:${input.project.name}`;
  clientState.manifest.side = "client";
  return clientState;
}

async function loadServerManifest(input: SyncClientServerRequest, signal: AbortSignal) {
  const session = await openSftpReadTransport(input.connection, signal);
  try {
    const observed = await discoverRemoteServerState(session.transport, {
      ...input.runtime,
      scanServerProperties: false,
      signal,
    });
    if (observed.isPartialAudit) {
      throw new SftpAuditError(
        "PARTIAL_AUDIT",
        "No se pudo leer completamente el servidor remoto. Revisá permisos y volvé a auditar."
      );
    }
    observed.manifest.instanceId = REMOTE_SERVER_INSTANCE_ID;
    return observed;
  } finally {
    session.close();
  }
}

async function performMultiplayerSync(
  input: SyncClientServerRequest,
  buildsBase: string,
  signal: AbortSignal
): Promise<ServerMultiplayerSyncResult> {
  const clientState = await loadClientManifest(input, buildsBase, signal);
  const observed = await loadServerManifest(input, signal);
  const distributable = generateDistributableManifest(observed.manifest, input.project.name);
  const diff = reconcileClientWithServerManifest(clientState.manifest, distributable);
  return {
    distributable,
    diff,
    clientModCount: clientState.manifest.mods.length,
    serverModCount: observed.manifest.mods.length,
    warnings: [...(clientState.warnings ?? []), ...(observed.warnings ?? [])],
  };
}

/** Compares the local alluser build against the remote server's distributable manifest. */
export async function syncClientWithRemoteServer(
  input: SyncClientServerRequest,
  buildsBase: string,
  signal: AbortSignal
): Promise<ServerMultiplayerSyncResult> {
  const release = acquireServerSession("Ya hay una operación de servidor en curso. Esperá a que termine.");
  try {
    return await performMultiplayerSync(input, buildsBase, signal);
  } finally {
    release();
  }
}
