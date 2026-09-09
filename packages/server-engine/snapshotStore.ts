import type { InstanceManifest } from "@mim/contracts-core/instances";
import type {
  ServerSnapshot,
  ServerChangeRecord,
  SnapshotStatus,
} from "@mim/contracts-core/server";
import { computeManifestFingerprint } from "./preflight";

export interface PlanFreshnessCheckResult {
  fresh: boolean;
  driftReason?: string;
  expectedFingerprint: string;
  actualFingerprint: string;
}

/**
 * Validates whether a pre-mutation snapshot is still fresh against the current remote server manifest.
 * Detects if external mutations, manual SFTP edits, or concurrent deploys occurred.
 */
export function validatePlanFreshness(
  snapshot: ServerSnapshot,
  currentObservedManifest: InstanceManifest
): PlanFreshnessCheckResult {
  const currentFingerprint = computeManifestFingerprint(currentObservedManifest);
  const expectedFingerprint = snapshot.observedManifestFingerprint;

  if (currentFingerprint !== expectedFingerprint) {
    return {
      fresh: false,
      driftReason: "Remote server state drifted: manifest fingerprint does not match snapshot expectation",
      expectedFingerprint,
      actualFingerprint: currentFingerprint,
    };
  }

  return {
    fresh: true,
    expectedFingerprint,
    actualFingerprint: currentFingerprint,
  };
}

export interface ISnapshotStore {
  saveSnapshot(snapshot: ServerSnapshot): Promise<void>;
  getSnapshot(snapshotId: string): Promise<ServerSnapshot | null>;
  listSnapshots(serverId: string): Promise<ServerSnapshot[]>;
  updateSnapshotStatus(snapshotId: string, status: SnapshotStatus): Promise<void>;
  recordChange(record: ServerChangeRecord): Promise<void>;
  getChangeHistory(serverId: string): Promise<ServerChangeRecord[]>;
}

/**
 * In-memory and extensible durable snapshot & journal store.
 */
export class MemorySnapshotStore implements ISnapshotStore {
  private snapshots = new Map<string, ServerSnapshot>();
  private changeJournal = new Map<string, ServerChangeRecord[]>();

  async saveSnapshot(snapshot: ServerSnapshot): Promise<void> {
    this.snapshots.set(snapshot.snapshotId, { ...snapshot });
  }

  async getSnapshot(snapshotId: string): Promise<ServerSnapshot | null> {
    const found = this.snapshots.get(snapshotId);
    return found ? { ...found } : null;
  }

  async listSnapshots(serverId: string): Promise<ServerSnapshot[]> {
    return [...this.snapshots.values()]
      .filter((s) => s.serverId === serverId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async updateSnapshotStatus(snapshotId: string, status: SnapshotStatus): Promise<void> {
    const found = this.snapshots.get(snapshotId);
    if (found) {
      found.status = status;
      this.snapshots.set(snapshotId, found);
    }
  }

  async recordChange(record: ServerChangeRecord): Promise<void> {
    const list = this.changeJournal.get(record.serverId) ?? [];
    list.push(record);
    this.changeJournal.set(record.serverId, list);
  }

  async getChangeHistory(serverId: string): Promise<ServerChangeRecord[]> {
    const list = this.changeJournal.get(serverId) ?? [];
    return [...list].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }
}

/**
 * Singleton instance of MemorySnapshotStore for application runtime
 */
export const defaultSnapshotStore = new MemorySnapshotStore();
