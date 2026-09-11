/**
 * Test Suite: FileSnapshotStore durable persistence (SRV-3 / T1.1)
 */

import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { ServerChangeRecord, ServerSnapshot } from "@mim/contracts-core/server";
import { FileSnapshotStore } from "@mim/server-engine/fileSnapshotStore";

function snapshot(partial: Partial<ServerSnapshot> & Pick<ServerSnapshot, "snapshotId" | "serverId" | "createdAt">): ServerSnapshot {
  return {
    operationId: partial.operationId ?? `op-${partial.snapshotId}`,
    status: partial.status ?? "active",
    observedManifestFingerprint: partial.observedManifestFingerprint ?? "obs-fp",
    desiredManifestFingerprint: partial.desiredManifestFingerprint ?? "des-fp",
    entries: partial.entries ?? [],
    metadata: partial.metadata,
    ...partial,
  };
}

function change(
  partial: Partial<ServerChangeRecord> & Pick<ServerChangeRecord, "id" | "serverId" | "timestamp">
): ServerChangeRecord {
  return {
    type: partial.type ?? "snapshot-created",
    summary: partial.summary ?? `change ${partial.id}`,
    ...partial,
  };
}

async function withStore<T>(run: (store: FileSnapshotStore, root: string) => Promise<T>): Promise<T> {
  const root = await mkdtemp(path.join(os.tmpdir(), "mim-snap-"));
  try {
    return await run(new FileSnapshotStore(root), root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function testSaveAndRead(): Promise<void> {
  await withStore(async (store) => {
    const blob = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
    const saved = snapshot({
      snapshotId: "snap-alpha",
      serverId: "srv-one",
      createdAt: "2026-09-11T12:00:00.000Z",
      entries: [
        {
          relativePath: "mods/example.jar",
          action: "existed",
          originalSha256: "abc",
          backupBlob: blob,
          sizeBytes: blob.byteLength,
        },
      ],
      metadata: { note: "pre-mutation" },
    });

    await store.saveSnapshot(saved);
    const loaded = await store.getSnapshot("snap-alpha");
    assert.ok(loaded);
    assert.equal(loaded.snapshotId, "snap-alpha");
    assert.equal(loaded.serverId, "srv-one");
    assert.equal(loaded.status, "active");
    assert.equal(loaded.entries.length, 1);
    assert.deepEqual(Array.from(loaded.entries[0].backupBlob ?? []), [0x50, 0x4b, 0x03, 0x04]);
    assert.equal(loaded.metadata?.note, "pre-mutation");
    assert.equal(await store.getSnapshot("missing-id"), null);
  });

  console.log("✔ save/read round-trip (including backupBlob) passed");
}

async function testListSortedByCreatedAt(): Promise<void> {
  await withStore(async (store) => {
    await store.saveSnapshot(snapshot({ snapshotId: "snap-old", serverId: "srv-one", createdAt: "2026-01-01T00:00:00.000Z" }));
    await store.saveSnapshot(snapshot({ snapshotId: "snap-new", serverId: "srv-one", createdAt: "2026-09-01T00:00:00.000Z" }));
    await store.saveSnapshot(snapshot({ snapshotId: "snap-mid", serverId: "srv-one", createdAt: "2026-06-01T00:00:00.000Z" }));
    await store.saveSnapshot(snapshot({ snapshotId: "snap-other", serverId: "srv-two", createdAt: "2026-12-01T00:00:00.000Z" }));

    const listed = await store.listSnapshots("srv-one");
    assert.deepEqual(
      listed.map((item) => item.snapshotId),
      ["snap-new", "snap-mid", "snap-old"]
    );
  });

  console.log("✔ listSnapshots sorts by createdAt desc and isolates serverId");
}

async function testUpdateStatus(): Promise<void> {
  await withStore(async (store) => {
    await store.saveSnapshot(snapshot({ snapshotId: "snap-status", serverId: "srv-one", createdAt: "2026-09-11T00:00:00.000Z" }));
    await store.updateSnapshotStatus("snap-status", "discarded");
    const updated = await store.getSnapshot("snap-status");
    assert.equal(updated?.status, "discarded");
    await store.updateSnapshotStatus("does-not-exist", "restored");
  });

  console.log("✔ updateSnapshotStatus persisted");
}

async function testJournalAppend(): Promise<void> {
  await withStore(async (store) => {
    await store.recordChange(change({ id: "chg-1", serverId: "srv-one", timestamp: "2026-09-11T10:00:00.000Z", summary: "first" }));
    await store.recordChange(change({ id: "chg-2", serverId: "srv-one", timestamp: "2026-09-11T11:00:00.000Z", summary: "second" }));
    await store.recordChange(change({ id: "chg-other", serverId: "srv-two", timestamp: "2026-09-11T12:00:00.000Z" }));

    const history = await store.getChangeHistory("srv-one");
    assert.deepEqual(
      history.map((item) => item.id),
      ["chg-2", "chg-1"]
    );
    assert.equal(history[0].summary, "second");
  });

  console.log("✔ journal append and newest-first history passed");
}

async function testReopenReadsPersistedState(): Promise<void> {
  await withStore(async (store, root) => {
    await store.saveSnapshot(
      snapshot({
        snapshotId: "snap-reopen",
        serverId: "srv-one",
        createdAt: "2026-09-11T08:00:00.000Z",
        status: "active",
      })
    );
    await store.recordChange(
      change({ id: "chg-reopen", serverId: "srv-one", timestamp: "2026-09-11T08:01:00.000Z", summary: "persisted" })
    );

    const reopened = new FileSnapshotStore(root);
    const loaded = await reopened.getSnapshot("snap-reopen");
    assert.equal(loaded?.snapshotId, "snap-reopen");
    assert.equal(loaded?.status, "active");
    const history = await reopened.getChangeHistory("srv-one");
    assert.equal(history.length, 1);
    assert.equal(history[0].id, "chg-reopen");
  });

  console.log("✔ reopen on the same folder reads persisted snapshots and journal");
}

async function testCorruptSnapshotReturnsNull(): Promise<void> {
  await withStore(async (store, root) => {
    const snapshotsDir = path.join(root, "snapshots");
    await mkdir(snapshotsDir, { recursive: true });
    await writeFile(path.join(snapshotsDir, "snap-corrupt.json"), "{not-json", "utf8");
    await writeFile(path.join(snapshotsDir, "snap-invalid.json"), JSON.stringify({ snapshotId: "snap-invalid" }), "utf8");

    assert.equal(await store.getSnapshot("snap-corrupt"), null);
    assert.equal(await store.getSnapshot("snap-invalid"), null);

    await store.saveSnapshot(snapshot({ snapshotId: "snap-ok", serverId: "srv-one", createdAt: "2026-09-11T00:00:00.000Z" }));
    const listed = await store.listSnapshots("srv-one");
    assert.deepEqual(
      listed.map((item) => item.snapshotId),
      ["snap-ok"]
    );
  });

  console.log("✔ corrupt snapshot files return null and do not throw");
}

async function run(): Promise<void> {
  console.log("Starting FileSnapshotStore durable persistence suite...");
  await testSaveAndRead();
  await testListSortedByCreatedAt();
  await testUpdateStatus();
  await testJournalAppend();
  await testReopenReadsPersistedState();
  await testCorruptSnapshotReturnsNull();
  console.log("\nAll FileSnapshotStore tests passed successfully!");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
