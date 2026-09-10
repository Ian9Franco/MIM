/**
 * SAGE 3.0 MIM-Bot Diagnostic Copilot Engine
 *
 * Orchestrates deterministic SAGE findings, FOMO dependency intelligence,
 * heuristic suspect elimination, local cryptographic caching, and AI-powered
 * reasoning via the unified Model Gateway (Gemini / OpenRouter).
 */

import { computeCrashSignature, getCachedDiagnosis, saveSageCacheEntry, SageActionableItem, SageCacheEntry, SageEliminationCandidate } from "./cacheEngine";
import { correlateSuspectsWithFomo, FomoCorrelationResult } from "./fomoCorrelator";
import { SageAnalysisResult } from "@/utils/sageAnalyzer";
import { generateWithModelGateway, resolveGatewayKeys, type AIProviderId, type GatewayKeyOptions } from "../ai";
import { buildSageDiagnosisContext } from "../contextBuilder";
import {
  runSageChat,
  type SageChatMessage,
  type SageCrashContext,
} from "./sageChatEngine";

export type { SageChatMessage };

export interface SageMimbotInput {
  analysis: SageAnalysisResult;
  rawCrashText: string;
  installedModIds?: string[];
  personality?: "bully" | "standard";
  /** Optional BYOK overrides for gateway routing. */
  gatewayKeys?: GatewayKeyOptions;
  /** @deprecated Use gatewayKeys — kept for tests */
  apiKey?: string;
  /** Provider selection. Defaults to env-configured provider or "offline". */
  provider?: AIProviderId | "offline";
  model?: string;
  signal?: AbortSignal;
}

export interface SageMimbotDiagnosisResult {
  signature: string;
  fromCache: boolean;
  mimbotExplanation: string;
  personality: "bully" | "standard";
  primaryCulprit: string | null;
  eliminationTree: SageEliminationCandidate[];
  fomoCorrelation: FomoCorrelationResult;
  actionableFixes: SageActionableItem[];
  solutions: string[];
  severity: "critical" | "warning" | "info";
  modelUsed: string;
}

/**
 * Builds the system instructions for MIM-Bot in diagnostic mode.
 * Kept for backward compatibility — new code should prefer buildSageDiagnosisContext.
 */
export function buildDiagnosticPrompt(
  analysis: SageAnalysisResult,
  fomo: FomoCorrelationResult,
  personality: "bully" | "standard"
): string {
  const ctx = buildSageDiagnosisContext(analysis, fomo, "", personality);
  return `${ctx.systemPrompt}\n\n${ctx.userPrompt}`;
}

/**
 * Local deterministic fallback when no API key is supplied or offline.
 */
export function generateLocalMimbotDiagnosis(
  analysis: SageAnalysisResult,
  fomo: FomoCorrelationResult,
  personality: "bully" | "standard"
): string {
  const isBully = personality === "bully";
  const culprit = fomo.primaryCulprit || analysis.suspectedMods[0] || "un mod no identificado";

  if (isBully) {
    if (fomo.missingDependencies.length > 0) {
      const dep = fomo.missingDependencies[0];
      return `🔥 **El Roast de MIM-Bot**: Felicitaciones, genio. Intentaste correr '${dep.name}' sin '${dep.requiredMod}'. ¿También intentás arrancar un auto sin nafta?\n\n🎯 **La Posta**: Falta una dependencia estructural requerida en el classpath.\n\n🛠️ **Plan de Rescate**:\n1. Descargá e instalá '${dep.requiredMod}'.\n2. Reiniciá el juego y no toques nada raro.`;
    }

    if (fomo.detectedIncompatibilities.length > 0) {
      const inc = fomo.detectedIncompatibilities[0];
      return `🔥 **El Roast de MIM-Bot**: Pusiste '${inc.modA}' junto con '${inc.modB}'. Es como tirar agua hirviendo a la placa de video y esperar 200 FPS.\n\n🎯 **La Posta**: ${inc.reason}\n\n🛠️ **Plan de Rescate**:\n1. Elegí uno de los dos mods y desactiva el otro.\n2. Si son mods de rendimiento, conservá el que sea nativo de tu loader.`;
    }

    return `🔥 **El Roast de MIM-Bot**: El juego colapsó por culpa de '${culprit}'. No sé qué le hiciste a tu modpack pero el motor de rendering pidió auxilio.\n\n🎯 **La Posta**: ${analysis.explanation || "Colisión interna en el stack de ejecución."}\n\n🛠️ **Plan de Rescate**:\n1. Desactivá temporalmente '${culprit}' renombrándolo a .disabled.\n2. Verificá si existe una actualización en CurseForge o Modrinth.`;
  }

  return `📌 **Resumen Técnico**: El crash report indica un fallo crítico asociado a '${culprit}'.\n\n🔍 **Análisis de Causa Raíz**: ${analysis.explanation || "Incompatibilidad o fallo en tiempo de ejecución."}\n\n🛠️ **Acciones de Solución**:\n1. ${analysis.solutions[0] || "Revisar la compatibilidad de versiones de los mods instalados."}\n2. ${analysis.solutions[1] || "Desactivar temporalmente el mod afectado."}`;
}

