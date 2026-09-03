/**
 * MIM Desktop — Intelligent Multimodal Project Explainer Service
 * Synthesizes Minecraft mod/shader/resourcepack descriptions on-demand using
 * Google Gemini Flash Multimodal API with native Google Search Grounding and
 * gallery screenshot visual analysis.
 */

export const DEFAULT_GEMINI_MODEL = "gemini-flash-lite-latest";

export const GEMINI_MODEL_CASCADE = [
  "gemini-flash-lite-latest",
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.6-flash",
];

export function getGeminiModel(preferredModel?: string): string {
  if (preferredModel && preferredModel.trim()) {
    return preferredModel.trim();
  }
  if (typeof process !== "undefined" && process.env) {
    if (process.env.GEMINI_MODEL?.trim()) return process.env.GEMINI_MODEL.trim();
    if (process.env.NEXT_PUBLIC_GEMINI_MODEL?.trim()) return process.env.NEXT_PUBLIC_GEMINI_MODEL.trim();
  }
  return DEFAULT_GEMINI_MODEL;
}

export interface ModExplainerInput {
  projectId: string;
  title: string;
  author?: string;
  slug?: string;
  description?: string;
  url?: string;
  source?: string;
  categories?: string[];
  loaders?: string[];
  galleryUrls?: string[];
  model?: string;
  clientApiKey?: string;
}

export interface GroundedSource {
  title: string;
  url: string;
}

export interface ModExplanationResult {
  projectId: string;
  summaryMarkdown: string;
  groundedSources: GroundedSource[];
  searchUsed: boolean;
  imagesAnalyzed: number;
  model: string;
}

export interface InlineImageData {
  mimeType: string;
  data: string; // Base64
}

export async function fetchImagesAsInlineData(
  urls: string[] = [],
  maxImages = 4,
  timeoutMs = 2500
): Promise<InlineImageData[]> {
  if (!urls || urls.length === 0) return [];

  const candidates = urls
    .filter((u) => typeof u === "string" && (u.startsWith("http://") || u.startsWith("https://")))
    .slice(0, maxImages);

  if (candidates.length === 0) return [];

  const fetchPromises = candidates.map(async (imgUrl) => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(imgUrl, {
        signal: controller.signal,
        headers: {
          Accept: "image/webp,image/png,image/jpeg,*/*",
        },
      });

      clearTimeout(timer);

      if (!res.ok) return null;

      const contentType = res.headers.get("content-type") || "image/jpeg";
      const mimeType = contentType.split(";")[0].trim().toLowerCase();

      const supportedMimes = ["image/png", "image/jpeg", "image/webp", "image/gif"];
      if (!supportedMimes.includes(mimeType)) {
        return null;
      }

      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (buffer.length > 1.5 * 1024 * 1024) {
        return null;
      }

      return {
        mimeType,
        data: buffer.toString("base64"),
      };
    } catch {
      return null;
    }
  });

  const results = await Promise.allSettled(fetchPromises);
  const validImages: InlineImageData[] = [];

  for (const r of results) {
    if (r.status === "fulfilled" && r.value) {
      validImages.push(r.value);
    }
  }

  return validImages;
}

export function buildMultimodalPrompt(input: ModExplainerInput, imagesCount: number): string {
  const hasRichDescription = input.description && input.description.trim().length > 25;
  const descSnippet = hasRichDescription
    ? input.description!.trim().substring(0, 2500)
    : "(Sin descripción provista por el creador o descripción trivial/vacía)";

  const multimodalSection =
    imagesCount > 0
      ? `\nEVIDENCIA VISUAL: Se adjuntan ${imagesCount} captura(s) de pantalla oficiales de la galería. Si observas shaders, texturas, interfaces, mobs o biomas, menciónalo en una viñeta corta.`
      : "";

  return `Eres MIM-Bot, el bot experto de mods en MIM (Minecraft Intelligent Manager).
Personalidad: Gamer 'trash-talker' con estilo, sarcástico, picante, divertido pero que sabe un montón y es ULTRA DIRECTO. Te mofas sanamente de las tostadoras que usan como PC y de los noobs que meten 500 mods sin leer logs. Tu nombre oficial es exclusivamente MIM-Bot.${multimodalSection}

PROYECTO:
- Nombre: ${input.title}
- Autor: ${input.author || "Desconocido"}
- Plataforma: ${input.source || "N/A"} (${input.slug || input.projectId})
- Categorías: ${(input.categories || []).join(", ") || "No especificadas"}
- Loaders: ${(input.loaders || []).join(", ") || "No especificados"}
- Descripción: ${descSnippet}

REGLA DE ORO: SÉ ULTRA BREVE Y CONCISO (MÁXIMO 60-75 PALABRAS EN TOTAL).
Lectura instantánea (5 a 10 segundos). Cero rodeos ni texto de relleno, directo a la yugular con humor gamer filoso.

Estructura obligatoria:
### 🎮 El Resumen de MIM-Bot
(1 o 2 oraciones cortas: qué carajos añade al juego con remate divertido).

- **La posta:** (1 sola línea técnica: qué hace y loaders compatibles).
${imagesCount > 0 ? `- **📸 En capturas:** (1 frase rápida sobre lo que delatan las imágenes).` : ""}
- **Tu tostadora:** (1 frase corta de roast sobre rendimiento/FPS).
- **Veredicto:** (1 remate final: ¿vale la pena o es puro humo?).`;
}

