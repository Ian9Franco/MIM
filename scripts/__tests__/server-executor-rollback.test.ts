/**
 * Test Suite: Server Deployment Executor & Deterministic Rollback (SRV-4)
 */

import assert from "node:assert/strict";
import crypto from "node:crypto";
import type {
  WritableFileTransport,
  RemoteFileEntry,
  ReconciliationPlan,
} from "@mim/contracts-core/server";
import type { InstanceManifest, ModArtifact } from "@mim/contracts-core/instances";
import { executeServerDeployment, isServerDeploymentLocked } from "@mim/server-engine/executor";
import { executeRollback } from "@mim/server-engine/rollback";
import { MemorySnapshotStore } from "@mim/server-engine/snapshotStore";

class MemoryWritableTransport implements WritableFileTransport {
  public files = new Map<string, Uint8Array>();
  public failOnWrite: string | null = null;

  async list(remotePath: string): Promise<RemoteFileEntry[]> {
    const entries: RemoteFileEntry[] = [];
    for (const [filePath, content] of this.files.entries()) {
      if (filePath.startsWith(remotePath)) {
        entries.push({
          path: filePath,
          name: filePath.split("/").pop() || filePath,
          kind: "file",
          size: content.length,
        });
      }
    }
    return entries;
  }

  async read(remotePath: string): Promise<Uint8Array> {
    const content = this.files.get(remotePath);
    if (!content) throw new Error(`File not found: ${remotePath}`);
    return content;
  }

  async write(remotePath: string, content: Uint8Array): Promise<void> {
    if (this.failOnWrite && remotePath.includes(this.failOnWrite)) {
      throw new Error(`Simulated I/O failure on writing ${remotePath}`);
    }
    this.files.set(remotePath, content);
  }

  async remove(remotePath: string): Promise<void> {
    this.files.delete(remotePath);
  }

  async move(from: string, to: string): Promise<void> {
    const content = this.files.get(from);
    if (!content) throw new Error(`Source not found for move: ${from}`);
    this.files.set(to, content);
    this.files.delete(from);
  }

  async stat(remotePath: string): Promise<RemoteFileEntry | null> {
    const content = this.files.get(remotePath);
    if (!content) return null;
    return {
      path: remotePath,
      name: remotePath.split("/").pop() || remotePath,
      kind: "file",
      size: content.length,
    };
  }
}

function createDummyArtifact(overrides: Partial<ModArtifact> = {}): ModArtifact {
  return {
    fileName: overrides.fileName || "mod.jar",
    modId: overrides.modId || "mod",
    modName: overrides.modName || "Mod",
    modVersion: overrides.modVersion || "1.0.0",
    minecraftVersion: overrides.minecraftVersion || "1.20.1",
    loader: overrides.loader || "fabric",
    projectType: "mod",
    hashes: overrides.hashes || {},
    environment: overrides.environment || { client: "required", server: "required" },
    dependencies: [],
    conflicts: [],
    providedIds: [],
    mixinTargets: [],
    source: { kind: "remote" },
  };
}

function createDummyManifest(overrides: Partial<InstanceManifest> = {}): InstanceManifest {
  return {
    schemaVersion: 1,
    instanceId: overrides.instanceId || "instance-1",
    side: overrides.side || "server",
    minecraftVersion: overrides.minecraftVersion || "1.20.1",
    loader: overrides.loader || "fabric",
    mods: overrides.mods || [],
    configs: overrides.configs || [],
    generatedAt: new Date().toISOString(),
    metadata: overrides.metadata,
  };
}

