import { z } from "zod";
import type { CrashCategory } from "../../lib/intelligence/sage/types";
import { SageCrashEngine } from "../../lib/intelligence/sage/engine";

export interface BenchmarkSample {
  id: string;
  category: CrashCategory;
  loader: string;
  minecraftVersion: string;
  expectedCulprit?: string;
  rawLog: string;
}

const crashCategorySchema = z.enum([
  "MISSING_DEPENDENCY",
  "VERSION_CONFLICT",
  "MIXIN_FAILURE",
  "JAVA_INCOMPATIBILITY",
  "MOD_CONFLICT",
  "CORRUPTED_WORLD",
  "OUT_OF_MEMORY",
  "UNKNOWN_RUNTIME",
]);

export const benchmarkSampleSchema = z.object({
  id: z.string(),
  category: crashCategorySchema,
  loader: z.string(),
  minecraftVersion: z.string(),
  expectedCulprit: z.string().optional(),
  rawLog: z.string(),
});

export const benchmarkCorpusSchema = z.array(benchmarkSampleSchema);

export function parseBenchmarkCorpus(raw: unknown): BenchmarkSample[] {
  return benchmarkCorpusSchema.parse(raw);
}

export interface SageEvalThresholds {
  MACRO_F1_MIN: number;
  TOP3_MIN: number;
  LATENCY_MAX_MS: number;
}

export const SAGE_EVAL_THRESHOLDS: SageEvalThresholds = {
  MACRO_F1_MIN: 85,
  TOP3_MIN: 95,
  LATENCY_MAX_MS: 15,
};

export const SAGE_EVAL_CATEGORIES: CrashCategory[] = [
  "MISSING_DEPENDENCY",
  "VERSION_CONFLICT",
  "MIXIN_FAILURE",
  "JAVA_INCOMPATIBILITY",
  "MOD_CONFLICT",
  "CORRUPTED_WORLD",
  "OUT_OF_MEMORY",
  "UNKNOWN_RUNTIME",
];

export interface RatioMetric {
  numerator: number;
  denominator: number;
  percentage: number;
}

export interface CategoryStatRow {
  category: CrashCategory;
  samples: number;
  precision: number;
  recall: number;
  f1: number;
}

export interface SageEvaluationResult {
  sampleCount: number;
  overallCategoryAccuracy: number;
  macroF1: number;
  meanLatencyMs: number;
  top1Historical: RatioMetric;
  top3Historical: RatioMetric;
  top1Attribution: RatioMetric;
  top3Attribution: RatioMetric;
  systemicCategoryCorrect: RatioMetric;
  categoryRows: CategoryStatRow[];
}

type CategoryStat = { tp: number; fp: number; fn: number; totalExpected: number };
type CategoryStats = Map<CrashCategory, CategoryStat>;

interface HistoricalCounters {
  top1HistoricalMatches: number;
  top3HistoricalMatches: number;
  top1AttributionMatches: number;
  top3AttributionMatches: number;
  systemicCategoryMatches: number;
  historicalDenominator: number;
  attributionDenominator: number;
  systemicDenominator: number;
}

function computePercentage(numerator: number, denominator: number): number {
  if (denominator <= 0) return 100;
  return (numerator / denominator) * 100;
}

function ratio(numerator: number, denominator: number): RatioMetric {
  return {
    numerator,
    denominator,
    percentage: computePercentage(numerator, denominator),
  };
}

function createEmptyCategoryStats(): CategoryStats {
  const stats: CategoryStats = new Map();
  for (const category of SAGE_EVAL_CATEGORIES) {
    stats.set(category, { tp: 0, fp: 0, fn: 0, totalExpected: 0 });
  }
  return stats;
}

function isKnownCategory(value: string): value is CrashCategory {
  return (SAGE_EVAL_CATEGORIES as readonly string[]).includes(value);
}

function recordCategoryOutcome(
  stats: CategoryStats,
  expected: CrashCategory,
  predicted: string,
  categoryMatch: boolean,
): void {
  const expectedStat = stats.get(expected);
  if (!expectedStat) return;

  expectedStat.totalExpected += 1;
  if (categoryMatch) {
    expectedStat.tp += 1;
    return;
  }

  expectedStat.fn += 1;
  if (isKnownCategory(predicted)) {
    const predictedStat = stats.get(predicted);
    if (predictedStat) {
      predictedStat.fp += 1;
    }
  }
}

function createHistoricalCounters(): HistoricalCounters {
  return {
    top1HistoricalMatches: 0,
    top3HistoricalMatches: 0,
    top1AttributionMatches: 0,
    top3AttributionMatches: 0,
    systemicCategoryMatches: 0,
    historicalDenominator: 0,
    attributionDenominator: 0,
    systemicDenominator: 0,
  };
}

