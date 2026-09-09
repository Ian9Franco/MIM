import path from "node:path";
import { scanModBuffer } from "@/lib/modding/enhanced-mod-scanner";
import { createInstanceManifest, toModArtifact, type ModArtifact } from "@/lib/instances";
import type {
  ReadOnlyFileTransport,
  RemoteDiscoveryOptions,
  RemoteServerDiscoveryResult,
  SftpConnectionConfig,
} from "./types";

/**
 * Resolves and validates a path relative to a base directory, strictly preventing path traversal.
 */
export function safeResolveRemotePath(baseDir: string, relativePath: string): string {
  const normalizedBase = path.posix.normalize(baseDir.replace(/\\/g, "/"));
  const normalizedTarget = path.posix.normalize(path.posix.join(normalizedBase, relativePath.replace(/\\/g, "/")));

  if (!normalizedTarget.startsWith(normalizedBase)) {
    throw new Error(`[Security] Path traversal attempt detected: ${relativePath} escapes base ${baseDir}`);
  }

  return normalizedTarget;
}

import { parseServerProperties } from "./configAdmin";


/**
 * Returns a sanitized clone of SFTP connection settings with passwords and private keys stripped.
 */
export function sanitizeSftpConfig(config: SftpConnectionConfig): Record<string, unknown> {
  return {
    host: config.host,
    port: config.port ?? 22,
    username: config.username,
    authType: config.auth.type,
    rootPath: config.rootPath ?? "/",
    knownHostFingerprint: config.knownHostFingerprint ? "[CONFIGURED]" : "[UNCONFIGURED]",
    timeoutMs: config.timeoutMs,
  };
}

/**
 * Inspects and discovers the remote Minecraft server state using a read-only transport.
 * Reads mods and configurations without performing any remote mutations.
 */
export async function discoverRemoteServerState(
  transport: ReadOnlyFileTransport,
  options?: RemoteDiscoveryOptions
): Promise<RemoteServerDiscoveryResult> {
  const startTime = Date.now();
  const rootPath = options?.rootPath ?? "/";
  const modsDirName = options?.modsDir ?? "mods";
  const modsPath = safeResolveRemotePath(rootPath, modsDirName);
  const scanProps = options?.scanServerProperties ?? true;
  const signal = options?.signal;

  if (signal?.aborted) {
    const abortErr = new Error("Remote server discovery was aborted");
    abortErr.name = "AbortError";
    throw abortErr;
  }

  // 1. Discover and scan mods directory
  const modArtifacts: ModArtifact[] = [];
  let totalJarFiles = 0;
  let loader: "fabric" | "forge" | "neoforge" | "quilt" | "vanilla" = "fabric";
  let detectedMinecraftVersion = "1.20.1";

  try {
    const fileEntries = await transport.list(modsPath);

    for (const entry of fileEntries) {
      if (signal?.aborted) {
        const abortErr = new Error("Remote server discovery was aborted");
        abortErr.name = "AbortError";
        throw abortErr;
      }

      if (entry.kind === "file" && entry.name.toLowerCase().endsWith(".jar")) {
        totalJarFiles++;
        const remoteFilePath = safeResolveRemotePath(modsPath, entry.name);
        const rawBytes = await transport.read(remoteFilePath);

        // Convert Uint8Array to Buffer for scanner
        const buffer = Buffer.isBuffer(rawBytes) ? rawBytes : Buffer.from(rawBytes);
        const scanned = await scanModBuffer(buffer, entry.name);
        const artifact = toModArtifact(scanned, {
          fileName: entry.name,
          source: { kind: "remote", path: remoteFilePath },
        });
        modArtifacts.push(artifact);

        if (artifact.loader !== "unknown") {
          loader = artifact.loader as typeof loader;
        }
        if (artifact.minecraftVersion !== "unknown") {
          detectedMinecraftVersion = artifact.minecraftVersion;
        }
      }
    }
  } catch (err: unknown) {
    if (signal?.aborted) throw err;
    // If mods dir doesn't exist yet, we still proceed with empty artifacts
    console.warn(`[ServerDiscovery] Notice: could not read mods directory at ${modsPath}:`, err);
  }

  // 2. Read server.properties if requested and available
  let serverProperties: Record<string, string> | undefined = undefined;
  if (scanProps) {
    try {
      const propsPath = safeResolveRemotePath(rootPath, "server.properties");
      const propsBytes = await transport.read(propsPath);
      const propsStr = Buffer.from(propsBytes).toString("utf-8");
      serverProperties = parseServerProperties(propsStr).properties;
    } catch {
      // server.properties is optional
    }
  }

  // 3. Construct the observed server instance manifest
  const manifest = createInstanceManifest({
    instanceId: `remote-server-${Date.now()}`,
    minecraftVersion: detectedMinecraftVersion,
    loader,
    side: "server",
    mods: modArtifacts,
    metadata: {
      displayName: serverProperties?.["motd"] || "Remote Minecraft Server",
    },
  });

  const durationMs = Date.now() - startTime;

  return {
    manifest,
    serverProperties,
    discoveredAt: new Date(startTime).toISOString(),
    durationMs,
    totalJarFiles,
  };
}