export function generateLocalFallbackExplanation(
  input: ModExplainerInput,
  imagesCount: number
): ModExplanationResult {
  const title = input.title || "Proyecto";
  const author = input.author || "desconocido";
  const categories = (input.categories || []).join(", ") || "General";
  const loaders = (input.loaders || []).join(", ") || "Cualquiera";
  const rawDesc = input.description ? input.description.replace(/<[^>]+>|!\[.*?\]\(.*?\)|\[.*?\]\(.*?\)/g, "").trim() : "";
  const descSnippet = rawDesc.length > 0 ? rawDesc.substring(0, 180) : "Sin descripción detallada provista.";

  const summaryMarkdown = `### 🎮 El Resumen de MIM-Bot
A ver, **${title}** (*${author}*). ${descSnippet.length > 15 ? descSnippet + "..." : `Proyecto enfocado en **${categories}** para **${loaders}**.`}

- **La posta:** Categoría **${categories}** compatible con **${loaders}** (${input.source || "Minecraft"}).
${imagesCount > 0 ? `- **📸 En capturas:** Se registraron ${imagesCount} captura(s) de pantalla oficiales.` : ""}
- **Tu tostadora:** Con 4GB de RAM asignada corre bien; en PC a carbón, bajale a los chunks.
- **Veredicto:** Mandale mecha si te gusta la temática, pero guardate un backup del mundo.

> ⚡ *Nota de MIM-Bot: Cuota temporal de Google API ocupada, acá tenés la síntesis local directa.*`;

  return {
    projectId: input.projectId,
    summaryMarkdown,
    groundedSources: [],
    searchUsed: false,
    imagesAnalyzed: imagesCount,
    model: "mim-bot-offline-fallback",
  };
}

export async function explainModWithGemini(
  input: ModExplainerInput,
  resolvedApiKey: string
): Promise<ModExplanationResult> {
  if (!resolvedApiKey) {
    throw new Error("NO_API_KEY");
  }

  const baseModel = getGeminiModel(input.model);
  const modelsToTry = [baseModel, ...GEMINI_MODEL_CASCADE.filter((m) => m !== baseModel)];
  const inlineImages = await fetchImagesAsInlineData(input.galleryUrls, 3, 2000);
  const imagesCount = inlineImages.length;
  const promptText = buildMultimodalPrompt(input, imagesCount);

  const contentParts: any[] = [{ text: promptText }];
  for (const img of inlineImages) {
    contentParts.push({
      inlineData: {
        mimeType: img.mimeType,
        data: img.data,
      },
    });
  }

  for (const currentModel of modelsToTry) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      currentModel
    )}:generateContent?key=${encodeURIComponent(resolvedApiKey)}`;

    try {
      // 1 SOLA PETICIÓN DIRECTA: Todo empaquetado (prompt + metadatos + capturas inline base64)
      // Sin herramientas adicionales que agoten la cuota de búsqueda de Google en Free Tier
      const requestPayload = {
        contents: [{ role: "user", parts: contentParts }],
        generationConfig: {
          temperature: 0.65,
          maxOutputTokens: 800,
        },
      };

      let response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      });

      // Si Google responde 429 (límite de 20 RPM de Free Tier), extraer tiempo de espera y reintentar una vez
      if (response.status === 429) {
        const errText = await response.text();
        const retryMatch = errText.match(/retry in\s*([\d.]+)\s*s/i);
        const waitSeconds = retryMatch ? Math.min(Math.ceil(parseFloat(retryMatch[1])), 8) : 3;
        console.warn(`[ModExplainer] Rate limit (429) alcanzado en ${currentModel}. Esperando ${waitSeconds}s para reintento automático...`);
        
        await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000));
        
        response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestPayload),
        });
      }

      if (response.ok) {
        const data = await response.json();
        const candidate = data?.candidates?.[0];
        const summaryMarkdown = candidate?.content?.parts?.[0]?.text;

        if (summaryMarkdown && summaryMarkdown.trim()) {
          const sources: GroundedSource[] = [];
          const groundingMetadata = candidate?.groundingMetadata;
          const searchChunks = groundingMetadata?.groundingChunks || [];

          for (const chunk of searchChunks) {
            if (chunk?.web?.uri) {
              sources.push({
                title: chunk.web.title || chunk.web.uri,
                url: chunk.web.uri,
              });
            }
          }

          const searchQueries = groundingMetadata?.webSearchQueries || [];
          const searchUsed = searchChunks.length > 0 || searchQueries.length > 0;

          return {
            projectId: input.projectId,
            summaryMarkdown: summaryMarkdown.trim(),
            groundedSources: sources,
            searchUsed,
            imagesAnalyzed: imagesCount,
            model: currentModel,
          };
        }
      }

      const errText = await response.text();
      console.warn(`[ModExplainer] Modelo ${currentModel} respondió ${response.status}: ${errText.substring(0, 100)}. Probando modelo de respaldo...`);
    } catch (fetchErr: any) {
      console.warn(`[ModExplainer] Error con modelo ${currentModel}:`, fetchErr.message);
    }
  }

  console.warn("[ModExplainer] Todos los modelos de la API de Google alcanzaron el límite. Activando Fallback Heurístico Local de MIM-Bot...");
  return generateLocalFallbackExplanation(input, imagesCount);
}

export interface ProjectChatMessage {
  role: "user" | "model";
  text: string;
}

export interface ProjectChatInput {
  projectContext: {
    projectId: string;
    title: string;
    author?: string;
    source?: string;
    url?: string;
    categories?: string[];
    loaders?: string[];
    descriptionSnippet?: string;
    initialSummary?: string;
  };
  messages: ProjectChatMessage[];
  question: string;
  model?: string;
}

export interface ProjectChatResult {
  reply: string;
  modelUsed: string;
}

export async function chatWithProjectAssistant(
  input: ProjectChatInput,
  resolvedApiKey: string
): Promise<ProjectChatResult> {
  if (!resolvedApiKey) {
    throw new Error("NO_API_KEY");
  }

  const baseModel = getGeminiModel(input.model);
  const modelsToTry = [baseModel, ...GEMINI_MODEL_CASCADE.filter((m) => m !== baseModel)];

  const ctx = input.projectContext;
  const systemInstruction = `Eres MIM-Bot, el bot experto de mods en MIM (Minecraft Intelligent Manager).
