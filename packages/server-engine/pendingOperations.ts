import type { ServerChangeRecord, ServerSnapshot, SnapshotStatus } from "@mim/contracts-core/server";
import type { ISnapshotStore } from "./snapshotStore";

/** Snapshot statuses that mean the pre-mutation operation is closed. */
export const TERMINAL_SNAPSHOT_STATUSES: readonly SnapshotStatus[] = ["restored", "discarded"];

export function isTerminalSnapshotStatus(status: SnapshotStatus): boolean {
  return status === "restored" || status === "discarded";
}

/**
 * Read-only recovery view after restart or reconnect.
 * Does not mutate the store and never triggers rollback.
 */
export interface PendingServerOperationState {
  serverId: string;
  /** Snapshots still marked `active` for this server, newest first. */
  openSnapshots: ServerSnapshot[];
  /** Most recent journal entry for this server, if any. */
  latestChange: ServerChangeRecord | null;
  pendingOperationCount: number;
}

/**
 * Pure resolver: given snapshots and journal rows, detect unfinished operations.
 */
export function resolvePendingServerOperations(
  serverId: string,
  snapshots: ServerSnapshot[],
  changeHistory: ServerChangeRecord[]
): PendingServerOperationState {
  const openSnapshots = snapshots
    .filter((snapshot) => snapshot.serverId === serverId && snapshot.status === "active")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    serverId,
    openSnapshots,
    latestChange: changeHistory[0] ?? null,
    pendingOperationCount: openSnapshots.length,
  };
}

/**
 * Loads snapshot and journal state from a durable or in-memory store.
 */
export async function loadPendingServerOperations(
  store: ISnapshotStore,
  serverId: string
): Promise<PendingServerOperationState> {
  const [snapshots, changeHistory] = await Promise.all([
    store.listSnapshots(serverId),
    store.getChangeHistory(serverId),
  ]);

  return resolvePendingServerOperations(serverId, snapshots, changeHistory);
}
