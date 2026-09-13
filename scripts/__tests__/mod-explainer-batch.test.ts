import assert from "node:assert/strict";
import { explainModsInBatch } from "../../lib/intelligence/modExplainerBatch";
import type { ModExplainerInput } from "../../lib/intelligence/modExplainer";

function makeRouteRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost:3000/api/fomo/explain-batch", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

async function testBatchExplainReturnsResults(): Promise<void> {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    Response.json({
      choices: [{ message: { content: "Resumen técnico del mod." } }],
    })) as typeof fetch;

  try {
    const inputs: ModExplainerInput[] = [
      { projectId: "mod-a", title: "Mod A", description: "Adds bees and honey mechanics for fabric 1.20.1" },
      { projectId: "mod-b", title: "Mod B", description: "Performance tweaks for fabric 1.20.1 with sodium-like optimizations" },
    ];
    const results = await explainModsInBatch(inputs, "openrouter-test-key", {
      openrouterKey: "openrouter-test-key",
    });
    assert.equal(results.length, 2);
    assert.ok(results.every((item) => item.ok && item.result?.projectId));
    console.log("✓ Batch mod explainer returns one result per project");
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function testBatchRouteRequiresKeys(): Promise<void> {
  const { POST } = await import("../../app/api/fomo/explain-batch/route");
  const response = await POST(
    makeRouteRequest({
      projects: [{ projectId: "x", title: "Example Mod" }],
    })
  );
  assert.equal(response.status, 401);
  console.log("✓ explain-batch rejects missing API keys");
}

async function testBatchRouteValidatesPayload(): Promise<void> {
  const { POST } = await import("../../app/api/fomo/explain-batch/route");
  const response = await POST(makeRouteRequest({ projects: [] }));
  assert.equal(response.status, 400);
  console.log("✓ explain-batch validates non-empty projects array");
}

async function run(): Promise<void> {
  await testBatchExplainReturnsResults();
  await testBatchRouteRequiresKeys();
  await testBatchRouteValidatesPayload();
  console.log("✔ Mod explainer batch tests passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
