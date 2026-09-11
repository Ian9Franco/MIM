/**
 * SAGE 2.0 — Quantitative Evaluation Harness
 */

import fs from "fs";
import path from "path";
import {
  SAGE_EVAL_THRESHOLDS,
  auditSageCorpus,
  buildSageEvaluationMarkdown,
  collectSageGateFailures,
  evaluateSageCorpus,
  filterCorpusBySplit,
  parseBenchmarkCorpus,
  type BenchmarkSample,
  type CorpusAudit,
  type SageEvaluationResult,
} from "./sageEvalCore";

const DATASETS_DIR = path.join(__dirname, "datasets");
const REGRESSION_CORPUS_PATH = path.join(DATASETS_DIR, "crash-corpus-regression.json");
const REAL_CORPUS_PATH = path.join(DATASETS_DIR, "crash-corpus.json");
const REPORT_OUTPUT_PATH = path.join(__dirname, "..", "..", "docs", "engines", "sage-eval.md");

function printConsoleSummary(label: string, result: SageEvaluationResult): void {
  console.log(`\n===============================================================`);
  console.log(`🔬 SAGE 2.0 EVALUATION — ${label} (${result.sampleCount} cases)`);
  console.log(`===============================================================\n`);

  console.log(`| Category                | Samples | Precision | Recall  | F1-Score |`);
  console.log(`|:------------------------|:-------:|:---------:|:-------:|:--------:|`);
  for (const row of result.categoryRows) {
    console.log(
      `| ${row.category.padEnd(23)} | ${String(row.samples).padStart(7)} | ${row.precision.toFixed(1).padStart(8)}% | ${row.recall.toFixed(1).padStart(6)}% | ${row.f1.toFixed(1).padStart(7)}% |`,
    );
  }

  console.log(`---------------------------------------------------------------`);
  console.log(`| Loader                  | Samples | Category accuracy |`);
  for (const row of result.loaderRows) {
    console.log(
      `| ${row.loader.padEnd(23)} | ${String(row.samples).padStart(7)} | ${row.categoryAccuracy.toFixed(1).padStart(16)}% |`,
    );
  }

  console.log(`---------------------------------------------------------------`);
  console.log(`🎯 Overall Category Accuracy: ${result.overallCategoryAccuracy.toFixed(1)}%`);
  console.log(`🏆 Macro F1-Score:           ${result.macroF1.toFixed(1)}%`);
  console.log(`🔍 Top-1 (histórico):         ${result.top1Historical.percentage.toFixed(1)}% (${result.top1Historical.numerator}/${result.top1Historical.denominator})`);
  console.log(`📊 Top-3 (histórico):         ${result.top3Historical.percentage.toFixed(1)}% (${result.top3Historical.numerator}/${result.top3Historical.denominator})`);
  console.log(`🎯 Top-1 atribución:          ${result.top1Attribution.percentage.toFixed(1)}% (${result.top1Attribution.numerator}/${result.top1Attribution.denominator})`);
  console.log(`🎯 Top-3 atribución:          ${result.top3Attribution.percentage.toFixed(1)}% (${result.top3Attribution.numerator}/${result.top3Attribution.denominator})`);
  console.log(`🧩 Sistémico sin culpable:    ${result.systemicCategoryCorrect.percentage.toFixed(1)}% (${result.systemicCategoryCorrect.numerator}/${result.systemicCategoryCorrect.denominator})`);
  console.log(`⚡ Mean Inference Latency:    ${result.meanLatencyMs.toFixed(2)} ms/log`);
  console.log(`===============================================================\n`);
}

function printAudit(label: string, audit: CorpusAudit): void {
  console.log(`📋 ${label}`);
  console.log(`   total=${audit.totalSamples} uniqueLogs=${audit.uniqueLogCount} exactExtraCopies=${audit.exactDuplicateExtraCount}`);
  console.log(`   origin unknown=${audit.originCounts.unknown} synthetic=${audit.originCounts.synthetic} community=${audit.originCounts.community} public-issue=${audit.originCounts["public-issue"]}`);
  console.log(`   split train=${audit.splitCounts.train} stress=${audit.splitCounts.stress} holdout=${audit.splitCounts.holdout}`);
  if (audit.totalSamples === 0) {
    console.log("   (empty — ready for real captured logs)");
    return;
  }
  console.log(`   logLength min=${audit.logLength.min} p50=${audit.logLength.p50} mean=${audit.logLength.mean.toFixed(0)} max=${audit.logLength.max}`);
  for (const [loader, count] of Object.entries(audit.loaderCounts).sort((left, right) => right[1] - left[1])) {
    console.log(`   loader ${loader}=${count}`);
  }
}

