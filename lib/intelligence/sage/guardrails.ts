/**
 * SAGE 2.0 — AI Guardrails & Output Validator
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates AI-generated diagnostic proposals against the deterministic truth.
 * Protects against:
 * 1. Culprit Hallucination (accusing unverified mods)
 * 2. Unsafe Remediation Instructions (shell execution, security disabling)
 * 3. Ungrounded Assertions (actions without evidence lineage)
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

export class SageGuardrails {
  /**
   * Validates and sanitizes proposed AI remediation steps.
   */
  public static validate(
    report: StructuredCrashReport,
    retrieved: RetrievedContext[],
    proposedActions: string[],
    proposedCulprit?: string
  ): GuardrailValidationResult {
    const violations: string[] = [];
    const sanitizedActions: string[] = [];

    // 1. Culprit Hallucination Check
    if (proposedCulprit && report.culpritMod) {
      const normProposed = proposedCulprit.toLowerCase().trim();
      const normReport = report.culpritMod.toLowerCase().trim();
      const isSuspected = report.suspectedMods.some(s => s.toLowerCase() === normProposed);

      if (normProposed !== normReport && !isSuspected) {
        violations.push(
          `Hallucination Violation: AI proposed culprit '${proposedCulprit}' which contradicts deterministic engine findings ('${report.culpritMod}').`
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
