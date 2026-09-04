/**
 * /api/sage/chat — POST
 * Chat interactivo de MIM-Bot con contexto de crash report (SAGE).
 * Protegido con withApiGuard, validación Zod, memoria de cascada de modelos
 * y conexión a caché de diagnóstico de SAGE.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiGuard } from "@/lib/apiGuard";
import { getApiKey } from "@/lib/core/settings";
import {
  computeCrashSignature,
  getCachedDiagnosis,
} from "@/lib/intelligence/sage/cacheEngine";

const GEMINI_MODELS = [
  "gemini-flash-lite-latest",
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.6-flash",
];

// Memoria en caliente del último modelo que respondió exitosamente
let lastSuccessfulModel = GEMINI_MODELS[0];

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

    // Prioridad de clave API:
    // 1. clientApiKey provista en el body
    // 2. Header x-gemini-key
    // 3. Settings MIM Desktop / process.env
    const headerKey = request.headers.get("x-gemini-key") || "";
    const resolvedApiKey =
      (clientApiKey || "").trim() ||
      (headerKey && headerKey.trim()) ||
      process.env.GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
      getApiKey("gemini");

    if (!resolvedApiKey) {
      return NextResponse.json(
        { error: "NO_API_KEY", message: "No hay clave de Gemini API configurada." },
        { status: 401 }
      );
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

    const geminiContents = [
      { role: "user", parts: [{ text: `${systemContext}\n\n[INICIO DE LA CONSULTA]` }] },
      {
        role: "model",
        parts: [
          {
            text: isBully
              ? "Dale, decime qué hiciste ahora para romper el juego."
              : "Entendido. Estoy listo para ayudarte a analizar este incidente técnico.",
          },
        ],
      },
      ...recentMessages
        .filter((m) => m?.text && m.text.trim())
        .map((m) => ({
          role: m.role === "model" ? "model" : "user",
          parts: [{ text: m.text.trim() }],
        })),
      { role: "user", parts: [{ text: question.trim() }] },
    ];

    // Presupuesto diferenciado de tokens y temperatura ajustada
    const requestPayload = {
      contents: geminiContents,
      generationConfig: {
        temperature: isBully ? 0.5 : 0.2,
        maxOutputTokens: isBully ? 280 : 700,
      },
    };

    // ── 4. Cascada de modelos ordenada priorizando el último exitoso ──
    const prioritizedModels = [
      lastSuccessfulModel,
      ...GEMINI_MODELS.filter((m) => m !== lastSuccessfulModel),
    ];

    let lastErrorMsg = "";
    let isRateLimited = false;

    for (const modelName of prioritizedModels) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(
        resolvedApiKey
      )}`;

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestPayload),
        });

        if (res.ok) {
          const data = await res.json();
          const candidate = data.candidates?.[0];
          const reply = candidate?.content?.parts?.[0]?.text;
          if (reply && reply.trim()) {
            lastSuccessfulModel = modelName;
            return NextResponse.json({
              reply: reply.trim(),
              modelUsed: modelName,
            });
          }
        }

        const errData = await res.json().catch(() => ({}));
        const errMsg = errData?.error?.message || res.statusText || "";
        lastErrorMsg = errMsg;

        // Caso A: Clave API inválida o expirada (400/401/403)
        if (
          res.status === 400 &&
          (errMsg.toLowerCase().includes("api_key") || errMsg.toLowerCase().includes("api key"))
        ) {
          return NextResponse.json(
            { error: "NO_API_KEY", message: "Clave de Gemini API inválida o expirada." },
            { status: 401 }
          );
        }

        // Caso B: Rate Limit / Quota Exceeded (429)
        if (res.status === 429 || errMsg.toLowerCase().includes("quota") || errMsg.toLowerCase().includes("resource_exhausted")) {
          isRateLimited = true;
          console.warn(`[/api/sage/chat] Modelo ${modelName} devolvió 429 (Cuota/Rate Limit): ${errMsg}. Probando fallback...`);
          continue;
        }

        console.warn(`[/api/sage/chat] Modelo ${modelName} falló (Status ${res.status}): ${errMsg}. Probando siguiente modelo...`);
      } catch (err: any) {
        console.warn(`[/api/sage/chat] Error de red con modelo ${modelName}:`, err.message);
        lastErrorMsg = err.message;
      }
    }

    // Si fallaron todos los modelos por cuota/rate limit
    if (isRateLimited) {
      return NextResponse.json(
        {
          error: "RATE_LIMITED",
          message:
            "Se alcanzó temporalmente el límite de consultas por minuto (RPM) o cuota de la API de Gemini. Esperá unos segundos antes de volver a preguntar.",
          details: lastErrorMsg,
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        error: "GENERATION_FAILED",
        message: `MIM-Bot no pudo generar respuesta tras probar ${prioritizedModels.length} modelos.`,
        details: lastErrorMsg,
      },
      { status: 502 }
    );
  }
);
