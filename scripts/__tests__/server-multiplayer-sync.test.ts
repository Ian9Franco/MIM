/**
 * Test Suite: Multiplayer Client-Server Sync & Distributable Manifests (SRV-7)
 */

import assert from "node:assert/strict";
import type { InstanceManifest, ModArtifact } from "@mim/contracts-core/instances";
import {
  generateDistributableManifest,
  reconcileClientWithServerManifest,
} from "@mim/server-engine/multiplayerSync";

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
  console.log("▶ Running SRV-7 Multiplayer Client-Server Sync Tests...");

  // Test 1: Distributable Manifest Generation (Server-only exclusion)
  {
    const serverManifest = createDummyManifest({
      instanceId: "srv-community",
      mods: [
        createDummyArtifact({
          fileName: "fabric-api-0.90.0.jar",
          modId: "fabric-api",
          modName: "Fabric API",
          hashes: { sha256: "sha_fapi" },
          environment: { client: "required", server: "required" },
        }),
        createDummyArtifact({
          fileName: "dynmap-fabric-3.6.jar",
          modId: "dynmap",
          modName: "Dynmap Web Map",
          hashes: { sha256: "sha_dynmap" },
          environment: { client: "unsupported", server: "required" }, // Server-only!
        }),
        createDummyArtifact({
          fileName: "voicechat-fabric-2.4.jar",
          modId: "simple-voice-chat",
          modName: "Simple Voice Chat",
          hashes: { sha256: "sha_vc" },
          environment: { client: "required", server: "required" },
        }),
      ],
    });

    const distManifest = generateDistributableManifest(serverManifest, "Community SMP Public");
    assert.equal(distManifest.schemaVersion, "1.0");
    assert.equal(distManifest.serverName, "Community SMP Public");
    assert.equal(distManifest.requiredMods.length, 2, "Must exclude server-only dynmap mod");
    assert.ok(distManifest.requiredMods.some((m) => m.identity === "fabric-api"));
    assert.ok(distManifest.requiredMods.some((m) => m.identity === "simple-voice-chat"));
    assert.ok(!distManifest.requiredMods.some((m) => m.identity === "dynmap"), "Dynmap must be excluded");
    console.log("  ✓ Test 1: Distributable manifest generation excludes server-only mods");
  }

  // Test 2: Client-Server Sync Reconciliation & Client-Only Preservation
  {
    const distManifest = {
      schemaVersion: "1.0" as const,
      serverId: "srv-community",
      serverName: "Community SMP",
      minecraftVersion: "1.20.1",
      modLoader: "fabric",
      modLoaderVersion: "0.15.2",
      exportedAt: new Date().toISOString(),
      requiredMods: [
        {
          identity: "fabric-api",
          displayName: "Fabric API",
          filename: "fabric-api-0.90.0.jar",
          sha256: "sha_fapi_v1",
          required: true,
          side: "both" as const,
        },
        {
          identity: "jei",
          displayName: "Just Enough Items",
          filename: "jei-15.0.0.jar",
          sha256: "sha_jei_v1",
          required: true,
          side: "both" as const,
        },
      ],
      optionalMods: [],
    };

    const clientManifest = createDummyManifest({
      instanceId: "cli-local",
      side: "client",
      mods: [
        createDummyArtifact({
          fileName: "fabric-api-0.90.0.jar",
          modId: "fabric-api",
          modName: "Fabric API",
          hashes: { sha256: "sha_fapi_DIFFERENT_HASH" },
        }),
        createDummyArtifact({
          fileName: "sodium-0.5.8.jar",
          modId: "sodium",
          modName: "Sodium Renderer",
          hashes: { sha256: "sha_sodium" },
          environment: { client: "required", server: "unsupported" }, // Client-only!
        }),
      ],
    });

    const diff = reconcileClientWithServerManifest(clientManifest, distManifest);
    assert.equal(diff.status, "mismatched", "Status must be mismatched");
    assert.equal(diff.missingMods.length, 1, "Must report 1 missing mod (JEI)");
    assert.equal(diff.missingMods[0].identity, "jei");
    assert.equal(diff.versionMismatches.length, 1, "Must report 1 version mismatch (Fabric API)");
    assert.equal(diff.clientOnlyModsPreserved.length, 1, "Must preserve Sodium client-only mod");
    assert.equal(diff.clientOnlyModsPreserved[0].modId, "sodium");
    console.log("  ✓ Test 2: Client-Server reconciliation preserves client-only mods");
  }

  // Test 3: Incompatibility Detection (Minecraft Version)
  {
    const distManifest = {
      schemaVersion: "1.0" as const,
      serverId: "srv-community",
      serverName: "Community SMP",
      minecraftVersion: "1.20.4",
      modLoader: "fabric",
      modLoaderVersion: "0.15.2",
      exportedAt: new Date().toISOString(),
      requiredMods: [],
      optionalMods: [],
    };

    const clientManifest = createDummyManifest({
      instanceId: "cli-old",
      side: "client",
      minecraftVersion: "1.20.1",
    });

    const diff = reconcileClientWithServerManifest(clientManifest, distManifest);
    assert.equal(diff.status, "incompatible", "Must detect Minecraft version incompatibility");
    assert.ok(diff.incompatibleMinecraft);
    assert.equal(diff.incompatibleMinecraft?.server, "1.20.4");
    assert.equal(diff.incompatibleMinecraft?.client, "1.20.1");
    console.log("  ✓ Test 3: Minecraft version incompatibility detected");
  }

  console.log("✔ SRV-7 Multiplayer Client-Server Sync Tests passed successfully!\n");
}

runTests().catch((err) => {
  console.error("❌ SRV-7 Tests failed:", err);
  process.exit(1);
});
