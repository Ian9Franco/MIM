import path from "node:path";
import crypto from "node:crypto";
import AdmZip from "adm-zip";
import { scanModBuffer } from "@/lib/modding/enhanced-mod-scanner";
import { createInstanceManifest, toModArtifact, type ModArtifact } from "@/lib/instances";
import type { ReadOnlyFileTransport, RemoteDiscoveryOptions, RemoteServerDiscoveryResult, SftpConnectionConfig } from "@mim/contracts-core/server";
import { parseServerProperties } from "./configAdmin";

export function safeResolveRemotePath(baseDir: string, relativePath: string): string {
  const base = path.posix.normalize(baseDir.replace(/\\/g, "/"));
  const relative = relativePath.replace(/\\/g, "/");
  const target = path.posix.normalize(path.posix.join(base, relative));
  if (path.posix.isAbsolute(relative) || (target !== base && !target.startsWith(base === "/" ? "/" : `${base}/`))) {
    throw new Error(`[Security] Path traversal attempt detected: ${relativePath} escapes base ${baseDir}`);
  }
  return target;
}

export function sanitizeSftpConfig(config: SftpConnectionConfig): Record<string, unknown> {
  return {
    host: config.host, port: config.port ?? 22, username: config.username,
    authType: config.auth.type, rootPath: config.rootPath ?? "/",
    knownHostFingerprint: config.knownHostFingerprint ? "[CONFIGURED]" : "[UNCONFIGURED]",
    timeoutMs: config.timeoutMs,
  };
}

/** Reads mod evidence only. Failed reads remain explicit and never mean absence. */
export async function discoverRemoteServerState(
  transport: ReadOnlyFileTransport, options?: RemoteDiscoveryOptions
): Promise<RemoteServerDiscoveryResult> {
  const startTime = Date.now();
  const root = options?.rootPath ?? "/";
  const modsPath = safeResolveRemotePath(root, options?.modsDir ?? "mods");
  const signal = options?.signal;
  signal?.throwIfAborted();
  const warnings: string[] = [];
  const mods: ModArtifact[] = [];
  let totalJarFiles = 0;
  // Dependency ranges in JAR metadata cannot prove the server's running version.
  const loader = options?.loader || "unknown";
  const minecraftVersion = options?.minecraftVersion || "unknown";
  if (loader === "unknown" || minecraftVersion === "unknown") warnings.push("No se verificó la versión o el loader del servidor.");
  try {
    const entries = await transport.list(modsPath);
    if (entries.length > 2000) throw new Error("Too many directory entries");
    for (const entry of entries) {
      signal?.throwIfAborted();
      if (entry.kind !== "file" || !entry.name.toLowerCase().endsWith(".jar")) continue;
      totalJarFiles++;
      try {
        const remotePath = safeResolveRemotePath(modsPath, entry.name);
        const buffer = Buffer.from(await transport.read(remotePath));
        // Bound archive input before the existing scanner touches compressed metadata.
        if (buffer.length > 64 * 1024 * 1024) throw new Error("Archive exceeds limit");
        const archiveEntries = new AdmZip(buffer).getEntries();
        if (archiveEntries.length > 20000 || archiveEntries.reduce((sum, item) => sum + item.header.size, 0) > 256 * 1024 * 1024) {
          throw new Error("Expanded archive exceeds limit");
        }
        const scanned = await scanModBuffer(buffer, entry.name);
        if (scanned.extractionWarnings?.length || !scanned.modId || scanned.modId === "unknown") {
          warnings.push(`Metadata incompleta: ${entry.name}`);
        }
        mods.push(toModArtifact(scanned, {
          fileName: entry.name, sha256: crypto.createHash("sha256").update(buffer).digest("hex"),
          source: { kind: "remote", path: remotePath },
        }));
      } catch {
        signal?.throwIfAborted();
        warnings.push(`No se pudo analizar ${entry.name}; no se lo considera ausente.`);
      }
    }
  } catch {
    signal?.throwIfAborted();
    warnings.push("No se pudo leer completamente la carpeta de mods. Revisá la ruta y los permisos.");
  }
  let serverProperties: Record<string, string> | undefined;
  if (options?.scanServerProperties !== false) {
    try {
      const bytes = await transport.read(safeResolveRemotePath(root, "server.properties"));
      serverProperties = parseServerProperties(Buffer.from(bytes).toString("utf8")).properties;
    } catch {
      signal?.throwIfAborted();
      warnings.push("No se pudo leer server.properties.");
    }
  }
  signal?.throwIfAborted();
  const manifest = createInstanceManifest({
    instanceId: "remote-server", minecraftVersion, loader, side: "server", mods,
    metadata: { displayName: serverProperties?.["motd"] || "Remote Minecraft Server" },
  });
  return { manifest, serverProperties, discoveredAt: new Date(startTime).toISOString(),
    durationMs: Date.now() - startTime, totalJarFiles, isPartialAudit: warnings.length > 0, warnings };
}
