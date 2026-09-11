/**
 * SAGE 2.0 — Quantitative Evaluation Harness
 */

import fs from "fs";
import path from "path";
import {
  SAGE_EVAL_THRESHOLDS,
  buildSageEvaluationMarkdown,
  collectSageGateFailures,
  evaluateSageCorpus,
  parseBenchmarkCorpus,
} from "./sageEvalCore";

const CORPUS_PATH = path.join(__dirname, "datasets", "crash-corpus.json");
const REPORT_OUTPUT_PATH = path.join(__dirname, "..", "..", "docs", "engines", "sage-eval.md");

function printConsoleSummary(result: ReturnType<typeof evaluateSageCorpus>): void {
  console.log(`\n===============================================================`);
  console.log(`🔬 SAGE 2.0 EVALUATION ENGINE — Running on ${result.sampleCount} test cases`);
  console.log(`===============================================================\n`);

  console.log(`| Category                | Samples | Precision | Recall  | F1-Score |`);
  console.log(`|:------------------------|:-------:|:---------:|:-------:|:--------:|`);
  for (const row of result.categoryRows) {
    console.log(
      `| ${row.category.padEnd(23)} | ${String(row.samples).padStart(7)} | ${row.precision.toFixed(1).padStart(8)}% | ${row.recall.toFixed(1).padStart(6)}% | ${row.f1.toFixed(1).padStart(7)}% |`,
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

function runEvaluation(): number {
  if (process.argv.includes("--self-test-fail")) {
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

  if (!fs.existsSync(CORPUS_PATH)) {
    console.error(`❌ Corpus not found at: ${CORPUS_PATH}`);
    return 1;
  }

  const samples = parseBenchmarkCorpus(JSON.parse(fs.readFileSync(CORPUS_PATH, "utf-8")));
  const result = evaluateSageCorpus(samples);
  printConsoleSummary(result);

  const evaluationDate = new Date().toISOString().split("T")[0];
  fs.writeFileSync(REPORT_OUTPUT_PATH, buildSageEvaluationMarkdown(result, evaluationDate), "utf-8");
  console.log(`📄 Written complete evaluation report to: ${REPORT_OUTPUT_PATH}`);

  const failures = collectSageGateFailures(result);
  if (failures.length > 0) {
    console.error("❌ SAGE evaluation gate failed:");
    for (const failure of failures) {
      console.error(`   - ${failure.metric}: measured ${failure.measured.toFixed(2)}, required threshold ${failure.threshold}`);
    }
    return 1;
  }

  console.log("✅ SAGE evaluation gate passed.");
  return 0;
}

process.exit(runEvaluation());
