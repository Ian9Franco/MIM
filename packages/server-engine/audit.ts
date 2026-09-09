import { diffInstanceManifests, validateInstanceManifest } from "@/lib/instances";
import type { InstanceManifest } from "@mim/contracts-core/instances";
import type { ServerAuditReport } from "./types";

export * from "./types";

/**
 * Read-only audit over desired and observed server state.
 * It deliberately produces evidence only; remote mutations are a separate step.
 */
export function auditServerInstance(
  desired: InstanceManifest,
  actual: InstanceManifest,
  generatedAt = new Date().toISOString()
): ServerAuditReport {
  if (desired.side !== "server" || actual.side !== "server") {
    throw new Error("[ServerAudit] Both desired and actual manifests must target server runtime");
  }

  const validation = validateInstanceManifest(actual);
  const diff = diffInstanceManifests(desired, actual);
  const duplicateIdentities =
    diff.duplicates.desired.length + diff.duplicates.actual.length;

  return {
    desiredInstanceId: desired.instanceId,
    actualInstanceId: actual.instanceId,
    generatedAt,
    validation,
    diff,
    summary: {
      correct: diff.unchanged.length,
      missingFromServer: diff.additions.length,
      extraOnServer: diff.removals.length,
      updatesRequired: diff.updates.length,
      duplicateIdentities,
      environmentMismatches: diff.environmentMismatches.length,
      validationErrors: validation.errors.length,
      validationWarnings: validation.warnings.length,
    },
    readyForPlanning: !validation.blocksExport && !diff.requiresManualReview,
  };
}
