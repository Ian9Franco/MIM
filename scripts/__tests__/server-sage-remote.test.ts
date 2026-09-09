/**
 * Test Suite: Server SAGE Remote Diagnostics & Crash Correlation (SRV-5)
 */

import assert from "node:assert/strict";
import type {
  ReadOnlyFileTransport,
  RemoteFileEntry,
  ServerChangeRecord,
} from "@mim/contracts-core/server";
import {
  parseRemoteServerLog,
  diagnoseServerLog,
  diagnoseRemoteServer,
} from "@mim/server-engine/sageRemote";

class MockLogTransport implements ReadOnlyFileTransport {
  constructor(private logContent: string) {}

  async list(): Promise<RemoteFileEntry[]> {
    return [{ path: "logs/latest.log", name: "latest.log", kind: "file" }];
  }

  async read(): Promise<Uint8Array> {
    return new TextEncoder().encode(this.logContent);
  }
}

async function runTests() {
  console.log("▶ Running SRV-5 Remote SAGE Diagnostic Tests...");

  // Test 1: Log Parsing
  {
    const sampleLog = `
[01:15:30] [Server thread/INFO] [minecraft/MinecraftServer]: Starting minecraft server version 1.20.1
[01:15:31] [Server thread/WARN] [fabric-loader]: Mod 'example-mod' is using deprecated APIs
[01:15:32] [Server thread/ERROR] [minecraft/MinecraftServer]: Encountered an unexpected exception
java.lang.RuntimeException: Something went wrong
\tat net.minecraft.server.MinecraftServer.run(MinecraftServer.java:100)
    `.trim();

    const entries = parseRemoteServerLog(sampleLog);
    assert.equal(entries.length, 3, "Must parse 3 top-level log entries");
    assert.equal(entries[0].level, "INFO");
    assert.equal(entries[1].level, "WARN");
    assert.equal(entries[2].level, "ERROR");
    assert.ok(entries[2].message.includes("java.lang.RuntimeException"), "Must capture multi-line stacktrace");
    console.log("  ✓ Test 1: Log parsing verified");
  }

  // Test 2: Missing Dependency Diagnosis with Correlation
  {
    const crashLog = `
[main/ERROR] [FabricLoader/]: Incompatible mod set!
net.fabricmc.loader.impl.FormattedException: Some mods require 'cloth-config' which is missing!
\tat net.fabricmc.loader.impl.FabricLoaderImpl.load(FabricLoaderImpl.java:234)
    `.trim();

    const recentChanges: ServerChangeRecord[] = [
      {
        id: "chg-1",
        serverId: "srv-prod",
        type: "mod-installed",
        timestamp: new Date().toISOString(),
        summary: "Installed mod cloth-config-v10.jar",
        artifactAfter: {
          modId: "cloth-config",
          modName: "Cloth Config",
          fileName: "cloth-config-v10.jar",
          modVersion: "10.0.0",
          minecraftVersion: "1.20.1",
          loader: "fabric",
          projectType: "mod",
          hashes: {},
          environment: { client: "required", server: "required" },
          dependencies: [],
          conflicts: [],
          providedIds: [],
          mixinTargets: [],
          source: { kind: "remote" },
        },
      },
    ];

    const report = diagnoseServerLog("srv-prod", crashLog, recentChanges, "dep-123");
    assert.equal(report.category, "missing_dependency", "Category must be missing_dependency");
    assert.ok(report.culpritMods.includes("cloth-config"), "Culprit mod must be cloth-config");
    assert.ok(report.recommendedAction.includes("cloth-config"), "Recommendation must suggest cloth-config");
    assert.equal(report.correlatedDeploymentId, "dep-123");
    assert.ok(report.correlatedChanges && report.correlatedChanges.length > 0, "Must correlate with recent changes");
    console.log("  ✓ Test 2: Missing dependency crash diagnosed and correlated");
  }

  // Test 3: Mixin Injection Failure Diagnosis
  {
    const mixinCrash = `
[Server thread/ERROR] [Mixin]: Critical injection failure: Mixin apply failed in class 'com.example.mod.mixin.EntityRendererMixin'
org.spongepowered.asm.mixin.transformer.throwException: Injection failed
    `.trim();

    const report = diagnoseServerLog("srv-prod", mixinCrash);
    assert.equal(report.category, "mixin_injection_failure", "Must classify as mixin_injection_failure");
    assert.ok(report.culpritMods.includes("com.example.mod.mixin.EntityRendererMixin"));
    console.log("  ✓ Test 3: Mixin failure diagnosed");
  }

  // Test 4: Remote Transport Diagnostic Ingestion
  {
    const rawCrash = "java.lang.OutOfMemoryError: Java heap space";
    const transport = new MockLogTransport(rawCrash);

    const report = await diagnoseRemoteServer(transport, "srv-prod", "logs/latest.log");
    assert.equal(report.category, "out_of_memory", "Must detect out_of_memory from remote stream");
    assert.ok(report.recommendedAction.includes("RAM"), "Must recommend RAM allocation");
    console.log("  ✓ Test 4: Remote diagnostic ingestion passed");
  }

  console.log("✔ SRV-5 Remote SAGE Diagnostic Tests passed successfully!\n");
}

runTests().catch((err) => {
  console.error("❌ SRV-5 Tests failed:", err);
  process.exit(1);
});
