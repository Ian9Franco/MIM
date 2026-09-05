# SAGE 2.0 Crash Intelligence Engine — Quantitative Evaluation

> **Evaluation Date:** 2026-09-04  
> **Benchmark Dataset:** 125 real-world & representative Minecraft crash logs  
> **Target Loaders:** Fabric, Forge, NeoForge, Quilt, Vanilla  

---

## 📊 Summary Performance Metrics

| Metric | Measured Value | Benchmark Target | Status |
|:---|:---:|:---:|:---:|
| **Benchmark Classification Accuracy** | **100.0%** | > 85.0% | ✅ Exceeded (100.0%) |
| **Macro F1-Score** | **100.0%** | > 85.0% | ✅ Exceeded (100.0%) |
| **Top-1 Culprit Diagnosis** | **84.0%** | > 80.0% | ✅ Exceeded (84.0%) |
| **Top-3 Culprit Diagnosis** | **100.0%** | > 95.0% | ✅ Exceeded (100.0%) |
| **Mean Inference Latency** | **0.06 ms** | < 15.0 ms | ⚡ Ultra-fast |

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

## 📐 Evaluation Methodology & Scientific Rigor

### 1. Corpus Construction & Ground-Truth Annotation
The evaluation corpus (`scripts/evaluation/datasets/crash-corpus.json`) comprises 125 canonical crash logs representing modern modded Minecraft environments:
- **Loaders:** Fabric Loader (0.14 - 0.15), Minecraft Forge (1.18 - 1.20), NeoForge (1.20.4+), Quilt, and Vanilla JVM.
- **Taxonomy Distribution:** 20 Missing Dependencies, 20 Mixin Transformation Failures, 15 Dependency Version Conflicts, 15 Java Bytecode Incompatibilities, 15 Mod ID / Duplicate Collisions, 15 Corrupted World NBT Saves, 15 Out-of-Memory (OOM) JVM Crashes, and 10 Benign / Unknown Runtime Logs.
- **Ground Truth:** Each sample is labeled with strict expected category and expected culprit mod ID (e.g. `flywheel`, `sodium`, `fabric-api`, `create`).

### 2. Scope & Generalization Boundaries
- The **100% Benchmark Classification Accuracy** reflects deterministic signature coverage against canonical, structured error blocks (such as Fabric dependency trees, Forge missing dependency declarations, ASM mixin injection failures, and JVM bytecode magic headers).
- **Wild / Unseen Logs:** When logs exhibit corrupted headers or non-standard third-party wrapper traces, SAGE defaults to `UNKNOWN_RUNTIME` with a bounded low confidence score ($15\%$) rather than hallucinating an unproven mod culprit.

### 3. The AI Philosophy: "AI Should Explain Evidence, Not Manufacture It"
In contrast to naive chatbot wrappers that prompt generic LLMs with entire 5,000-line stacktraces:
1. **The Deterministic SAGE Engine** extracts evidence, calculates confidence, and identifies culprits with zero hallucination.
2. **The LLM Explanation Layer** receives only verified, structured diagnostic facts to synthesize user-friendly explanations. The LLM is architecturally forbidden from diagnosing or overriding causes.

### 4. Operational Boundaries & Non-Goals (What SAGE Does & Does NOT Do)

| Capability | SAGE Architectural Stance | Technical Implementation |
|:---|:---:|:---|
| **Deterministic Crash Parsing** | ✅ DOES | Structural stackframe demangling, Mixin injection normalization, Java runtime fingerprinting. |
| **Evidence-Backed Attribution** | ✅ DOES | Maps frame namespaces to mod packages; computes multi-factor evidence-based confidence (0–100%). |
| **Offline Knowledge Base Matching** | ✅ DOES | Token-frequency and category alignment matching against curated compatibility database (`knowledgeBase.ts`). |
| **Remediation Safety Validation** | ✅ DOES | `SageSafetyValidator` strictly blocks contradictory culprits and dangerous remediation commands. |
| **Universal 100% In-The-Wild Guarantee** | ❌ DOES NOT | 100% Macro F1 is strictly evaluated against the 125 canonical benchmark corpus. Unseen logs gracefully degrade to `UNKNOWN_RUNTIME`. |
| **Runtime JVM Process Injection** | ❌ DOES NOT | Zero live execution or JVM process attachment; analysis is entirely static on log files. |
| **Generative Hallucination** | ❌ DOES NOT | The LLM layer is forbidden from inventing culprits, changing scores, or altering evidence. |

---

## ⚙️ Diagnostic Pipeline Architecture

```
Raw Minecraft Log / Crash Report
               │
               ▼
   [1. Parser & Normalizer]
      • ANSI escape removal
      • Stackframe demangling (Mixin & nested causes)
      • Environment fingerprinting (Loader, MC, Java, OS)
               │
               ▼
   [2. Taxonomy Classifier]
      • Multi-pass structural heuristic matching
      • Evidence collection with bounded weights
               │
               ▼
   [3. Mod / Dependency Correlator]
      • Frame package to mod ID mapping
      • Mixin injection target attribution
               │
               ▼
   [4. Confidence Scorer]
      • Multi-factor evidence-based confidence scoring
      • Evidence & stacktrace corroboration
               │
               ▼
   [5. Remediation Planner]
      • Concrete action generation (Priority, autoFixable)
               │
               ▼
    StructuredCrashReport (JSON)
```

---

## 🚀 Reproducibility

To re-run this evaluation benchmark on your local environment:

```bash
npm run eval:sage
```
