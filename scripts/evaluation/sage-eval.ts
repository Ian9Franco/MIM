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

const CORPUS_PATH = path.join(__dirname, "datasets", "crash-corpus.json");
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

function printAudit(audit: CorpusAudit): void {
  console.log("📋 Corpus audit (SAGE-01)");
  console.log(`   total=${audit.totalSamples} uniqueLogs=${audit.uniqueLogCount} exactExtraCopies=${audit.exactDuplicateExtraCount}`);
  console.log(`   origin unknown=${audit.originCounts.unknown} synthetic=${audit.originCounts.synthetic} community=${audit.originCounts.community} public-issue=${audit.originCounts["public-issue"]}`);
  console.log(`   split train=${audit.splitCounts.train} stress=${audit.splitCounts.stress} holdout=${audit.splitCounts.holdout}`);
  console.log(`   logLength min=${audit.logLength.min} p50=${audit.logLength.p50} mean=${audit.logLength.mean.toFixed(0)} max=${audit.logLength.max}`);
  for (const [loader, count] of Object.entries(audit.loaderCounts).sort((left, right) => right[1] - left[1])) {
    console.log(`   loader ${loader}=${count}`);
  }
  for (const group of audit.exactDuplicateGroups) {
    console.log(`   exact ${group.canonicalId} x${group.sampleCount}`);
  }
  for (const group of audit.nearDuplicateGroups) {
    console.log(`   near  ${group.canonicalId} x${group.sampleCount}`);
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

function loadCorpus(): BenchmarkSample[] {
  if (!fs.existsSync(CORPUS_PATH)) {
    throw new Error(`Corpus not found at: ${CORPUS_PATH}`);
  }
  return parseBenchmarkCorpus(JSON.parse(fs.readFileSync(CORPUS_PATH, "utf-8")));
}

function writeReport(
  train: SageEvaluationResult,
  audit: CorpusAudit,
  stress: SageEvaluationResult,
  holdout: SageEvaluationResult,
): void {
  const evaluationDate = new Date().toISOString().split("T")[0] ?? "unknown-date";
  fs.writeFileSync(
    REPORT_OUTPUT_PATH,
    buildSageEvaluationMarkdown({ evaluationDate, train, audit, stress, holdout }),
    "utf-8",
  );
  console.log(`📄 Written complete evaluation report to: ${REPORT_OUTPUT_PATH}`);
}

function applyTrainGate(result: SageEvaluationResult): number {
  const failures = collectSageGateFailures(result);
  if (failures.length > 0) {
    console.error("❌ SAGE evaluation gate failed:");
    for (const failure of failures) {
      console.error(`   - ${failure.metric}: measured ${failure.measured.toFixed(2)}, required threshold ${failure.threshold}`);
    }
    return 1;
  }
  console.log("✅ SAGE evaluation gate passed (train split only).");
  return 0;
}

function runEvaluation(): number {
  if (process.argv.includes("--self-test-fail")) {
    return runSelfTestFail();
  }

  let samples: BenchmarkSample[];
  try {
    samples = loadCorpus();
  } catch (error) {
    console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }

  const audit = auditSageCorpus(samples);
  const trainSamples = filterCorpusBySplit(samples, "train");
  const stressSamples = filterCorpusBySplit(samples, "stress");
  const holdoutSamples = filterCorpusBySplit(samples, "holdout");

  if (process.argv.includes("--audit")) {
    printAudit(audit);
    return 0;
  }

  if (process.argv.includes("--holdout")) {
    if (holdoutSamples.length === 0) {
      console.log("Holdout is empty. SAGE-01 Capa B needs unseen real logs.");
      return 0;
    }
    printConsoleSummary("holdout", evaluateSageCorpus(holdoutSamples));
    return 0;
  }

  if (process.argv.includes("--stress")) {
    printConsoleSummary("stress (not gated)", evaluateSageCorpus(stressSamples));
    return 0;
  }

  printAudit(audit);
  const train = evaluateSageCorpus(trainSamples);
  printConsoleSummary("train / SAGE-03 gate", train);
  writeReport(train, audit, evaluateSageCorpus(stressSamples), evaluateSageCorpus(holdoutSamples));
  return applyTrainGate(train);
}

process.exit(runEvaluation());