function scoreAttributionCase(
  counters: HistoricalCounters,
  report: ReturnType<typeof SageCrashEngine.diagnose>,
  expectedCulprit: string,
): void {
  counters.attributionDenominator += 1;
  const expected = expectedCulprit.toLowerCase();
  const top1Match = report.culpritMod?.toLowerCase() === expected;
  const top3Match = report.suspectedMods.slice(0, 3).some((mod) => mod.toLowerCase() === expected);

  if (top1Match) {
    counters.top1AttributionMatches += 1;
    counters.top1HistoricalMatches += 1;
  }
  if (top3Match) {
    counters.top3AttributionMatches += 1;
    counters.top3HistoricalMatches += 1;
  }
}

function scoreSystemicCase(counters: HistoricalCounters, categoryMatch: boolean): void {
  counters.systemicDenominator += 1;
  if (categoryMatch) {
    counters.systemicCategoryMatches += 1;
    counters.top1HistoricalMatches += 1;
    counters.top3HistoricalMatches += 1;
  }
}

function computeF1Row(category: CrashCategory, stat: CategoryStat): CategoryStatRow {
  const precision = computePercentage(stat.tp, stat.tp + stat.fp);
  const recall = computePercentage(stat.tp, stat.tp + stat.fn);
  const sum = precision + recall;
  const f1 = sum > 0 ? (2 * precision * recall) / sum : 0;
  return {
    category,
    samples: stat.totalExpected,
    precision,
    recall,
    f1,
  };
}

function buildCategoryRows(stats: CategoryStats): CategoryStatRow[] {
  const emptyStat: CategoryStat = { tp: 0, fp: 0, fn: 0, totalExpected: 0 };
  return SAGE_EVAL_CATEGORIES.map((category) => computeF1Row(category, stats.get(category) ?? emptyStat));
}

function computeMacroF1(categoryRows: CategoryStatRow[]): number {
  if (categoryRows.length === 0) return 0;
  const total = categoryRows.reduce((sum, row) => sum + row.f1, 0);
  return total / categoryRows.length;
}

export function evaluateSageCorpus(samples: BenchmarkSample[]): SageEvaluationResult {
  const stats = createEmptyCategoryStats();
  const counters = createHistoricalCounters();
  let totalCorrectCategory = 0;
  let totalLatencyMs = 0;

  for (const sample of samples) {
    const report = SageCrashEngine.diagnose(sample.rawLog);
    totalLatencyMs += report.diagnosisDurationMs ?? report.inferenceDurationMs ?? 0;

    const categoryMatch = report.category === sample.category;
    recordCategoryOutcome(stats, sample.category, report.category, categoryMatch);
    if (categoryMatch) {
      totalCorrectCategory += 1;
    }

    counters.historicalDenominator += 1;
    if (sample.expectedCulprit) {
      scoreAttributionCase(counters, report, sample.expectedCulprit);
    } else {
      scoreSystemicCase(counters, categoryMatch);
    }
  }

  const categoryRows = buildCategoryRows(stats);
  const sampleCount = samples.length;

  return {
    sampleCount,
    overallCategoryAccuracy: sampleCount > 0 ? (totalCorrectCategory / sampleCount) * 100 : 0,
    macroF1: computeMacroF1(categoryRows),
    meanLatencyMs: sampleCount > 0 ? totalLatencyMs / sampleCount : 0,
    top1Historical: ratio(counters.top1HistoricalMatches, counters.historicalDenominator),
    top3Historical: ratio(counters.top3HistoricalMatches, counters.historicalDenominator),
    top1Attribution: ratio(counters.top1AttributionMatches, counters.attributionDenominator),
    top3Attribution: ratio(counters.top3AttributionMatches, counters.attributionDenominator),
    systemicCategoryCorrect: ratio(counters.systemicCategoryMatches, counters.systemicDenominator),
    categoryRows,
  };
}

export interface SageGateFailure {
  metric: string;
  measured: number;
  threshold: number;
}

export function collectSageGateFailures(
  result: SageEvaluationResult,
  thresholds: SageEvalThresholds = SAGE_EVAL_THRESHOLDS,
): SageGateFailure[] {
  const failures: SageGateFailure[] = [];
  if (result.macroF1 < thresholds.MACRO_F1_MIN) {
    failures.push({ metric: "Macro F1-Score", measured: result.macroF1, threshold: thresholds.MACRO_F1_MIN });
  }
  if (result.top3Historical.percentage < thresholds.TOP3_MIN) {
    failures.push({
      metric: "Top-3 (histórico, mezclado)",
      measured: result.top3Historical.percentage,
      threshold: thresholds.TOP3_MIN,
    });
  }
  if (result.meanLatencyMs > thresholds.LATENCY_MAX_MS) {
    failures.push({
      metric: "Mean Inference Latency",
      measured: result.meanLatencyMs,
      threshold: thresholds.LATENCY_MAX_MS,
    });
  }
  return failures;
}

