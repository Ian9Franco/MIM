import type {
  EnvironmentMismatch,
  InstanceManifest,
  InstanceManifestDiff,
  InstanceSide,
  ManifestDuplicate,
  ManifestUpdate,
  ModArtifact,
} from "./types";

function strongestHash(artifact: ModArtifact): string | undefined {
  return artifact.hashes.sha512 ?? artifact.hashes.sha256 ?? artifact.hashes.sha1;
}

/**
 * Stable identity preference:
 * 1. explicit modId
 * 2. cryptographic content hash
 * 3. filename fallback
 */
export function artifactIdentity(artifact: ModArtifact): string {
  if (artifact.modId && artifact.modId !== "unknown") {
    return `mod:${artifact.modId.toLowerCase()}`;
  }
  const hash = strongestHash(artifact);
  if (hash) return `hash:${hash.toLowerCase()}`;
  return `file:${artifact.fileName.toLowerCase()}`;
}

function indexArtifacts(mods: ModArtifact[]): Map<string, ModArtifact[]> {
  const index = new Map<string, ModArtifact[]>();
  for (const artifact of mods) {
    const identity = artifactIdentity(artifact);
    const existing = index.get(identity) ?? [];
    existing.push(artifact);
    index.set(identity, existing);
  }
  return index;
}

function duplicates(index: Map<string, ModArtifact[]>): ManifestDuplicate[] {
  return [...index.entries()]
    .filter(([, artifacts]) => artifacts.length > 1)
    .map(([identity, artifacts]) => ({ identity, artifacts }))
    .sort((a, b) => a.identity.localeCompare(b.identity));
}

function isUnsupported(artifact: ModArtifact, side: InstanceSide): boolean {
  return artifact.environment[side] === "unsupported";
}

function environmentMismatches(
  manifest: InstanceManifest
): EnvironmentMismatch[] {
  return manifest.mods
    .filter((artifact) => isUnsupported(artifact, manifest.side))
    .map((artifact) => ({
      artifact,
      side: manifest.side,
      reason: `${artifact.modName} declares ${manifest.side} as unsupported`,
    }));
}

function updateReasons(
  desired: ModArtifact,
  actual: ModArtifact
): ManifestUpdate["reasons"] {
  const reasons: ManifestUpdate["reasons"] = [];
  if (desired.modVersion !== actual.modVersion) reasons.push("version");
  const desiredHash = strongestHash(desired);
  const actualHash = strongestHash(actual);
  if (desiredHash && actualHash && desiredHash !== actualHash) reasons.push("content");
  if (desired.fileName !== actual.fileName) reasons.push("filename");
  if (desired.loader !== actual.loader) reasons.push("loader");
  return reasons;
}

export function diffInstanceManifests(
  desired: InstanceManifest,
  actual: InstanceManifest
): InstanceManifestDiff {
  const desiredIndex = indexArtifacts(desired.mods);
  const actualIndex = indexArtifacts(actual.mods);

  const additions: ModArtifact[] = [];
  const removals: ModArtifact[] = [];
  const updates: ManifestUpdate[] = [];
  const unchanged: ModArtifact[] = [];

  const identities = new Set([...desiredIndex.keys(), ...actualIndex.keys()]);

  for (const identity of [...identities].sort()) {
    const desiredArtifacts = desiredIndex.get(identity) ?? [];
    const actualArtifacts = actualIndex.get(identity) ?? [];

    // Duplicates are reported separately and intentionally not auto-reconciled.
    if (desiredArtifacts.length > 1 || actualArtifacts.length > 1) continue;

    const desiredArtifact = desiredArtifacts[0];
    const actualArtifact = actualArtifacts[0];

    if (desiredArtifact && !actualArtifact) {
      additions.push(desiredArtifact);
      continue;
    }
    if (!desiredArtifact && actualArtifact) {
      removals.push(actualArtifact);
      continue;
    }
    if (!desiredArtifact || !actualArtifact) continue;

    const reasons = updateReasons(desiredArtifact, actualArtifact);
    if (reasons.length > 0) {
      updates.push({ identity, desired: desiredArtifact, actual: actualArtifact, reasons });
    } else {
      unchanged.push(desiredArtifact);
    }
  }

  const desiredDuplicates = duplicates(desiredIndex);
  const actualDuplicates = duplicates(actualIndex);
  const mismatches = environmentMismatches(desired);
  const requiresManualReview =
    desiredDuplicates.length > 0 || actualDuplicates.length > 0 || mismatches.length > 0;

  return {
    desiredInstanceId: desired.instanceId,
    actualInstanceId: actual.instanceId,
    additions,
    removals,
    updates,
    unchanged,
    duplicates: { desired: desiredDuplicates, actual: actualDuplicates },
    environmentMismatches: mismatches,
    hasChanges:
      additions.length > 0 ||
      removals.length > 0 ||
      updates.length > 0 ||
      requiresManualReview,
    requiresManualReview,
  };
}
