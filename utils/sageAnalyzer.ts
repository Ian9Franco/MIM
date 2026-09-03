/**
 * SAGE — Systematic Analyzer for Glitches & Exceptions (Facade)
 * ─────────────────────────────────────────────────────────────────────────────
 * Backward-compatible bridge to SAGE 2.0 Crash Intelligence Engine.
 * Delegates core analysis to the modular diagnostic pipeline in `lib/intelligence/sage/`.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { SageCrashEngine } from "@/lib/intelligence/sage/engine";
import { SageExplainer } from "@/lib/intelligence/sage/explainer";
import { CrashCategory } from "@/lib/intelligence/sage/types";

export interface SageActionableFix {
  type: "missing_dependency" | "incompatible_dependency_version" | "duplicate_mod" | "other";
  modId: string;
  dependencyId?: string;
  requiredVersion?: string;
  currentVersion?: string;
  suggestionLabel: string;
}

export interface SageAnalysisResult {
  success: boolean;
  title: string;
  exceptionType: string;
  category: "Memoria" | "Dependencias" | "Conflictos" | "Programación" | "Java/Sistema" | "Desconocido";
  severity: "critical" | "warning" | "info";
  confidence: number;
  suspectedMods: string[];
  explanation: string;
  solutions: string[];
  technicalSummary: string;
  gameVersion?: string;
  loader?: string;
  actionableFix?: SageActionableFix;
  actionableFixes?: SageActionableFix[];
  rawStats: {
    linesParsed: number;
    hasStackTrace: boolean;
    hasModList: boolean;
  };
  isHybrid?: boolean;
  hybridRiskScore?: number;
  hybridStabilityRisk?: "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";
  detectedFabricModulesCount?: number;
  rule?: string;
}

function mapCategoryToLegacy(cat: CrashCategory): SageAnalysisResult["category"] {
  switch (cat) {
    case "OUT_OF_MEMORY":
      return "Memoria";
    case "MISSING_DEPENDENCY":
      return "Dependencias";
    case "MOD_CONFLICT":
    case "VERSION_CONFLICT":
      return "Conflictos";
    case "MIXIN_FAILURE":
      return "Programación";
    case "JAVA_INCOMPATIBILITY":
      return "Java/Sistema";
    default:
      return "Desconocido";
  }
}

export function analyzeMinecraftLog(rawText: string): SageAnalysisResult {
  if (!rawText || rawText.trim().length === 0) {
    return {
      success: false,
      title: "Log Vacío",
      exceptionType: "EmptyInputException",
      category: "Desconocido",
      severity: "info",
      confidence: 0,
      suspectedMods: [],
      explanation: "El texto de entrada está vacío.",
      solutions: ["Pega un reporte de crash o archivo latest.log."],
      technicalSummary: "",
      rawStats: { linesParsed: 0, hasStackTrace: false, hasModList: false }
    };
  }

  // Delegate to SAGE 2.0 Engine
  const report = SageCrashEngine.diagnose(rawText);

  // Map to legacy actionable fixes
  const actionableFixes: SageActionableFix[] = report.remediation.allActions
    .filter(a => a.targetMod)
    .map(a => ({
      type: a.actionType === "install_dependency" ? "missing_dependency" :
            a.actionType === "delete_duplicate" ? "duplicate_mod" : "other",
      modId: a.targetMod!,
      dependencyId: a.targetMod,
      requiredVersion: a.requiredVersion,
      suggestionLabel: a.title
    }));

  const legacyCategory = mapCategoryToLegacy(report.category);
  const severity: "critical" | "warning" | "info" =
    report.confidence >= 80 ? "critical" : report.confidence >= 50 ? "warning" : "info";

  // Synthesize solutions
  const solutions = report.remediation.allActions.flatMap(a => a.instructions);
  if (solutions.length === 0) {
    solutions.push("Revisa el archivo de log para detalles adicionales.");
  }

  const explanation = `${report.rootCause}.\n\n` +
    (report.evidence.length > 0 ? `Evidencia detectada:\n` + report.evidence.map(e => `• ${e.description}`).join("\n") : "");

  return {
    success: report.category !== "UNKNOWN_RUNTIME",
    title: report.rootCause,
    exceptionType: report.rawException || "CrashException",
    category: legacyCategory,
    severity,
    confidence: report.confidence,
    suspectedMods: report.suspectedMods,
    explanation,
    solutions,
    technicalSummary: SageExplainer.formatOfflineReport(report),
    gameVersion: report.environment.minecraftVersion,
    loader: report.environment.loader !== "unknown" ? report.environment.loader : undefined,
    actionableFix: actionableFixes[0],
    actionableFixes: actionableFixes.length > 0 ? actionableFixes : undefined,
    rawStats: {
      linesParsed: report.environment.totalLines,
      hasStackTrace: report.normalizedStack.length > 0,
      hasModList: report.environment.hasModList
    },
    isHybrid: report.environment.isHybridConnector
  };
}
