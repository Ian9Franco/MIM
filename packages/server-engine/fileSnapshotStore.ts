import { randomBytes } from "node:crypto";
import {
  mkdir,
  readdir,
  readFile,
  rename,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import type {
  ServerChangeRecord,
  ServerSnapshot,
  SnapshotEntry,
  SnapshotStatus,
} from "@mim/contracts-core/server";
import type { ISnapshotStore } from "./snapshotStore";

const SNAPSHOTS_DIR = "snapshots";
const JOURNAL_DIR = "journal";
const SAFE_ID = /^[A-Za-z0-9._-]+$/;
const SNAPSHOT_STATUSES = new Set<SnapshotStatus>(["active", "restored", "discarded"]);

interface StoredSnapshotEntry {
  relativePath: string;
  action: SnapshotEntry["action"];
  originalSha256?: string;
  backupBlobBase64?: string;
  sizeBytes?: number;
}

interface StoredSnapshot extends Omit<ServerSnapshot, "entries"> {
  entries: StoredSnapshotEntry[];
}

/**
 * Disk-backed snapshot and change journal store.
 *
 * Layout:
 *   <root>/snapshots/<snapshotId>.json
 *   <root>/journal/<serverId>.ndjson
 *
 * Writes go to a sibling `.tmp` file and then `rename` into place.
 */
export class FileSnapshotStore implements ISnapshotStore {
  constructor(private readonly rootDir: string) {}

  async saveSnapshot(snapshot: ServerSnapshot): Promise<void> {
    assertSafeId(snapshot.snapshotId, "snapshotId");
    assertSafeId(snapshot.serverId, "serverId");
    const filePath = this.snapshotPath(snapshot.snapshotId);
    await atomicWriteFile(filePath, JSON.stringify(toStoredSnapshot(snapshot)));
  }

  async getSnapshot(snapshotId: string): Promise<ServerSnapshot | null> {
    assertSafeId(snapshotId, "snapshotId");
    return readSnapshotFile(this.snapshotPath(snapshotId));
  }

  async listSnapshots(serverId: string): Promise<ServerSnapshot[]> {
    assertSafeId(serverId, "serverId");
    const dir = path.join(this.rootDir, SNAPSHOTS_DIR);
    let names: string[];
    try {
      names = await readdir(dir);
    } catch (error) {
      if (isEnoent(error)) return [];
      throw error;
    }

    const snapshots: ServerSnapshot[] = [];
    for (const name of names) {
      if (!name.endsWith(".json") || name.endsWith(".tmp")) continue;
      const snapshot = await readSnapshotFile(path.join(dir, name));
      if (snapshot && snapshot.serverId === serverId) {
        snapshots.push(snapshot);
      }
    }

    return snapshots.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async updateSnapshotStatus(snapshotId: string, status: SnapshotStatus): Promise<void> {
    const snapshot = await this.getSnapshot(snapshotId);
    if (!snapshot) return;
    snapshot.status = status;
    await this.saveSnapshot(snapshot);
  }

  async recordChange(record: ServerChangeRecord): Promise<void> {
    assertSafeId(record.serverId, "serverId");
    const filePath = this.journalPath(record.serverId);
    let existing = "";
    try {
      existing = await readFile(filePath, "utf8");
    } catch (error) {
      if (!isEnoent(error)) throw error;
    }
    const prefix = existing.length === 0 || existing.endsWith("\n") ? existing : `${existing}\n`;
    await atomicWriteFile(filePath, `${prefix}${JSON.stringify(record)}\n`);
  }

  async getChangeHistory(serverId: string): Promise<ServerChangeRecord[]> {
    assertSafeId(serverId, "serverId");
    let raw: string;
    try {
      raw = await readFile(this.journalPath(serverId), "utf8");
    } catch (error) {
      if (isEnoent(error)) return [];
      throw error;
    }

    const records: ServerChangeRecord[] = [];
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const parsed: unknown = JSON.parse(trimmed);
        if (isChangeRecord(parsed) && parsed.serverId === serverId) {
          records.push(parsed);
        }
      } catch {
        // Skip corrupt journal lines; the rest of the history remains readable.
      }
    }

    return records.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  private snapshotPath(snapshotId: string): string {
    return path.join(this.rootDir, SNAPSHOTS_DIR, `${snapshotId}.json`);
  }

  private journalPath(serverId: string): string {
    return path.join(this.rootDir, JOURNAL_DIR, `${serverId}.ndjson`);
  }
}

function assertSafeId(value: string, label: string): void {
  if (!value || !SAFE_ID.test(value) || value.includes("..")) {
    throw new Error(`Invalid ${label} for snapshot store path: ${value}`);
  }
}

async function atomicWriteFile(targetPath: string, contents: string): Promise<void> {
  await mkdir(path.dirname(targetPath), { recursive: true });
  const tmpPath = `${targetPath}.${process.pid}.${randomBytes(6).toString("hex")}.tmp`;
  try {
    await writeFile(tmpPath, contents, "utf8");
    try {
      await rename(tmpPath, targetPath);
    } catch (error) {
      const code = errorCode(error);
      if (code === "EEXIST" || code === "EPERM" || code === "EACCES") {
        await unlink(targetPath);
        await rename(tmpPath, targetPath);
        return;
      }
      throw error;
    }
  } catch (error) {
    await unlink(tmpPath).catch(() => undefined);
    throw error;
  }
}

async function readSnapshotFile(filePath: string): Promise<ServerSnapshot | null> {
  let raw: string;
  try {
    raw = await readFile(filePath, "utf8");
  } catch (error) {
    if (isEnoent(error)) return null;
    throw error;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    return fromStoredSnapshot(parsed);
  } catch {
    return null;
  }
}

function toStoredSnapshot(snapshot: ServerSnapshot): StoredSnapshot {
  return {
    ...snapshot,
    entries: snapshot.entries.map((entry) => ({
      relativePath: entry.relativePath,
      action: entry.action,
      originalSha256: entry.originalSha256,
      sizeBytes: entry.sizeBytes,
      backupBlobBase64:
        entry.backupBlob && entry.backupBlob.byteLength > 0
          ? Buffer.from(entry.backupBlob).toString("base64")
          : undefined,
    })),
  };
}

function fromStoredSnapshot(value: unknown): ServerSnapshot | null {
  if (!isRecord(value)) return null;
  if (typeof value.snapshotId !== "string" || typeof value.serverId !== "string") return null;
  if (typeof value.operationId !== "string" || typeof value.createdAt !== "string") return null;
  if (typeof value.observedManifestFingerprint !== "string") return null;
  if (typeof value.desiredManifestFingerprint !== "string") return null;
  if (typeof value.status !== "string" || !SNAPSHOT_STATUSES.has(value.status as SnapshotStatus)) {
    return null;
  }
  if (!Array.isArray(value.entries)) return null;

  const entries: SnapshotEntry[] = [];
  for (const entry of value.entries) {
    const decoded = fromStoredEntry(entry);
    if (!decoded) return null;
    entries.push(decoded);
  }

  const snapshot: ServerSnapshot = {
    snapshotId: value.snapshotId,
    serverId: value.serverId,
    operationId: value.operationId,
    createdAt: value.createdAt,
    status: value.status as SnapshotStatus,
    observedManifestFingerprint: value.observedManifestFingerprint,
    desiredManifestFingerprint: value.desiredManifestFingerprint,
    entries,
  };

  if (value.metadata && isRecord(value.metadata)) {
    snapshot.metadata = value.metadata as ServerSnapshot["metadata"];
  }

  return snapshot;
}

function fromStoredEntry(value: unknown): SnapshotEntry | null {
  if (!isRecord(value)) return null;
  if (typeof value.relativePath !== "string") return null;
  if (value.action !== "existed" && value.action !== "created") return null;

  const entry: SnapshotEntry = {
    relativePath: value.relativePath,
    action: value.action,
  };

  if (typeof value.originalSha256 === "string") entry.originalSha256 = value.originalSha256;
  if (typeof value.sizeBytes === "number") entry.sizeBytes = value.sizeBytes;
  if (typeof value.backupBlobBase64 === "string") {
    entry.backupBlob = Uint8Array.from(Buffer.from(value.backupBlobBase64, "base64"));
  }

  return entry;
}

function isChangeRecord(value: unknown): value is ServerChangeRecord {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.serverId === "string" &&
    typeof value.type === "string" &&
    typeof value.timestamp === "string" &&
    typeof value.summary === "string"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEnoent(error: unknown): boolean {
  return errorCode(error) === "ENOENT";
}

function errorCode(error: unknown): string | null {
  if (typeof error === "object" && error !== null && "code" in error && typeof error.code === "string") {
    return error.code;
  }
  return null;
}
