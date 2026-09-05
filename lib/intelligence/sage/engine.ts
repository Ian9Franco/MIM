/**
 * SAGE 2.0 — Crash Intelligence Diagnostic Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Main engine pipeline orchestrating log parsing, stacktrace normalization,
 * exception classification, mod correlation, multi-factor confidence scoring,
 * and structured remediation planning.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { parseCrashEnvironment, parseNormalizedStack } from "./parser";
import { classifyCrash } from "./classifier";
import { correlateCulprits } from "./correlator";
import { computeConfidenceScore } from "./scorer";
import { planRemediation } from "./remediation";
import { StructuredCrashReport, SageLocale } from "./types";
import { formatLocalizedRootCause } from "./i18n";

/**
 * Universal UUID generator safe for both Browser (window/globalThis.crypto)
 * and Node.js environments without relying on external or unpolyfilled modules.
 */
function generateUUID(): string {
  if (typeof globalThis !== "undefined" && globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface SageDiagnoseOptions {
  locale?: SageLocale;
}

export class SageCrashEngine {
  /**
   * Runs the full heuristic diagnostic pipeline over a raw Minecraft log/crash report.
   *
   * Pipeline:
   * 1. Environment & Stack Normalization
   * 2. Exception Classification & Evidence Gathering
   * 3. Culprit Mod Correlation
   * 4. Multi-Factor Confidence Scoring
   * 5. Structured Remediation Plan Formulation
   */
  public static diagnose(rawLog: string, options?: SageDiagnoseOptions): StructuredCrashReport {
    const startTime = typeof performance !== "undefined" ? performance.now() : Date.now();
    const locale: SageLocale = options?.locale || "en";

    // 1. Environment & Stack Normalization
    const environment = parseCrashEnvironment(rawLog);
    const normalizedStack = parseNormalizedStack(rawLog);

    // 2. Exception Classification & Evidence
    const classification = classifyCrash(rawLog);

    // 3. Mod & Dependency Correlation
    const correlation = correlateCulprits(normalizedStack, classification.candidateCulprits);
    const culpritMod = correlation.primaryCulprit;
    const suspectedMods = correlation.allSuspects;

    // 4. Multi-Factor Confidence Scoring
    const confidence = computeConfidenceScore(
      classification.category,
      classification.evidence,
      normalizedStack,
      culpritMod
    );

    // 5. Remediation Plan
    const remediation = planRemediation(
      classification.category,
      culpritMod,
      suspectedMods,
      environment,
      locale
    );

    const endTime = typeof performance !== "undefined" ? performance.now() : Date.now();
    const diagnosisDurationMs = Math.round((endTime - startTime) * 100) / 100;

    // Build descriptive root cause statement using locale
    const rootCause = formatLocalizedRootCause(classification.category, culpritMod, locale);

    return {
      id: generateUUID(),
      category: classification.category,
      rootCause,
      confidence,
      culpritMod,
      suspectedMods,
      evidence: classification.evidence,
      environment,
      normalizedStack,
      remediation,
      rawException: classification.primaryException,
      timestamp: new Date().toISOString(),
      diagnosisDurationMs,
      inferenceDurationMs: diagnosisDurationMs,
      locale
    };
  }
}
