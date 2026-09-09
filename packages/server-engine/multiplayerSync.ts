/**
 * Multiplayer Client-Server Sync Engine (SRV-7)
 * Generates public distributable manifests and calculates client-side sync diffs
 * while strictly preserving client-only mods (shaders, OptiFine, Sodium, etc.).
 */

import type { InstanceManifest, ModArtifact } from "@mim/contracts-core/instances";
import type {
  DistributableServerManifest,
  DistributableModRequirement,
  ClientSyncDiffResult,
} from "@mim/contracts-core/server";

/**
 * Exports a clean, client-safe distributable manifest from a server instance.
 * Excludes server-only utilities and sensitive server configurations.
 */
export function generateDistributableManifest(
  serverManifest: InstanceManifest,
  serverName?: string
): DistributableServerManifest {
  const requiredMods: DistributableModRequirement[] = [];
  const optionalMods: DistributableModRequirement[] = [];

  for (const artifact of serverManifest.mods) {
    // Exclude server-only plugins/mods
    if (artifact.environment?.server === "required" && artifact.environment?.client === "unsupported") {
      continue;
    }

    const requirement: DistributableModRequirement = {
      identity: artifact.modId || artifact.fileName,
      displayName: artifact.modName || artifact.fileName,
      filename: artifact.fileName,
      sha256: artifact.hashes?.sha256,
      required: true,
      side: artifact.environment?.server === "unsupported" ? "client" : "both",
    };

    requiredMods.push(requirement);
  }

  return {
    schemaVersion: "1.0",
    serverId: serverManifest.instanceId,
    serverName: serverName || (serverManifest.metadata?.displayName as string) || "Minecraft Server",
    minecraftVersion: serverManifest.minecraftVersion,
    modLoader: serverManifest.loader,
    modLoaderVersion: "latest",
    exportedAt: new Date().toISOString(),
    requiredMods,
    optionalMods,
  };
}

/**
 * Reconciles a local client instance against a remote server distributable manifest.
 * Produces an exact sync plan without destroying client-only mods.
 */
export function reconcileClientWithServerManifest(
  clientManifest: InstanceManifest,
  serverManifest: DistributableServerManifest
): ClientSyncDiffResult {
  // 1. Compatibility verification (Minecraft version & Loader)
  const isMinecraftCompatible =
    clientManifest.minecraftVersion.trim() === serverManifest.minecraftVersion.trim();
  const isLoaderCompatible =
    clientManifest.loader.toLowerCase() === serverManifest.modLoader.toLowerCase();

  if (!isMinecraftCompatible || !isLoaderCompatible) {
    return {
      status: "incompatible",
      missingMods: [],
      versionMismatches: [],
      clientOnlyModsPreserved: clientManifest.mods.filter(
        (a) => a.environment?.server === "unsupported"
      ),
      incompatibleMinecraft: !isMinecraftCompatible
        ? { server: serverManifest.minecraftVersion, client: clientManifest.minecraftVersion }
        : undefined,
      incompatibleLoaders: !isLoaderCompatible
        ? { server: serverManifest.modLoader, client: clientManifest.loader }
        : undefined,
    };
  }

  // 2. Index client artifacts by identity and filename
  const clientArtifactsByIdentity = new Map<string, ModArtifact>();
  const clientArtifactsByFilename = new Map<string, ModArtifact>();

  for (const artifact of clientManifest.mods) {
    if (artifact.modId) clientArtifactsByIdentity.set(artifact.modId.toLowerCase(), artifact);
    if (artifact.fileName) clientArtifactsByFilename.set(artifact.fileName.toLowerCase(), artifact);
  }

  const missingMods: DistributableModRequirement[] = [];
  const versionMismatches: { required: DistributableModRequirement; actual: ModArtifact }[] = [];
  const clientOnlyModsPreserved: ModArtifact[] = [];

  // 3. Evaluate required mods
  for (const requiredMod of serverManifest.requiredMods) {
    const clientMatch =
      clientArtifactsByIdentity.get(requiredMod.identity.toLowerCase()) ||
      clientArtifactsByFilename.get(requiredMod.filename.toLowerCase());

    if (!clientMatch) {
      missingMods.push(requiredMod);
    } else {
      // Check version / hash mismatch
      const clientSha = clientMatch.hashes?.sha256;
      const hashDiff = requiredMod.sha256 && clientSha && requiredMod.sha256 !== clientSha;
      if (hashDiff) {
        versionMismatches.push({
          required: requiredMod,
          actual: clientMatch,
        });
      }
    }
  }

  // 4. Identify and preserve client-only mods
  for (const artifact of clientManifest.mods) {
    if (artifact.environment?.server === "unsupported") {
      clientOnlyModsPreserved.push(artifact);
    }
  }

  const isReady = missingMods.length === 0 && versionMismatches.length === 0;

  return {
    status: isReady ? "ready" : "mismatched",
    missingMods,
    versionMismatches,
    clientOnlyModsPreserved,
  };
}
