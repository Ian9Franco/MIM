import { executeRollback } from "@mim/server-engine/rollback";
import { loadPendingServerOperations } from "@mim/server-engine/pendingOperations";
import type { RollbackResult } from "@mim/contracts-core/server";
import type { PendingServerOperationState } from "@mim/server-engine/pendingOperations";
import type { InspectServerRequest } from "./inspectSchema";
import { createServerSnapshotStore } from "./snapshotStoreFactory";
import { REMOTE_SERVER_INSTANCE_ID } from "./serverIdentity";
import { openSftpWritableTransport } from "./transport/sftpWritableTransport";
import { acquireServerSession } from "./sessionLock";

export async function loadServerRecoveryState(
  serverId: string = REMOTE_SERVER_INSTANCE_ID
): Promise<PendingServerOperationState> {
  return loadPendingServerOperations(createServerSnapshotStore(), serverId);
}

export interface ServerRollbackRequest extends InspectServerRequest {
  snapshotId: string;
  confirm: true;
}

export interface ServerRollbackResponse {
  pending: PendingServerOperationState;
  rollback: RollbackResult;
}

/** Restores a durable snapshot on the remote server. Requires explicit operator confirmation. */
export async function rollbackServerSnapshot(
  input: ServerRollbackRequest,
  signal: AbortSignal
): Promise<ServerRollbackResponse> {
  const release = acquireServerSession("Ya hay una operación de servidor en curso. Esperá a que termine.");
  try {
    const store = createServerSnapshotStore();
    const snapshot = await store.getSnapshot(input.snapshotId);
    if (!snapshot || snapshot.serverId !== REMOTE_SERVER_INSTANCE_ID) {
      throw new Error("Snapshot no encontrado para este servidor.");
    }
    if (snapshot.status !== "active") {
      throw new Error("El snapshot ya no está activo.");
    }

    const session = await openSftpWritableTransport(input.connection, signal);
    try {
      const rollback = await executeRollback(session.transport, snapshot, { verifyHashes: true, signal });
      if (rollback.success) {
        await store.updateSnapshotStatus(snapshot.snapshotId, "restored");
        await store.recordChange({
          id: `chg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          serverId: REMOTE_SERVER_INSTANCE_ID,
          type: "rollback-applied",
          timestamp: new Date().toISOString(),
          summary: `Rollback manual desde UI (${snapshot.snapshotId})`,
          metadata: { rollbackId: rollback.rollbackId },
        });
      }
      const pending = await loadServerRecoveryState();
      return { pending, rollback };
    } finally {
      session.close();
    }
  } finally {
    release();
  }
}
