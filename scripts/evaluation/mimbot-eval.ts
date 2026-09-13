/**
 * SAGE-05 — MIMbot eval fixture validator (baseline v2026-09-10).
 * Validates dataset structure; live LLM scoring is opt-in via RUN_MIMBOT_LIVE=1.
 */

import { z } from "zod";
import fixtureData from "./mimbot-fixtures.json";

const caseSchema = z.object({
  id: z.string().min(1),
  category: z.enum(["crash", "dependencies", "mods", "quota", "ambiguity"]),
  question: z.string().min(5),
  crashContext: z.object({
    category: z.string(),
    exceptionType: z.string(),
    suspectedMods: z.array(z.string()).optional(),
    loader: z.string(),
    gameVersion: z.string(),
    explanation: z.string().optional(),
  }),
  expectedSignals: z.array(z.string()).min(1),
  forbiddenSignals: z.array(z.string()).min(1),
});

const fixtureSchema = z.object({
  version: z.string(),
  baseline: z.object({
    promptVersion: z.string(),
    gateway: z.string(),
  }),
  cases: z.array(caseSchema).min(15).max(25),
});

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
  console.log(`✓ ${message}`);
}

function scoreResponse(text: string, testCase: z.infer<typeof caseSchema>): {
  passed: boolean;
  missing: string[];
  forbiddenHit: string[];
} {
  const normalized = text.toLowerCase();
  const missing = testCase.expectedSignals.filter(
    (signal) => !normalized.includes(signal.toLowerCase())
  );
  const forbiddenHit = testCase.forbiddenSignals.filter((signal) =>
    normalized.includes(signal.toLowerCase())
  );
  return {
    passed: missing.length === 0 && forbiddenHit.length === 0,
    missing,
    forbiddenHit,
  };
}

async function main(): Promise<void> {
  const fixture = fixtureSchema.parse(fixtureData);

  assert(fixture.cases.length >= 15, `Fixture has ${fixture.cases.length} cases (>= 15)`);
  assert(fixture.cases.length <= 20, `Fixture has ${fixture.cases.length} cases (SAGE-05 target <= 20)`);

  const categories = new Set(fixture.cases.map((c) => c.category));
  for (const required of ["crash", "dependencies", "mods", "quota", "ambiguity"] as const) {
    assert(categories.has(required), `Includes category: ${required}`);
  }

  const ids = new Set<string>();
  for (const testCase of fixture.cases) {
    assert(!ids.has(testCase.id), `Unique case id: ${testCase.id}`);
    ids.add(testCase.id);
  }

  if (process.env.RUN_MIMBOT_LIVE === "1") {
    const { runSageChat } = await import("../../lib/intelligence/sage/sageChatEngine");
    const { resolveGatewayKeys } = await import("../../lib/intelligence/ai/modelGateway");
    const { runAnalysisQueue } = await import("../../lib/intelligence/ai/analysisQueue");
    const keys = resolveGatewayKeys();
    assert(keys.hasGeminiKey || keys.hasOpenRouterKey, "Live eval requires Gemini or OpenRouter key");
    const provider = keys.hasOpenRouterKey ? ("openrouter" as const) : ("gemini" as const);

    const queued = await runAnalysisQueue(
      fixture.cases.map((testCase) => ({
        id: testCase.id,
        provider,
        run: async (signal) =>
          runSageChat({
            question: testCase.question,
            personality: "standard",
            crashContext: testCase.crashContext,
            gatewayKeys: {},
            signal,
          }),
      })),
      {
        maxRetries: 2,
        concurrency: { gemini: 1, openrouter: 1 },
        onJobStart: (id) => console.log(`▶ LIVE queue ${id}`),
        onQuotaWait: (p, waitMs, hint) =>
          console.log(`⏳ Cuota ${p}: esperando ${Math.ceil(waitMs / 1000)}s — ${hint}`),
      }
    );

    let passed = 0;
    for (const item of queued) {
      if (item.cancelled) {
        console.error(`✗ LIVE ${item.id} cancelled`);
        continue;
      }
      if (!item.ok || !item.value) {
        console.error(`✗ LIVE ${item.id}`, item.error ?? "unknown error");
        continue;
      }
      const scored = scoreResponse(item.value.text, fixture.cases.find((c) => c.id === item.id)!);
      if (scored.passed) {
        passed += 1;
        console.log(`✓ LIVE ${item.id}`);
      } else {
        console.error(`✗ LIVE ${item.id}`, scored);
      }
    }
    assert(passed >= Math.ceil(fixture.cases.length * 0.6), `Live pass rate ${passed}/${fixture.cases.length}`);
  } else {
    console.log("ℹ️  Structure-only mode (set RUN_MIMBOT_LIVE=1 for live scoring)");
  }

  console.log(`✓ MIMbot eval fixtures validated (${fixture.version})`);
}

main().catch((error: unknown) => {
  console.error("MIMbot eval failed:", error);
  process.exit(1);
});
