import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs";
import { scanRepository, inspectSource, BOUNDARY_RULES } from "../architecture/verify-boundaries";
import type { InstanceManifest, ModArtifact } from "@mim/contracts-core/instances";
import type { NetworkDiagnosticReport, RetryPolicyConfig } from "@mim/contracts-core/network";
import type { ReconciliationPlan, ServerSnapshot } from "@mim/contracts-core/server";

function testContractsExports(): void {
  // Test type assignments and shapes
  const mod: ModArtifact = {
    fileName: "test-mod.jar",
    modId: "test_mod",
    modName: "Test Mod",
    modVersion: "1.0.0",
    minecraftVersion: "1.20.1",
    loader: "fabric",
    projectType: "mod",
    hashes: { sha256: "abc" },
    environment: { client: "required", server: "required" },
    dependencies: [],
    conflicts: [],
    providedIds: [],
    mixinTargets: [],
    source: { kind: "local" },
  };

  const manifest: InstanceManifest = {
    schemaVersion: 1,
    instanceId: "inst-1",
    side: "server",
    minecraftVersion: "1.20.1",
    loader: "fabric",
    mods: [mod],
    configs: [],
    generatedAt: new Date().toISOString(),
  };

  assert.equal(manifest.instanceId, "inst-1");
  assert.equal(manifest.mods.length, 1);
  assert.equal(manifest.mods[0].modId, "test_mod");

  const retryCfg: RetryPolicyConfig = {
    maxAttempts: 3,
    baseDelayMs: 200,
    maxDelayMs: 2000,
    budgetMs: 5000,
  };
  assert.equal(retryCfg.maxAttempts, 3);

  console.log("✔ Contracts package types & interfaces export test passed");
}

function testBoundaryVerification(): void {
  const rootDir = path.resolve(process.cwd());
  const violations = scanRepository(rootDir);

  // Filter out any known or check specific contracts violations
  const contractsViolations = violations.filter(v => v.source.startsWith("packages/contracts-core/"));
  assert.equal(contractsViolations.length, 0, `Contracts package has forbidden imports: ${JSON.stringify(contractsViolations)}`);

  // Verify that an intentional violation in contracts package is caught
  const dummyViolation = inspectSource(
    "packages/contracts-core/dummy.ts",
    `import { something } from "@/lib/instances/types";`
  );
  assert.equal(dummyViolation.length, 1);
  assert.equal(dummyViolation[0].rule, "contracts-must-be-pure");

  console.log("✔ Monorepo boundary and contracts purity checks passed");
}

async function run(): Promise<void> {
  console.log("Starting @mim/contracts-core & monorepo boundary test suite...");
  testContractsExports();
  testBoundaryVerification();
  console.log("\nAll ARCH-2 tests passed successfully!");
}

run().catch((err) => {
  console.error("Test failure:", err);
  process.exit(1);
});
