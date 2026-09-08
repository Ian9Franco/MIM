import assert from "node:assert/strict";
import AdmZip from "adm-zip";
import { scanModBuffer } from "@/lib/modding/enhanced-mod-scanner";
import {
  createInstanceManifest,
  diffInstanceManifests,
  toModArtifact,
  validateInstanceManifest,
  type ModArtifact,
} from "@/lib/instances";
import {
  auditServerInstance,
  buildReconciliationPlan,
  evaluateRemoteMutationSafety,
  getRecentServerChanges,
  hasRemoteCapability,
  type RemoteServerTarget,
  type ServerChangeRecord,
} from "@/lib/server";
import type { EventPayload } from "@/lib/events/eventContract";

function artifact(overrides: Partial<ModArtifact> = {}): ModArtifact {
  return {
    fileName: "example-1.0.0.jar",
    modId: "example",
    modName: "Example",
    modVersion: "1.0.0",
    minecraftVersion: "1.20.1",
    loader: "fabric",
    projectType: "mod",
    hashes: { sha1: "aaa" },
    environment: { client: "optional", server: "optional" },
    dependencies: [],
    conflicts: [],
    providedIds: [],
    mixinTargets: [],
    source: { kind: "generated" },
    ...overrides,
  };
}

async function testBufferScanner(): Promise<void> {
  const zip = new AdmZip();
  zip.addFile(
    "fabric.mod.json",
    Buffer.from(
      JSON.stringify({
        schemaVersion: 1,
        id: "remote-example",
        version: "2.4.0",
        name: "Remote Example",
        environment: "client",
        depends: { fabricloader: ">=0.15.0" },
        conflicts: { "old-example": "*" },
        provides: ["remote-example-api"],
      })
    )
  );

  const metadata = await scanModBuffer(zip.toBuffer(), "remote-example-2.4.0.jar");
  assert.equal(metadata.modId, "remote-example");
  assert.equal(metadata.modVersion, "2.4.0");
  assert.equal(metadata.environment, "client");
  assert.equal(metadata.serverSide, "unsupported");
  assert.ok(metadata.sha1);

  const normalized = toModArtifact(metadata, {
    fileName: "remote-example-2.4.0.jar",
    source: { kind: "remote", path: "/mods/remote-example-2.4.0.jar" },
  });
  assert.equal(normalized.source.kind, "remote");
  assert.equal(normalized.environment.server, "unsupported");
  assert.deepEqual(normalized.providedIds, ["remote-example-api"]);
  assert.ok(normalized.conflicts.includes("old-example"));
}

function testManifestValidation(): void {
  const clientOnly = artifact({
    fileName: "client-only.jar",
    modId: "client-only",
    modName: "Client Only",
    environment: { client: "required", server: "unsupported" },
    dependencies: [{ modId: "missing-lib", type: "required" }],
  });

  const manifest = createInstanceManifest({
    instanceId: "server-observed",
    side: "server",
    minecraftVersion: "1.20.1",
    loader: "fabric",
    mods: [clientOnly],
    generatedAt: "2026-09-07T00:00:00.000Z",
  });

  const validation = validateInstanceManifest(manifest);
  assert.ok(validation.issues.some((issue) => issue.category === "dependency_missing"));
  assert.ok(validation.issues.some((issue) => issue.category === "environment_mismatch"));
}

function testDiffAndReconciliation(): void {
  const actual = createInstanceManifest({
    instanceId: "remote-server",
    side: "server",
    minecraftVersion: "1.20.1",
    loader: "fabric",
    mods: [artifact({ modVersion: "1.0.0", hashes: { sha1: "old" } })],
    generatedAt: "2026-09-07T00:00:00.000Z",
  });
  const desired = createInstanceManifest({
    instanceId: "project-server",
    side: "server",
    minecraftVersion: "1.20.1",
    loader: "fabric",
    mods: [
      artifact({
        fileName: "example-2.0.0.jar",
        modVersion: "2.0.0",
        hashes: { sha1: "new" },
      }),
    ],
    generatedAt: "2026-09-07T00:00:00.000Z",
  });

  const diff = diffInstanceManifests(desired, actual);
  assert.equal(diff.updates.length, 1);
  assert.deepEqual(diff.updates[0].reasons.sort(), ["content", "filename", "version"]);

  const plan = buildReconciliationPlan(diff);
  assert.equal(plan.blocked, false);
  assert.equal(plan.requiresSnapshot, true);
  assert.equal(plan.actions.length, 1);
  assert.equal(plan.actions[0].type, "replace");
}

