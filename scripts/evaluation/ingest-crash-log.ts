/**
 * SAGE-01 — Append a captured crash/log excerpt to crash-corpus.json.
 * Never writes to the regression fixture. Rejects origin=synthetic.
 *
 * Usage:
 *   npm run sage:ingest-log -- --file path/to/latest.log --id HOST-001 --category MISSING_DEPENDENCY --loader fabric --version 1.20.1 [--culprit fabric-api] [--origin community]
 */

import fs from "fs";
import path from "path";
import {
  SAMPLE_ORIGINS,
  benchmarkSampleSchema,
  crashCategorySchema,
  parseBenchmarkCorpus,
  type BenchmarkSample,
  type SampleOrigin,
} from "./sageEvalCore";

const CORPUS_PATH = path.join(__dirname, "datasets", "crash-corpus.json");

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function required(name: string): string {
  const value = arg(name)?.trim();
  if (!value) {
    throw new Error(`Missing --${name}`);
  }
  return value;
}

function main(): void {
  const filePath = required("file");
  const origin = (arg("origin") ?? "community") as SampleOrigin;
  if (!SAMPLE_ORIGINS.includes(origin)) {
    throw new Error(`Invalid origin. Use one of: ${SAMPLE_ORIGINS.join(", ")}`);
  }
  if (origin === "synthetic") {
    throw new Error("crash-corpus.json cannot accept origin=synthetic. Use crash-corpus-regression.json for CI fixtures.");
  }

  const rawLog = fs.readFileSync(filePath, "utf-8").trim();
  if (rawLog.length < 40) {
    throw new Error("Log excerpt is too short to ingest (min 40 chars).");
  }

  const category = crashCategorySchema.parse(required("category"));
  const sample = benchmarkSampleSchema.parse({
    id: required("id"),
    category,
    loader: required("loader"),
    minecraftVersion: required("version"),
    origin,
    license: arg("license") ?? "user-consent",
    anonymized: arg("anonymized") !== "false",
    split: "holdout",
    notes: arg("notes") ?? `Ingested from ${path.basename(filePath)}`,
    rawLog,
    expectedCulprit: arg("culprit")?.trim() || undefined,
  } satisfies BenchmarkSample);

  const existing = parseBenchmarkCorpus(JSON.parse(fs.readFileSync(CORPUS_PATH, "utf-8")));
  if (existing.some((item) => item.id === sample.id)) {
    throw new Error(`Duplicate id ${sample.id} in crash-corpus.json`);
  }
  fs.writeFileSync(CORPUS_PATH, `${JSON.stringify([...existing, sample], null, 2)}\n`, "utf-8");
  console.log(`✔ Ingested ${sample.id} into crash-corpus.json (${existing.length + 1} holdout samples)`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
