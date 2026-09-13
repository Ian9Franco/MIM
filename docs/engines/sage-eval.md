# SAGE 2.0 Crash Intelligence Engine — Quantitative Evaluation

> **Evaluation Date:** 2026-09-13  
> **Regression gate (`crash-corpus-regression.json`):** 125 templated cases — CI only, not real captured logs  
> **Real corpus (`crash-corpus.json`):** 0 cases — add server/client logs here when available  
> **MIM Server remote logs (SRV-5):** separate path via SFTP/`latest.log`; not mixed into this file yet  

---

## Limits (SAGE-01)

This eval measures the **local SAGE crash engine**, not MIM Server remote ingestion.

- `crash-corpus-regression.json` holds templated snippets (`origin: synthetic`) for the SAGE-03 CI gate only.
- `crash-corpus.json` is intentionally **empty** until you capture real logs (client crash or server `latest.log` excerpts) without contaminating regression.
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

- Samples: 0 (0 unique logs; 0 exact duplicate extras)
- Log length: min 0, p50 0, mean 0, max 0 chars
- Origin: unknown 0, synthetic 0, community 0, public-issue 0
- Split: train 0, stress 0, holdout 0

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
| **Mean Inference Latency** | **0.05 ms** | < 15.0 ms | ✅ Pass (0.05 ms) |

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

`crash-corpus.json` is empty. Add captured logs with `split: holdout` after testing a local or hosted server.


---

## 🚀 Reproducibility

```bash
npm run eval:sage              # regression gate + write this report
npm run eval:sage -- --holdout # real holdout only (empty until you add logs)
npm run eval:sage -- --audit   # regression + real corpus audits
```

CI gate thresholds (`SAGE-03`) apply **only** to `crash-corpus-regression.json`: Macro F1 ≥ 85%, Top-3 histórico ≥ 95%, latencia media ≤ 15 ms.
