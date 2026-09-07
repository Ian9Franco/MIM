import type { ModArtifact } from "@/lib/instances/types";

export type ServerChangeType =
  | "reconciliation-planned"
  | "mod-installed"
  | "mod-removed"
  | "mod-replaced"
  | "config-updated"
  | "server-started"
  | "server-stopped"
  | "server-restarted"
  | "snapshot-created"
  | "rollback-applied"
  | "crash-detected";

export interface ServerChangeRecord {
  id: string;
  serverId: string;
  type: ServerChangeType;
  timestamp: string;
  reconciliationId?: string;
  artifactBefore?: ModArtifact;
  artifactAfter?: ModArtifact;
  path?: string;
  summary: string;
  metadata?: Record<string, string | number | boolean | null>;
}

/**
 * Deterministic history slice intended for SAGE context and UI timelines.
 * Persistence is intentionally left to the caller.
 */
export function getRecentServerChanges(
  records: ServerChangeRecord[],
  options: { serverId: string; since?: string; limit?: number }
): ServerChangeRecord[] {
  const sinceMs = options.since ? Date.parse(options.since) : Number.NEGATIVE_INFINITY;
  const limit = Math.max(1, options.limit ?? 50);

  return records
    .filter((record) => record.serverId === options.serverId)
    .filter((record) => Date.parse(record.timestamp) >= sinceMs)
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
    .slice(0, limit);
}