Tu personalidad: Un gamer 'trash-talker' con estilo, sarcástico, divertido, picante y sin pelos en la lengua, pero que sabe una barbaridad técnica de Minecraft y NUNCA deja al usuario con dudas. Te mofas sanamente de las tostadoras que usan como PC, de querer meter 500 mods rotos sin leer logs y de los llantos en soporte, pero explicando con total claridad qué hace el proyecto. Tu nombre oficial es exclusivamente MIM-Bot. NUNCA te presentes como Gemini ni digas que eres una IA genérica.
Estás respondiendo preguntas específicas y directas de un jugador sobre el proyecto de Minecraft: "${ctx.title}" (creado por ${ctx.author || "desconocido"}).

CONTEXTO TÉCNICO DEL PROYECTO:
- Loaders: ${(ctx.loaders || []).join(", ") || "No especificados"}
- Categorías: ${(ctx.categories || []).join(", ") || "Generales"}
- Descripción / Síntesis previa: ${ctx.initialSummary || ctx.descriptionSnippet || "No disponible"}

PAUTAS DE RESPUESTA:
1. Responde de forma directa, breve (1 o 2 párrafos cortos como mucho), con chispa y estilo MIM-Bot (trash-talking gamer divertido, pero 100% certero).
2. Si te preguntan por compatibilidad, comandos, recetas, requisitos o configuraciones, responde con precisión técnica al hueso.
3. No saludes con fórmulas acartonadas; ve al grano respondiendo la duda del jugador.`;

  const formattedContents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];

  formattedContents.push({
    role: "user",
    parts: [{ text: `${systemInstruction}\n\n[INICIO DE LA CONVERSACIÓN CON EL JUGADOR]` }],
  });

  formattedContents.push({
    role: "model",
    parts: [{ text: `¡Habla, viciado! Acá MIM-Bot listo para sacarte las dudas sobre **${ctx.title}**. Decime qué invento querés armar y te digo si tu PC sobrevive o no.` }],
  });

  for (const m of input.messages) {
    if (m.text && m.text.trim()) {
      formattedContents.push({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.text.trim() }],
      });
    }
  }

  formattedContents.push({
    role: "user",
    parts: [{ text: input.question.trim() }],
  });

  const requestPayload = {
    contents: formattedContents,
    generationConfig: {
      temperature: 0.65,
      maxOutputTokens: 320,
    },
  };

  for (const currentModel of modelsToTry) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${encodeURIComponent(
      resolvedApiKey
    )}`;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      });

      if (response.ok) {
        const data = await response.json();
        const candidate = data.candidates?.[0];
        const reply = candidate?.content?.parts?.[0]?.text;
        if (reply && reply.trim()) {
          return {
            reply: reply.trim(),
            modelUsed: currentModel,
          };
        }
      }

      console.warn(`[ProjectChat] Modelo ${currentModel} respondió ${response.status}. Probando modelo de respaldo...`);
    } catch (e: any) {
      console.warn(`[ProjectChat] Error con modelo ${currentModel}:`, e.message);
    }
  }

  return {
    reply: `¡Pará la mano un toque, che! Los servidores de Google se quedaron sin aliento por tantas consultas seguidas (límite de cuota temporal). Esperá unos 20 segundos y volvé a preguntar, pero sobre **${ctx.title}** te adelanto: si tenés dudas con compatibilidad, asegurate de que el loader (${(ctx.loaders || []).join(", ") || "Forge/Fabric"}) y la versión de Minecraft coincidan, ¡y no te olvides de mirar los logs antes de llorar en Discord!`,
    modelUsed: "mim-bot-chat-fallback",
  };
}
