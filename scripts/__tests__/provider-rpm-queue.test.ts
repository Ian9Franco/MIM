import assert from "node:assert/strict";
import { GeminiProvider } from "../../lib/intelligence/ai/geminiProvider";
import {
  GEMINI_RPM_LIMIT,
  resetProviderRpmQueueForTests,
  withProviderRpmLimit,
} from "../../lib/intelligence/ai/providerRpmQueue";
import type { AIRequest } from "../../lib/intelligence/ai/types";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function testSerializesGeminiWork(): Promise<void> {
  resetProviderRpmQueueForTests();
  let inFlight = 0;
  let maxInFlight = 0;

  await Promise.all([
    withProviderRpmLimit("gemini", async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await sleep(40);
      inFlight -= 1;
      return 1;
    }),
    withProviderRpmLimit("gemini", async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await sleep(10);
      inFlight -= 1;
      return 2;
    }),
  ]);

  assert.equal(maxInFlight, 1, "Gemini RPM queue serializes overlapping work");
  console.log("✓ Gemini RPM queue serializes overlapping work");
}

async function testSlidingWindowLimit(): Promise<void> {
  let now = 0;
  const waits: number[] = [];
  resetProviderRpmQueueForTests({
    clock: () => now,
    wait: async (ms) => {
      waits.push(ms);
      now += ms;
    },
  });

  await withProviderRpmLimit("gemini", async () => "a", { limit: 2, windowMs: 1_000 });
  await withProviderRpmLimit("gemini", async () => "b", { limit: 2, windowMs: 1_000 });
  await withProviderRpmLimit("gemini", async () => "c", { limit: 2, windowMs: 1_000 });

  assert.equal(waits.length, 1, "Third Gemini call waits for a free RPM slot");
  assert.ok(waits[0] >= 1_000, "Wait covers the remainder of the 60s-equivalent window");
  assert.equal(GEMINI_RPM_LIMIT, 15, "Gemini default remains 15 RPM");
  console.log("✓ Gemini RPM queue waits when the sliding window is full");
}

async function testOpenRouterIsUnlimitedByDefault(): Promise<void> {
  let now = 0;
  const waits: number[] = [];
  resetProviderRpmQueueForTests({
    clock: () => now,
    wait: async (ms) => {
      waits.push(ms);
      now += ms;
    },
  });

  await Promise.all(
    Array.from({ length: 20 }, (_, index) =>
      withProviderRpmLimit("openrouter", async () => index)
    )
  );

  assert.equal(waits.length, 0, "OpenRouter does not inherit the Gemini 15 RPM cap");
  console.log("✓ OpenRouter bypasses the Gemini RPM window");
}

async function testGeminiProviderUsesQueue(): Promise<void> {
  resetProviderRpmQueueForTests();
  let inFlight = 0;
  let maxInFlight = 0;
  globalThis.fetch = (async () => {
    inFlight += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);
    await sleep(30);
    inFlight -= 1;
    return Response.json({ candidates: [{ content: { parts: [{ text: "ok" }] } }] });
  }) as typeof fetch;

  const request: AIRequest = {
    model: "test-model",
    messages: [{ role: "user", parts: [{ type: "text", text: "Diagnose" }] }],
    timeoutMs: 2_000,
  };
  const provider = new GeminiProvider("gemini-secret");
  await Promise.all([provider.generate(request), provider.generate(request)]);
  assert.equal(maxInFlight, 1, "GeminiProvider generate() shares the sequential RPM queue");
  console.log("✓ GeminiProvider generate() is gated by the RPM queue");
}

async function main(): Promise<void> {
  try {
    await testSerializesGeminiWork();
    await testSlidingWindowLimit();
    await testOpenRouterIsUnlimitedByDefault();
    await testGeminiProviderUsesQueue();
  } finally {
    resetProviderRpmQueueForTests();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
