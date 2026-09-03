/**
 * SAGE 2.0 — Root-Cause Confidence Scorer
 * ─────────────────────────────────────────────────────────────────────────────
 * Multi-factor confidence inference based on evidence weight, corroborating
 * stack frames, and environment certainty. Eliminates arbitrary multipliers.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { CrashCategory, DiagnosisEvidence, NormalizedFrame } from "./types";

export function computeConfidenceScore(
  category: CrashCategory,
  evidence: DiagnosisEvidence[],
  frames: NormalizedFrame[],
  culprit?: string
): number {
  if (category === "UNKNOWN_RUNTIME") {
    return 15;
  }

  // 1. Calculate aggregated evidence base score
  const totalWeight = evidence.reduce((sum, e) => sum + e.weight, 0);
  const avgWeight = evidence.length > 0 ? totalWeight / evidence.length : 50;

  let score = avgWeight;

  // 2. Corroborating stack frames bonus
  if (frames.length > 0) {
    score += 5; // Stacktrace confirms live execution trace

    if (culprit) {
      const culpritInStack = frames.some(
        f => f.className.toLowerCase().includes(culprit) ||
             (f.mixinTarget && f.mixinTarget.toLowerCase().includes(culprit))
      );
      if (culpritInStack) {
        score += 10; // Suspected mod confirmed present in top stack frames
      }
    }
  }

  // 3. Category-specific certainty anchors
  switch (category) {
    case "OUT_OF_MEMORY":
      // JVM OutOfMemory is virtually indisputable
      score = Math.max(score, 98);
      break;
    case "JAVA_INCOMPATIBILITY":
      // Bytecode magic version checks are deterministic
      score = Math.max(score, 96);
      break;
    case "MISSING_DEPENDENCY":
      score = Math.min(score, 95);
      break;
    case "MOD_CONFLICT":
      score = Math.min(score, 92);
      break;
    case "MIXIN_FAILURE":
      score = Math.min(score, 89);
      break;
    case "CORRUPTED_WORLD":
      score = Math.min(score, 88);
      break;
    case "VERSION_CONFLICT":
      score = Math.min(score, 87);
      break;
  }

  // Clamp within realistic confidence bounds
  return Math.min(99, Math.max(20, Math.round(score)));
}
