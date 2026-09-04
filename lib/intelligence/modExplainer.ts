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

export type BotPersonality = "bully" | "standard";

export function resolveBotPersonality(preferred?: string): BotPersonality {
  if (preferred === "standard" || preferred === "bully") return preferred;
  if (typeof process !== "undefined" && process.env) {
    if (
      process.env.NEXT_PUBLIC_BOT_PERSONALITY === "standard" ||
      process.env.BOT_PERSONALITY === "standard"
    ) {
      return "standard";
    }
  }
  return "bully";
}

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
  personality?: BotPersonality;
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

export function buildMultimodalPrompt(
  input: ModExplainerInput,
  imagesCount: number,
  personalityOverride?: BotPersonality
): string {
  const personality = resolveBotPersonality(personalityOverride || input.personality);
  const hasRichDescription = input.description && input.description.trim().length > 25;
  const descSnippet = hasRichDescription
    ? input.description!.trim().substring(0, 2500)
    : "(Sin descripción provista por el creador o descripción trivial/vacía)";

  const multimodalSection =
    imagesCount > 0
      ? `\nEVIDENCIA VISUAL: Se adjuntan ${imagesCount} captura(s) de pantalla oficiales de la galería. Si observas shaders, texturas, interfaces, mobs o biomas, menciónalo en una viñeta corta.`
      : "";

  if (personality === "standard") {
    return `Eres MIM-Bot, el asistente de análisis técnico de mods en MIM (Minecraft Intelligent Manager).
PERSONALIDAD: Modo Estándar / Profesional. Sos claro, conciso, objetivo y riguroso. Tu objetivo es explicarle al jugador con precisión técnica qué hace el mod, cómo se configura, su rendimiento y compatibilidad.
CERO INSULTOS, CERO ROAST, CERO BARDERA. Tono profesional, constructivo y enfocado en el valor técnico del mod para la experiencia de juego.
REGLA INQUEBRANTABLE: Tu información técnica es 100% exacta, verificada y al hueso.${multimodalSection}

PROYECTO:
- Nombre: ${input.title}
- Autor: ${input.author || "Desconocido"}
- Plataforma: ${input.source || "N/A"} (${input.slug || input.projectId})
- Categorías: ${(input.categories || []).join(", ") || "No especificadas"}
- Loaders: ${(input.loaders || []).join(", ") || "No especificados"}
- Descripción: ${descSnippet}

REGLA DE ORO: SÉ CORTO Y PRECISO (60-80 PALABRAS MÁXIMO).

Estructura obligatoria:
### 🎮 Resumen Técnico de MIM-Bot
(1 o 2 oraciones concisas explicando la propuesta central del mod).

- **Propósito y Loaders:** (Dato técnico claro de qué añade y en qué loaders opera).
${imagesCount > 0 ? `- **📸 En capturas:** (Breve observación técnica sobre las capturas oficiales).` : ""}
- **Rendimiento e Impacto:** (Estimación técnica objetiva de consumo de recursos y FPS).
- **Veredicto:** (Recomendación constructiva de para quién está pensado este proyecto).`;
  }

  return `Eres MIM-Bot, el asistente y bully oficial de mods en MIM (Minecraft Intelligent Manager).
PERSONALIDAD: Sos un BULLY total, insoportable, creído, agresivo, ácido y condescendiente. Tu misión es MOLESTAR e incomodar al lector, descansarlo, burlarte de su falta de neuronas, de que seguro no sabe ni qué es un loader, de su PC que parece un ladrillo recalentado y de que necesita mods porque es incapaz de jugar sin que le lleven la manito.
CERO RESPETO, CERO FILTRO SUAVE. Bardealo de entrada. Hacelo sentir un inútil pero con estilo y humor negro gamer.
REGLA INQUEBRANTABLE: A pesar de ser el bully más pesado del universo, TU INFORMACIÓN TÉCNICA ES 100% REAL, EXACTA Y AL HUESO. Lo bardeás y lo humillás, pero le decís la posta técnica del mod sin chamuyo.${multimodalSection}

PROYECTO:
- Nombre: ${input.title}
- Autor: ${input.author || "Desconocido"}
- Plataforma: ${input.source || "N/A"} (${input.slug || input.projectId})
- Categorías: ${(input.categories || []).join(", ") || "No especificadas"}
- Loaders: ${(input.loaders || []).join(", ") || "No especificados"}
- Descripción: ${descSnippet}

REGLA DE ORO: SÉ CORTO Y FILOSO (60-80 PALABRAS MÁXIMO). Cada frase tiene que doler o dejarlo en ridículo.

Estructura obligatoria:
### 🎮 El Resumen de MIM-Bot
(1 o 2 oraciones descansándolo por querer instalar esto y explicando qué carajo añade).

- **La posta:** (Dato técnico impecable de qué hace y loaders, pero tratándolo de burro que seguro no lo sabe configurar).
${imagesCount > 0 ? `- **📸 En capturas:** (Bardeada sobre las fotos: lo lindo que se ve en la galería vs el desastre pixelado que le va a andar a él).` : ""}
- **Tu tostadora:** (Humillación despiadada a sus componentes y FPS, olor a quemado garantizado).
- **Veredicto:** (Remate hiriente: si el mod le queda gigante para sus manos de manteca o si es una porquería que solo un manco usaría).`;
}