function testServerAudit(): void {
  const actual = createInstanceManifest({
    instanceId: "remote-server",
    side: "server",
    minecraftVersion: "1.20.1",
    loader: "fabric",
    mods: [artifact({ modVersion: "1.0.0", hashes: { sha1: "old" } })],
  });
  const desired = createInstanceManifest({
    instanceId: "desired-server",
    side: "server",
    minecraftVersion: "1.20.1",
    loader: "fabric",
    mods: [artifact({ modVersion: "2.0.0", hashes: { sha1: "new" } })],
  });

  const audit = auditServerInstance(desired, actual, "2026-09-07T00:00:00.000Z");
  assert.equal(audit.summary.updatesRequired, 1);
  assert.equal(audit.summary.validationErrors, 0);
  assert.equal(audit.generatedAt, "2026-09-07T00:00:00.000Z");
}

function testUnsafeDesiredStateBlocksPlan(): void {
  const clientOnly = artifact({
    fileName: "sodium.jar",
    modId: "sodium",
    modName: "Sodium",
    environment: { client: "required", server: "unsupported" },
  });
  const desired = createInstanceManifest({
    instanceId: "desired-server",
    side: "server",
    minecraftVersion: "1.20.1",
    loader: "fabric",
    mods: [clientOnly],
  });
  const actual = createInstanceManifest({
    instanceId: "actual-server",
    side: "server",
    minecraftVersion: "1.20.1",
    loader: "fabric",
  });

  const plan = buildReconciliationPlan(diffInstanceManifests(desired, actual));
  assert.equal(plan.blocked, true);
  assert.ok(plan.actions.some((action) => action.type === "manual-review"));
}

function testDuplicateIdentityRequiresReview(): void {
  const duplicateA = artifact({ fileName: "example-1.0.jar", hashes: { sha1: "one" } });
  const duplicateB = artifact({ fileName: "example-2.0.jar", modVersion: "2.0", hashes: { sha1: "two" } });
  const desired = createInstanceManifest({
    instanceId: "desired",
    side: "server",
    minecraftVersion: "1.20.1",
    loader: "fabric",
    mods: [duplicateA, duplicateB],
  });
  const actual = createInstanceManifest({
    instanceId: "actual",
    side: "server",
    minecraftVersion: "1.20.1",
    loader: "fabric",
  });

  const diff = diffInstanceManifests(desired, actual);
  assert.equal(diff.duplicates.desired.length, 1);
  assert.equal(diff.requiresManualReview, true);
  assert.equal(buildReconciliationPlan(diff).blocked, true);
}

function testCapabilityModel(): void {
  const target: RemoteServerTarget = {
    id: "sftp-only",
    displayName: "SFTP only",
    capabilities: {
      files: {
        async list() { return []; },
        async read() { return Buffer.alloc(0); },
        async write() {},
        async remove() {},
      },
    },
  };

  assert.equal(hasRemoteCapability(target, "files"), true);
  assert.equal(hasRemoteCapability(target, "process"), false);
}

function testMutationSafety(): void {
  const blocked = evaluateRemoteMutationSafety({
    path: "/world/level.dat",
    operation: "write",
    serverStatus: "online",
    snapshotAvailable: false,
  });
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.requiresOfflineServer, true);
  assert.equal(blocked.requiresSnapshot, true);

  const safe = evaluateRemoteMutationSafety({
    path: "/server.properties",
    operation: "write",
    serverStatus: "online",
    snapshotAvailable: false,
  });
  assert.equal(safe.allowed, true);
}

function testServerHistory(): void {
  const records: ServerChangeRecord[] = [
    {
      id: "old",
      serverId: "server-1",
      type: "server-restarted",
      timestamp: "2026-09-06T10:00:00.000Z",
      summary: "Old restart",
    },
    {
      id: "new",
      serverId: "server-1",
      type: "mod-replaced",
      timestamp: "2026-09-07T10:00:00.000Z",
      summary: "Updated Example",
    },
    {
      id: "other-server",
      serverId: "server-2",
      type: "crash-detected",
      timestamp: "2026-09-07T11:00:00.000Z",
      summary: "Unrelated",
    },
  ];

  const recent = getRecentServerChanges(records, {
    serverId: "server-1",
    since: "2026-09-07T00:00:00.000Z",
  });
  assert.deepEqual(recent.map((record) => record.id), ["new"]);
}

function testServerEventContract(): void {
  const payload: EventPayload<"server:connected"> = {
    serverId: "server-1",
    capabilities: ["files", "commands"],
  };
  assert.deepEqual(payload.capabilities, ["files", "commands"]);
}

async function main(): Promise<void> {
  await testBufferScanner();
  testManifestValidation();
  testDiffAndReconciliation();
  testServerAudit();
  testUnsafeDesiredStateBlocksPlan();
  testDuplicateIdentityRequiresReview();
  testCapabilityModel();
  testMutationSafety();
  testServerHistory();
  testServerEventContract();
  console.log("✓ Server Manager foundation contracts passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