function runSelfTestFail(): number {
  const forced = evaluateSageCorpus([]);
  const failures = collectSageGateFailures(forced, {
    ...SAGE_EVAL_THRESHOLDS,
    MACRO_F1_MIN: 101,
  });
  if (failures.length === 0) {
    console.error("❌ Self-test gate expected at least one failure but found none.");
    return 1;
  }
  console.log("✔ Self-test gate failure path verified.");
  return 1;
}

function loadCorpusFile(filePath: string): BenchmarkSample[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Corpus not found at: ${filePath}`);
  }
  const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  return parseBenchmarkCorpus(Array.isArray(raw) ? raw : []);
}

function loadRegressionCorpus(): BenchmarkSample[] {
  return loadCorpusFile(REGRESSION_CORPUS_PATH);
}

function loadRealCorpus(): BenchmarkSample[] {
  return loadCorpusFile(REAL_CORPUS_PATH);
}

function writeReport(
  regressionTrain: SageEvaluationResult,
  regressionAudit: CorpusAudit,
  realAudit: CorpusAudit,
  holdout: SageEvaluationResult,
): void {
  const evaluationDate = new Date().toISOString().split("T")[0] ?? "unknown-date";
  fs.writeFileSync(
    REPORT_OUTPUT_PATH,
    buildSageEvaluationMarkdown({
      evaluationDate,
      regression: { train: regressionTrain, audit: regressionAudit },
      real: { audit: realAudit, holdout: holdout.sampleCount > 0 ? holdout : undefined },
    }),
    "utf-8",
  );
  console.log(`📄 Written complete evaluation report to: ${REPORT_OUTPUT_PATH}`);
}

function applyRegressionGate(result: SageEvaluationResult): number {
  const failures = collectSageGateFailures(result);
  if (failures.length > 0) {
    console.error("❌ SAGE evaluation gate failed (regression corpus):");
    for (const failure of failures) {
      console.error(`   - ${failure.metric}: measured ${failure.measured.toFixed(2)}, required threshold ${failure.threshold}`);
    }
    return 1;
  }
  console.log("✅ SAGE evaluation gate passed (regression corpus only).");
  return 0;
}

function runEvaluation(): number {
  if (process.argv.includes("--self-test-fail")) {
    return runSelfTestFail();
  }

  let regressionSamples: BenchmarkSample[];
  let realSamples: BenchmarkSample[];
  try {
    regressionSamples = loadRegressionCorpus();
    realSamples = loadRealCorpus();
  } catch (error) {
    console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }

  const regressionAudit = auditSageCorpus(regressionSamples);
  const realAudit = auditSageCorpus(realSamples);
  const regressionTrainSamples = filterCorpusBySplit(regressionSamples, "train");
  const holdoutSamples = filterCorpusBySplit(realSamples, "holdout");

  if (process.argv.includes("--audit")) {
    printAudit("Regression fixture (CI gate)", regressionAudit);
    printAudit("Real corpus (crash-corpus.json)", realAudit);
    return 0;
  }

  if (process.argv.includes("--holdout")) {
    if (holdoutSamples.length === 0) {
      console.log("Real holdout is empty. Add captured logs to scripts/evaluation/datasets/crash-corpus.json with split: holdout.");
      return 0;
    }
    printConsoleSummary("real holdout (not gated)", evaluateSageCorpus(holdoutSamples));
    return 0;
  }

  printAudit("Regression fixture (CI gate)", regressionAudit);
  printAudit("Real corpus (crash-corpus.json)", realAudit);
  const regressionTrain = evaluateSageCorpus(regressionTrainSamples);
  printConsoleSummary("regression / SAGE-03 gate", regressionTrain);
  writeReport(regressionTrain, regressionAudit, realAudit, evaluateSageCorpus(holdoutSamples));
  return applyRegressionGate(regressionTrain);
}

process.exit(runEvaluation());