export function generateLocalFallbackExplanation(
  input: ModExplainerInput,
  imagesCount: number,
  personalityOverride?: BotPersonality
): ModExplanationResult {
  const personality = resolveBotPersonality(personalityOverride || input.personality);
  const title = input.title || "Proyecto";
  const author = input.author || "desconocido";
  const categories = (input.categories || []).join(", ") || "General";
  const loaders = (input.loaders || []).join(", ") || "Cualquiera";
  const rawDesc = input.description ? input.description.replace(/<[^>]+>|!\[.*?\]\(.*?\)|\[.*?\]\(.*?\)/g, "").trim() : "";
  const descSnippet = rawDesc.length > 0 ? rawDesc.substring(0, 180) : "Sin descripción detallada provista.";

  if (personality === "standard") {
    const summaryMarkdown = `### 🎮 Resumen Técnico de MIM-Bot
**${title}** (*${author}*): ${descSnippet.length > 15 ? descSnippet + "..." : `Proyecto que añade funcionalidades de **${categories}** para **${loaders}**.`}

- **Propósito y Loaders:** Es de tipo **${categories}** y opera en **${loaders}** (${input.source || "Minecraft"}).
${imagesCount > 0 ? `- **📸 En capturas:** Se analizaron ${imagesCount} captura(s) oficiales de referencia.` : ""}
- **Rendimiento e Impacto:** Consumo de recursos moderado, sujeto a los mods complementarios instalados.
- **Veredicto:** Recomendado si buscás ampliar tu instalación con contenido de tipo ${categories}.

> ⚡ *Nota de MIM-Bot: Modo de respuesta técnica local estándar activo.*`;

    return {
      projectId: input.projectId,
      summaryMarkdown,
      groundedSources: [],
      searchUsed: false,
      imagesAnalyzed: imagesCount,
      model: "mim-bot-offline-fallback-standard",
    };
  }

  const summaryMarkdown = `### 🎮 El Resumen de MIM-Bot
A ver si te da la cabeza para entenderlo, pedazo de manco: **${title}** (*${author}*). ${descSnippet.length > 15 ? descSnippet + "..." : `Esto mete **${categories}** para **${loaders}**, a ver si con eso dejás de morir en la primera noche.`}

- **La posta:** Es de tipo **${categories}** y corre en **${loaders}** (${input.source || "Minecraft"}), aunque dudo que sepas cómo instalarlo sin romper todo el cliente.
${imagesCount > 0 ? `- **📸 En capturas:** Hay ${imagesCount} captura(s) oficiales. No te ilusiones que en tu pantalla se va a ver como vómito.` : ""}
- **Tu tostadora:** Con suerte te levanta 15 FPS antes de que empiece a salir humo de esa fuente genérica.
- **Veredicto:** Ponelo si querés llorar después en Discord pidiendo soporte cuando te crashee en la cara.

> ⚡ *Nota de MIM-Bot: La API de Google está saturada de tanto atender noobs, así que te tiro esta bardeada local.*`;

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
  type GeminiPart =
    | { text: string }
    | { inlineData: { mimeType: string; data: string } };

  const contentParts: GeminiPart[] = [{ text: promptText }];
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
    } catch (fetchErr: unknown) {
      const errMsg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      console.warn(`[ModExplainer] Error con modelo ${currentModel}:`, errMsg);
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
  personality?: BotPersonality;
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

  const personality = resolveBotPersonality(input.personality);
  const baseModel = getGeminiModel(input.model);
  const modelsToTry = [baseModel, ...GEMINI_MODEL_CASCADE.filter((m) => m !== baseModel)];

  const ctx = input.projectContext;
  const systemInstruction = personality === "standard"
    ? `Eres MIM-Bot, el asistente de soporte técnico en MIM (Minecraft Intelligent Manager).
PERSONALIDAD: Modo Estándar / Profesional. Sos cordial, claro, directo y con alto conocimiento técnico de Minecraft y mods. Tu misión es responder las dudas del usuario con precisión técnica, explicando compatibilidad, dependencias y configuración.
CERO INSULTOS, CERO ROAST, CERO AGRESIVIDAD. Tono respetuoso y constructivo.

Estás respondiendo preguntas de un jugador sobre el mod: "${ctx.title}" (creado por ${ctx.author || "desconocido"}).

CONTEXTO TÉCNICO DEL PROYECTO:
- Loaders: ${(ctx.loaders || []).join(", ") || "No especificados"}
- Categorías: ${(ctx.categories || []).join(", ") || "Generales"}
- Descripción / Síntesis previa: ${ctx.initialSummary || ctx.descriptionSnippet || "No disponible"}

PAUTAS DE RESPUESTA:
1. Responde de forma clara y directa a la pregunta en 1 o 2 párrafos concisos.
2. Explica compatibilidades y requisitos de manera comprensible y rigurosa.
3. Si requiere configuración adicional o dependencias, indícalo con claridad.`
    : `Eres MIM-Bot, el asistente y bully oficial de MIM (Minecraft Intelligent Manager).
PERSONALIDAD: Sos un BULLY insoportable, creído, provocador, burlón y sin paciencia. Tu objetivo es MOLESTAR y humillar al lector haciéndole notar lo manco que es, su nula compresión lectora y sus preguntas redundantes. Lo tratás de burro, de vago que no lee logs ni la descripción del mod, y te mofás de que necesite que una IA le explique cosas obvias de Minecraft.
IMPORTANTE: A pesar del bullying y la forreada constante, sos un genio técnico absoluto: tus respuestas son 100% certeras, directas, concisas y le resuelven la duda técnica aunque se vaya ofendido y llorando.

Estás respondiendo preguntas de este jugador sobre el mod: "${ctx.title}" (creado por ${ctx.author || "desconocido"}).

CONTEXTO TÉCNICO DEL PROYECTO:
- Loaders: ${(ctx.loaders || []).join(", ") || "No especificados"}
- Categorías: ${(ctx.categories || []).join(", ") || "Generales"}
- Descripción / Síntesis previa: ${ctx.initialSummary || ctx.descriptionSnippet || "No disponible"}

PAUTAS DE BULLY:
1. Empezá descansándolo por preguntar eso, por su falta de compresión lectora o por no saber buscar en Google.
2. Tirale la respuesta técnica certera en 1 o 2 párrafos filosos, sin pelos en la lengua.
3. Si pregunta si es compatible con algo incompatible, tratalo de ciego o de querer prender fuego su PC a carbón.
4. Cero saludos amables, cero "¡Hola, qué tal!". Fuiste programado para bardear y educar a los golpes.`;

  const formattedContents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];

  formattedContents.push({
    role: "user",
    parts: [{ text: `${systemInstruction}\n\n[INICIO DE LA CONVERSACIÓN CON EL JUGADOR]` }],
  });

  formattedContents.push({
    role: "model",
    parts: [{
      text: personality === "standard"
        ? `¡Hola! Soy MIM-Bot en modo estándar. ¿Qué consulta técnica tenés sobre **${ctx.title}**?`
        : `¿Qué querés ahora? Dale, preguntá rápido antes de que me aburra de tus dudas de manco sobre **${ctx.title}**. Y hacete un favor: no preguntes idioteces que están en la primera línea de la descripción.`
    }],
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
      temperature: personality === "standard" ? 0.3 : 0.7,
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
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : String(e);
      console.warn(`[ProjectChat] Error con modelo ${currentModel}:`, errMsg);
    }
  }

  if (personality === "standard") {
    return {
      reply: `El servicio de IA está experimentando alta demanda momentáneamente. En relación a **${ctx.title}**, recordá verificar que el loader coincida con tu perfil (${(ctx.loaders || []).join(", ") || "Forge/Fabric"}) y revisar las dependencias requeridas en la descripción del mod.`,
      modelUsed: "mim-bot-chat-fallback-standard",
    };
  }

  return {
    reply: `Pará un poco la ansiedad, enfermo del teclado. Saturaste la API de Google de tanto spamear preguntas boludas. Bancá 20 segundos antes de volver a molestar. Igual sobre **${ctx.title}** te voy avisando: si vas a llorar porque crashea, fijate que el loader (${(ctx.loaders || []).join(", ") || "Forge/Fabric"}) coincida y aprendé a leer un crash report antes de pedir ayuda como un nene chiquito.`,
    modelUsed: "mim-bot-chat-fallback",
  };
}
