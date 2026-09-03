import { NextResponse } from "next/server";
import { explainModWithGemini, chatWithProjectAssistant, type ModExplainerInput } from "@/lib/intelligence/modExplainer";

export async function POST(request: Request) {
  try {
    const body = await request.json();
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
    } = body || {};

    if (!projectId || !title) {
      return NextResponse.json(
        { error: "Faltan parámetros requeridos (projectId, title)" },
        { status: 400 }
      );
    }

    const headerKey = request.headers.get("x-gemini-key") || "";
    const resolvedApiKey =
      (clientApiKey && clientApiKey.trim()) ||
      (headerKey && headerKey.trim()) ||
      process.env.GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
      "";

    if (!resolvedApiKey) {
      return NextResponse.json(
        {
          error: "NO_API_KEY",
          message:
            "No se ha configurado una clave de Google Gemini API. Ingresa tu clave gratuita para activar explicaciones con búsqueda en Google.",
        },
        { status: 401 }
      );
    }

    // Modo Mini-Chat: Responder pregunta de seguimiento
    if (body.question || body.mode === "chat") {
      const chatRes = await chatWithProjectAssistant(
        {
          projectContext: body.projectContext || {
            projectId,
            title,
            author,
            source,
            url,
            categories,
            loaders,
            descriptionSnippet: description,
            initialSummary: body.initialSummary,
          },
          messages: Array.isArray(body.messages) ? body.messages : [],
          question: body.question,
          model,
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
    };

    const result = await explainModWithGemini(input, resolvedApiKey);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[MIMweb Explain Error]:", error);
    return NextResponse.json(
      { error: error?.message || "Error al sintetizar el mod con Gemini" },
      { status: 500 }
    );
  }
}
