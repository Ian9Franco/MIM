import assert from "node:assert/strict";
import { detectAffectedSurfaces } from "../architecture/detect-affected-surfaces";

function testHubOnlyChanges(): void {
  const result = detectAffectedSurfaces([
    "apps/hub/app/page.tsx",
    "apps/hub/components/DraftDetailView.tsx",
  ]);

  assert.equal(result.hub, true, "Hub should be marked affected");
  assert.equal(result.desktop, false, "Desktop should not be affected by Hub-only changes");
  assert.equal(result.contracts, false, "Contracts should not be affected");
  assert.equal(result.all, false, "Scope all should be false");
  console.log("✔ Hub-only detection passed");
}

function testContractsTransitiveChanges(): void {
  const result = detectAffectedSurfaces([
    "packages/contracts-core/instances.ts",
  ]);

  assert.equal(result.contracts, true);
  assert.equal(result.all, true, "Contracts changes trigger full transitive downstream scope");
  assert.equal(result.hub, true);
  assert.equal(result.desktop, true);
  assert.equal(result.network, true);
  assert.equal(result.serverEngine, true);
  console.log("✔ Contracts transitive detection passed");
}

function testServerEngineChanges(): void {
  const result = detectAffectedSurfaces([
    "packages/server-engine/reconciliation.ts",
  ]);

  assert.equal(result.serverEngine, true);
  assert.equal(result.desktop, true, "Desktop consumes server engine");
  assert.equal(result.hub, false, "Hub does not consume server engine");
  assert.equal(result.all, false);
  console.log("✔ Server-engine detection passed");
}

function testGlobalConfigChanges(): void {
  const result = detectAffectedSurfaces([
    "package.json",
  ]);

  assert.equal(result.all, true, "Root package.json changes trigger global scope");
  assert.equal(result.hub, true);
  assert.equal(result.desktop, true);
  console.log("✔ Global config trigger passed");
}

function testEmptyChangesFallback(): void {
  const result = detectAffectedSurfaces([]);

  assert.equal(result.all, true, "Empty file list defaults safely to all surfaces");
  console.log("✔ Empty changes fallback passed");
}

async function run(): Promise<void> {
  console.log("Starting ARCH-7 Scoped CI Detection test suite...");
  testHubOnlyChanges();
  testContractsTransitiveChanges();
  testServerEngineChanges();
  testGlobalConfigChanges();
  testEmptyChangesFallback();
  console.log("\nAll ARCH-7 Scoped CI Detection tests passed successfully!");
}

run().catch((err) => {
  console.error("Test failure:", err);
  process.exit(1);
});
