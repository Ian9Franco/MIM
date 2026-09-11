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

const CORPUS_PATH = path.join(process.cwd(), "scripts/evaluation/datasets/crash-corpus.json");

function loadCorpus(): BenchmarkSample[] {
  return parseBenchmarkCorpus(JSON.parse(fs.readFileSync(CORPUS_PATH, "utf8")));
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

function testHistoricalCasesAreUnknownTrain(): void {
  const corpus = loadCorpus();
  const train = filterCorpusBySplit(corpus, "train");
  assert.equal(train.length, 125);
  assert.ok(train.every((sample) => sample.origin === "unknown"));
  assert.ok(train.every((sample) => sample.license === "unspecified"));
  assert.ok(train.every((sample) => sample.split === "train"));
  console.log("✔ 125 historical cases are origin=unknown split=train");
}

function testExactDuplicatesAreMarked(): void {
  const corpus = loadCorpus();
  const audit = auditSageCorpus(corpus);
  assert.ok(audit.exactDuplicateExtraCount >= 28, `expected extras, got ${audit.exactDuplicateExtraCount}`);
  assert.ok(audit.uniqueLogCount < audit.totalSamples);
  const marked = corpus.filter((sample) => sample.duplicateOf);
  assert.equal(marked.length, audit.exactDuplicateExtraCount);
  console.log("✔ exact duplicate extras are audited and marked duplicateOf");
}

function testStressSetIsSyntheticAndExcludedFromTrain(): void {
  const corpus = loadCorpus();
  const stress = filterCorpusBySplit(corpus, "stress");
  const holdout = filterCorpusBySplit(corpus, "holdout");
  assert.equal(stress.length, 10);
  assert.ok(stress.every((sample) => sample.origin === "synthetic"));
  assert.ok(stress.some((sample) => sample.id === "STRESS-001" && sample.notes?.includes("Truncated")));
  assert.ok(stress.some((sample) => sample.loader === "quilt"));
  assert.ok(stress.some((sample) => /Prism Launcher/i.test(sample.rawLog)));
  assert.equal(holdout.length, 0);
  console.log("✔ 10 synthetic stress cases exist; holdout is empty");
}

function testAuditFlagDoesNotFail(): void {
  const script = path.join(process.cwd(), "scripts/evaluation/sage-eval.ts");
  const run = spawnSync(
    "npx",
    ["ts-node", "--project", "tsconfig.scripts.json", script, "--audit"],
    { encoding: "utf8" },
  );
  assert.equal(run.status, 0, run.stderr || run.stdout);
  assert.match(run.stdout, /uniqueLogs=/);
  assert.match(run.stdout, /holdout=0/);
  console.log("✔ sage-eval --audit exits 0 and prints provenance counts");
}

function testHoldoutFlagIsEmptyAndUngated(): void {
  const script = path.join(process.cwd(), "scripts/evaluation/sage-eval.ts");
  const run = spawnSync(
    "npx",
    ["ts-node", "--project", "tsconfig.scripts.json", script, "--holdout"],
    { encoding: "utf8" },
  );
  assert.equal(run.status, 0, run.stderr || run.stdout);
  assert.match(run.stdout, /Holdout is empty/);
  console.log("✔ sage-eval --holdout is empty and does not apply the train gate");
}

function run(): void {
  console.log("Starting SAGE-01 corpus provenance suite...");
  testSchemaRejectsMissingProvenance();
  testHistoricalCasesAreUnknownTrain();
  testExactDuplicatesAreMarked();
  testStressSetIsSyntheticAndExcludedFromTrain();
  testAuditFlagDoesNotFail();
  testHoldoutFlagIsEmptyAndUngated();
  console.log("\nAll SAGE-01 corpus provenance tests passed successfully!");
}

run();
