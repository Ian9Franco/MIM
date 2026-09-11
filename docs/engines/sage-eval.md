# SAGE 2.0 Crash Intelligence Engine — Quantitative Evaluation

> **Evaluation Date:** 2026-09-11  
> **Benchmark Dataset:** 125 real-world & representative Minecraft crash logs  
> **Target Loaders:** Fabric, Forge, NeoForge, Quilt, Vanilla  

---

## 📊 Summary Performance Metrics

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

## 🔬 Category Breakdown

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

---

## 🚀 Reproducibility

To re-run this evaluation benchmark on your local environment:

```bash
npm run eval:sage
```

CI gate thresholds (`SAGE-03`): Macro F1 ≥ 85%, Top-3 histórico ≥ 95%, latencia media ≤ 15 ms.
