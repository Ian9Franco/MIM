/**
 * Pure Domain Contracts: Instances & Artifacts
 *
 * Canonical, transport-agnostic representation of Minecraft artifacts and
 * instances. Local filesystem, SFTP, provider APIs and generated builds should
 * all converge on these types before validation, diffing or reconciliation.
 */

export type InstanceSide = "client" | "server";
export type EnvironmentRequirement =
  | "required"
  | "optional"
  | "unsupported"
  | "unknown";

export type ArtifactSourceKind =
  | "local"
  | "remote"
  | "provider"
  | "generated";

export interface ArtifactHashes {
  sha1?: string;
  sha256?: string;
  sha512?: string;
}

export interface ArtifactEnvironment {
  client: EnvironmentRequirement;
  server: EnvironmentRequirement;
}

export interface ArtifactDependency {
  modId: string;
  version?: string;
  type: "required" | "optional" | "incompatible" | "embedded";
}

export interface ArtifactSource {
  kind: ArtifactSourceKind;
  /** Path is informational. Domain logic must never assume it is locally readable. */
  path?: string;
  provider?: "modrinth" | "curseforge" | string;
  projectId?: string;
  versionId?: string;
}

/**
 * Canonical mod identity used by Scanner, Validator, Builder and Server Manager.
 * Unknown values remain explicit instead of being guessed from the transport.
 */
export interface ModArtifact {
  fileName: string;
  modId: string;
  modName: string;
  modVersion: string;
  minecraftVersion: string;
  loader: string;
  projectType: string;
  hashes: ArtifactHashes;
  environment: ArtifactEnvironment;
  dependencies: ArtifactDependency[];
  conflicts: string[];
  providedIds: string[];
  mixinTargets: string[];
  source: ArtifactSource;
}

export interface ConfigArtifact {
  relativePath: string;
  hashes: ArtifactHashes;
  source: ArtifactSource;
}

/**
 * Universal snapshot of desired or observed state.
 * A project build, a local client and a remote server use the same contract.
 */
export interface InstanceManifest {
  schemaVersion: 1;
  instanceId: string;
  side: InstanceSide;
  minecraftVersion: string;
  loader: string;
  mods: ModArtifact[];
  configs: ConfigArtifact[];
  generatedAt: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface ManifestDuplicate {
  identity: string;
  artifacts: ModArtifact[];
}

export interface ManifestUpdate {
  identity: string;
  desired: ModArtifact;
  actual: ModArtifact;
  reasons: Array<"version" | "content" | "filename" | "loader">;
}

export interface EnvironmentMismatch {
  artifact: ModArtifact;
  side: InstanceSide;
  reason: string;
}

export interface ConfigDiffEntry {
  relativePath: string;
  type: "addition" | "removal" | "modified" | "unchanged";
  desired?: ConfigArtifact;
  actual?: ConfigArtifact;
}

export interface InstanceManifestDiff {
  desiredInstanceId: string;
  actualInstanceId: string;
  additions: ModArtifact[];
  removals: ModArtifact[];
  updates: ManifestUpdate[];
  unchanged: ModArtifact[];
  configDiffs?: ConfigDiffEntry[];
  duplicates: {
    desired: ManifestDuplicate[];
    actual: ManifestDuplicate[];
  };
  environmentMismatches: EnvironmentMismatch[];
  hasChanges: boolean;
  requiresManualReview: boolean;
}
