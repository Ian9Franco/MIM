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

function ratio(numerator: number, denominator: number): RatioMetric {
  return {
    numerator,
    denominator,
    percentage: denominator > 0 ? (numerator / denominator) * 100 : 100,
  };
}

function createEmptyCategoryStats(): CategoryStats {
  return new Map(
    SAGE_EVAL_CATEGORIES.map((category) => [category, { tp: 0, fp: 0, fn: 0, totalExpected: 0 }]),
  );
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

  expectedStat.totalExpected++;
  if (categoryMatch) {
    expectedStat.tp++;
    return;
  }

  expectedStat.fn++;
  if (isKnownCategory(predicted)) {
    const predictedStat = stats.get(predicted);
    if (predictedStat) predictedStat.fp++;
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
  counters.attributionDenominator++;
  const expected = expectedCulprit.toLowerCase();
  const top1Match = report.culpritMod?.toLowerCase() === expected;
  const top3Match = report.suspectedMods.slice(0, 3).some((mod) => mod.toLowerCase() === expected);

  if (top1Match) counters.top1AttributionMatches++;
  if (top3Match) counters.top3AttributionMatches++;
  if (top1Match) counters.top1HistoricalMatches++;
  if (top3Match) counters.top3HistoricalMatches++;
}

function scoreSystemicCase(counters: HistoricalCounters, categoryMatch: boolean): void {
  counters.systemicDenominator++;
  if (!categoryMatch) return;
  counters.systemicCategoryMatches++;
  counters.top1HistoricalMatches++;
  counters.top3HistoricalMatches++;
}

function buildCategoryRows(stats: CategoryStats): CategoryStatRow[] {
  return SAGE_EVAL_CATEGORIES.map((category) => {
    const row = stats.get(category) ?? { tp: 0, fp: 0, fn: 0, totalExpected: 0 };
    const precision = row.tp + row.fp > 0 ? (row.tp / (row.tp + row.fp)) * 100 : 100;
    const recall = row.tp + row.fn > 0 ? (row.tp / (row.tp + row.fn)) * 100 : 100;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
    return { category, samples: row.totalExpected, precision, recall, f1 };
  });
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
    if (categoryMatch) totalCorrectCategory++;

    counters.historicalDenominator++;
    if (sample.expectedCulprit) {
      scoreAttributionCase(counters, report, sample.expectedCulprit);
    } else {
      scoreSystemicCase(counters, categoryMatch);
    }
  }

  const categoryRows = buildCategoryRows(stats);
  const macroF1 = categoryRows.reduce((sum, row) => sum + row.f1, 0) / SAGE_EVAL_CATEGORIES.length;

  return {
    sampleCount: samples.length,
    overallCategoryAccuracy: samples.length > 0 ? (totalCorrectCategory / samples.length) * 100 : 0,
    macroF1,
    meanLatencyMs: samples.length > 0 ? totalLatencyMs / samples.length : 0,
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

function formatMetricStatus(measured: number, threshold: number, higherIsBetter: boolean): string {
  const pass = higherIsBetter ? measured >= threshold : measured <= threshold;
  return pass ? `✅ Pass (${measured.toFixed(higherIsBetter ? 1 : 2)}${higherIsBetter ? "%" : " ms"})` : `❌ Fail (${measured.toFixed(higherIsBetter ? 1 : 2)}${higherIsBetter ? "%" : " ms"})`;
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
| **Benchmark Classification Accuracy** | **${result.overallCategoryAccuracy.toFixed(1)}%** | > ${SAGE_EVAL_THRESHOLDS.MACRO_F1_MIN}.0% | ${formatMetricStatus(result.overallCategoryAccuracy, SAGE_EVAL_THRESHOLDS.MACRO_F1_MIN, true)} |
| **Macro F1-Score** | **${result.macroF1.toFixed(1)}%** | > ${SAGE_EVAL_THRESHOLDS.MACRO_F1_MIN}.0% | ${formatMetricStatus(result.macroF1, SAGE_EVAL_THRESHOLDS.MACRO_F1_MIN, true)} |
| **Top-1 (histórico, mezclado)** | **${result.top1Historical.percentage.toFixed(1)}%** | informativo | ${result.top1Historical.numerator}/${result.top1Historical.denominator} |
| **Top-3 (histórico, mezclado)** | **${result.top3Historical.percentage.toFixed(1)}%** | > ${SAGE_EVAL_THRESHOLDS.TOP3_MIN}.0% | ${formatMetricStatus(result.top3Historical.percentage, SAGE_EVAL_THRESHOLDS.TOP3_MIN, true)} |
| **Top-1 atribución (con culpable)** | **${result.top1Attribution.percentage.toFixed(1)}%** | informativo | ${result.top1Attribution.numerator}/${result.top1Attribution.denominator} |
| **Top-3 atribución (con culpable)** | **${result.top3Attribution.percentage.toFixed(1)}%** | informativo | ${result.top3Attribution.numerator}/${result.top3Attribution.denominator} |
| **Acierto sistémico sin culpable** | **${result.systemicCategoryCorrect.percentage.toFixed(1)}%** | informativo | ${result.systemicCategoryCorrect.numerator}/${result.systemicCategoryCorrect.denominator} |
| **Mean Inference Latency** | **${result.meanLatencyMs.toFixed(2)} ms** | < ${SAGE_EVAL_THRESHOLDS.LATENCY_MAX_MS}.0 ms | ${formatMetricStatus(result.meanLatencyMs, SAGE_EVAL_THRESHOLDS.LATENCY_MAX_MS, false)} |

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
