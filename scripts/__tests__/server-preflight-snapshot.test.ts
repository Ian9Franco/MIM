import assert from "node:assert/strict";
import crypto from "node:crypto";
import type { InstanceManifest, ModArtifact, ConfigArtifact } from "@mim/contracts-core/instances";
import type { ReadOnlyFileTransport, RemoteFileEntry } from "@mim/contracts-core/server";
import {
  runServerPreflight,
  computeManifestFingerprint,
  buildReconciliationPlan,
  createPreMutationSnapshot,
  validatePlanFreshness,
  MemorySnapshotStore,
} from "../../lib/server";

function createMod(partial: Partial<ModArtifact> & { fileName: string }): ModArtifact {
  return {
    fileName: partial.fileName,
    modId: partial.modId || partial.fileName.replace(/\.jar$/, ""),
    modName: partial.modName || partial.fileName,
    modVersion: partial.modVersion || "1.0.0",
    minecraftVersion: partial.minecraftVersion || "1.20.1",
    loader: partial.loader || "fabric",
    projectType: "mod",
    hashes: partial.hashes || { sha256: crypto.createHash("sha256").update(partial.fileName).digest("hex") },
    environment: partial.environment || { client: "required", server: "required" },
    dependencies: partial.dependencies || [],
    conflicts: partial.conflicts || [],
    providedIds: partial.providedIds || [],
    mixinTargets: partial.mixinTargets || [],
    source: partial.source || { kind: "local" },
  };
}

function createConfig(relativePath: string, content: string): ConfigArtifact {
  return {
    relativePath,
    hashes: { sha256: crypto.createHash("sha256").update(content).digest("hex") },
    source: { kind: "local" },
  };
}

function createManifest(
  instanceId: string,
  mods: ModArtifact[],
  configs: ConfigArtifact[] = [],
  mcVersion = "1.20.1",
  loader = "fabric"
): InstanceManifest {
  return {
    schemaVersion: 1,
    instanceId,
    side: "server",
    minecraftVersion: mcVersion,
    loader,
    mods,
    configs,
    generatedAt: new Date().toISOString(),
  };
}

class MockTransport implements ReadOnlyFileTransport {
  private files = new Map<string, Uint8Array>();

  setFile(path: string, content: string | Uint8Array): void {
    const bytes = typeof content === "string" ? new TextEncoder().encode(content) : content;
    this.files.set(path, bytes);
  }

  async list(remotePath: string): Promise<RemoteFileEntry[]> {
    const entries: RemoteFileEntry[] = [];
    for (const [filePath, content] of this.files.entries()) {
      if (filePath.startsWith(remotePath)) {
        entries.push({
          path: filePath,
          name: filePath.split("/").pop() || "",
          kind: "file",
          size: content.byteLength,
        });
      }
    }
    return entries;
  }

  async read(remotePath: string): Promise<Uint8Array> {
    const content = this.files.get(remotePath);
    if (!content) {
      throw new Error(`File not found: ${remotePath}`);
    }
    return content;
  }
}

async function testPreflightValidations(): Promise<void> {
  // Test 1: Version mismatch
  const desiredV1 = createManifest("srv-1", [createMod({ fileName: "mod-a.jar" })], [], "1.20.1", "fabric");
  const observedV2 = createManifest("srv-remote", [createMod({ fileName: "mod-a.jar" })], [], "1.20.4", "fabric");
  const reportV = runServerPreflight(desiredV1, observedV2);
  assert.equal(reportV.overallStatus, "blocked");
  assert.ok(reportV.blockReasons.some((r) => r.includes("Minecraft version mismatch")));

  // Test 2: Loader mismatch
  const desiredL1 = createManifest("srv-1", [createMod({ fileName: "mod-a.jar" })], [], "1.20.1", "fabric");
  const observedL2 = createManifest("srv-remote", [createMod({ fileName: "mod-a.jar" })], [], "1.20.1", "forge");
  const reportL = runServerPreflight(desiredL1, observedL2);
  assert.equal(reportL.overallStatus, "blocked");
  assert.ok(reportL.blockReasons.some((r) => r.includes("Mod loader mismatch")));

  // Test 3: Client-only mod rejected on server
  const clientOnlyMod = createMod({
    fileName: "sodium-extra.jar",
    modId: "sodium-extra",
    environment: { client: "required", server: "unsupported" },
  });
  const desiredWithClientOnly = createManifest("srv-1", [clientOnlyMod]);
  const observedEmpty = createManifest("srv-remote", []);
  const reportClientOnly = runServerPreflight(desiredWithClientOnly, observedEmpty);
  assert.equal(reportClientOnly.overallStatus, "blocked");
  assert.ok(reportClientOnly.blockReasons.some((r) => r.includes("Client-only mods cannot be installed")));

  // Test 4: Missing required dependency
  const modWithDep = createMod({
    fileName: "appleskin.jar",
    modId: "appleskin",
    dependencies: [{ modId: "cloth-config", type: "required" }],
  });
  const desiredMissingDep = createManifest("srv-1", [modWithDep]);
  const reportMissingDep = runServerPreflight(desiredMissingDep, observedEmpty);
  assert.equal(reportMissingDep.overallStatus, "warning");
  assert.ok(reportMissingDep.warnings.some((w) => w.includes("requires cloth-config")));

  // Test 5: Compatible clean preflight
  const clothConfig = createMod({ fileName: "cloth-config.jar", modId: "cloth-config" });
  const desiredClean = createManifest("srv-1", [modWithDep, clothConfig]);
  const reportClean = runServerPreflight(desiredClean, observedEmpty);
  assert.equal(reportClean.overallStatus, "ready");
  assert.equal(reportClean.blockReasons.length, 0);

  console.log("✔ Server preflight validation tests passed");
}

