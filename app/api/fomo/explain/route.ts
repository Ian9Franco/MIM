import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiGuard } from "@/lib/apiGuard";
import {
  explainModWithGemini,
  chatWithProjectAssistant,
  type ModExplainerInput,
  type BotPersonality,
} from "@/lib/intelligence/modExplainer";
import { getApiKey } from "@/lib/core/settings";

const bodySchema = z.object({
  projectId: z.string().trim().min(1, "Faltan parámetros requeridos (projectId)"),
  title: z.string().trim().min(1, "Faltan parámetros requeridos (title)"),
  author: z.string().optional().default(""),
  slug: z.string().optional().default(""),
  description: z.string().optional().default(""),
  url: z.string().optional().default(""),
  source: z.string().optional().default(""),
  categories: z.array(z.string()).optional().default([]),
  loaders: z.array(z.string()).optional().default([]),
  galleryUrls: z.array(z.string()).optional().default([]),
  model: z.string().optional(),
  clientApiKey: z.string().optional(),
  personality: z.enum(["bully", "standard"]).optional(),
  question: z.string().optional(),
  mode: z.string().optional(),
  initialSummary: z.string().optional(),
  projectContext: z.record(z.string(), z.unknown()).optional(),
  messages: z.array(z.unknown()).optional().default([]),
});

export const POST = withApiGuard(
  {
    rateLimit: { windowMs: 60 * 1000, maxRequests: 25 },
    bodySchema,
  },
  async ({ request, body }) => {
    const {
      projectId,
      title,
      author,
      slug,
      description,
      url,
      source,
      categories,
      loaders,
      galleryUrls,
      model,
      clientApiKey,
      personality,
      question,
      mode,
      initialSummary,
      projectContext,
      messages,
    } = body;

    const headerKey = request.headers.get("x-gemini-key") || "";
    const resolvedApiKey =
      (clientApiKey && clientApiKey.trim()) ||
      (headerKey && headerKey.trim()) ||
      process.env.GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
      getApiKey("gemini");

    if (!resolvedApiKey) {
      return NextResponse.json(
        {
          error: "NO_API_KEY",
          message:
            "No se ha configurado una clave de Google Gemini API. Puedes ingresar tu clave gratuita en los Ajustes de MIM o directamente en esta ventana.",
        },
        { status: 401 }
      );
    }

    const headerPersonality = request.headers.get("x-bot-personality");
    const requestedPersonality: BotPersonality =
      personality ||
      (headerPersonality === "standard" || headerPersonality === "bully" ? headerPersonality : undefined) ||
      (process.env.NEXT_PUBLIC_BOT_PERSONALITY === "standard" ? "standard" : "bully");

    // Modo Mini-Chat: Responder pregunta de seguimiento
    if (question || mode === "chat") {
      const chatRes = await chatWithProjectAssistant(
        {
          projectContext: (projectContext as any) || {
            projectId,
            title,
            author,
            source,
            url,
            categories,
            loaders,
            descriptionSnippet: description,
            initialSummary,
          },
          messages: Array.isArray(messages) ? (messages as any) : [],
          question: question || "",
          model,
          personality: requestedPersonality,
        },
        resolvedApiKey
      );
      return NextResponse.json(chatRes);
    }

    const input: ModExplainerInput = {
      projectId,
      title,
      author,
      slug,
      description,
      url,
      source,
      categories,
      loaders,
      galleryUrls: Array.isArray(galleryUrls) ? galleryUrls : [],
      model,
      personality: requestedPersonality,
    };

    const result = await explainModWithGemini(input, resolvedApiKey);
    return NextResponse.json(result);
  }
);
