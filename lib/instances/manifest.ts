import type { ConfigArtifact, InstanceManifest, InstanceSide, ModArtifact } from "./types";

export interface CreateInstanceManifestInput {
  instanceId: string;
  side: InstanceSide;
  minecraftVersion: string;
  loader: string;
  mods?: ModArtifact[];
  configs?: ConfigArtifact[];
  generatedAt?: string;
  metadata?: InstanceManifest["metadata"];
}

function sortArtifacts<T extends { fileName?: string; relativePath?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const left = a.fileName ?? a.relativePath ?? "";
    const right = b.fileName ?? b.relativePath ?? "";
    return left.localeCompare(right, "en", { sensitivity: "base" });
  });
}

/**
 * Creates a deterministic manifest snapshot. Sources may be local, remote or
 * generated; consumers should only depend on the normalized manifest.
 */
export function createInstanceManifest(input: CreateInstanceManifestInput): InstanceManifest {
  return {
    schemaVersion: 1,
    instanceId: input.instanceId,
    side: input.side,
    minecraftVersion: input.minecraftVersion,
    loader: input.loader,
    mods: sortArtifacts(input.mods ?? []),
    configs: sortArtifacts(input.configs ?? []),
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    metadata: input.metadata,
  };
}
