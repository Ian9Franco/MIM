/**
 * Deterministic Server Rollback Engine
 * Restores previous server filesystem state from durable snapshots.
 */

import crypto from "node:crypto";
import type {
  WritableFileTransport,
  ServerSnapshot,
  RollbackResult,
} from "@mim/contracts-core/server";

export interface RollbackExecutionOptions {
  verifyHashes?: boolean;
  signal?: AbortSignal;
}

/**
 * Calculates SHA-256 checksum for Uint8Array buffer
 */
export function computeBufferSha256(buffer: Uint8Array): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * Executes a deterministic rollback operation using the provided snapshot.
 */
export async function executeRollback(
  transport: WritableFileTransport,
  snapshot: ServerSnapshot,
  options: RollbackExecutionOptions = {}
): Promise<RollbackResult> {
  const startTime = Date.now();
  const rollbackId = `rb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const failedEntries: { path: string; error: string }[] = [];
  let restoredEntries = 0;
  let deletedEntries = 0;

  for (const entry of snapshot.entries) {
    if (options.signal?.aborted) {
      failedEntries.push({
        path: entry.relativePath,
        error: "Rollback aborted by signal",
      });
      break;
    }

    try {
      if (entry.action === "created") {
        // This file was created during the failed deployment -> delete it
        try {
          await transport.remove(entry.relativePath);
          deletedEntries++;
        } catch (err: unknown) {
          // If file already doesn't exist, treat as benign
          const message = err instanceof Error ? err.message : String(err);
          if (!message.toLowerCase().includes("not found") && !message.toLowerCase().includes("enoent")) {
            failedEntries.push({
              path: entry.relativePath,
              error: `Failed to remove created file: ${message}`,
            });
          }
        }
      } else if (entry.action === "existed") {
        // File existed before mutation -> restore its original content
        if (entry.backupBlob) {
          await transport.write(entry.relativePath, entry.backupBlob);

          if (options.verifyHashes && entry.originalSha256) {
            const restoredHash = computeBufferSha256(entry.backupBlob);
            if (restoredHash !== entry.originalSha256) {
              failedEntries.push({
                path: entry.relativePath,
                error: `Checksum mismatch after restore: expected ${entry.originalSha256}, got ${restoredHash}`,
              });
              continue;
            }
          }
          restoredEntries++;
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      failedEntries.push({
        path: entry.relativePath,
        error: message,
      });
    }
  }

  const success = failedEntries.length === 0;
  if (success) {
    snapshot.status = "restored";
  }

  return {
    rollbackId,
    snapshotId: snapshot.snapshotId,
    serverId: snapshot.serverId,
    success,
    restoredEntries,
    deletedEntries,
    failedEntries,
    durationMs: Date.now() - startTime,
    requiresManualRecovery: !success,
  };
}
