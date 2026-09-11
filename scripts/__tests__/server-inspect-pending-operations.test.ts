/**
 * Test Suite: inspect pendingOperations wiring (SRV-3 / T1.3)
 */

import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { startSftpFixture, fixtureJar } from "./fixtures/sftpFixture";
import { inspectServer } from "@/lib/server/inspectServer";
import type { InspectServerRequest } from "@/lib/server/inspectSchema";
import { createServerSnapshotStore } from "@/lib/server/snapshotStoreFactory";
import { REMOTE_SERVER_INSTANCE_ID } from "@/lib/server/serverIdentity";
import { deployServer } from "@/lib/server/deployServer";

function validInput(connection: InspectServerRequest["connection"]): InspectServerRequest {
  return {
    project: { name: "Fixture", version: "1.20.1", loader: "fabric" },
    runtime: { minecraftVersion: "1.20.1", loader: "fabric" },
    connection,
  };
}

async function prepareBuild(buildsBase: string): Promise<void> {
  const mods = path.join(buildsBase, "Fixture_allhost", "mods");
  await fs.mkdir(mods, { recursive: true });
  await fs.writeFile(path.join(mods, "example.jar"), fixtureJar("example", "2.0.0"));
  await fs.writeFile(path.join(mods, "missing.jar"), fixtureJar("missing", "1.0.0"));
}

async function withPortableDir<T>(run: (portableDir: string) => Promise<T>): Promise<T> {
  const portableDir = await fs.mkdtemp(path.join(os.tmpdir(), "mim-inspect-pending-portable-"));
  const portableBefore = process.env.MIM_PORTABLE_DIR;
  process.env.MIM_PORTABLE_DIR = portableDir;
  try {
    return await run(portableDir);
  } finally {
    await fs.rm(portableDir, { recursive: true, force: true });
    if (portableBefore === undefined) delete process.env.MIM_PORTABLE_DIR;
    else process.env.MIM_PORTABLE_DIR = portableBefore;
  }
}

async function testInspectSurfacesSeededPending(): Promise<void> {
  const fixture = await startSftpFixture();
  const buildsBase = await fs.mkdtemp(path.join(os.tmpdir(), "mim-inspect-pending-builds-"));
  const signal = () => AbortSignal.timeout(30000);
  const input = validInput(fixture.connection);
  try {
    await prepareBuild(buildsBase);
    await withPortableDir(async () => {
      const store = createServerSnapshotStore();
      await store.saveSnapshot({
        snapshotId: "snap-open-test",
        serverId: REMOTE_SERVER_INSTANCE_ID,
        operationId: "op-open-test",
        createdAt: "2026-09-11T08:00:00.000Z",
        status: "active",
        observedManifestFingerprint: "obs",
        desiredManifestFingerprint: "des",
        entries: [],
      });
      const withPending = await inspectServer(input, buildsBase, signal());
      assert.equal(withPending.pendingOperations, 1);
    });
  } finally {
    await fixture.close();
    await fs.rm(buildsBase, { recursive: true, force: true });
  }
  console.log("✔ inspect exposes pendingOperations from durable store");
}

async function testDeployClosesItsSnapshot(): Promise<void> {
  const fixture = await startSftpFixture();
  const buildsBase = await fs.mkdtemp(path.join(os.tmpdir(), "mim-inspect-pending-builds-"));
  const signal = () => AbortSignal.timeout(30000);
  const input = validInput(fixture.connection);
  try {
    await prepareBuild(buildsBase);
    await withPortableDir(async () => {
      await deployServer({ ...input, confirm: true }, buildsBase, signal());
      const afterDeploy = await inspectServer(input, buildsBase, signal());
      assert.equal(afterDeploy.pendingOperations, 0);
    });
  } finally {
    await fixture.close();
    await fs.rm(buildsBase, { recursive: true, force: true });
  }
  console.log("✔ successful deploy closes active snapshots and clears pendingOperations");
}

async function run(): Promise<void> {
  await testInspectSurfacesSeededPending();
  await testDeployClosesItsSnapshot();
  console.log("\nAll inspect pendingOperations tests passed successfully!");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
