import type { InstanceManifestDiff, ModArtifact } from "@/lib/instances/types";

export type ReconciliationActionType =
  | "install"
  | "remove"
  | "replace"
  | "manual-review";

export interface ReconciliationAction {
  type: ReconciliationActionType;
  identity: string;
  desired?: ModArtifact;
  actual?: ModArtifact;
  reason: string;
  destructive: boolean;
}

export interface ReconciliationPlan {
  desiredInstanceId: string;
  actualInstanceId: string;
  actions: ReconciliationAction[];
  blocked: boolean;
  blockReasons: string[];
  requiresSnapshot: boolean;
}

/**
 * Converts a pure manifest diff into an explicit plan without performing I/O.
 * Remote execution belongs to a later transactional layer with snapshot,
 * verification and rollback guarantees.
 */
export function buildReconciliationPlan(diff: InstanceManifestDiff): ReconciliationPlan {
  const actions: ReconciliationAction[] = [];
  const blockReasons: string[] = [];

  for (const artifact of diff.additions) {
    actions.push({
      type: "install",
      identity: artifact.modId !== "unknown" ? `mod:${artifact.modId}` : `file:${artifact.fileName}`,
      desired: artifact,
      reason: "Artifact exists in desired state but not actual state",
      destructive: false,
    });
  }

  for (const artifact of diff.removals) {
    actions.push({
      type: "remove",
      identity: artifact.modId !== "unknown" ? `mod:${artifact.modId}` : `file:${artifact.fileName}`,
      actual: artifact,
      reason: "Artifact exists in actual state but not desired state",
      destructive: true,
    });
  }

  for (const update of diff.updates) {
    actions.push({
      type: "replace",
      identity: update.identity,
      desired: update.desired,
      actual: update.actual,
      reason: `Artifact differs by ${update.reasons.join(", ")}`,
      destructive: true,
    });
  }

  for (const duplicate of diff.duplicates.desired) {
    blockReasons.push(`Desired state contains duplicate identity ${duplicate.identity}`);
    actions.push({
      type: "manual-review",
      identity: duplicate.identity,
      reason: "Desired state contains multiple artifacts with the same identity",
      destructive: false,
    });
  }

  for (const duplicate of diff.duplicates.actual) {
    blockReasons.push(`Actual state contains duplicate identity ${duplicate.identity}`);
    actions.push({
      type: "manual-review",
      identity: duplicate.identity,
      reason: "Actual state contains multiple artifacts with the same identity",
      destructive: false,
    });
  }

  for (const mismatch of diff.environmentMismatches) {
    const identity = mismatch.artifact.modId !== "unknown"
      ? `mod:${mismatch.artifact.modId}`
      : `file:${mismatch.artifact.fileName}`;
    blockReasons.push(mismatch.reason);
    actions.push({
      type: "manual-review",
      identity,
      desired: mismatch.artifact,
      reason: mismatch.reason,
      destructive: false,
    });
  }

  return {
    desiredInstanceId: diff.desiredInstanceId,
    actualInstanceId: diff.actualInstanceId,
    actions,
    blocked: blockReasons.length > 0,
    blockReasons,
    requiresSnapshot: actions.some((action) => action.destructive),
  };
}