async function testConfigReconciliationAndSnapshotRequirement(): Promise<void> {
  const desiredConfigs = [
    createConfig("config/server.toml", "max-players=20"),
    createConfig("config/mod.json", '{"enabled": true}'),
  ];
  const observedConfigs = [
    createConfig("config/server.toml", "max-players=10"),
    createConfig("config/old.json", '{"deprecated": true}'),
  ];

  const desired = createManifest("srv-1", [createMod({ fileName: "mod-a.jar" })], desiredConfigs);
  const observed = createManifest("srv-remote", [createMod({ fileName: "mod-a.jar" })], observedConfigs);

  const preflight = runServerPreflight(desired, observed);
  assert.equal(preflight.overallStatus, "ready");
  assert.ok(preflight.plan.requiresSnapshot, "Mutating config changes MUST require snapshot");

  const configActions = preflight.plan.actions.filter((a) => a.type === "sync-config");
  assert.equal(configActions.length, 3); // 1 addition, 1 removal, 1 modified

  console.log("✔ Config reconciliation and mutating snapshot requirement passed");
}

async function testSnapshotCreationAndStalePlanDetection(): Promise<void> {
  const transport = new MockTransport();
  transport.setFile("mods/old-mod.jar", "existing mod jar content");
  transport.setFile("config/server.toml", "max-players=10");

  const modToInstall = createMod({ fileName: "new-mod.jar", modId: "new-mod" });
  const modToRemove = createMod({ fileName: "old-mod.jar", modId: "old-mod" });

  const desired = createManifest("srv-1", [modToInstall], [createConfig("config/server.toml", "max-players=20")]);
  const observed = createManifest("srv-remote", [modToRemove], [createConfig("config/server.toml", "max-players=10")]);

  const preflight = runServerPreflight(desired, observed);
  assert.ok(preflight.plan.requiresSnapshot);

  // Create Snapshot
  const snapshot = await createPreMutationSnapshot({
    plan: preflight.plan,
    transport,
    serverId: "server-test-1",
    desiredManifest: desired,
    observedManifest: observed,
  });

  assert.equal(snapshot.serverId, "server-test-1");
  assert.equal(snapshot.status, "active");
  assert.equal(snapshot.entries.length, 3); // old-mod (existed), new-mod (created), config/server.toml (existed)

  const existedEntry = snapshot.entries.find((e) => e.relativePath === "mods/old-mod.jar");
  assert.ok(existedEntry);
  assert.equal(existedEntry.action, "existed");
  assert.ok(existedEntry.backupBlob && existedEntry.backupBlob.byteLength > 0);
  assert.ok(existedEntry.originalSha256);

  const createdEntry = snapshot.entries.find((e) => e.relativePath === "mods/new-mod.jar");
  assert.ok(createdEntry);
  assert.equal(createdEntry.action, "created");

  // Verify freshness against identical observed manifest
  const freshCheck = validatePlanFreshness(snapshot, observed);
  assert.equal(freshCheck.fresh, true);

  // Verify stale detection against drifted observed manifest
  const driftedObserved = createManifest(
    "srv-remote",
    [modToRemove, createMod({ fileName: "rogue-external-mod.jar", modId: "rogue" })],
    [createConfig("config/server.toml", "max-players=10")]
  );
  const staleCheck = validatePlanFreshness(snapshot, driftedObserved);
  assert.equal(staleCheck.fresh, false);
  assert.ok(staleCheck.driftReason?.includes("drifted"));

  // Verify Durable Store
  const store = new MemorySnapshotStore();
  await store.saveSnapshot(snapshot);
  const fetched = await store.getSnapshot(snapshot.snapshotId);
  assert.ok(fetched);
  assert.equal(fetched.snapshotId, snapshot.snapshotId);

  await store.recordChange({
    id: "change-1",
    serverId: "server-test-1",
    type: "snapshot-created",
    timestamp: new Date().toISOString(),
    summary: `Pre-mutation snapshot ${snapshot.snapshotId} created`,
  });

  const history = await store.getChangeHistory("server-test-1");
  assert.equal(history.length, 1);
  assert.equal(history[0].type, "snapshot-created");

  console.log("✔ Snapshot creation, stale plan drift detection and store persistence passed");
}

async function run(): Promise<void> {
  console.log("Starting SRV-3 Preflight, Config Diff, and Durable Snapshot test suite...");
  await testPreflightValidations();
  await testConfigReconciliationAndSnapshotRequirement();
  await testSnapshotCreationAndStalePlanDetection();
  console.log("\nAll SRV-3 tests passed successfully!");
}

run().catch((err) => {
  console.error("Test failure:", err);
  process.exit(1);
});
