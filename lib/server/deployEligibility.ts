import type { InstanceManifestDiff } from "@mim/contracts-core/instances";
import type { ReconciliationPlan } from "@mim/contracts-core/server";

export interface DeployPlanCounts {
  install: number;
  replace: number;
  remove: number;
  config: number;
  manualReview: number;
}

export function summarizeReconciliationPlan(plan: ReconciliationPlan): DeployPlanCounts {
  const counts: DeployPlanCounts = { install: 0, replace: 0, remove: 0, config: 0, manualReview: 0 };
  for (const action of plan.actions) {
    if (action.type === "install") counts.install += 1;
    else if (action.type === "replace") counts.replace += 1;
    else if (action.type === "remove") counts.remove += 1;
    else if (action.type === "sync-config") counts.config += 1;
    else if (action.type === "manual-review") counts.manualReview += 1;
  }
  return counts;
}

export function mutatingActionCount(counts: DeployPlanCounts): number {
  return counts.install + counts.replace + counts.remove + counts.config;
}

export function countsFromDiff(diff: InstanceManifestDiff): DeployPlanCounts {
  const config = (diff.configDiffs ?? []).filter((entry) => entry.type !== "unchanged").length;
  return {
    install: diff.additions.length,
    replace: diff.updates.length,
    remove: diff.removals.length,
    config,
    manualReview: diff.duplicates.desired.length + diff.duplicates.actual.length + diff.environmentMismatches.length,
  };
}

export function isCompleteDeployableAudit(result: {
  isPartialAudit: boolean;
  runtimeMismatch?: boolean;
  report: { readyForPlanning: boolean; diff: InstanceManifestDiff } | null;
}): boolean {
  if (result.isPartialAudit || !result.report || result.runtimeMismatch) return false;
  if (!result.report.readyForPlanning) return false;
  return mutatingActionCount(countsFromDiff(result.report.diff)) > 0;
}
