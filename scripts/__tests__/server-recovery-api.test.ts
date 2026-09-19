import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { loadServerRecoveryState } from "@/lib/server/recoveryServer";
import { createServerSnapshotStore } from "@/lib/server/snapshotStoreFactory";
import { REMOTE_SERVER_INSTANCE_ID } from "@/lib/server/serverIdentity";

async function withPortableDir<T>(run: () => Promise<T>): Promise<T> {
  const portableDir = await fs.mkdtemp(path.join(os.tmpdir(), "mim-recovery-portable-"));
  const portableBefore = process.env.MIM_PORTABLE_DIR;
  process.env.MIM_PORTABLE_DIR = portableDir;
  try {
    return await run();
  } finally {
    await fs.rm(portableDir, { recursive: true, force: true });
    if (portableBefore === undefined) delete process.env.MIM_PORTABLE_DIR;
    else process.env.MIM_PORTABLE_DIR = portableBefore;
  }
}

async function run() {
  const { GET } = await import("@/app/api/server/recovery/route");
  const runtimeBefore = process.env.MIM_DESKTOP_RUNTIME;
  process.env.MIM_DESKTOP_RUNTIME = "1";
  try {
    const denied = await GET(
      new Request("http://127.0.0.1:3101/api/server/recovery", {
        headers: { host: "127.0.0.1:3101", origin: "https://untrusted.example" },
      })
    );
    assert.equal(denied.status, 403);
  } finally {
    if (runtimeBefore === undefined) delete process.env.MIM_DESKTOP_RUNTIME;
    else process.env.MIM_DESKTOP_RUNTIME = runtimeBefore;
  }

  await withPortableDir(async () => {
    const store = createServerSnapshotStore();
    await store.saveSnapshot({
      snapshotId: "snap-recovery-test",
      serverId: REMOTE_SERVER_INSTANCE_ID,
      operationId: "op-recovery-test",
      createdAt: "2026-09-19T12:00:00.000Z",
      status: "active",
      observedManifestFingerprint: "obs",
      desiredManifestFingerprint: "des",
      entries: [{ relativePath: "mods/example.jar", action: "existed", originalSha256: "abc" }],
    });
    const pending = await loadServerRecoveryState();
    assert.equal(pending.pendingOperationCount, 1);
    assert.equal(pending.openSnapshots[0]?.snapshotId, "snap-recovery-test");
    assert.equal(pending.openSnapshots[0]?.entries.length, 1);
  });

  console.log("✓ recovery API state exposes open snapshot details");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
