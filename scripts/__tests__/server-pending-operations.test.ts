/**
 * Test Suite: pending server operation detection after restart (SRV-3 / T1.2)
 */

import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { ServerChangeRecord, ServerSnapshot } from "@mim/contracts-core/server";
import { FileSnapshotStore } from "@mim/server-engine/fileSnapshotStore";
import {
  isTerminalSnapshotStatus,
  loadPendingServerOperations,
  resolvePendingServerOperations,
  TERMINAL_SNAPSHOT_STATUSES,
} from "@mim/server-engine/pendingOperations";
import { MemorySnapshotStore } from "@mim/server-engine/snapshotStore";

function snapshot(
  partial: Partial<ServerSnapshot> & Pick<ServerSnapshot, "snapshotId" | "serverId" | "createdAt" | "status">
): ServerSnapshot {
  return {
    operationId: partial.operationId ?? `op-${partial.snapshotId}`,
    observedManifestFingerprint: partial.observedManifestFingerprint ?? "obs-fp",
    desiredManifestFingerprint: partial.desiredManifestFingerprint ?? "des-fp",
    entries: partial.entries ?? [],
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

async function testTerminalStatusHelpers(): Promise<void> {
  assert.deepEqual(TERMINAL_SNAPSHOT_STATUSES, ["restored", "discarded"]);
  assert.equal(isTerminalSnapshotStatus("active"), false);
  assert.equal(isTerminalSnapshotStatus("restored"), true);
  assert.equal(isTerminalSnapshotStatus("discarded"), true);
  console.log("✔ terminal snapshot status helpers passed");
}

async function testResolveIgnoresClosedSnapshots(): Promise<void> {
  const snapshots = [
    snapshot({
      snapshotId: "snap-open",
      serverId: "srv-one",
      createdAt: "2026-09-11T12:00:00.000Z",
      status: "active",
    }),
    snapshot({
      snapshotId: "snap-restored",
      serverId: "srv-one",
      createdAt: "2026-09-11T13:00:00.000Z",
      status: "restored",
    }),
    snapshot({
      snapshotId: "snap-discarded",
      serverId: "srv-one",
      createdAt: "2026-09-11T14:00:00.000Z",
      status: "discarded",
    }),
    snapshot({
      snapshotId: "snap-other-server",
      serverId: "srv-two",
      createdAt: "2026-09-11T15:00:00.000Z",
      status: "active",
    }),
  ];

  const history = [
    change({
      id: "chg-latest",
      serverId: "srv-one",
      timestamp: "2026-09-11T16:00:00.000Z",
      summary: "last known change",
    }),
    change({
      id: "chg-old",
      serverId: "srv-one",
      timestamp: "2026-09-11T10:00:00.000Z",
    }),
  ];

  const resolved = resolvePendingServerOperations("srv-one", snapshots, history);
  assert.equal(resolved.pendingOperationCount, 1);
  assert.deepEqual(resolved.openSnapshots.map((item) => item.snapshotId), ["snap-open"]);
  assert.equal(resolved.latestChange?.id, "chg-latest");
  console.log("✔ resolvePendingServerOperations filters active snapshots only");
}

async function testResolveSortsOpenSnapshotsNewestFirst(): Promise<void> {
  const snapshots = [
    snapshot({
      snapshotId: "snap-old",
      serverId: "srv-one",
      createdAt: "2026-01-01T00:00:00.000Z",
      status: "active",
    }),
    snapshot({
      snapshotId: "snap-new",
      serverId: "srv-one",
      createdAt: "2026-09-01T00:00:00.000Z",
      status: "active",
    }),
  ];

  const resolved = resolvePendingServerOperations("srv-one", snapshots, []);
  assert.deepEqual(
    resolved.openSnapshots.map((item) => item.snapshotId),
    ["snap-new", "snap-old"]
  );
  assert.equal(resolved.pendingOperationCount, 2);
  assert.equal(resolved.latestChange, null);
  console.log("✔ open snapshots are sorted newest-first");
}

async function testLoadFromMemoryStore(): Promise<void> {
  const store = new MemorySnapshotStore();
  const open = snapshot({
    snapshotId: "snap-memory",
    serverId: "srv-one",
    createdAt: "2026-09-11T08:00:00.000Z",
    status: "active",
  });
  await store.saveSnapshot(open);
  await store.saveSnapshot(
    snapshot({
      snapshotId: "snap-closed",
      serverId: "srv-one",
      createdAt: "2026-09-11T09:00:00.000Z",
      status: "discarded",
    })
  );
  await store.recordChange(
    change({
      id: "chg-memory",
      serverId: "srv-one",
      timestamp: "2026-09-11T08:01:00.000Z",
      summary: "deploy interrupted",
    })
  );

  const loaded = await loadPendingServerOperations(store, "srv-one");
  assert.equal(loaded.pendingOperationCount, 1);
  assert.equal(loaded.openSnapshots[0]?.snapshotId, "snap-memory");
  assert.equal(loaded.latestChange?.summary, "deploy interrupted");
  console.log("✔ loadPendingServerOperations reads memory store state");
}

async function testLoadSurvivesReopen(): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "mim-pending-"));
  try {
    const store = new FileSnapshotStore(root);
    await store.saveSnapshot(
      snapshot({
        snapshotId: "snap-reopen",
        serverId: "srv-one",
        createdAt: "2026-09-11T08:00:00.000Z",
        status: "active",
      })
    );
    await store.recordChange(
      change({
        id: "chg-reopen",
        serverId: "srv-one",
        timestamp: "2026-09-11T08:02:00.000Z",
        summary: "process restarted",
      })
    );

    const reopened = await loadPendingServerOperations(new FileSnapshotStore(root), "srv-one");
    assert.equal(reopened.pendingOperationCount, 1);
    assert.equal(reopened.openSnapshots[0]?.snapshotId, "snap-reopen");
    assert.equal(reopened.latestChange?.id, "chg-reopen");
  } finally {
    await rm(root, { recursive: true, force: true });
  }

  console.log("✔ pending operation detection survives store reopen");
}

async function run(): Promise<void> {
  console.log("Starting pending server operation detection suite...");
  await testTerminalStatusHelpers();
  await testResolveIgnoresClosedSnapshots();
  await testResolveSortsOpenSnapshotsNewestFirst();
  await testLoadFromMemoryStore();
  await testLoadSurvivesReopen();
  console.log("\nAll pending operation detection tests passed successfully!");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
