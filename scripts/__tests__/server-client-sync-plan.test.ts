import assert from "node:assert/strict";
import type { ModArtifact } from "@mim/contracts-core/instances";
import { buildClientSyncActions } from "@mim/server-engine/clientSyncPlan";
import { generateDistributableManifest, reconcileClientWithServerManifest } from "@mim/server-engine/multiplayerSync";

function artifact(overrides: Partial<ModArtifact> = {}): ModArtifact {
  return {
    fileName: overrides.fileName || "mod.jar",
    modId: overrides.modId || "mod",
    modName: overrides.modName || "Mod",
    modVersion: overrides.modVersion || "1.0.0",
    minecraftVersion: "1.20.1",
    loader: "fabric",
    projectType: "mod",
    hashes: overrides.hashes || { sha256: "abc" },
    environment: overrides.environment || { client: "required", server: "required" },
    dependencies: [],
    conflicts: [],
    providedIds: [],
    mixinTargets: [],
    source: overrides.source || { kind: "remote", path: "/server/mods/mod.jar" },
  };
}

async function run() {
  const serverManifest = {
    schemaVersion: 1 as const,
    instanceId: "srv",
    side: "server" as const,
    minecraftVersion: "1.20.1",
    loader: "fabric",
    mods: [
      artifact({
        fileName: "jei.jar",
        modId: "jei",
        hashes: { sha256: "server-jei" },
        source: { kind: "remote", path: "/server/mods/jei.jar" },
      }),
    ],
    configs: [],
    generatedAt: new Date().toISOString(),
  };

  const distributable = generateDistributableManifest(serverManifest);
  assert.equal(distributable.requiredMods[0].remotePath, "/server/mods/jei.jar");

  const clientManifest = {
    ...serverManifest,
    instanceId: "cli",
    side: "client" as const,
    mods: [],
  };
  const diff = reconcileClientWithServerManifest(clientManifest, distributable);
  const actions = buildClientSyncActions(diff, serverManifest.mods);
  assert.equal(actions.length, 1);
  assert.equal(actions[0].kind, "install");
  assert.equal(actions[0].resolution, "server-sftp");
  console.log("✓ buildClientSyncActions resolves SFTP installs from server artifacts");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
