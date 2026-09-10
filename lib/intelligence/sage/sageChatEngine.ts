/**
 * Shared SAGE MIM-Bot chat engine — used by /api/sage/chat and sageMimbotEngine (BOT-05b).
 */

import {
  generateWithModelGateway,
  isAIProviderError,
  type GatewayKeyOptions,
} from "../ai";
import {
  computeCrashSignature,
  getCachedDiagnosis,
} from "./cacheEngine";

export type SageCrashContext = {
  category?: string;
  exceptionType?: string;
  suspectedMods?: string[];
  loader?: string;
  gameVersion?: string;
  explanation?: string;
  stackTraceSnippet?: string;
};

export type SageChatTurn = {
  role: string;
  text: string;
};

/** @alias SageChatTurn */
export type SageChatMessage = SageChatTurn;

export type SageChatInput = {
  question: string;
  personality: "bully" | "standard";
  messages?: SageChatTurn[];
  crashContext?: SageCrashContext;
  gatewayKeys: GatewayKeyOptions;
  signal?: AbortSignal;
};

export type SageChatResult = {
  text: string;
  model: string;
  provider: string;
  routeReason: string;
};

export function buildSageChatSystemContext(
  crashContext: SageCrashContext | undefined,
  personality: "bully" | "standard",
  cachedContextHint = ""
): string {
  const isBully = personality === "bully";

  return `
Sos MIM-Bot, el asistente técnico de diagnóstico de SAGE (Systematic Analyzer for Glitches & Exceptions) de MIM (Minecraft Intelligent Manager).
${
  isBully
    ? `Tu personalidad es la de un gamer bully técnico: satírico, mordaz, burlón con las cagadas de configuración del usuario, pero con información 100% verídica, exacta y soluciones concretas.
Tirale la respuesta técnica certera en 1 o 2 párrafos filosos, sin pelos en la lengua. Cero saludos formales.`
    : `Tu personalidad es la de un ingeniero de software profesional: sobrio, cordial, empático, preciso y directo al grano estructurado en:
1. Resumen técnico
2. Causa raíz identificada
3. Acciones de mitigación`
}

CONTEXTO DEL CRASH REPORT ANALIZADO POR SAGE:
- Categoría: ${crashContext?.category || "Desconocida"}
- Excepción: ${crashContext?.exceptionType || "Desconocida"}
- Mods sospechosos identificados: ${(crashContext?.suspectedMods || []).join(", ") || "Ninguno"}
- Loader: ${crashContext?.loader || "Desconocido"}
- Versión de Minecraft: ${crashContext?.gameVersion || "Desconocida"}
- Diagnóstico previo de SAGE: ${crashContext?.explanation || "Sin diagnóstico previo"}${cachedContextHint}

REGLA CLAVE PARA ENLACES A FOMO:
Siempre que nombres, sugieras o recomiendes un mod, dependencia requerida, biblioteca, texture pack, resource pack o shader para solucionar el problema, formatalo OBLIGATORIAMENTE con link a FOMO usando esta sintaxis:
[Nombre del Mod](fomo:id_o_nombre)
Ejemplos: [Cloth Config API](fomo:cloth-config), [ad_astra](fomo:ad_astra), [Resourceful Lib](fomo:resourcefullib), [Sodium](fomo:sodium), [Architectury API](fomo:architectury-api).
Esto genera automáticamente un botón interactivo para que el usuario pueda abrirlo en FOMO y descargarlo en 1-clic.

Respondé a la consulta del usuario de forma concisa y accionable.
`.trim();
}

export function resolveSageCachedContextHint(crashContext?: SageCrashContext): string {
  if (!crashContext) return "";

  try {
    const sig = computeCrashSignature(
      crashContext.loader || "",
      crashContext.gameVersion || "",
      crashContext.stackTraceSnippet || crashContext.explanation || "",
      crashContext.suspectedMods || []
    );
    const cached = getCachedDiagnosis(sig);
    if (cached?.culprit) {
      return `\n- Culprit confirmado previamente en caché: ${cached.culprit} (Certeza: ${cached.severity})`;
    }
  } catch {
    // Non-fatal: cache lookup is best-effort
  }

  return "";
}

export function buildSageChatAiMessages(input: SageChatInput) {
  const isBully = input.personality === "bully";
  const cachedHint = resolveSageCachedContextHint(input.crashContext);
  const systemContext = buildSageChatSystemContext(
    input.crashContext,
    input.personality,
    cachedHint
  );
  const recentMessages = Array.isArray(input.messages) ? input.messages.slice(-6) : [];

  return [
    {
      role: "user" as const,
      parts: [{ type: "text" as const, text: `${systemContext}\n\n[INICIO DE LA CONSULTA]` }],
    },
    {
      role: "assistant" as const,
      parts: [{
        type: "text" as const,
        text: isBully
          ? "Dale, decime qué hiciste ahora para romper el juego."
          : "Entendido. Estoy listo para ayudarte a analizar este incidente técnico.",
      }],
    },
    ...recentMessages
      .filter((m) => m?.text?.trim())
      .map((m) => ({
        role: (m.role === "model" ? "assistant" : "user") as "user" | "assistant",
        parts: [{ type: "text" as const, text: m.text.trim() }],
      })),
    {
      role: "user" as const,
      parts: [{ type: "text" as const, text: input.question.trim() }],
    },
  ];
}

export async function runSageChat(input: SageChatInput): Promise<SageChatResult> {
  const isBully = input.personality === "bully";
  const aiMessages = buildSageChatAiMessages(input);

  const result = await generateWithModelGateway({
    intent: "sage-chat",
    messages: aiMessages,
    temperature: isBully ? 0.5 : 0.2,
    maxOutputTokens: isBully ? 280 : 700,
    signal: input.signal,
    ...input.gatewayKeys,
  });

  return {
    text: result.text,
    model: result.model,
    provider: result.provider,
    routeReason: result.routeReason,
  };
}

export function mapSageChatError(err: unknown): {
  code: "MIM_CREDENTIAL_MISSING" | "MIM_CREDENTIAL_INVALID" | "MIM_PROVIDER_RATE_LIMIT" | "MIM_AI_GENERATION_FAILED";
  details?: string;
} {
  if (isAIProviderError(err)) {
    if (err.code === "NO_API_KEY") {
      return { code: "MIM_CREDENTIAL_MISSING" };
    }
    if (err.code === "RATE_LIMITED") {
      return { code: "MIM_PROVIDER_RATE_LIMIT", details: err.message };
    }
  }

  const msg = err instanceof Error ? err.message : String(err);
  if (msg.toLowerCase().includes("api_key") || msg.toLowerCase().includes("api key")) {
    return { code: "MIM_CREDENTIAL_INVALID", details: msg };
  }

  return { code: "MIM_AI_GENERATION_FAILED", details: msg };
}