function resolveGatewayKeysFromLegacy(input: SageMimbotInput): GatewayKeyOptions | undefined {
  if (input.gatewayKeys) return input.gatewayKeys;
  if (!input.apiKey?.trim()) return undefined;

  if (input.provider === "openrouter") {
    return { openrouterKey: input.apiKey.trim() };
  }
  return { clientGeminiKey: input.apiKey.trim() };
}

/**
 * Executes deep diagnosis through MIM-Bot via Model Gateway.
 */
export async function analyzeWithSageMimbot(input: SageMimbotInput): Promise<SageMimbotDiagnosisResult> {
  const { analysis, rawCrashText, installedModIds = [], personality = "bully", provider: providerHint = "offline", model, signal } = input;
  const loader = analysis.loader || "fabric";
  const mcVersion = analysis.gameVersion || "1.20.1";

  const signature = computeCrashSignature(loader, mcVersion, rawCrashText, analysis.suspectedMods);

  const cached = getCachedDiagnosis(signature);
  if (cached) {
    return {
      signature,
      fromCache: true,
      mimbotExplanation: cached.mimbotExplanation,
      personality: cached.personality,
      primaryCulprit: cached.culprit,
      eliminationTree: cached.eliminationTree,
      fomoCorrelation: {
        primaryCulprit: cached.culprit,
        eliminationTree: cached.eliminationTree,
        missingDependencies: [],
        detectedIncompatibilities: [],
        suggestedAction: "review",
      },
      actionableFixes: cached.actionableFixes,
      solutions: cached.solutions,
      severity: cached.severity,
      modelUsed: "local-cache-hit",
    };
  }

  const fomoCorrelation = correlateSuspectsWithFomo({
    suspects: analysis.suspectedMods,
    stackTrace: rawCrashText,
    installedModIds,
    loader,
    mcVersion,
  });

  let mimbotExplanation = "";
  let modelUsed = "local-heuristic";

  if (providerHint !== "offline") {
    const gatewayKeys = input.gatewayKeys ?? resolveGatewayKeysFromLegacy(input) ?? {};
    const { hasGeminiKey, hasOpenRouterKey } = resolveGatewayKeys(gatewayKeys);

    if (hasGeminiKey || hasOpenRouterKey) {
    const ctx = buildSageDiagnosisContext(analysis, fomoCorrelation, rawCrashText, personality);
    const promptText = `${ctx.systemPrompt}\n\n${ctx.userPrompt}`;

    try {
      const result = await generateWithModelGateway({
        intent: "sage-diagnosis",
        messages: [{ role: "user", parts: [{ type: "text", text: promptText }] }],
        temperature: 0.7,
        preferredGeminiModel: model,
        signal,
        ...gatewayKeys,
      });

      if (result.text) {
        mimbotExplanation = result.text;
        modelUsed = result.model;
      }
    } catch (err) {
      console.warn("[sageMimbotEngine] Model gateway failed, falling back to local heuristic:", err);
    }
    }
  }

  if (!mimbotExplanation) {
    mimbotExplanation = generateLocalMimbotDiagnosis(analysis, fomoCorrelation, personality);
    modelUsed = "local-heuristic";
  }

  const actionableFixes: SageActionableItem[] = [];
  if (fomoCorrelation.missingDependencies.length > 0) {
    for (const dep of fomoCorrelation.missingDependencies) {
      actionableFixes.push({
        id: `install-${dep.requiredMod}`,
        label: `Descargar e instalar '${dep.requiredMod}'`,
        action: "install_dependency",
        modId: dep.requiredMod,
      });
    }
  }

  const primaryCulprit = fomoCorrelation.primaryCulprit || analysis.suspectedMods[0];
  if (primaryCulprit) {
    actionableFixes.push({
      id: `disable-${primaryCulprit}`,
      label: `Desactivar temporalmente '${primaryCulprit}' (.disabled)`,
      action: "disable_mod",
      modId: primaryCulprit,
    });
  }

  if (analysis.category === "Memoria") {
    actionableFixes.push({
      id: "opt-jvm",
      label: "Optimizar flags de memoria JVM",
      action: "optimize_jvm",
    });
  }

  const cacheEntry: SageCacheEntry = {
    signature,
    timestamp: Date.now(),
    loader,
    mcVersion,
    culprit: primaryCulprit || "unknown",
    suspects: analysis.suspectedMods,
    severity: analysis.severity,
    summary: analysis.explanation,
    mimbotExplanation,
    personality,
    solutions: analysis.solutions,
    actionableFixes,
    eliminationTree: fomoCorrelation.eliminationTree,
  };

  await saveSageCacheEntry(cacheEntry);

  return {
    signature,
    fromCache: false,
    mimbotExplanation,
    personality,
    primaryCulprit: primaryCulprit || null,
    eliminationTree: fomoCorrelation.eliminationTree,
    fomoCorrelation,
    actionableFixes,
    solutions: analysis.solutions,
    severity: analysis.severity,
    modelUsed,
  };
}

