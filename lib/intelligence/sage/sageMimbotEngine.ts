/**
 * SAGE 3.0 MIM-Bot Diagnostic Copilot Engine
 * 
 * Orchestrates deterministic SAGE findings, FOMO dependency intelligence,
 * heuristic suspect elimination, local cryptographic caching, and AI-powered
 * reasoning via the unified AIProvider abstraction (GLM via OpenRouter primary,
 * Gemini fallback, or offline heuristic).
 */

import { computeCrashSignature, getCachedDiagnosis, saveSageCacheEntry, SageActionableItem, SageCacheEntry, SageEliminationCandidate } from "./cacheEngine";
import { correlateSuspectsWithFomo, FomoCorrelationResult } from "./fomoCorrelator";
import { SageAnalysisResult } from "@/utils/sageAnalyzer";
import { createDefaultProvider, type AIProvider, type AIProviderId } from "../ai";
import { OpenRouterProvider } from "../ai/openRouterProvider";
import { buildSageDiagnosisContext } from "../contextBuilder";

export interface SageMimbotInput {
  analysis: SageAnalysisResult;
  rawCrashText: string;
  installedModIds?: string[];
  personality?: "bully" | "standard";
  /** Optional BYOK API key. When omitted, env-configured keys are used. */
  apiKey?: string;
  /** Provider selection. Defaults to env-configured provider or "offline". */
  provider?: AIProviderId | "offline";
  model?: string;
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

export interface SageChatMessage {
  role: "user" | "model" | "assistant";
  text: string;
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

