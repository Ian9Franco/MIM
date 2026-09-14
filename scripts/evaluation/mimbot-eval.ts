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

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, index)];
}

function readLiveThresholds() {
  const passRate = Number(process.env.MIMBOT_EVAL_MIN_PASS_RATE ?? "0.6");
  const maxP95Ms = Number(process.env.MIMBOT_EVAL_MAX_P95_MS ?? "45000");
  const maxTotalMs = Number(process.env.MIMBOT_EVAL_MAX_TOTAL_MS ?? "360000");
  return {
    passRate: Number.isFinite(passRate) ? passRate : 0.6,
    maxP95Ms: Number.isFinite(maxP95Ms) ? maxP95Ms : 45_000,
    maxTotalMs: Number.isFinite(maxTotalMs) ? maxTotalMs : 360_000,
  };
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
    // CI main gate runs without BYOK secrets in many environments; treat missing
    // keys as a soft skip so structure validation still green-lights the job.
    if (!keys.hasGeminiKey && !keys.hasOpenRouterKey) {
      console.warn("⚠️  Live eval skipped: no Gemini or OpenRouter key configured");
      console.log(`✓ MIMbot eval fixtures validated (${fixture.version}) [live skipped]`);
      return;
    }
    const provider = keys.hasOpenRouterKey ? ("openrouter" as const) : ("gemini" as const);

    const liveStartedAt = Date.now();
    const latenciesMs: number[] = [];

    const queued = await runAnalysisQueue(
      fixture.cases.map((testCase) => ({
        id: testCase.id,
        provider,
        run: async (signal) => {
          const startedAt = Date.now();
          const result = await runSageChat({
            question: testCase.question,
            personality: "standard",
            crashContext: testCase.crashContext,
            gatewayKeys: {},
            signal,
          });
          latenciesMs.push(Date.now() - startedAt);
          return result;
        },
      })),
      {
        maxRetries: 2,
        concurrency: { gemini: 1, openrouter: 1 },
        onJobStart: (id) => console.log(`▶ LIVE queue ${id}`),
        onQuotaWait: (p, waitMs, hint) =>
          console.log(`⏳ Cuota ${p}: esperando ${Math.ceil(waitMs / 1000)}s — ${hint}`),
      }
    );

    const thresholds = readLiveThresholds();
    const totalWallMs = Date.now() - liveStartedAt;
    const sortedLatencies = [...latenciesMs].sort((a, b) => a - b);
    const p50 = percentile(sortedLatencies, 50);
    const p95 = percentile(sortedLatencies, 95);
    const maxLatency = sortedLatencies[sortedLatencies.length - 1] ?? 0;

    console.log(
      `ℹ️  Live latency — wall: ${totalWallMs}ms, p50: ${p50}ms, p95: ${p95}ms, max: ${maxLatency}ms`
    );

    let passed = 0;
    let hardFailures = 0;
    for (const item of queued) {
      if (item.cancelled) {
        console.error(`✗ LIVE ${item.id} cancelled`);
        hardFailures += 1;
        continue;
      }
      if (!item.ok || !item.value) {
        console.error(`✗ LIVE ${item.id}`, item.error ?? "unknown error");
        hardFailures += 1;
        continue;
      }
      const scored = scoreResponse(item.value.text, fixture.cases.find((c) => c.id === item.id)!);
      if (scored.passed) {
        passed += 1;
        console.log(`✓ LIVE ${item.id} (${item.value.provider}/${item.value.model})`);
      } else {
        console.error(`✗ LIVE ${item.id}`, scored);
      }
    }

    const minPassed = Math.ceil(fixture.cases.length * thresholds.passRate);
    assert(hardFailures === 0, `Live eval had ${hardFailures} cancelled/transport failures`);
    assert(passed >= minPassed, `Live pass rate ${passed}/${fixture.cases.length} (min ${minPassed})`);
    assert(
      p95 <= thresholds.maxP95Ms,
      `Live p95 latency ${p95}ms exceeds ${thresholds.maxP95Ms}ms`
    );
    assert(
      totalWallMs <= thresholds.maxTotalMs,
      `Live wall time ${totalWallMs}ms exceeds ${thresholds.maxTotalMs}ms`
    );
  } else {
    console.log("ℹ️  Structure-only mode (set RUN_MIMBOT_LIVE=1 for live scoring)");
  }

  console.log(`✓ MIMbot eval fixtures validated (${fixture.version})`);
}

main().catch((error: unknown) => {
  console.error("MIMbot eval failed:", error);
  process.exit(1);
});