function formatPercentageStatus(measured: number, threshold: number): string {
  const pass = measured >= threshold;
  const icon = pass ? "✅ Pass" : "❌ Fail";
  return `${icon} (${measured.toFixed(1)}%)`;
}

function formatLatencyStatus(measured: number, threshold: number): string {
  const pass = measured <= threshold;
  const icon = pass ? "✅ Pass" : "❌ Fail";
  return `${icon} (${measured.toFixed(2)} ms)`;
}

export function formatRatioLine(label: string, metric: RatioMetric): string {
  return `- **${label}:** ${metric.percentage.toFixed(1)}% (${metric.numerator}/${metric.denominator})`;
}

export function buildSageEvaluationMarkdown(result: SageEvaluationResult, evaluationDate: string): string {
  const markdownRows = result.categoryRows.map(
    (row) =>
      `| \`${row.category}\` | ${row.samples} | ${row.precision.toFixed(1)}% | ${row.recall.toFixed(1)}% | ${row.f1.toFixed(1)}% |`,
  );

  return `# SAGE 2.0 Crash Intelligence Engine — Quantitative Evaluation

> **Evaluation Date:** ${evaluationDate}  
> **Benchmark Dataset:** ${result.sampleCount} real-world & representative Minecraft crash logs  
> **Target Loaders:** Fabric, Forge, NeoForge, Quilt, Vanilla  

---

## 📊 Summary Performance Metrics

| Metric | Measured Value | Benchmark Target | Status |
|:---|:---:|:---:|:---:|
| **Benchmark Classification Accuracy** | **${result.overallCategoryAccuracy.toFixed(1)}%** | > ${SAGE_EVAL_THRESHOLDS.MACRO_F1_MIN}.0% | ${formatPercentageStatus(result.overallCategoryAccuracy, SAGE_EVAL_THRESHOLDS.MACRO_F1_MIN)} |
| **Macro F1-Score** | **${result.macroF1.toFixed(1)}%** | > ${SAGE_EVAL_THRESHOLDS.MACRO_F1_MIN}.0% | ${formatPercentageStatus(result.macroF1, SAGE_EVAL_THRESHOLDS.MACRO_F1_MIN)} |
| **Top-1 (histórico, mezclado)** | **${result.top1Historical.percentage.toFixed(1)}%** | informativo | ${result.top1Historical.numerator}/${result.top1Historical.denominator} |
| **Top-3 (histórico, mezclado)** | **${result.top3Historical.percentage.toFixed(1)}%** | > ${SAGE_EVAL_THRESHOLDS.TOP3_MIN}.0% | ${formatPercentageStatus(result.top3Historical.percentage, SAGE_EVAL_THRESHOLDS.TOP3_MIN)} |
| **Top-1 atribución (con culpable)** | **${result.top1Attribution.percentage.toFixed(1)}%** | informativo | ${result.top1Attribution.numerator}/${result.top1Attribution.denominator} |
| **Top-3 atribución (con culpable)** | **${result.top3Attribution.percentage.toFixed(1)}%** | informativo | ${result.top3Attribution.numerator}/${result.top3Attribution.denominator} |
| **Acierto sistémico sin culpable** | **${result.systemicCategoryCorrect.percentage.toFixed(1)}%** | informativo | ${result.systemicCategoryCorrect.numerator}/${result.systemicCategoryCorrect.denominator} |
| **Mean Inference Latency** | **${result.meanLatencyMs.toFixed(2)} ms** | < ${SAGE_EVAL_THRESHOLDS.LATENCY_MAX_MS}.0 ms | ${formatLatencyStatus(result.meanLatencyMs, SAGE_EVAL_THRESHOLDS.LATENCY_MAX_MS)} |

### Métricas desglosadas (SAGE-02)

${formatRatioLine("Top-1 (histórico, mezclado)", result.top1Historical)}
${formatRatioLine("Top-3 (histórico, mezclado)", result.top3Historical)}
${formatRatioLine("Top-1 atribución (solo casos con expectedCulprit)", result.top1Attribution)}
${formatRatioLine("Top-3 atribución (solo casos con expectedCulprit)", result.top3Attribution)}
${formatRatioLine("Categoría correcta sin culpable atribuible", result.systemicCategoryCorrect)}

---

## 🔬 Category Breakdown

| Crash Category | Sample Count | Precision | Recall | F1-Score |
|:---|:---:|:---:|:---:|:---:|
${markdownRows.join("\n")}

---

## 🚀 Reproducibility

To re-run this evaluation benchmark on your local environment:

\`\`\`bash
npm run eval:sage
\`\`\`

CI gate thresholds (\`SAGE-03\`): Macro F1 ≥ ${SAGE_EVAL_THRESHOLDS.MACRO_F1_MIN}%, Top-3 histórico ≥ ${SAGE_EVAL_THRESHOLDS.TOP3_MIN}%, latencia media ≤ ${SAGE_EVAL_THRESHOLDS.LATENCY_MAX_MS} ms.
`;
}

