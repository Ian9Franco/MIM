import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { buildClientSyncActions } from "@mim/server-engine/clientSyncPlan";
import { discoverRemoteServerState } from "@mim/server-engine/discovery";
import { buildAllUser } from "@/lib/modding/builder";
import type { ClientSyncApplyItemResult, ClientSyncApplyResult } from "@mim/contracts-core/server";
import type { Loader } from "@/lib/core/constants";
import { SOURCE_BASE } from "@/lib/core/constants";
import type { SyncClientServerRequest } from "./multiplayerSchema";
import { openSftpReadTransport, SftpAuditError } from "./transport/sftpReadTransport";
import { performMultiplayerSync, type ServerMultiplayerSyncResult } from "./multiplayerServer";
import { acquireServerSession } from "./sessionLock";
import { REMOTE_SERVER_INSTANCE_ID } from "./serverIdentity";
import { resolveModrinthDownloadUrl } from "./modrinthResolve";
import {
  removeProjectModByFilename,
  resolveClientModInstallPath,
  resolveProjectModsRoot,
} from "./projectModsPath";

async function downloadHttpsFile(url: string): Promise<Buffer> {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) throw new Error(`Download failed (${response.status})`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > 64 * 1024 * 1024) throw new Error("Download exceeds size limit");
  return bytes;
}

async function readServerModBytes(
  input: SyncClientServerRequest,
  remotePath: string,
  signal: AbortSignal
): Promise<Buffer> {
  const session = await openSftpReadTransport(input.connection, signal);
  try {
    return Buffer.from(await session.transport.read(remotePath));
  } finally {
    session.close();
  }
}

function verifySha256(buffer: Buffer, expected?: string): void {
  if (!expected) return;
  const actual = crypto.createHash("sha256").update(buffer).digest("hex");
  if (actual !== expected) throw new Error("Hash mismatch after download");
}

async function applyClientSyncActions(
  input: SyncClientServerRequest,
  buildsBase: string,
  sourceBase: string,
  syncResult: ServerMultiplayerSyncResult,
  serverArtifacts: { fileName: string; source?: { path?: string } }[],
  signal: AbortSignal
): Promise<ClientSyncApplyResult> {
  const actions = buildClientSyncActions(syncResult.diff, serverArtifacts as never);
  if (actions.length === 0) {
    return { actions, results: [], diffAfter: syncResult.diff };
  }
  if (actions.some((action) => action.resolution === "unresolved")) {
    throw new SftpAuditError(
      "SYNC_UNRESOLVED",
      "No se pudo resolver la descarga de uno o más mods. Repetí la comparación o copiá los JAR manualmente."
    );
  }

  const modsRoot = resolveProjectModsRoot(
    sourceBase,
    input.project.name,
    input.project.version,
    input.project.loader
  );
  fs.mkdirSync(path.join(modsRoot, ".essential", "librerias"), { recursive: true });

  const results: ClientSyncApplyItemResult[] = [];

  for (const action of actions) {
    const { requirement } = action;
    try {
      let buffer: Buffer;
      let filename = requirement.filename;

      if (action.resolution === "server-sftp") {
        const remotePath = requirement.remotePath;
        if (!remotePath) throw new Error("Missing remote path");
        buffer = await readServerModBytes(input, remotePath, signal);
      } else {
        const resolved = await resolveModrinthDownloadUrl(
          requirement.projectId!,
          requirement.versionId!,
          requirement.filename
        );
        if (!resolved) throw new Error("Modrinth version not found");
        buffer = await downloadHttpsFile(resolved.url);
        filename = resolved.filename;
        verifySha256(buffer, resolved.sha256 || requirement.sha256);
      }

      verifySha256(buffer, requirement.sha256);

      if (action.kind === "replace" && action.removeFilename) {
        removeProjectModByFilename(modsRoot, action.removeFilename);
      }

      const targetPath = resolveClientModInstallPath(modsRoot, filename);
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, buffer);

      results.push({
        identity: requirement.identity,
        filename,
        success: true,
        resolution: action.resolution,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Apply failed";
      results.push({
        identity: requirement.identity,
        filename: requirement.filename,
        success: false,
        resolution: action.resolution,
        message,
      });
    }
  }

  if (results.some((item) => !item.success)) {
    throw new SftpAuditError(
      "SYNC_APPLY_PARTIAL",
      `Falló la instalación de ${results.filter((item) => !item.success).length} mod(s). Revisá permisos y espacio en disco.`
    );
  }

  const buildPath = path.join(buildsBase, input.project.name);
  const rebuild = buildAllUser(
    sourceBase,
    buildPath,
    input.project.version,
    input.project.loader as Loader
  );

  const afterSync = await performMultiplayerSync(input, buildsBase, signal);

  return {
    actions,
    results,
    rebuild: {
      success: rebuild.success,
      message: rebuild.message,
      modsCount: rebuild.modsCount,
    },
    diffAfter: afterSync.diff,
  };
}

async function loadServerArtifacts(input: SyncClientServerRequest, signal: AbortSignal) {
  const session = await openSftpReadTransport(input.connection, signal);
  try {
    const observed = await discoverRemoteServerState(session.transport, {
      ...input.runtime,
      scanServerProperties: false,
      signal,
    });
    observed.manifest.instanceId = REMOTE_SERVER_INSTANCE_ID;
    return observed.manifest.mods;
  } finally {
    session.close();
  }
}

/** Downloads missing/mismatched mods from the server (or Modrinth) into the project and rebuilds alluser. */
export async function applyClientSyncFromRemote(
  input: SyncClientServerRequest,
  buildsBase: string,
  signal: AbortSignal,
  sourceBase: string = SOURCE_BASE
): Promise<ClientSyncApplyResult & { syncBefore: ServerMultiplayerSyncResult }> {
  const release = acquireServerSession("Ya hay una operación de servidor en curso. Esperá a que termine.");
  try {
    const syncBefore = await performMultiplayerSync(input, buildsBase, signal);
    if (syncBefore.diff.status === "incompatible") {
      throw new SftpAuditError("SYNC_INCOMPATIBLE", "El cliente y el servidor son incompatibles. No se puede sincronizar.");
    }
    if (syncBefore.diff.status === "ready") {
      return { syncBefore, actions: [], results: [], diffAfter: syncBefore.diff };
    }

    const serverArtifacts = await loadServerArtifacts(input, signal);
    const applied = await applyClientSyncActions(
      input,
      buildsBase,
      sourceBase,
      syncBefore,
      serverArtifacts,
      signal
    );
    return { syncBefore, ...applied };
  } finally {
    release();
  }
}
