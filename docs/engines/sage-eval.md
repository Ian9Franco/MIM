# SAGE 2.0 Crash Intelligence Engine — Quantitative Evaluation

> **Evaluation Date:** 2026-09-11  
> **Gate dataset (`split: train`):** 125 cases (107 unique logs in the full corpus)  
> **Provenance:** origin is per-case; unlabeled historical cases are `unknown`, not attested community logs  
> **Holdout real:** 0 cases — SAGE-01 remains open until unseen real logs exist  

---

## Limits (SAGE-01)

These numbers describe the current corpus. They are not a generalization claim.

- Historical cases are `origin: unknown` / `license: unspecified` until a human fills provenance.
- 28 extra copies share an identical `rawLog` with another case (unique logs: 107/135).
- Log length on the full corpus: min 160, p50 305, mean 331, max 611 characters. Typical Minecraft crash reports are much longer.
- Train loader mix is Fabric-heavy. Quilt has no train cases. NeoForge has a single train case unless listed below.
- No launcher wrappers (Prism, MultiMC, CurseForge) exist in `train`. Truncated stacks and combined errors live only in `split: stress` and are **not** part of the SAGE-03 gate.
- 100% train F1 means the engine matches this regression set. It does not prove performance on unseen logs.

### Duplicate audit

Exact groups:

- exact CASE-086: 15 copies (14 extras)
- exact CASE-101: 15 copies (14 extras)

Near-duplicate prefix groups (distinct hashes, shared prefix):

- near CASE-001: 14 samples sharing a 180-char prefix
- near CASE-036: 21 samples sharing a 180-char prefix
- near CASE-056: 9 samples sharing a 180-char prefix
- near CASE-058: 7 samples sharing a 180-char prefix

Origin counts: unknown 125, synthetic 10, community 0, public-issue 0.  
Split counts: train 125, stress 10, holdout 0.

---

## 📊 Summary Performance Metrics (train / SAGE-03 gate)

| Metric | Measured Value | Benchmark Target | Status |
|:---|:---:|:---:|:---:|
| **Benchmark Classification Accuracy** | **100.0%** | > 85.0% | ✅ Pass (100.0%) |
| **Macro F1-Score** | **100.0%** | > 85.0% | ✅ Pass (100.0%) |
| **Top-1 (histórico, mezclado)** | **84.0%** | informativo | 105/125 |
| **Top-3 (histórico, mezclado)** | **100.0%** | > 95.0% | ✅ Pass (100.0%) |
| **Top-1 atribución (con culpable)** | **71.4%** | informativo | 50/70 |
| **Top-3 atribución (con culpable)** | **100.0%** | informativo | 70/70 |
| **Acierto sistémico sin culpable** | **100.0%** | informativo | 55/55 |
| **Mean Inference Latency** | **0.06 ms** | < 15.0 ms | ✅ Pass (0.06 ms) |

### Métricas desglosadas (SAGE-02)

- **Top-1 (histórico, mezclado):** 84.0% (105/125)
- **Top-3 (histórico, mezclado):** 100.0% (125/125)
- **Top-1 atribución (solo casos con expectedCulprit):** 71.4% (50/70)
- **Top-3 atribución (solo casos con expectedCulprit):** 100.0% (70/70)
- **Categoría correcta sin culpable atribuible:** 100.0% (55/55)

---

## 🔬 Category Breakdown (train)

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

## Loader Breakdown (train)

| Loader | Samples | Category accuracy |
|:---|---:|---:|
| fabric | 81 | 100.0% |
| forge | 28 | 100.0% |
| vanilla | 15 | 100.0% |
| neoforge | 1 | 100.0% |

---

## Stress set (synthetic, not gated)

| Metric | Value |
|:---|---:|
| Samples | 10 |
| Category accuracy | 70.0% |
| Macro F1 | 64.2% |
| Top-3 histórico | 90.0% (9/10) |

| Loader | Samples | Category accuracy |
|:---|---:|---:|
| fabric | 4 | 75.0% |
| forge | 4 | 75.0% |
| neoforge | 1 | 0.0% |
| quilt | 1 | 100.0% |


## Holdout set (unseen real logs)

Holdout is empty. SAGE-01 Capa B needs 10–20 real logs never used to tune rules.


---

## 🚀 Reproducibility

```bash
npm run eval:sage              # train split + SAGE-03 gate + write this report
npm run eval:sage -- --stress  # synthetic stress only (no gate)
npm run eval:sage -- --holdout # real holdout only (no gate; empty until Capa B)
npm run eval:sage -- --audit   # duplicate / provenance counts
```

CI gate thresholds (`SAGE-03`) apply **only** to `split: train`: Macro F1 ≥ 85%, Top-3 histórico ≥ 95%, latencia media ≤ 15 ms.
