/**
 * Test Suite: Server Administration, Properties, RCON & Backups (SRV-6)
 */

import assert from "node:assert/strict";
import type {
  ReadOnlyFileTransport,
  RemoteFileEntry,
  CommandChannel,
} from "@mim/contracts-core/server";
import {
  parseServerProperties,
  serializeServerProperties,
  validateServerProperties,
  updateServerProperties,
} from "@mim/server-engine/configAdmin";
import {
  stripMinecraftFormatting,
  validateCommandSafety,
  executeConsoleCommand,
} from "@mim/server-engine/rcon";
import {
  listServerBackups,
  extractWorldMetadata,
} from "@mim/server-engine/backups";

class MockAdminTransport implements ReadOnlyFileTransport {
  async list(remotePath: string): Promise<RemoteFileEntry[]> {
    if (remotePath === "backups") {
      return [
        { path: "backups/world-2026-09-08.zip", name: "world-2026-09-08.zip", kind: "file", size: 5048576, modifiedAt: "2026-09-08T10:00:00Z" },
        { path: "backups/world-2026-09-09.zip", name: "world-2026-09-09.zip", kind: "file", size: 5242880, modifiedAt: "2026-09-09T10:00:00Z" },
      ];
    }
    return [];
  }

  async read(remotePath: string): Promise<Uint8Array> {
    return new TextEncoder().encode(`content of ${remotePath}`);
  }
}

async function runTests() {
  console.log("▶ Running SRV-6 Server Administration, RCON & Backups Tests...");

  // Test 1: server.properties parsing, preservation & serialization
  {
    const rawProps = `
# Minecraft server properties
# Mon Sep 09 01:00:00 UTC 2026
server-port=25565
gamemode=survival
# Custom unmanaged plugin setting
custom.plugin.flag=true
max-players=20
    `.trim();

    const parsed = parseServerProperties(rawProps);
    assert.equal(parsed.properties["server-port"], "25565");
    assert.equal(parsed.properties["gamemode"], "survival");
    assert.equal(parsed.properties["custom.plugin.flag"], "true");
    assert.equal(parsed.properties["max-players"], "20");

    // Update max-players and add motd
    const updated = updateServerProperties(parsed, {
      "max-players": "50",
      motd: "MIM Managed Server",
    });

    const serialized = serializeServerProperties(updated);
    assert.ok(serialized.includes("# Minecraft server properties"), "Must preserve comments");
    assert.ok(serialized.includes("max-players=50"), "Must update max-players");
    assert.ok(serialized.includes("custom.plugin.flag=true"), "Must preserve unmanaged custom keys");
    assert.ok(serialized.includes("motd=MIM Managed Server"), "Must append new property");
    console.log("  ✓ Test 1: server.properties parsing and preservation passed");
  }

  // Test 2: server.properties validation
  {
    const invalidProps = {
      "server-port": "99999",
      "max-players": "-5",
      "enable-rcon": "true",
      "rcon.password": "",
    };

    const validation = validateServerProperties(invalidProps);
    assert.equal(validation.valid, false, "Must fail validation");
    assert.equal(validation.errors.length, 3, "Must report 3 errors (port, max-players, rcon.password)");
    console.log("  ✓ Test 2: server.properties validation passed");
  }

  // Test 3: RCON Command Execution and Sanitization
  {
    const channel: CommandChannel = {
      async execute(cmd: string) {
        if (cmd === "list") {
          return { output: "§aThere are 2 of a max of 20 players online: §fSteve, Alex", accepted: true };
        }
        return { output: "Unknown command", accepted: false };
      },
    };

    // Safe command with color codes
    const result = await executeConsoleCommand(channel, "list");
    assert.equal(result.success, true);
    assert.equal(result.response, "There are 2 of a max of 20 players online: Steve, Alex");

    // Dangerous command blocked by default
    const dangerousCheck = validateCommandSafety("/stop");
    assert.equal(dangerousCheck.safe, false);

    const blockedResult = await executeConsoleCommand(channel, "/stop");
    assert.equal(blockedResult.success, false);
    assert.ok(blockedResult.response.includes("blocked"));
    console.log("  ✓ Test 3: RCON execution and safety passed");
  }

  // Test 4: Backups Listing and World Metadata
  {
    const transport = new MockAdminTransport();
    const backups = await listServerBackups(transport);
    assert.equal(backups.length, 2, "Must find 2 backups");
    assert.equal(backups[0].filename, "world-2026-09-09.zip", "Must sort descending by date");
    assert.equal(backups[0].worldName, "world");

    const worldMeta = extractWorldMetadata("MyWorld", new TextEncoder().encode("generatorName:flat Version:1.20.1"));
    assert.equal(worldMeta.levelName, "MyWorld");
    assert.equal(worldMeta.generatorName, "flat");
    assert.equal(worldMeta.versionName, "1.20.1");
    console.log("  ✓ Test 4: Backups and World metadata inspection passed");
  }

  console.log("✔ SRV-6 Server Administration & RCON Tests passed successfully!\n");
}

runTests().catch((err) => {
  console.error("❌ SRV-6 Tests failed:", err);
  process.exit(1);
});
