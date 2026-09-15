# SAGE 2.0 Crash Intelligence Engine — Quantitative Evaluation

> **Canonical eval source (SAGE-07):** this file. MimBot structure/live eval is `npm run eval:mimbot` + `scripts/evaluation/mimbot-fixtures.json`. Do not copy numeric claims elsewhere.

> **Evaluation Date:** 2026-09-15  
> **Regression gate (`crash-corpus-regression.json`):** 125 templated cases — CI only, not real captured logs  
> **Real corpus (`crash-corpus.json`):** 1 cases — holdout for generalization (SAGE-01)  
> **MIM Server remote logs (SRV-5):** separate path via SFTP/`latest.log`; ingest excerpts here with `npm run sage:ingest-log`  

---

## Limits (SAGE-01)

This eval measures the **local SAGE crash engine**, not MIM Server remote ingestion.

- `crash-corpus-regression.json` holds templated snippets (`origin: synthetic`) for the SAGE-03 CI gate only.
- `crash-corpus.json` is the **only** place for captured logs (client crash, server `latest.log`, or the SRV-5 local fixture seed). Regression stays synthetic.
- 100% regression F1 does not prove generalization. Real holdout lives only in `crash-corpus.json`.

### Regression fixture audit

- Samples: 125 (97 unique logs; 28 exact duplicate extras)
- Log length: min 160, p50 303, mean 325, max 611 chars
- Origin: unknown 0, synthetic 125, community 0, public-issue 0
- Split: train 125, stress 0, holdout 0

Exact groups:

- exact CASE-086: 15 copies (14 extras)
- exact CASE-101: 15 copies (14 extras)

Near-duplicate prefix groups:

- near CASE-001: 14 samples sharing a 180-char prefix
- near CASE-036: 20 samples sharing a 180-char prefix
- near CASE-056: 8 samples sharing a 180-char prefix
- near CASE-058: 7 samples sharing a 180-char prefix


### Real corpus audit

- Samples: 1 (1 unique logs; 0 exact duplicate extras)
- Log length: min 342, p50 342, mean 342, max 342 chars
- Origin: unknown 1, synthetic 0, community 0, public-issue 0
- Split: train 0, stress 0, holdout 1

Exact groups:

- none

Near-duplicate prefix groups:

- none


---

## 📊 Summary Performance Metrics (regression / SAGE-03 gate)

| Metric | Measured Value | Benchmark Target | Status |
|:---|:---:|:---:|:---:|
| **Benchmark Classification Accuracy** | **100.0%** | > 85.0% | ✅ Pass (100.0%) |
| **Macro F1-Score** | **100.0%** | > 85.0% | ✅ Pass (100.0%) |
| **Top-1 (histórico, mezclado)** | **84.0%** | informativo | 105/125 |
| **Top-3 (histórico, mezclado)** | **100.0%** | > 95.0% | ✅ Pass (100.0%) |
| **Top-1 atribución (con culpable)** | **71.4%** | informativo | 50/70 |
| **Top-3 atribución (con culpable)** | **100.0%** | informativo | 70/70 |
| **Acierto sistémico sin culpable** | **100.0%** | informativo | 55/55 |
| **Mean Inference Latency (local)** | **0.02 ms** | < 15.0 ms | ✅ Pass (0.02 ms) |
| **p50 latency (local)** | **0.01 ms** | informativo | warmup 1, repeats 3 |
| **p95 latency (local)** | **0.04 ms** | informativo | max 0.10 ms |

### SAGE-04 — Latencia reproducible (diagnóstico local)

Esta medición es **solo el clasificador determinista** (`SageCrashEngine.diagnose`). No es latencia ni costo de MimBot/LLM.

- Entorno: Node v24.15.0, win32/x64
- Calentamiento: 1 pasada(s); cronometraje: 3 repetición(es)
- mean 0.019 ms · p50 0.014 ms · p95 0.041 ms · max 0.095 ms
- Override: `SAGE_EVAL_WARMUP`, `SAGE_EVAL_REPEATS`

### Métricas desglosadas (SAGE-02)

- **Top-1 (histórico, mezclado):** 84.0% (105/125)
- **Top-3 (histórico, mezclado):** 100.0% (125/125)
- **Top-1 atribución (solo casos con expectedCulprit):** 71.4% (50/70)
- **Top-3 atribución (solo casos con expectedCulprit):** 100.0% (70/70)
- **Categoría correcta sin culpable atribuible:** 100.0% (55/55)

---

## 🔬 Category Breakdown (regression)

| Crash Category | Sample Count | Precision | Recall | F1-Score |
|:---|:---:|:---:|:---:|:---:|
| `MISSING_DEPENDENCY` | 20 | 100.0% | 100.0% | 100.0% |
| `VERSION_CONFLICT` | 15 | 100.0% | 100.0% | 100.0% |
| `MIXIN_FAILURE` | 20 | 100.0% | 100.0% | 100.0% |
| `JAVA_INCOMPATIBILITY` | 15 | 100.0% | 100.0% | 100.0% |
| `MOD_CONFLICT` | 15 | 100.0% | 100.0% | 100.0% |
| `CORRUPTED_WORLD` | 15 | 100.0% | 100.0% | 100.0% |
| `OUT_OF_MEMORY` | 15 | 100.0% | 100.0% | 100.0% |
| `UNKNOWN_RUNTIME` | 10 | 100.0% | 100.0% | 100.0% |

## Loader Breakdown (regression)

| Loader | Samples | Category accuracy |
|:---|---:|---:|
| fabric | 81 | 100.0% |
| forge | 28 | 100.0% |
| vanilla | 15 | 100.0% |
| neoforge | 1 | 100.0% |

---

## Real holdout (`crash-corpus.json`, not gated)

| Metric | Value |
|:---|---:|
| Samples | 1 |
| Category accuracy | 0.0% |
| Macro F1 | 75.0% |
| Top-3 histórico | 0.0% (0/1) |

| Loader | Samples | Category accuracy |
|:---|---:|---:|
| fabric | 1 | 0.0% |


---

## 🚀 Reproducibility

```bash
npm run eval:sage              # regression gate + write this report
npm run eval:sage -- --holdout # real holdout only (fixture seed + any ingested logs)
npm run eval:sage -- --audit   # regression + real corpus audits
```

CI gate thresholds (`SAGE-03`) apply **only** to `crash-corpus-regression.json`: Macro F1 ≥ 85%, Top-3 histórico ≥ 95%, latencia media ≤ 15 ms.
