/**
 * SAGE 3.0 MIM-Bot Diagnostic Copilot Engine
 * 
 * Orchestrates deterministic SAGE findings, FOMO dependency intelligence,
 * heuristic suspect elimination, local cryptographic caching, and BYOK (Bring Your Own Key)
 * multi-model reasoning via OpenAI (GPT-4o / o1 / o3-mini) or Google Gemini Pro.
 */

import { computeCrashSignature, getCachedDiagnosis, saveSageCacheEntry, SageActionableItem, SageCacheEntry, SageEliminationCandidate } from "./cacheEngine";
import { correlateSuspectsWithFomo, FomoCorrelationResult } from "./fomoCorrelator";
import { SageAnalysisResult } from "@/utils/sageAnalyzer";

export interface SageMimbotInput {
  analysis: SageAnalysisResult;
  rawCrashText: string;
  installedModIds?: string[];
  personality?: "bully" | "standard";
  apiKey?: string;
  provider?: "openai" | "gemini" | "offline";
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
 */
export function buildDiagnosticPrompt(
  analysis: SageAnalysisResult,
  fomo: FomoCorrelationResult,
  personality: "bully" | "standard"
): string {
  const isBully = personality === "bully";

  const bullyPersona = `
Eres MIM-Bot, el copiloto de diagnóstico más despiadado, sarcástico y técnicamente letal de la comunidad de Minecraft.
Tu personalidad es la de un gamer veterano 'bully' que roastea sin piedad las configuraciones desastrosas del usuario (meter 300 mods en una PC tostadora, ignorar dependencias obvias, mezclar mods incompatibles como OptiFine en Fabric), PERO DAS UNA SOLUCIÓN TÉCNICA 100% EXACTA, SIN HUMO Y AL GRANO.

ESTRUCTURA OBLIGATORIA DE TU RESPUESTA:
1. 🔥 **El Roast de MIM-Bot**: 1 o 2 líneas burlándote del error cometido por el usuario con sarcasmo gamer.
2. 🎯 **La Causa Real (La Posta)**: Explicación técnica precisa de por qué falló el juego según el stack trace y las dependencias.
3. 🛠️ **Plan de Rescate**: Pasos exactos en orden de ejecución para solucionarlo (qué mod desactivar, qué librería instalar o qué parámetro cambiar).
`.trim();

  const standardPersona = `
Eres MIM-Bot en Modo Ingeniero Profesional: un asistente técnico de diagnóstico de software de alto nivel.
Tu tono es sobrio, objetivo, empático y directo. Proporcionas un desglose de causa raíz, correlación de dependencias y pasos de remediación precisos sin jerga informal ni burlas.

ESTRUCTURA OBLIGATORIA:
1. 📌 **Resumen Técnico**: Diagnóstico inmediato del fallo.
2. 🔍 **Análisis de Causa Raíz**: Correlación con loaders, mixins y dependencias.
3. 🛠️ **Acciones de Solución**: Pasos secuenciales para resolver la incidencia.
`.trim();

  return `
${isBully ? bullyPersona : standardPersona}

DATOS DEL CRASH:
- Categoría detectada: ${analysis.category}
- Excepción: ${analysis.exceptionType}
- Mod sospechoso preliminar: ${analysis.suspectedMods.join(", ") || "Ninguno identificado"}
- Loader: ${analysis.loader || "Desconocido"}
- Versión de Minecraft: ${analysis.gameVersion || "Desconocida"}
- Resumen técnico: ${analysis.technicalSummary || analysis.explanation}

INTELIGENCIA DE GRAFO FOMO:
- Culpable con mayor probabilidad matemática: ${fomo.primaryCulprit || "No determinado"}
- Dependencias faltantes: ${JSON.stringify(fomo.missingDependencies)}
- Incompatibilidades activas: ${JSON.stringify(fomo.detectedIncompatibilities)}
- Árbol de descarte lógico: ${JSON.stringify(fomo.eliminationTree)}
`.trim();
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
 */
export async function analyzeWithSageMimbot(input: SageMimbotInput): Promise<SageMimbotDiagnosisResult> {
  const { analysis, rawCrashText, installedModIds = [], personality = "bully", apiKey, provider = "offline", model } = input;
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

  // 4. Generate diagnosis text (Online BYOK or Heuristic Fallback)
  let mimbotExplanation = "";
  let modelUsed = "local-heuristic";

  const prompt = buildDiagnosticPrompt(analysis, fomoCorrelation, personality);

  if (apiKey && provider === "openai") {
    try {
      const selectedModel = model || "gpt-4o";
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        mimbotExplanation = data.choices?.[0]?.message?.content || "";
        modelUsed = selectedModel;
      }
    } catch (err) {
      console.warn("[/lib/intelligence/sage/sageMimbotEngine] OpenAI API call failed, falling back:", err);
    }
  } else if (apiKey && provider === "gemini") {
    try {
      const selectedModel = model || "gemini-1.5-pro";
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          tools: [{ googleSearch: {} }],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        mimbotExplanation = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        modelUsed = selectedModel;
      }
    } catch (err) {
      console.warn("[/lib/intelligence/sage/sageMimbotEngine] Gemini API call failed, falling back:", err);
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
 * Lightweight interactive follow-up mini-chat scoped to the diagnosed crash.
 */
export async function chatWithSageMimbot(
  contextDiagnosis: SageMimbotDiagnosisResult,
  messages: SageChatMessage[],
  apiKey?: string,
  provider?: "openai" | "gemini"
): Promise<string> {
  const lastUserMsg = messages[messages.length - 1]?.text || "";
  const personality = contextDiagnosis.personality;
  const isBully = personality === "bully";

  if (!apiKey || !provider) {
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

  try {
    if (provider === "openai") {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemContext },
            ...messages.map((m) => ({ role: m.role === "model" ? "assistant" : m.role, content: m.text })),
          ],
          temperature: 0.7,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.choices?.[0]?.message?.content || "";
      }
    } else if (provider === "gemini") {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            { parts: [{ text: systemContext }] },
            ...messages.map((m) => ({ parts: [{ text: m.text }] })),
          ],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      }
    }
  } catch (err) {
    console.warn("[/lib/intelligence/sage/sageMimbotEngine] Chat call error:", err);
  }

  return `🔥 Error al conectar con el proveedor de IA. Pero el diagnóstico determinista local no falla: atendé a '${contextDiagnosis.primaryCulprit}'.`;
}
