/**
 * Test Suite: SAGE-01 corpus provenance, splits, and duplicate audit
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  auditSageCorpus,
  filterCorpusBySplit,
  parseBenchmarkCorpus,
  type BenchmarkSample,
} from "../evaluation/sageEvalCore";

const DATASETS_DIR = path.join(process.cwd(), "scripts/evaluation/datasets");
const REAL_CORPUS_PATH = path.join(DATASETS_DIR, "crash-corpus.json");
const REGRESSION_CORPUS_PATH = path.join(DATASETS_DIR, "crash-corpus-regression.json");

function loadRegressionCorpus(): BenchmarkSample[] {
  return parseBenchmarkCorpus(JSON.parse(fs.readFileSync(REGRESSION_CORPUS_PATH, "utf8")));
}

function loadRealCorpus(): BenchmarkSample[] {
  return parseBenchmarkCorpus(JSON.parse(fs.readFileSync(REAL_CORPUS_PATH, "utf8")));
}

function testSchemaRejectsMissingProvenance(): void {
  assert.throws(() => {
    parseBenchmarkCorpus([
      {
        id: "bad",
        category: "OUT_OF_MEMORY",
        loader: "fabric",
        minecraftVersion: "1.20.1",
        rawLog: "java.lang.OutOfMemoryError: Java heap space",
      },
    ]);
  });
  console.log("✔ corpus schema requires provenance fields");
}

function testRealCorpusHoldoutSeed(): void {
  const corpus = loadRealCorpus();
  assert.equal(corpus.length, 1);
  const [seed] = corpus;
  assert.equal(seed.id, "SRV5-FIXTURE-001");
  assert.equal(seed.split, "holdout");
  assert.notEqual(seed.origin, "synthetic");
  assert.ok(!corpus.some((sample) => sample.origin === "synthetic"));
  console.log("✔ crash-corpus.json has SRV-5 fixture holdout seed (not synthetic)");
}

function testRegressionFixtureIsSyntheticTrainOnly(): void {
  const corpus = loadRegressionCorpus();
  const train = filterCorpusBySplit(corpus, "train");
  assert.equal(train.length, 125);
  assert.ok(train.every((sample) => sample.origin === "synthetic"));
  assert.ok(train.every((sample) => sample.split === "train"));
  assert.equal(filterCorpusBySplit(corpus, "holdout").length, 0);
  assert.equal(filterCorpusBySplit(corpus, "stress").length, 0);
  console.log("✔ regression fixture is 125 synthetic train cases, isolated from real corpus");
}

function testExactDuplicatesAreMarkedInRegression(): void {
  const corpus = loadRegressionCorpus();
  const audit = auditSageCorpus(corpus);
  assert.ok(audit.exactDuplicateExtraCount >= 28, `expected extras, got ${audit.exactDuplicateExtraCount}`);
  assert.ok(audit.uniqueLogCount < audit.totalSamples);
  const marked = corpus.filter((sample) => sample.duplicateOf);
  assert.equal(marked.length, audit.exactDuplicateExtraCount);
  console.log("✔ regression duplicate extras are audited and marked duplicateOf");
}

function testAuditFlagReportsBothCorpora(): void {
  const script = path.join(process.cwd(), "scripts/evaluation/sage-eval.ts");
  const run = spawnSync(
    "npx",
    ["ts-node", "--project", "tsconfig.scripts.json", script, "--audit"],
    { encoding: "utf8", shell: true },
  );
  assert.equal(run.status, 0, run.stderr || run.stdout);
  assert.match(run.stdout, /Regression fixture/);
  assert.match(run.stdout, /Real corpus/);
  assert.match(run.stdout, /SRV5-FIXTURE-001|holdout=1/);
  console.log("✔ sage-eval --audit reports regression and real holdout seed");
}

function testHoldoutFlagScoresSeedWithoutGate(): void {
  const script = path.join(process.cwd(), "scripts/evaluation/sage-eval.ts");
  const run = spawnSync(
    "npx",
    ["ts-node", "--project", "tsconfig.scripts.json", script, "--holdout"],
    { encoding: "utf8", shell: true },
  );
  assert.equal(run.status, 0, run.stderr || run.stdout);
  assert.match(run.stdout, /real holdout \(not gated\)/);
  assert.doesNotMatch(run.stdout, /SAGE evaluation gate failed/);
  console.log("✔ sage-eval --holdout scores the seed and does not apply the regression gate");
}

function run(): void {
  console.log("Starting SAGE-01 corpus provenance suite...");
  testSchemaRejectsMissingProvenance();
  testRealCorpusHoldoutSeed();
  testRegressionFixtureIsSyntheticTrainOnly();
  testExactDuplicatesAreMarkedInRegression();
  testAuditFlagReportsBothCorpora();
  testHoldoutFlagScoresSeedWithoutGate();
  console.log("\nAll SAGE-01 corpus provenance tests passed successfully!");
}

run();
