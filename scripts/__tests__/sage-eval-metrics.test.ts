/**
 * Test Suite: SAGE-02 metric split and SAGE-03 gate helpers
 */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import type { CrashCategory } from "../../lib/intelligence/sage/types";
import {
  SAGE_EVAL_THRESHOLDS,
  collectSageGateFailures,
  evaluateSageCorpus,
  type BenchmarkSample,
} from "../evaluation/sageEvalCore";

function sample(
  id: string,
  category: CrashCategory,
  rawLog: string,
  expectedCulprit?: string,
): BenchmarkSample {
  return {
    id,
    category,
    loader: "fabric",
    minecraftVersion: "1.20.1",
    rawLog,
    expectedCulprit,
  };
}

function testMetricSplitOnMiniCorpus(): void {
  const fabricApiLog =
    "[main/FATAL] [FabricLoader/]: A critical error occurred\nnet.fabricmc.loader.impl.FormattedException: Some of your mods are incompatible with the game or each other!\nA potential solution has been determined, this may resolve your issue:\n\t - Install fabric-api, any version.\nMore details:\n\t - Mod 'sodium' requires any version of fabric-api, which is missing!\nMinecraft Version: 1.20.1\nFabric Loader: 0.15.11";
  const sodiumLog =
    "[main/FATAL] [FabricLoader/]: A critical error occurred\nnet.fabricmc.loader.impl.FormattedException: Some of your mods are incompatible with the game or each other!\nA potential solution has been determined, this may resolve your issue:\n\t - Install sodium, any version.\nMore details:\n\t - Mod 'iris' requires any version of sodium, which is missing!\nMinecraft Version: 1.20.1\nFabric Loader: 0.15.11";
  const oomLog =
    "[Render thread/FATAL] [Minecraft/]: Unreported exception thrown!\njava.lang.OutOfMemoryError: Java heap space\n\tat java.util.Arrays.copyOf(Arrays.java:3537)\nMinecraft Version: 1.20.1\nFabric Loader: 0.15.11";

  const corpus: BenchmarkSample[] = [
    sample("with-culprit-top1", "MISSING_DEPENDENCY", fabricApiLog, "fabric-api"),
    sample("with-culprit-top1-b", "MISSING_DEPENDENCY", sodiumLog, "sodium"),
    sample("systemic-ok", "OUT_OF_MEMORY", oomLog),
    sample("systemic-ok-b", "OUT_OF_MEMORY", oomLog),
  ];

  const result = evaluateSageCorpus(corpus);
  assert.equal(result.top1Attribution.denominator, 2);
  assert.equal(result.top3Attribution.denominator, 2);
  assert.equal(result.systemicCategoryCorrect.denominator, 2);
  assert.equal(result.top1Historical.denominator, 4);
  assert.equal(result.top3Historical.denominator, 4);
  assert.equal(result.top1Attribution.numerator, 2);
  assert.equal(result.systemicCategoryCorrect.numerator, 2);
  console.log("✔ SAGE-02 metric denominators and attribution split verified");
}

function testGatePassesOnHealthyResult(): void {
  const healthy = evaluateSageCorpus([
    sample("ok-1", "MISSING_DEPENDENCY", "Could not find required mod: fabric-api", "fabric-api"),
    sample("ok-2", "OUT_OF_MEMORY", "java.lang.OutOfMemoryError: Java heap space"),
  ]);
  healthy.macroF1 = 100;
  healthy.top3Historical.percentage = 100;
  healthy.meanLatencyMs = 1;
  assert.equal(collectSageGateFailures(healthy).length, 0);
  console.log("✔ SAGE-03 gate passes when thresholds are met");
}

function testGateFailsWhenThresholdBroken(): void {
  const broken = evaluateSageCorpus([
    sample("bad", "UNKNOWN_RUNTIME", "Could not find required mod: fabric-api", "fabric-api"),
  ]);
  broken.macroF1 = 10;
  broken.top3Historical.percentage = 10;
  broken.meanLatencyMs = 50;
  const failures = collectSageGateFailures(broken);
  assert.ok(failures.some((item) => item.metric === "Macro F1-Score"));
  assert.ok(failures.some((item) => item.metric.includes("Top-3")));
  assert.ok(failures.some((item) => item.metric.includes("Latency")));
  console.log("✔ SAGE-03 gate reports all threshold violations");
}

function testSelfTestFailExitCode(): void {
  const script = path.join(process.cwd(), "scripts", "evaluation", "sage-eval.ts");
  const tsNodeBin = require.resolve("ts-node/dist/bin.js");
  const run = spawnSync(
    process.execPath,
    [tsNodeBin, "--project", "tsconfig.scripts.json", script, "--self-test-fail"],
    { encoding: "utf8" },
  );
  assert.equal(run.status, 1, run.stderr || run.stdout);
  console.log("✔ sage-eval --self-test-fail exits with code 1");
}

function testThresholdConstants(): void {
  assert.equal(SAGE_EVAL_THRESHOLDS.MACRO_F1_MIN, 85);
  assert.equal(SAGE_EVAL_THRESHOLDS.TOP3_MIN, 95);
  assert.equal(SAGE_EVAL_THRESHOLDS.LATENCY_MAX_MS, 15);
  console.log("✔ SAGE-03 threshold constants match plan");
}

function run(): void {
  console.log("Starting SAGE eval metrics & gate suite...");
  testMetricSplitOnMiniCorpus();
  testGatePassesOnHealthyResult();
  testGateFailsWhenThresholdBroken();
  testThresholdConstants();
  testSelfTestFailExitCode();
  console.log("\nAll SAGE eval metrics & gate tests passed successfully!");
}

run();
