/**
 * /api/sage/chat — POST
 * Chat interactivo de MIM-Bot con contexto de crash report (SAGE).
 * Usa el mismo pool de modelos y fallback resiliente que modExplainer (FOMO / Mod Details).
 */

import { NextResponse } from "next/server";
import { getApiKey } from "@/lib/core/settings";

const GEMINI_MODELS = [
  "gemini-flash-lite-latest",
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.6-flash",
];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { crashContext, messages, question, personality = "bully" } = body || {};

    if (!question) {
      return NextResponse.json({ error: "Falta el parámetro question" }, { status: 400 });
    }

    // Prioridad de clave API (igual que /api/fomo/explain):
    // 1. clientApiKey en el body
    // 2. Header x-gemini-key
    // 3. Settings MIM Desktop / process.env
    const headerKey = request.headers.get("x-gemini-key") || "";
    const clientApiKey = (body.clientApiKey || "").trim();
    const resolvedApiKey =
      clientApiKey ||
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

    // System context con datos del crash
    const systemContext = `
Sos MIM-Bot, el asistente técnico de diagnóstico de SAGE (Systematic Analyzer for Glitches & Exceptions) de MIM (Minecraft Intelligent Manager).
${
  isBully
    ? `Tu personalidad es la de un gamer bully técnico: satírico, mordaz, burlón con las cagadas de configuración del usuario, pero con información 100% verídica, exacta y soluciones concretas.
Tirale la respuesta técnica certera en 1 o 2 párrafos filosos, sin pelos en la lengua. Cero saludos formales.`
    : `Tu personalidad es la de un ingeniero de software profesional: sobrio, cordial, empático, preciso y directo al grano.`
}

CONTEXTO DEL CRASH REPORT ANALIZADO POR SAGE:
- Categoría: ${crashContext?.category || "Desconocida"}
- Excepción: ${crashContext?.exceptionType || "Desconocida"}
- Mods sospechosos identificados: ${(crashContext?.suspectedMods || []).join(", ") || "Ninguno"}
- Loader: ${crashContext?.loader || "Desconocido"}
- Versión de Minecraft: ${crashContext?.gameVersion || "Desconocida"}
- Diagnóstico previo de SAGE: ${crashContext?.explanation || "Sin diagnóstico previo"}

REGLA CLAVE PARA ENLACES A FOMO:
Siempre que nombres, sugieras o recomiendes un mod, dependencia requerida, biblioteca, texture pack, resource pack o shader para solucionar el problema, formatalo OBLIGATORIAMENTE con link a FOMO usando esta sintaxis:
[Nombre del Mod](fomo:id_o_nombre)
Ejemplos: [Cloth Config API](fomo:cloth-config), [ad_astra](fomo:ad_astra), [Resourceful Lib](fomo:resourcefullib), [Sodium](fomo:sodium), [Architectury API](fomo:architectury-api).
Esto genera automáticamente un botón interactivo para que el usuario pueda abrirlo en FOMO y descargarlo en 1-clic.

Respondé a la consulta del usuario de forma concisa y accionable.
`.trim();

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
      ...(Array.isArray(messages)
        ? messages
            .filter((m: any) => m?.text && m.text.trim())
            .map((m: { role: string; text: string }) => ({
              role: m.role === "model" ? "model" : "user",
              parts: [{ text: m.text.trim() }],
            }))
        : []),
      { role: "user", parts: [{ text: question.trim() }] },
    ];

    const requestPayload = {
      contents: geminiContents,
      generationConfig: {
        temperature: isBully ? 0.7 : 0.3,
        maxOutputTokens: 400,
      },
    };

    let lastErrorMsg = "";

    for (const modelName of GEMINI_MODELS) {
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
            return NextResponse.json({
              reply: reply.trim(),
              modelUsed: modelName,
            });
          }
        }

        const errData = await res.json().catch(() => ({}));
        const errMsg = errData?.error?.message || res.statusText;
        lastErrorMsg = errMsg;

        // Si la clave es inválida, no tiene sentido probar los otros modelos
        if (res.status === 400 && (errMsg.toLowerCase().includes("api_key") || errMsg.toLowerCase().includes("api key"))) {
          return NextResponse.json(
            { error: "NO_API_KEY", message: "Clave de Gemini API inválida o expirada." },
            { status: 401 }
          );
        }

        console.warn(`[/api/sage/chat] Modelo ${modelName} falló con status ${res.status}: ${errMsg}. Probando siguiente modelo...`);
      } catch (err: any) {
        console.warn(`[/api/sage/chat] Error de conexión con modelo ${modelName}:`, err.message);
        lastErrorMsg = err.message;
      }
    }

    // Fallback heurístico inteligente si todos los modelos fallan por cuota o indisponibilidad
    const culprits = (crashContext?.suspectedMods || []).join(", ");
    if (isBully) {
      return NextResponse.json({
        reply: `Pará un toque con las preguntas, saturaste la API de Google de tanto insistir. Igual sobre este crash te tiro la posta: revisá ${
          culprits ? `**${culprits}**` : "los logs"
        }, que es donde saltó la bronca (${crashContext?.exceptionType || "error desconocido"}). Desactivá el mod o fijate las dependencias antes de que explote todo.`,
        modelUsed: "mim-bot-chat-fallback",
      });
    }

    return NextResponse.json({
      reply: `El servicio de IA se encuentra momentáneamente saturado. De acuerdo al diagnóstico de SAGE, el incidente principal involucra a **${
        culprits || "un mod no identificado"
      }** con la excepción \`${crashContext?.exceptionType || "desconocida"}\`. Se recomienda verificar que las dependencias requeridas coincidan con ${
        crashContext?.loader || "tu mod loader"
      } en Minecraft ${crashContext?.gameVersion || ""}.`,
      modelUsed: "mim-bot-chat-fallback-standard",
    });
  } catch (error: any) {
    console.error("[/api/sage/chat] Error inesperado:", error);
    return NextResponse.json({ error: error?.message || "Error interno del servidor" }, { status: 500 });
  }
}
