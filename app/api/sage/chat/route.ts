/**
 * /api/sage/chat — POST
 * Chat interactivo de MIM-Bot con contexto de crash report (SAGE).
 * Protegido con withApiGuard, validación Zod, AIProvider abstraction,
 * y conexión a caché de diagnóstico de SAGE.
 *
 * MVP: Uses non-streaming generation through AIProvider, but emits
 * the response through the existing SSE stream contract (start → delta → done)
 * to preserve the SageMimbotCopilot frontend component.
 */

import { z } from "zod";
import { withApiGuard } from "@/lib/apiGuard";
import {
  computeCrashSignature,
  getCachedDiagnosis,
} from "@/lib/intelligence/sage/cacheEngine";
import {
  errorMessage,
  sageErrorResponse,
} from "@/lib/intelligence/sage/errorContract";
import { encodeSageStreamEvent } from "@/lib/intelligence/sage/streamContract";
import { generateWithModelGateway, isAIProviderError, resolveGatewayKeys } from "@/lib/intelligence/ai";

const bodySchema = z.object({
  question: z.string().trim().min(1, "Falta el parámetro question"),
  personality: z.enum(["bully", "standard"]).optional().default("bully"),
  clientApiKey: z.string().optional().default(""),
  messages: z
    .array(
      z.object({
        role: z.string(),
        text: z.string(),
      })
    )
    .optional()
    .default([]),
  crashContext: z
    .object({
      category: z.string().optional(),
      exceptionType: z.string().optional(),
      suspectedMods: z.array(z.string()).optional(),
      loader: z.string().optional(),
      gameVersion: z.string().optional(),
      explanation: z.string().optional(),
      stackTraceSnippet: z.string().optional(),
    })
    .optional(),
});

export const POST = withApiGuard(
  {
    rateLimit: { windowMs: 60 * 1000, maxRequests: 25 },
    bodySchema,
  },
  async ({ request, body }) => {
    const { crashContext, messages, question, personality, clientApiKey } = body;

    // Resolve provider using the unified factory
    const headerGeminiKey = request.headers.get("x-gemini-key") || "";
    const headerOpenRouterKey = request.headers.get("x-openrouter-key") || "";

    const gatewayKeys = {
      clientGeminiKey: clientApiKey || undefined,
      headerGeminiKey: headerGeminiKey,
      openrouterKey: headerOpenRouterKey,
    };
    const { hasGeminiKey, hasOpenRouterKey } = resolveGatewayKeys(gatewayKeys);

    if (!hasGeminiKey && !hasOpenRouterKey) {
      return sageErrorResponse("MIM_CREDENTIAL_MISSING");
    }

    const isBully = personality === "bully";

    // ── 1. Verificación en Caché Determinista SAGE ──
    let cachedContextHint = "";
    if (crashContext) {
      try {
        const sig = computeCrashSignature(
          crashContext.loader || "",
          crashContext.gameVersion || "",
          crashContext.stackTraceSnippet || crashContext.explanation || "",
          crashContext.suspectedMods || []
        );
        const cached = getCachedDiagnosis(sig);
        if (cached && cached.culprit) {
          cachedContextHint = `\n- Culprit confirmado previamente en caché: ${cached.culprit} (Certeza: ${cached.severity})`;
        }
      } catch (err) {
        console.debug("[/api/sage/chat] Cache signature evaluation skipped:", err);
      }
    }

    // ── 2. System Context con datos del crash y formateo FOMO ──
    const systemContext = `
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

    // ── 3. Truncado de Historial a los últimos 6 turnos para optimizar tokens ──
    const recentMessages = Array.isArray(messages) ? messages.slice(-6) : [];

    // Build messages in the AIProvider format
    const aiMessages = [
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
        .filter((m) => m?.text && m.text.trim())
        .map((m) => ({
          role: (m.role === "model" ? "assistant" : "user") as "user" | "assistant",
          parts: [{ type: "text" as const, text: m.text.trim() }],
        })),
      {
        role: "user" as const,
        parts: [{ type: "text" as const, text: question.trim() }],
      },
    ];

    // ── 4. Generate via Model Gateway (BOT-GW: text → GLM, multimodal → Gemini) ──
    try {
      const result = await generateWithModelGateway({
        intent: "sage-chat",
        messages: aiMessages,
        temperature: isBully ? 0.5 : 0.2,
        maxOutputTokens: isBully ? 280 : 700,
        signal: request.signal,
        ...gatewayKeys,
      });

      const responseText = result.text;
      const modelUsed = result.model;

      // ── 5. Emit buffered response through SSE stream contract ──
      // The SageMimbotCopilot frontend expects the SSE stream format.
      // We buffer the full response and emit it as start → delta → done.
      return createBufferedStreamResponse(responseText, modelUsed);

    } catch (err: unknown) {
      const msg = errorMessage(err);
      console.warn("[/api/sage/chat] Provider generation failed:", msg);

      if (isAIProviderError(err)) {
        if (err.code === "RATE_LIMITED") {
          return sageErrorResponse("MIM_PROVIDER_RATE_LIMIT", { details: msg });
        }
      }

      return sageErrorResponse("MIM_AI_GENERATION_FAILED", {
        message: "MIM-Bot no pudo generar respuesta.",
        details: msg,
      });
    }
  }
);

/**
 * Emits a buffered AI response through the SAGE SSE stream contract.
 * Preserves the SageMimbotCopilot frontend expectations (start → delta → done).
 */
function createBufferedStreamResponse(text: string, model: string): Response {
  let step = 0;

  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (step === 0) {
        controller.enqueue(encodeSageStreamEvent({ type: "start", model }));
        step = 1;
        return;
      }
      if (step === 1) {
        controller.enqueue(encodeSageStreamEvent({ type: "delta", text }));
        step = 2;
        return;
      }
      controller.enqueue(encodeSageStreamEvent({ type: "done" }));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