async function runTests() {
  console.log("▶ Running SRV-4 Deployment Executor & Rollback Tests...");

  // Test 1: Successful Deployment with Staging and Verification
  {
    const transport = new MemoryWritableTransport();
    const snapshotStore = new MemorySnapshotStore();

    const observedManifest = createDummyManifest({ instanceId: "srv-remote-1" });
    const desiredManifest = createDummyManifest({ instanceId: "cli-1" });

    const newModPayload = new TextEncoder().encode("dummy jar content v1");
    const modSha256 = crypto.createHash("sha256").update(newModPayload).digest("hex");

    const plan: ReconciliationPlan = {
      desiredInstanceId: "cli-1",
      actualInstanceId: "srv-remote-1",
      blocked: false,
      blockReasons: [],
      requiresSnapshot: true,
      actions: [
        {
          type: "install",
          identity: "fabric-api",
          targetPath: "mods/fabric-api-0.90.0.jar",
          desired: createDummyArtifact({
            fileName: "fabric-api-0.90.0.jar",
            modId: "fabric-api",
            modName: "Fabric API",
            hashes: { sha256: modSha256 },
          }),
          reason: "Missing on remote",
          destructive: false,
        },
      ],
    };

    const report = await executeServerDeployment(
      transport,
      plan,
      desiredManifest,
      observedManifest,
      snapshotStore,
      async () => newModPayload,
      { verifyHashes: true }
    );

    assert.equal(report.status, "completed", "Deployment should complete successfully");
    assert.equal(report.appliedActions, 1, "Should apply 1 action");
    assert.ok(transport.files.has("mods/fabric-api-0.90.0.jar"), "Mod must be present in mods folder");
    assert.equal(isServerDeploymentLocked("srv-remote-1"), false, "Lock must be released");
    console.log("  ✓ Test 1: Successful atomic deployment passed");
  }

  // Test 2: Injected Failure Triggers Automatic Rollback
  {
    const transport = new MemoryWritableTransport();
    const snapshotStore = new MemorySnapshotStore();

    const existingMod = new TextEncoder().encode("original jei content");
    const existingSha256 = crypto.createHash("sha256").update(existingMod).digest("hex");
    transport.files.set("mods/jei-15.0.0.jar", existingMod);

    const observedManifest = createDummyManifest({
      instanceId: "srv-remote-2",
      mods: [
        createDummyArtifact({
          fileName: "jei-15.0.0.jar",
          modId: "jei",
          modName: "Just Enough Items",
          hashes: { sha256: existingSha256 },
        }),
      ],
    });
    const desiredManifest = createDummyManifest({ instanceId: "cli-2" });

    const plan: ReconciliationPlan = {
      desiredInstanceId: "cli-2",
      actualInstanceId: "srv-remote-2",
      blocked: false,
      blockReasons: [],
      requiresSnapshot: true,
      actions: [
        {
          type: "replace",
          identity: "jei",
          targetPath: "mods/jei-15.0.0.jar",
          desired: createDummyArtifact({
            fileName: "jei-15.0.0.jar",
            modId: "jei",
            modName: "Just Enough Items",
          }),
          reason: "Version update",
          destructive: true,
        },
        {
          type: "install",
          identity: "bad-mod",
          targetPath: "mods/bad-mod.jar",
          desired: createDummyArtifact({
            fileName: "bad-mod.jar",
            modId: "bad-mod",
            modName: "Bad Mod",
          }),
          reason: "New mod",
          destructive: false,
        },
      ],
    };

    // Simulate failure when writing bad-mod
    transport.failOnWrite = "bad-mod";

    const report = await executeServerDeployment(
      transport,
      plan,
      desiredManifest,
      observedManifest,
      snapshotStore,
      async (id) => new TextEncoder().encode(`payload for ${id}`),
      { autoRollbackOnError: true }
    );

    assert.equal(report.status, "rolled-back", "Status must be rolled-back on failure");
    assert.ok(transport.files.has("mods/jei-15.0.0.jar"), "Original mod must be restored by rollback");
    const restoredContent = transport.files.get("mods/jei-15.0.0.jar");
    assert.deepEqual(restoredContent, existingMod, "Content must match pre-mutation snapshot");
    assert.equal(isServerDeploymentLocked("srv-remote-2"), false, "Lock must be released");
    console.log("  ✓ Test 2: Injected failure triggers automatic rollback and restores files");
  }

  // Test 3: Standalone executeRollback verifies hash integrity
  {
    const transport = new MemoryWritableTransport();
    const originalData = new TextEncoder().encode("server.properties original");
    const originalSha = crypto.createHash("sha256").update(originalData).digest("hex");

    const snapshot = {
      snapshotId: "snap-manual-1",
      serverId: "srv-3",
      operationId: "op-manual",
      createdAt: new Date().toISOString(),
      status: "active" as const,
      observedManifestFingerprint: "abc",
      desiredManifestFingerprint: "def",
      entries: [
        {
          relativePath: "server.properties",
          action: "existed" as const,
          originalSha256: originalSha,
          backupBlob: originalData,
        },
        {
          relativePath: "mods/newly-added.jar",
          action: "created" as const,
        },
      ],
    };

    transport.files.set("server.properties", new TextEncoder().encode("mutated corrupted text"));
    transport.files.set("mods/newly-added.jar", new TextEncoder().encode("unwanted"));

    const result = await executeRollback(transport, snapshot, { verifyHashes: true });
    assert.equal(result.success, true, "Rollback must succeed");
    assert.equal(result.restoredEntries, 1, "Restored 1 entry");
    assert.equal(result.deletedEntries, 1, "Deleted 1 entry");
    assert.equal(transport.files.has("mods/newly-added.jar"), false, "Created file must be removed");
    assert.deepEqual(transport.files.get("server.properties"), originalData, "Properties must be restored");
    console.log("  ✓ Test 3: Standalone executeRollback verified");
  }

  console.log("✔ SRV-4 Deployment Executor & Rollback Tests passed successfully!\n");
}

runTests().catch((err) => {
  console.error("❌ SRV-4 Tests failed:", err);
  process.exit(1);
});
