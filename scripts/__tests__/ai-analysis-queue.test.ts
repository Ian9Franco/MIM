import assert from "node:assert/strict";
import { runAnalysisQueue, type AnalysisQueueJob } from "@/lib/intelligence/ai/analysisQueue";
import { AIProviderError } from "@/lib/intelligence/ai/errors";
import { resetAiQuotaTrackerForTests } from "@/lib/intelligence/ai/quotaTracker";
import type { AIProviderId } from "@/lib/intelligence/ai/types";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function testSerializesPerProvider(): Promise<void> {
  const events: string[] = [];
  const jobs: AnalysisQueueJob<number>[] = [
    {
      id: "a",
      provider: "gemini",
      run: async () => {
        events.push("a-start");
        await sleep(40);
        events.push("a-end");
        return 1;
      },
    },
    {
      id: "b",
      provider: "gemini",
      run: async () => {
        events.push("b-start");
        await sleep(10);
        events.push("b-end");
        return 2;
      },
    },
  ];

  const results = await runAnalysisQueue(jobs, { concurrency: { gemini: 1, openrouter: 1 } });
  assert.equal(results.length, 2);
  assert.ok(results.every((item) => item.ok));
  assert.deepEqual(events, ["a-start", "a-end", "b-start", "b-end"]);
  console.log("✓ Analysis queue serializes same-provider jobs");
}

async function testAllowsParallelAcrossProviders(): Promise<void> {
  let geminiActive = 0;
  let openrouterActive = 0;
  let maxGemini = 0;
  let maxOpenrouter = 0;

  const track = (provider: AIProviderId) => async () => {
    if (provider === "gemini") {
      geminiActive += 1;
      maxGemini = Math.max(maxGemini, geminiActive);
      await sleep(30);
      geminiActive -= 1;
    } else {
      openrouterActive += 1;
      maxOpenrouter = Math.max(maxOpenrouter, openrouterActive);
      await sleep(30);
      openrouterActive -= 1;
    }
    return provider;
  };

  await runAnalysisQueue(
    [
      { id: "g1", provider: "gemini", run: track("gemini") },
      { id: "o1", provider: "openrouter", run: track("openrouter") },
    ],
    { concurrency: { gemini: 1, openrouter: 1 } }
  );

  assert.equal(maxGemini, 1);
  assert.equal(maxOpenrouter, 1);
  console.log("✓ Analysis queue runs different providers in parallel");
}

async function testRetriesQuotaErrors(): Promise<void> {
  resetAiQuotaTrackerForTests();
  let attempts = 0;

  const results = await runAnalysisQueue(
    [
      {
        id: "quota",
        provider: "openrouter",
        run: async () => {
          attempts += 1;
          if (attempts === 1) {
            throw new AIProviderError("rate limit — retry in 0.05s", "RATE_LIMITED", {
              status: 429,
              provider: "openrouter",
            });
          }
          return "ok";
        },
      },
    ],
    { maxRetries: 2, concurrency: { openrouter: 1 } }
  );

  assert.equal(attempts, 2);
  assert.equal(results[0]?.ok, true);
  assert.equal(results[0]?.value, "ok");
  console.log("✓ Analysis queue retries quota-like failures");
}

async function testCancellation(): Promise<void> {
  const controller = new AbortController();
  let started = false;

  const promise = runAnalysisQueue(
    [
      {
        id: "slow",
        provider: "gemini",
        run: async (signal) => {
          started = true;
          await sleep(200);
          signal.throwIfAborted();
          return 1;
        },
      },
      {
        id: "queued",
        provider: "gemini",
        run: async () => 2,
      },
    ],
    { parentSignal: controller.signal, concurrency: { gemini: 1 } }
  );

  await sleep(20);
  controller.abort();
  const results = await promise;

  assert.equal(started, true);
  assert.ok(results.some((item) => item.cancelled));
  console.log("✓ Analysis queue propagates cancellation");
}

async function run(): Promise<void> {
  await testSerializesPerProvider();
  await testAllowsParallelAcrossProviders();
  await testRetriesQuotaErrors();
  await testCancellation();
  console.log("✔ AI analysis queue tests passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
