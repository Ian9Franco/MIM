import {
  parseServerProperties,
  serializeServerProperties,
  updateServerProperties,
  validateServerProperties,
} from "@mim/server-engine/configAdmin";
import { listServerBackups, extractWorldMetadata } from "@mim/server-engine/backups";
import { executeConsoleCommand } from "@mim/server-engine/rcon";
import type {
  ServerBackupInfo,
  ServerPropertiesConfig,
  WorldMetadataInfo,
} from "@mim/contracts-core/server";
import type {
  ExecuteServerRconRequest,
  InspectServerAdminRequest,
  UpdateServerPropertiesRequest,
} from "./adminSchema";
import { openSftpReadTransport, SftpAuditError } from "./transport/sftpReadTransport";
import { openSftpWritableTransport } from "./transport/sftpWritableTransport";
import { openRconChannel } from "./transport/rconChannel";
import { acquireServerSession } from "./sessionLock";

const PROPERTIES_PATH = "server.properties";
const REDACTED = "";

function publicProperties(config: ServerPropertiesConfig): ServerPropertiesConfig {
  const properties = { ...config.properties };
  if ("rcon.password" in properties) properties["rcon.password"] = REDACTED;
  return { ...config, properties };
}

async function readPropertiesOrEmpty(read: (path: string) => Promise<Uint8Array>): Promise<{
  raw: string | null;
  config: ServerPropertiesConfig | null;
}> {
  try {
    const raw = new TextDecoder("utf-8").decode(await read(PROPERTIES_PATH));
    return { raw, config: parseServerProperties(raw) };
  } catch (error: unknown) {
    if (error instanceof SftpAuditError && error.code === "ENOENT") {
      return { raw: null, config: null };
    }
    throw error;
  }
}

async function readWorldMetadata(
  read: (path: string) => Promise<Uint8Array>,
  levelName: string
): Promise<WorldMetadataInfo | null> {
  const candidates = [`${levelName}/level.dat`, "world/level.dat", "level.dat"];
  for (const path of candidates) {
    try {
      const buffer = await read(path);
      return extractWorldMetadata(levelName, buffer);
    } catch (error: unknown) {
      if (error instanceof SftpAuditError && (error.code === "ENOENT" || error.code === "LIMIT")) continue;
      throw error;
    }
  }
  return null;
}

async function performAdminInspect(input: InspectServerAdminRequest, signal: AbortSignal) {
  const session = await openSftpReadTransport(input.connection, signal);
  try {
    const { config } = await readPropertiesOrEmpty((path) => session.transport.read(path));
    const backups: ServerBackupInfo[] = await listServerBackups(session.transport);
    const levelName = config?.properties["level-name"]?.trim() || "world";
    const world = await readWorldMetadata((path) => session.transport.read(path), levelName);
    const validation = config ? validateServerProperties(config.properties) : null;
    return {
      properties: config ? publicProperties(config) : null,
      validation,
      rcon: {
        enabled: config?.properties["enable-rcon"] === "true",
        port: Number.parseInt(config?.properties["rcon.port"] || "25575", 10) || 25575,
        passwordConfigured: Boolean(config?.properties["rcon.password"]?.trim()),
      },
      backups,
      world,
    };
  } finally {
    session.close();
  }
}

async function performPropertiesUpdate(input: UpdateServerPropertiesRequest, signal: AbortSignal) {
  const session = await openSftpWritableTransport(input.connection, signal);
  try {
    const current = await readPropertiesOrEmpty((path) => session.transport.read(path));
    if (!current.config || current.raw === null) {
      throw new SftpAuditError("LOG_UNAVAILABLE", "No hay server.properties en la carpeta del servidor.");
    }

    const updates = { ...input.updates };
    if ("rcon.password" in updates && updates["rcon.password"].trim() === "") {
      delete updates["rcon.password"];
    }

    const next = updateServerProperties(current.config, updates);
    const validation = validateServerProperties(next.properties);
    if (!validation.valid) {
      throw new SftpAuditError("INVALID_PROPERTIES", validation.errors[0] || "server.properties inválido.");
    }

    const serialized = serializeServerProperties(next);
    await session.transport.write(PROPERTIES_PATH, new TextEncoder().encode(serialized));
    return {
      properties: publicProperties(next),
      validation,
    };
  } finally {
    session.close();
  }
}

async function performRconCommand(input: ExecuteServerRconRequest, signal: AbortSignal) {
  let port = input.rconPort;
  if (!port) {
    const snapshot = await performAdminInspect(input, signal);
    port = snapshot.rcon.port;
  }
  const session = await openRconChannel({
    host: input.connection.host,
    port,
    password: input.rconPassword,
    signal,
  });
  try {
    return await executeConsoleCommand(session.channel, input.command);
  } finally {
    session.close();
  }
}

export type ServerAdminInspectResult = Awaited<ReturnType<typeof inspectServerAdmin>>;
export type ServerPropertiesUpdateResult = Awaited<ReturnType<typeof updateRemoteServerProperties>>;

export async function inspectServerAdmin(input: InspectServerAdminRequest, signal: AbortSignal) {
  const release = acquireServerSession("Ya hay una operación de servidor en curso. Esperá a que termine.");
  try {
    return await performAdminInspect(input, signal);
  } finally {
    release();
  }
}

export async function updateRemoteServerProperties(input: UpdateServerPropertiesRequest, signal: AbortSignal) {
  const release = acquireServerSession("Ya hay una operación de servidor en curso. Esperá a que termine.");
  try {
    return await performPropertiesUpdate(input, signal);
  } finally {
    release();
  }
}

export async function executeServerRcon(input: ExecuteServerRconRequest, signal: AbortSignal) {
  const release = acquireServerSession("Ya hay una operación de servidor en curso. Esperá a que termine.");
  try {
    return await performRconCommand(input, signal);
  } finally {
    release();
  }
}