/**
 * MIM-Bot Chat (incident scope): follow-up scoped to the diagnosed crash.
 * Delegates to the shared sageChatEngine used by /api/sage/chat (BOT-05b).
 */
export async function chatWithSageMimbot(
  contextDiagnosis: SageMimbotDiagnosisResult,
  messages: SageChatMessage[],
  gatewayKeys?: GatewayKeyOptions,
  signal?: AbortSignal
): Promise<string> {
  const personality = contextDiagnosis.personality;
  const isBully = personality === "bully";

  if (!gatewayKeys) {
    if (isBully) {
      return `🔥 No configuraste tu clave para el chat en vivo, pero te la hago corta: el culpable sigue siendo **${contextDiagnosis.primaryCulprit || "el mod corrupto"}**. Desactivalo o instalale la dependencia que te marqué arriba y dejá de dar vueltas.`;
    }
    return `Para consultas interactivas avanzadas, configurá tu clave de **Google Gemini** u **OpenRouter** en Ajustes. Según el diagnóstico técnico, la recomendación principal es solucionar el mod **${contextDiagnosis.primaryCulprit}**.`;
  }

  const crashContext: SageCrashContext = {
    explanation: contextDiagnosis.mimbotExplanation,
    suspectedMods: contextDiagnosis.eliminationTree.map((e) => e.modId),
  };

  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user" && m.text.trim());
  const question = lastUserMessage?.text.trim() || "¿Qué debería hacer ahora?";
  const priorMessages = messages.filter((m) => m !== lastUserMessage);

  try {
    const result = await runSageChat({
      question,
      personality,
      messages: priorMessages,
      crashContext,
      gatewayKeys,
      signal,
    });
    return result.text;
  } catch (err) {
    console.warn("[sageMimbotEngine] Chat gateway error:", err);
    return `🔥 Error al conectar con el proveedor de IA. Pero el diagnóstico determinista local no falla: atendé a '${contextDiagnosis.primaryCulprit}'.`;
  }
}
