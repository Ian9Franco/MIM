/**
 * SAGE 2.0 — Remediation Safety Validator & Output Sanitizer
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates suggested remediation proposals against deterministic engine findings.
 * Enforces:
 * 1. Attribution Consistency (proposals must match verified culprit or suspect mods)
 * 2. Shell Command & Security Safety (blocks destructive commands and security disabling)
 * 3. Evidence Lineage (verifies actions align with known knowledge base terms)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { StructuredCrashReport } from "./types";
import { RetrievedContext } from "./retriever";

export interface GuardrailValidationResult {
  valid: boolean;
  groundingScore: number; // 0.0 to 1.0
  violations: string[];
  sanitizedActions: string[];
}

const FORBIDDEN_PHRASES = [
  "disable antivirus",
  "turn off windows defender",
  "format c:",
  "rm -rf /",
  "del /s /q",
  "run powershell -command",
  "download crack",
  "pirate"
];

export class SageSafetyValidator {
  /**
   * Validates and sanitizes proposed remediation steps.
   */
  public static validate(
    report: StructuredCrashReport,
    retrieved: RetrievedContext[],
    proposedActions: string[],
    proposedCulprit?: string
  ): GuardrailValidationResult {
    const violations: string[] = [];
    const sanitizedActions: string[] = [];

    // 1. Attribution Consistency Check
    if (proposedCulprit && report.culpritMod) {
      const normProposed = proposedCulprit.toLowerCase().trim();
      const normReport = report.culpritMod.toLowerCase().trim();
      const isSuspected = report.suspectedMods.some(s => s.toLowerCase() === normProposed);

      if (normProposed !== normReport && !isSuspected) {
        violations.push(
          `Attribution Inconsistency: Proposed culprit '${proposedCulprit}' contradicts deterministic engine findings ('${report.culpritMod}').`
        );
      }
    }

    // 2. Prohibited & Unsafe Instructions Check
    for (const action of proposedActions) {
      const lower = action.toLowerCase();
      const hasForbidden = FORBIDDEN_PHRASES.some(phrase => lower.includes(phrase));

      if (hasForbidden) {
        violations.push(`Security Violation: Remediation contains prohibited advice: "${action}".`);
      } else {
        sanitizedActions.push(action);
      }
    }

    // 3. Grounding Verification (Lineage check)
    // Verify that actions align with either retrieved knowledge base or deterministic remediation
    let groundedCount = 0;
    const knownTerms = new Set<string>();

    // Add deterministic plan keywords
    for (const a of report.remediation.allActions) {
      for (const w of a.title.toLowerCase().split(/\s+/)) knownTerms.add(w);
    }
    // Add retrieved article keywords
    for (const r of retrieved) {
      for (const kw of r.article.keywords) knownTerms.add(kw.toLowerCase());
      for (const a of r.article.affectedMods) knownTerms.add(a.toLowerCase());
    }

    for (const act of sanitizedActions) {
      const actWords = act.toLowerCase().split(/\s+/);
      const isGrounded = actWords.some(w => w.length >= 4 && knownTerms.has(w));
      if (isGrounded) groundedCount++;
    }

    const groundingScore =
      sanitizedActions.length > 0
        ? Math.round((groundedCount / sanitizedActions.length) * 100) / 100
        : 1.0;

    if (groundingScore < 0.5) {
      violations.push(`Grounding Warning: Low lineage score (${groundingScore * 100}%). Some suggestions may lack factual grounding.`);
    }

    return {
      valid: violations.length === 0,
      groundingScore,
      violations,
      sanitizedActions
    };
  }
}

/** Backward-compatible alias for SageSafetyValidator */
export const SageGuardrails = SageSafetyValidator;
export type SageGuardrails = SageSafetyValidator;
