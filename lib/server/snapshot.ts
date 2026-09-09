import crypto from "node:crypto";
import type { InstanceManifest } from "@mim/contracts-core/instances";
import type {
  ReadOnlyFileTransport,
  ReconciliationPlan,
  ServerSnapshot,
  SnapshotEntry,
} from "./types";
import { computeManifestFingerprint } from "./preflight";

export interface SnapshotCreationOptions {
  plan: ReconciliationPlan;
  transport: ReadOnlyFileTransport;
  serverId: string;
  desiredManifest: InstanceManifest;
  observedManifest: InstanceManifest;
  operationId?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

/**
 * Creates a durable, pre-mutation snapshot of all remote paths affected by a reconciliation plan.
 * Existing files are backed up in memory/blob form with sha256 checksums.
 * New files to be installed are marked as "created" entries so rollback knows to delete them.
 */
export async function createPreMutationSnapshot(
  options: SnapshotCreationOptions
): Promise<ServerSnapshot> {
  const {
    plan,
    transport,
    serverId,
    desiredManifest,
    observedManifest,
    operationId = `op-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
    metadata,
  } = options;

  const snapshotId = `snap-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  const entries: SnapshotEntry[] = [];
  const processedPaths = new Set<string>();

  for (const action of plan.actions) {
    if (action.type === "manual-review") continue;

    const targetPath =
      action.targetPath ||
      (action.actual?.fileName ? `mods/${action.actual.fileName}` : action.desired?.fileName ? `mods/${action.desired.fileName}` : undefined);

    if (!targetPath || processedPaths.has(targetPath)) continue;
    processedPaths.add(targetPath);

    try {
      const buffer = await transport.read(targetPath);
      const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");
      entries.push({
        relativePath: targetPath,
        action: "existed",
        originalSha256: sha256,
        backupBlob: buffer,
        sizeBytes: buffer.byteLength,
      });
    } catch {
      // If reading fails (e.g. file not found), it means the file did not exist previously
      entries.push({
        relativePath: targetPath,
        action: "created",
      });
    }
  }

  const observedFingerprint = computeManifestFingerprint(observedManifest);
  const desiredFingerprint = computeManifestFingerprint(desiredManifest);

  return {
    snapshotId,
    serverId,
    operationId,
    createdAt: new Date().toISOString(),
    status: "active",
    observedManifestFingerprint: observedFingerprint,
    desiredManifestFingerprint: desiredFingerprint,
    entries,
    metadata,
  };
}
