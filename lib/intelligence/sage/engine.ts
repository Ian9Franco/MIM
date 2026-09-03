/**
 * SAGE 2.0 — Crash Intelligence Diagnostic Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Main engine pipeline orchestrating log parsing, stacktrace normalization,
 * exception classification, mod correlation, multi-factor confidence scoring,
 * and structured remediation planning.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import crypto from "crypto";
import { parseCrashEnvironment, parseNormalizedStack } from "./parser";
import { classifyCrash } from "./classifier";
import { correlateCulprits } from "./correlator";
import { computeConfidenceScore } from "./scorer";
import { planRemediation } from "./remediation";
import { StructuredCrashReport } from "./types";

export class SageCrashEngine {
  /**
   * Runs the full diagnostic inference pipeline over a raw Minecraft log/crash report.
   *
   * Pipeline:
   * 1. Environment & Stack Normalization
   * 2. Exception Classification & Evidence Gathering
   * 3. Culprit Mod Correlation
   * 4. Multi-Factor Confidence Scoring
   * 5. Structured Remediation Plan Formulation
   */
  public static diagnose(rawLog: string): StructuredCrashReport {
    const startTime = typeof performance !== "undefined" ? performance.now() : Date.now();

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
      environment
    );

    const endTime = typeof performance !== "undefined" ? performance.now() : Date.now();
    const inferenceDurationMs = Math.round((endTime - startTime) * 100) / 100;

    // Build descriptive root cause statement
    let rootCause = "Unrecognized application error";
    switch (classification.category) {
      case "MISSING_DEPENDENCY":
        rootCause = culpritMod
          ? `Missing required dependency mod: '${culpritMod}'`
          : "Required library or dependency is missing from the active environment";
        break;
      case "OUT_OF_MEMORY":
        rootCause = "JVM Heap Space or Metaspace exhaustion (OutOfMemoryError)";
        break;
      case "JAVA_INCOMPATIBILITY":
        rootCause = "Java bytecode version incompatibility with current JVM runtime";
        break;
      case "MOD_CONFLICT":
        rootCause = culpritMod
          ? `Duplicate mod instance or ID collision on '${culpritMod}'`
          : "Mod ID conflict or duplicate JAR files in mods directory";
        break;
      case "MIXIN_FAILURE":
        rootCause = culpritMod
          ? `Mixin bytecode transformation failure caused by '${culpritMod}'`
          : "ASM Mixin injection failure during class loading";
        break;
      case "VERSION_CONFLICT":
        rootCause = culpritMod
          ? `Dependency version mismatch for mod '${culpritMod}'`
          : "Mod requires a different version of Minecraft or loader library";
        break;
      case "CORRUPTED_WORLD":
        rootCause = "Corrupted chunk, player NBT save file, or dimension registry";
        break;
    }

    return {
      id: crypto.randomUUID(),
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
      inferenceDurationMs
    };
  }
}
