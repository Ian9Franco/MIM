import assert from "node:assert/strict";
import { createInstanceManifest, type ModArtifact } from "@/lib/instances";
import { auditServerInstance } from "@/lib/server";
import { computeServerHealthState } from "@/components/server/ServerHealthBadge";

function createArtifact(name: string, overrides: Partial<ModArtifact> = {}): ModArtifact {
  return {
    fileName: `${name}.jar`,
    modId: name,
    modName: name.toUpperCase(),
    modVersion: "1.0.0",
    minecraftVersion: "1.20.1",
    loader: "fabric",
    projectType: "mod",
    hashes: { sha1: "hash1" },
    environment: { client: "optional", server: "optional" },
    dependencies: [],
    conflicts: [],
    providedIds: [],
    mixinTargets: [],
    source: { kind: "generated" },
    ...overrides,
  };
}

async function testAuditCalculations(): Promise<void> {
  const desired = createInstanceManifest({
    instanceId: "project-1",
    minecraftVersion: "1.20.1",
    loader: "fabric",
    side: "server",
    mods: [
      createArtifact("fabric-api", { modVersion: "0.92.0" }),
      createArtifact("sodium", {
        environment: { client: "required", server: "unsupported" },
      }),
      createArtifact("lithium", { modVersion: "0.11.1" }),
    ],
  });

  const actual = createInstanceManifest({
    instanceId: "remote-server-1",
    minecraftVersion: "1.20.1",
    loader: "fabric",
    side: "server",
    mods: [
      createArtifact("fabric-api", { modVersion: "0.90.0" }), // outdated
      createArtifact("extra-mod", { modVersion: "1.0.0" }), // extra on server
      // lithium is missing on server
    ],
  });

  const report = auditServerInstance(desired, actual);

  assert.equal(report.desiredInstanceId, "project-1");
  assert.equal(report.actualInstanceId, "remote-server-1");

  // Summary checks
  assert.equal(report.summary.missingFromServer, 2); // sodium and lithium
  assert.equal(report.summary.extraOnServer, 1); // extra-mod
  assert.equal(report.summary.updatesRequired, 1); // fabric-api 0.90 vs 0.92
  assert.equal(report.summary.environmentMismatches, 1); // sodium client-only

  console.log("✔ Server audit calculation logic passed");
}

async function testHealthBadgeStateComputation(): Promise<void> {
  // 1. Idle
  const idleState = computeServerHealthState(null);
  assert.equal(idleState.state, "idle");

  // 2. Partial
  const dummyReport = auditServerInstance(
    createInstanceManifest({ instanceId: "d", side: "server", minecraftVersion: "1.20.1", loader: "fabric" }),
    createInstanceManifest({ instanceId: "a", side: "server", minecraftVersion: "1.20.1", loader: "fabric" })
  );
  const partialState = computeServerHealthState(dummyReport, true);
  assert.equal(partialState.state, "partial");

  // 3. Synced
  const syncedState = computeServerHealthState(dummyReport, false);
  assert.equal(syncedState.state, "synced");

  // 4. Drift detected
  const reportWithDrift = auditServerInstance(
    createInstanceManifest({
      instanceId: "d",
      side: "server",
      minecraftVersion: "1.20.1",
      loader: "fabric",
      mods: [createArtifact("mod-a")],
    }),
    createInstanceManifest({ instanceId: "a", side: "server", minecraftVersion: "1.20.1", loader: "fabric" })
  );
  const driftState = computeServerHealthState(reportWithDrift);
  assert.equal(driftState.state, "drift_detected");

  console.log("✔ Server health state computation passed");
}

async function run(): Promise<void> {
  console.log("Starting server audit UI & API test suite...");
  await testAuditCalculations();
  await testHealthBadgeStateComputation();
  console.log("\nAll server audit UI tests passed successfully!");
}

run().catch((err) => {
  console.error("Test failure:", err);
  process.exit(1);
});
