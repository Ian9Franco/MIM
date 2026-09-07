import path from "path";
import type { EnhancedModMeta } from "@/lib/mod-scanner/types";
import type {
  ArtifactEnvironment,
  ArtifactSource,
  EnvironmentRequirement,
  ModArtifact,
} from "./types";

const UNKNOWN = "unknown";

function requirement(value?: string): EnvironmentRequirement {
  if (
    value === "required" ||
    value === "optional" ||
    value === "unsupported" ||
    value === "unknown"
  ) {
    return value;
  }
  return "unknown";
}

function normalizeEnvironment(meta: EnhancedModMeta): ArtifactEnvironment {
  if (meta.environment === "client") {
    return { client: "required", server: "unsupported" };
  }
  if (meta.environment === "server") {
    return { client: "unsupported", server: "required" };
  }
  if (meta.environment === "both") {
    return { client: "optional", server: "optional" };
  }

  return {
    client: requirement(meta.clientSide),
    server: requirement(meta.serverSide),
  };
}

export interface ModArtifactOptions {
  fileName?: string;
  source?: ArtifactSource;
  sha256?: string;
  sha512?: string;
}

/** Convert scanner output into the canonical instance-domain artifact. */
export function toModArtifact(
  meta: EnhancedModMeta,
  options: ModArtifactOptions = {}
): ModArtifact {
  const source = options.source ?? { kind: "local" as const };
  const inferredName = source.path ? path.basename(source.path) : undefined;

  return {
    fileName: options.fileName ?? inferredName ?? meta.modName ?? UNKNOWN,
    modId: meta.modId || UNKNOWN,
    modName: meta.modName || UNKNOWN,
    modVersion: meta.modVersion || UNKNOWN,
    minecraftVersion: meta.gameVersion || UNKNOWN,
    loader: meta.loader || UNKNOWN,
    projectType: meta.projectType || "mod",
    hashes: {
      sha1: meta.sha1,
      sha256: options.sha256,
      sha512: options.sha512,
    },
    environment: normalizeEnvironment(meta),
    dependencies: (meta.dependencies ?? []).map((dependency) => ({
      modId: dependency.modId,
      version: dependency.version,
      type: dependency.type,
    })),
    conflicts: [...(meta.conflicts ?? [])],
    providedIds: [...(meta.providedIds ?? [])],
    mixinTargets: [...(meta.mixinTargets ?? [])],
    source,
  };
}
