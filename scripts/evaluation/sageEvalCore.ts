import { createHash } from "crypto";
import { z } from "zod";
import type { CrashCategory } from "../../lib/intelligence/sage/types";
import { SageCrashEngine } from "../../lib/intelligence/sage/engine";

export const SAMPLE_ORIGINS = ["community", "public-issue", "synthetic", "unknown"] as const;
export const SAMPLE_SPLITS = ["train", "holdout", "stress"] as const;
export const NEAR_DUPLICATE_PREFIX_LENGTH = 180;

export type SampleOrigin = (typeof SAMPLE_ORIGINS)[number];
export type SampleSplit = (typeof SAMPLE_SPLITS)[number];

export interface BenchmarkSample {
  id: string;
  category: CrashCategory;
  loader: string;
  minecraftVersion: string;
  expectedCulprit?: string;
  origin: SampleOrigin;
  license: string;
  anonymized: boolean;
  split: SampleSplit;
  duplicateOf?: string;
  notes?: string;
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
  id: z.string().min(1),
  category: crashCategorySchema,
  loader: z.string().min(1),
  minecraftVersion: z.string().min(1),
  expectedCulprit: z.string().optional(),
  origin: z.enum(SAMPLE_ORIGINS),
  license: z.string().min(1),
  anonymized: z.boolean(),
  split: z.enum(SAMPLE_SPLITS),
  duplicateOf: z.string().min(1).optional(),
  notes: z.string().optional(),
  rawLog: z.string().min(1),
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

export interface LoaderStatRow {
  loader: string;
  samples: number;
  categoryAccuracy: number;
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
  loaderRows: LoaderStatRow[];
}

export interface CorpusDuplicateGroup {
  kind: "exact" | "near";
  canonicalId: string;
  duplicateIds: string[];
  sampleCount: number;
}

export interface CorpusAudit {
  totalSamples: number;
  uniqueLogCount: number;
  exactDuplicateExtraCount: number;
  exactDuplicateGroups: CorpusDuplicateGroup[];
  nearDuplicateGroups: CorpusDuplicateGroup[];
  originCounts: Record<SampleOrigin, number>;
  splitCounts: Record<SampleSplit, number>;
  loaderCounts: Record<string, number>;
  logLength: { min: number; p50: number; max: number; mean: number };
}

export function filterCorpusBySplit(samples: BenchmarkSample[], split: SampleSplit): BenchmarkSample[] {
  return samples.filter((sample) => sample.split === split);
}

function countBy<K extends string>(values: K[], keys: readonly K[]): Record<K, number> {
  const counts = Object.fromEntries(keys.map((key) => [key, 0])) as Record<K, number>;
  for (const value of values) counts[value]++;
  return counts;
}

function percentile50(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

export function auditSageCorpus(samples: BenchmarkSample[]): CorpusAudit {
  const hashToIds = new Map<string, string[]>();
  const prefixToHashes = new Map<string, Set<string>>();
  const prefixToIds = new Map<string, string[]>();
  const lengths: number[] = [];
  const loaderCounts: Record<string, number> = {};

  for (const sample of samples) {
    const hashed = createHash("sha256").update(sample.rawLog).digest("hex");
    const hashIds = hashToIds.get(hashed) ?? [];
    hashIds.push(sample.id);
    hashToIds.set(hashed, hashIds);

    const prefix = sample.rawLog.slice(0, NEAR_DUPLICATE_PREFIX_LENGTH);
    const prefixIds = prefixToIds.get(prefix) ?? [];
    prefixIds.push(sample.id);
    prefixToIds.set(prefix, prefixIds);
    const prefixHashes = prefixToHashes.get(prefix) ?? new Set<string>();
    prefixHashes.add(hashed);
    prefixToHashes.set(prefix, prefixHashes);

    lengths.push(sample.rawLog.length);
    loaderCounts[sample.loader] = (loaderCounts[sample.loader] ?? 0) + 1;
  }

  const exactDuplicateGroups: CorpusDuplicateGroup[] = [];
  for (const ids of hashToIds.values()) {
    if (ids.length < 2) continue;
    const [canonicalId, ...duplicateIds] = ids;
    if (!canonicalId) continue;
    exactDuplicateGroups.push({ kind: "exact", canonicalId, duplicateIds, sampleCount: ids.length });
  }

  const nearDuplicateGroups: CorpusDuplicateGroup[] = [];
  for (const [prefix, ids] of prefixToIds.entries()) {
    const uniqueHashes = prefixToHashes.get(prefix)?.size ?? 0;
    if (ids.length < 2 || uniqueHashes < 2) continue;
    const [canonicalId, ...duplicateIds] = ids;
    if (!canonicalId) continue;
    nearDuplicateGroups.push({ kind: "near", canonicalId, duplicateIds, sampleCount: ids.length });
  }

  lengths.sort((left, right) => left - right);
  const exactDuplicateExtraCount = exactDuplicateGroups.reduce((sum, group) => sum + group.duplicateIds.length, 0);

  return {
    totalSamples: samples.length,
    uniqueLogCount: hashToIds.size,
    exactDuplicateExtraCount,
    exactDuplicateGroups,
    nearDuplicateGroups,
    originCounts: countBy(samples.map((sample) => sample.origin), SAMPLE_ORIGINS),
    splitCounts: countBy(samples.map((sample) => sample.split), SAMPLE_SPLITS),
    loaderCounts,
    logLength: {
      min: lengths[0] ?? 0,
      p50: percentile50(lengths),
      max: lengths[lengths.length - 1] ?? 0,
      mean: lengths.length > 0 ? lengths.reduce((sum, value) => sum + value, 0) / lengths.length : 0,
    },
  };
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

function recordLoaderOutcome(
  loaderStats: Map<string, { total: number; correct: number }>,
  loader: string,
  correct: boolean,
): void {
  const row = loaderStats.get(loader) ?? { total: 0, correct: 0 };
  row.total += 1;
  if (correct) row.correct += 1;
  loaderStats.set(loader, row);
}

function buildLoaderRows(loaderStats: Map<string, { total: number; correct: number }>): LoaderStatRow[] {
  return [...loaderStats.entries()]
    .sort((left, right) => right[1].total - left[1].total || left[0].localeCompare(right[0]))
    .map(([loader, row]) => ({
      loader,
      samples: row.total,
      categoryAccuracy: row.total > 0 ? (row.correct / row.total) * 100 : 0,
    }));
}

export function evaluateSageCorpus(samples: BenchmarkSample[]): SageEvaluationResult {
  const stats = createEmptyCategoryStats();
  const counters = createHistoricalCounters();
  const loaderStats = new Map<string, { total: number; correct: number }>();
  let totalCorrectCategory = 0;
  let totalLatencyMs = 0;

  for (const sample of samples) {
    const report = SageCrashEngine.diagnose(sample.rawLog);
    totalLatencyMs += report.diagnosisDurationMs ?? report.inferenceDurationMs ?? 0;

    const categoryMatch = report.category === sample.category;
    recordCategoryOutcome(stats, sample.category, report.category, categoryMatch);
    recordLoaderOutcome(loaderStats, sample.loader, categoryMatch);
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
    loaderRows: buildLoaderRows(loaderStats),
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

export interface SageEvalReportInput {
  evaluationDate: string;
  train: SageEvaluationResult;
  audit: CorpusAudit;
  stress?: SageEvaluationResult;
  holdout?: SageEvaluationResult;
}

function formatSplitResult(title: string, result: SageEvaluationResult | undefined, emptyNote: string): string {
  if (!result || result.sampleCount === 0) {
    return `## ${title}\n\n${emptyNote}\n`;
  }
  const loaderRows = result.loaderRows.map(
    (row) => `| ${row.loader} | ${row.samples} | ${row.categoryAccuracy.toFixed(1)}% |`,
  );
  return `## ${title}

| Metric | Value |
|:---|---:|
| Samples | ${result.sampleCount} |
| Category accuracy | ${result.overallCategoryAccuracy.toFixed(1)}% |
| Macro F1 | ${result.macroF1.toFixed(1)}% |
| Top-3 histórico | ${result.top3Historical.percentage.toFixed(1)}% (${result.top3Historical.numerator}/${result.top3Historical.denominator}) |

| Loader | Samples | Category accuracy |
|:---|---:|---:|
${loaderRows.join("\n")}
`;
}

export function buildSageEvaluationMarkdown(input: SageEvalReportInput): string {
  const { train, audit, evaluationDate, stress, holdout } = input;
  const markdownRows = train.categoryRows.map(
    (row) =>
      `| \`${row.category}\` | ${row.samples} | ${row.precision.toFixed(1)}% | ${row.recall.toFixed(1)}% | ${row.f1.toFixed(1)}% |`,
  );
  const loaderRows = train.loaderRows.map(
    (row) => `| ${row.loader} | ${row.samples} | ${row.categoryAccuracy.toFixed(1)}% |`,
  );
  const exactDupLines = audit.exactDuplicateGroups
    .map((group) => `- exact ${group.canonicalId}: ${group.sampleCount} copies (${group.duplicateIds.length} extras)`)
    .join("\n");
  const nearDupLines = audit.nearDuplicateGroups
    .map((group) => `- near ${group.canonicalId}: ${group.sampleCount} samples sharing a ${NEAR_DUPLICATE_PREFIX_LENGTH}-char prefix`)
    .join("\n");

  return `# SAGE 2.0 Crash Intelligence Engine — Quantitative Evaluation

> **Evaluation Date:** ${evaluationDate}  
> **Gate dataset (\`split: train\`):** ${train.sampleCount} cases (${audit.uniqueLogCount} unique logs in the full corpus)  
> **Provenance:** origin is per-case; unlabeled historical cases are \`unknown\`, not attested community logs  
> **Holdout real:** ${audit.splitCounts.holdout} cases — SAGE-01 remains open until unseen real logs exist  

---

## Limits (SAGE-01)

These numbers describe the current corpus. They are not a generalization claim.

- Historical cases are \`origin: unknown\` / \`license: unspecified\` until a human fills provenance.
- ${audit.exactDuplicateExtraCount} extra copies share an identical \`rawLog\` with another case (unique logs: ${audit.uniqueLogCount}/${audit.totalSamples}).
- Log length on the full corpus: min ${audit.logLength.min}, p50 ${audit.logLength.p50}, mean ${audit.logLength.mean.toFixed(0)}, max ${audit.logLength.max} characters. Typical Minecraft crash reports are much longer.
- Train loader mix is Fabric-heavy. Quilt has no train cases. NeoForge has a single train case unless listed below.
- No launcher wrappers (Prism, MultiMC, CurseForge) exist in \`train\`. Truncated stacks and combined errors live only in \`split: stress\` and are **not** part of the SAGE-03 gate.
- 100% train F1 means the engine matches this regression set. It does not prove performance on unseen logs.

### Duplicate audit

Exact groups:

${exactDupLines || "- none"}

Near-duplicate prefix groups (distinct hashes, shared prefix):

${nearDupLines || "- none"}

Origin counts: unknown ${audit.originCounts.unknown}, synthetic ${audit.originCounts.synthetic}, community ${audit.originCounts.community}, public-issue ${audit.originCounts["public-issue"]}.  
Split counts: train ${audit.splitCounts.train}, stress ${audit.splitCounts.stress}, holdout ${audit.splitCounts.holdout}.

---

## 📊 Summary Performance Metrics (train / SAGE-03 gate)

| Metric | Measured Value | Benchmark Target | Status |
|:---|:---:|:---:|:---:|
| **Benchmark Classification Accuracy** | **${train.overallCategoryAccuracy.toFixed(1)}%** | > ${SAGE_EVAL_THRESHOLDS.MACRO_F1_MIN}.0% | ${formatPercentageStatus(train.overallCategoryAccuracy, SAGE_EVAL_THRESHOLDS.MACRO_F1_MIN)} |
| **Macro F1-Score** | **${train.macroF1.toFixed(1)}%** | > ${SAGE_EVAL_THRESHOLDS.MACRO_F1_MIN}.0% | ${formatPercentageStatus(train.macroF1, SAGE_EVAL_THRESHOLDS.MACRO_F1_MIN)} |
| **Top-1 (histórico, mezclado)** | **${train.top1Historical.percentage.toFixed(1)}%** | informativo | ${train.top1Historical.numerator}/${train.top1Historical.denominator} |
| **Top-3 (histórico, mezclado)** | **${train.top3Historical.percentage.toFixed(1)}%** | > ${SAGE_EVAL_THRESHOLDS.TOP3_MIN}.0% | ${formatPercentageStatus(train.top3Historical.percentage, SAGE_EVAL_THRESHOLDS.TOP3_MIN)} |
| **Top-1 atribución (con culpable)** | **${train.top1Attribution.percentage.toFixed(1)}%** | informativo | ${train.top1Attribution.numerator}/${train.top1Attribution.denominator} |
| **Top-3 atribución (con culpable)** | **${train.top3Attribution.percentage.toFixed(1)}%** | informativo | ${train.top3Attribution.numerator}/${train.top3Attribution.denominator} |
| **Acierto sistémico sin culpable** | **${train.systemicCategoryCorrect.percentage.toFixed(1)}%** | informativo | ${train.systemicCategoryCorrect.numerator}/${train.systemicCategoryCorrect.denominator} |
| **Mean Inference Latency** | **${train.meanLatencyMs.toFixed(2)} ms** | < ${SAGE_EVAL_THRESHOLDS.LATENCY_MAX_MS}.0 ms | ${formatLatencyStatus(train.meanLatencyMs, SAGE_EVAL_THRESHOLDS.LATENCY_MAX_MS)} |

### Métricas desglosadas (SAGE-02)

${formatRatioLine("Top-1 (histórico, mezclado)", train.top1Historical)}
${formatRatioLine("Top-3 (histórico, mezclado)", train.top3Historical)}
${formatRatioLine("Top-1 atribución (solo casos con expectedCulprit)", train.top1Attribution)}
${formatRatioLine("Top-3 atribución (solo casos con expectedCulprit)", train.top3Attribution)}
${formatRatioLine("Categoría correcta sin culpable atribuible", train.systemicCategoryCorrect)}

---

## 🔬 Category Breakdown (train)

| Crash Category | Sample Count | Precision | Recall | F1-Score |
|:---|:---:|:---:|:---:|:---:|
${markdownRows.join("\n")}

## Loader Breakdown (train)

| Loader | Samples | Category accuracy |
|:---|---:|---:|
${loaderRows.join("\n")}

---

${formatSplitResult(
  "Stress set (synthetic, not gated)",
  stress,
  "No `split: stress` cases in the corpus.",
)}

${formatSplitResult(
  "Holdout set (unseen real logs)",
  holdout,
  "Holdout is empty. SAGE-01 Capa B needs 10–20 real logs never used to tune rules.",
)}

---

## 🚀 Reproducibility

\`\`\`bash
npm run eval:sage              # train split + SAGE-03 gate + write this report
npm run eval:sage -- --stress  # synthetic stress only (no gate)
npm run eval:sage -- --holdout # real holdout only (no gate; empty until Capa B)
npm run eval:sage -- --audit   # duplicate / provenance counts
\`\`\`

CI gate thresholds (\`SAGE-03\`) apply **only** to \`split: train\`: Macro F1 ≥ ${SAGE_EVAL_THRESHOLDS.MACRO_F1_MIN}%, Top-3 histórico ≥ ${SAGE_EVAL_THRESHOLDS.TOP3_MIN}%, latencia media ≤ ${SAGE_EVAL_THRESHOLDS.LATENCY_MAX_MS} ms.
`;
}

