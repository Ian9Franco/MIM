import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs";
import { scanRepository, inspectSource } from "../architecture/verify-boundaries";
import { sanitizeEndpoint, classifyNetworkError, calculateNextRetry } from "@mim/network-resilience";
import { runServerPreflight, buildReconciliationPlan, MemorySnapshotStore } from "@mim/server-engine";
import type { InstanceManifest } from "@mim/contracts-core/instances";

function testNetworkResiliencePackage(): void {
  const sanitized = sanitizeEndpoint("https://user:secret123@api.example.com/download?token=abcdef");
  assert.ok(!sanitized.includes("secret123"));
  assert.ok(!sanitized.includes("abcdef"));

  const diag = classifyNetworkError({
    rawUrl: "https://api.example.com/v1/resource",
    httpStatus: 429,
    headers: { "retry-after": "5" },
  });
  assert.equal(diag.category, "rate_limited");
  assert.equal(diag.retryAfterSeconds, 5);
  assert.equal(diag.isRetryable, true);

  const decision = calculateNextRetry({ attemptCount: 0, startTimeMs: Date.now() }, diag);
  assert.equal(decision.shouldRetry, true);
  assert.equal(decision.delayMs, 5000);

  console.log("✔ @mim/network-resilience package functionality verified");
}

function testServerEnginePackage(): void {
  const manifest: InstanceManifest = {
    schemaVersion: 1,
    instanceId: "test-srv",
    side: "server",
    minecraftVersion: "1.20.1",
    loader: "fabric",
    mods: [],
    configs: [],
    generatedAt: new Date().toISOString(),
  };

  const preflight = runServerPreflight(manifest, manifest);
  assert.equal(preflight.overallStatus, "ready");
  assert.equal(preflight.plan.actions.length, 0);

  const store = new MemorySnapshotStore();
  assert.ok(store);

  console.log("✔ @mim/server-engine package functionality verified");
}

function testDesktopWorkspaceConfiguration(): void {
  const desktopPkgPath = path.resolve(process.cwd(), "apps/desktop/package.json");
  assert.ok(fs.existsSync(desktopPkgPath), "apps/desktop/package.json must exist");

  const desktopPkg = JSON.parse(fs.readFileSync(desktopPkgPath, "utf8"));
  assert.equal(desktopPkg.name, "@mim/desktop");
  assert.ok(desktopPkg.scripts?.["package:win"]);

  console.log("✔ apps/desktop workspace configuration verified");
}

function testMonorepoBoundaries(): void {
  const rootDir = path.resolve(process.cwd());
  const violations = scanRepository(rootDir);

  assert.equal(violations.length, 0, `Forbidden architectural boundary violations detected: ${JSON.stringify(violations, null, 2)}`);

  // Verify that an intentional boundary violation in domain packages is caught
  const testViolation = inspectSource(
    "packages/network-resilience/dummy.ts",
    `import { something } from "@/app/page";`
  );
  assert.equal(testViolation.length, 1);
  assert.equal(testViolation[0].rule, "network-resilience-must-be-pure");

  console.log("✔ Monorepo domain packages & desktop boundaries verified");
}

async function run(): Promise<void> {
  console.log("Starting ARCH-3 and ARCH-4 monorepo verification test suite...");
  testNetworkResiliencePackage();
  testServerEnginePackage();
  testDesktopWorkspaceConfiguration();
  testMonorepoBoundaries();
  console.log("\nAll ARCH-3 and ARCH-4 tests passed successfully!");
}

run().catch((err) => {
  console.error("Test failure:", err);
  process.exit(1);
});
