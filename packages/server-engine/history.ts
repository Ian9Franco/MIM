import type { ServerChangeRecord } from "@mim/contracts-core/server";

export * from "@mim/contracts-core/server";

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

export class ServerChangeLog {
  private records: ServerChangeRecord[] = [];

  record(entry: Omit<ServerChangeRecord, "id" | "timestamp">): ServerChangeRecord {
    const record: ServerChangeRecord = {
      ...entry,
      id: `change-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
    };
    this.records.push(record);
    return record;
  }

  getByServer(serverId: string): ServerChangeRecord[] {
    return this.records
      .filter((r) => r.serverId === serverId)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  clear(): void {
    this.records = [];
  }
}