  // Standard persona fallback
  return `📌 **Resumen Técnico**: El crash report indica un fallo crítico asociado a '${culprit}'.\n\n🔍 **Análisis de Causa Raíz**: ${analysis.explanation || "Incompatibilidad o fallo en tiempo de ejecución."}\n\n🛠️ **Acciones de Solución**:\n1. ${analysis.solutions[0] || "Revisar la compatibilidad de versiones de los mods instalados."}\n2. ${analysis.solutions[1] || "Desactivar temporalmente el mod afectado."}`;
}

/**
 * Executes deep diagnosis through MIM-Bot.
 * Uses AIProvider abstraction — GLM via OpenRouter (primary) or Gemini (fallback).
 */
export async function analyzeWithSageMimbot(input: SageMimbotInput): Promise<SageMimbotDiagnosisResult> {
  const { analysis, rawCrashText, installedModIds = [], personality = "bully", apiKey, provider: providerHint = "offline", model } = input;
  const loader = analysis.loader || "fabric";
  const mcVersion = analysis.gameVersion || "1.20.1";

  // 1. Signature calculation
  const signature = computeCrashSignature(loader, mcVersion, rawCrashText, analysis.suspectedMods);

  // 2. Check Local Cache
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

  // 3. FOMO Correlation & Elimination Tree
  const fomoCorrelation = correlateSuspectsWithFomo({
    suspects: analysis.suspectedMods,
    stackTrace: rawCrashText,
    installedModIds,
    loader,
    mcVersion,
  });

  // 4. Generate diagnosis text via AIProvider or local heuristic fallback
  let mimbotExplanation = "";
  let modelUsed = "local-heuristic";

  if (providerHint !== "offline") {
    // Build evidence-tagged context
    const ctx = buildSageDiagnosisContext(analysis, fomoCorrelation, rawCrashText, personality);
    const promptText = `${ctx.systemPrompt}\n\n${ctx.userPrompt}`;

    // Resolve provider: use BYOK key if provided, otherwise env-configured default
    let aiProvider: AIProvider | null = null;

    if (apiKey) {
      // BYOK path — create provider directly with the provided key
      const { createAIProvider } = await import("../ai");
      aiProvider = createAIProvider({
        apiKey,
        provider: providerHint === "gemini" ? "gemini" : providerHint === "openrouter" ? "openrouter" : undefined,
      });
    } else {
      // Env-configured path
      const result = createDefaultProvider();
      aiProvider = result.provider;
    }

    if (aiProvider) {
      try {
        let result;

        if (aiProvider.id === "openrouter" && "generateWithFallback" in aiProvider) {
          // GLM cascade via OpenRouter
          result = await (aiProvider as OpenRouterProvider).generateWithFallback({
            messages: [{ role: "user", parts: [{ type: "text", text: promptText }] }],
            temperature: 0.7,
          });
        } else {
          // Gemini or other provider — use specified model or default
          const selectedModel = model || "gemini-flash-lite-latest";
          result = await aiProvider.generate({
            model: selectedModel,
            messages: [{ role: "user", parts: [{ type: "text", text: promptText }] }],
            temperature: 0.7,
          });
        }

        if (result.text) {
          mimbotExplanation = result.text;
          modelUsed = result.model;
        }
      } catch (err) {
        console.warn("[sageMimbotEngine] AI provider call failed, falling back to local heuristic:", err);
      }
    }
  }

  if (!mimbotExplanation) {
    mimbotExplanation = generateLocalMimbotDiagnosis(analysis, fomoCorrelation, personality);
    modelUsed = "local-heuristic";
  }

  // 5. Build Actionable Items
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

  // 6. Save in Local Cache for instant 0 ms future recall
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
 * MIM-Bot Chat (incident scope): lightweight follow-up scoped to the diagnosed crash.
 * Uses the AIProvider abstraction instead of raw fetch calls.
 */
export async function chatWithSageMimbot(
  contextDiagnosis: SageMimbotDiagnosisResult,
  messages: SageChatMessage[],
  apiKey?: string,
  provider?: AIProviderId
): Promise<string> {
  const personality = contextDiagnosis.personality;
  const isBully = personality === "bully";

  // Resolve provider: BYOK or env-configured
  let aiProvider: AIProvider | null = null;

  if (apiKey && provider) {
    const { createAIProvider } = await import("../ai");
    aiProvider = createAIProvider({ apiKey, provider });
  } else {
    const result = createDefaultProvider();
    aiProvider = result.provider;
  }

  if (!aiProvider) {
    if (isBully) {
      return `🔥 No configuraste tu API key para el chat en vivo, pero te la hago corta: el culpable sigue siendo **${contextDiagnosis.primaryCulprit || "el mod corrupto"}**. Desactivalo o instalale la dependencia que te marqué arriba y dejá de dar vueltas.`;
    }
    return `Para consultas interactivas avanzadas, podés configurar tu clave de OpenAI o Google Gemini en las opciones. Según el diagnóstico técnico, la recomendación principal es solucionar el mod **${contextDiagnosis.primaryCulprit}**.`;
  }

  const systemContext = `
Contexto del crash diagnosticado:
- Culpable: ${contextDiagnosis.primaryCulprit}
- Explicación previa: ${contextDiagnosis.mimbotExplanation}
- Personalidad activa: ${personality}
Responde la pregunta del usuario con brevedad (máximo 3 párrafos), manteniendo tu tono ${personality === "bully" ? "gamer bully sarcástico pero técnicamente certero" : "profesional de ingeniería"}.
`.trim();

  const chatMessages = [
    { role: "system" as const, parts: [{ type: "text" as const, text: systemContext }] },
    ...messages.map((m) => ({
      role: (m.role === "model" ? "assistant" : m.role) as "user" | "assistant",
      parts: [{ type: "text" as const, text: m.text }],
    })),
  ];

  try {
    let result;

    if (aiProvider.id === "openrouter" && "generateWithFallback" in aiProvider) {
      result = await (aiProvider as OpenRouterProvider).generateWithFallback({
        messages: chatMessages,
        temperature: 0.7,
        maxOutputTokens: 320,
      });
    } else {
      result = await aiProvider.generate({
        model: "gemini-flash-lite-latest",
        messages: chatMessages,
        temperature: 0.7,
        maxOutputTokens: 320,
      });
    }

    if (result.text) return result.text;
  } catch (err) {
    console.warn("[sageMimbotEngine] Chat provider call error:", err);
  }

  return `🔥 Error al conectar con el proveedor de IA. Pero el diagnóstico determinista local no falla: atendé a '${contextDiagnosis.primaryCulprit}'.`;
}