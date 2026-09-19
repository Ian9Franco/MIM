import type { ModArtifact } from "@mim/contracts-core/instances";
import type {
  ClientSyncAction,
  ClientSyncDiffResult,
  ClientSyncResolution,
  DistributableModRequirement,
} from "@mim/contracts-core/server";

function resolveRequirement(
  requirement: DistributableModRequirement,
  serverArtifacts: Map<string, ModArtifact>
): ClientSyncResolution {
  const artifact =
    serverArtifacts.get(requirement.identity.toLowerCase()) ||
    serverArtifacts.get(requirement.filename.toLowerCase());
  if (artifact?.source?.path || requirement.remotePath) return "server-sftp";
  if (requirement.provider === "modrinth" && requirement.projectId && requirement.versionId) {
    return "modrinth";
  }
  if (artifact?.source?.provider === "modrinth" && artifact.source.projectId && artifact.source.versionId) {
    return "modrinth";
  }
  return "unresolved";
}

function enrichRequirement(
  requirement: DistributableModRequirement,
  serverArtifacts: Map<string, ModArtifact>
): DistributableModRequirement {
  const artifact =
    serverArtifacts.get(requirement.identity.toLowerCase()) ||
    serverArtifacts.get(requirement.filename.toLowerCase());
  if (!artifact) return requirement;
  return {
    ...requirement,
    remotePath: requirement.remotePath || artifact.source?.path,
    provider: requirement.provider || artifact.source?.provider,
    projectId: requirement.projectId || artifact.source?.projectId,
    versionId: requirement.versionId || artifact.source?.versionId,
  };
}

/** Builds install/replace intents from a sync diff and observed server artifacts. */
export function buildClientSyncActions(
  diff: ClientSyncDiffResult,
  serverArtifacts: ModArtifact[]
): ClientSyncAction[] {
  if (diff.status !== "mismatched") return [];

  const serverByIdentity = new Map<string, ModArtifact>();
  for (const artifact of serverArtifacts) {
    if (artifact.modId) serverByIdentity.set(artifact.modId.toLowerCase(), artifact);
    if (artifact.fileName) serverByIdentity.set(artifact.fileName.toLowerCase(), artifact);
  }

  const actions: ClientSyncAction[] = [];

  for (const missing of diff.missingMods) {
    const requirement = enrichRequirement(missing, serverByIdentity);
    actions.push({
      kind: "install",
      requirement,
      resolution: resolveRequirement(requirement, serverByIdentity),
    });
  }

  for (const mismatch of diff.versionMismatches) {
    const requirement = enrichRequirement(mismatch.required, serverByIdentity);
    actions.push({
      kind: "replace",
      requirement,
      removeFilename: mismatch.actual.fileName,
      resolution: resolveRequirement(requirement, serverByIdentity),
    });
  }

  return actions;
}
