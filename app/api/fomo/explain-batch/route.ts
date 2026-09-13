import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiGuard } from "@/lib/apiGuard";
import { resolveGatewayKeys } from "@/lib/intelligence/ai";
import { withStoredGatewayKeys } from "@/lib/intelligence/ai/storedGatewayKeys";
import { explainModsInBatch } from "@/lib/intelligence/modExplainerBatch";

const projectSchema = z.object({
  projectId: z.string().trim().min(1),
  title: z.string().trim().min(1),
  author: z.string().optional().default(""),
  slug: z.string().optional().default(""),
  description: z.string().optional().default(""),
  url: z.string().optional().default(""),
  source: z.string().optional().default(""),
  categories: z.array(z.string()).optional().default([]),
  loaders: z.array(z.string()).optional().default([]),
  galleryUrls: z.array(z.string()).optional().default([]),
  model: z.string().optional(),
  personality: z.enum(["bully", "standard"]).optional(),
});

const bodySchema = z.object({
  projects: z.array(projectSchema).min(1).max(12),
  clientApiKey: z.string().optional(),
});

export const POST = withApiGuard(
  {
    rateLimit: { windowMs: 60_000, maxRequests: 6 },
    bodySchema,
  },
  async ({ request, body }) => {
    const headerGeminiKey = request.headers.get("x-gemini-key") || "";
    const headerOpenRouterKey = request.headers.get("x-openrouter-key") || "";
    const gatewayKeys = withStoredGatewayKeys({
      clientGeminiKey: body.clientApiKey,
      headerGeminiKey,
      openrouterKey: headerOpenRouterKey,
    });
    const { hasGeminiKey, hasOpenRouterKey, geminiKey, openrouterKey } = resolveGatewayKeys(gatewayKeys);

    if (!hasGeminiKey && !hasOpenRouterKey) {
      return NextResponse.json(
        {
          error: "NO_API_KEY",
          message: "Configurá una clave de Gemini u OpenRouter antes de explicar mods en lote.",
        },
        { status: 401 }
      );
    }

    const resolvedApiKey = geminiKey || openrouterKey || "";
    const results = await explainModsInBatch(body.projects, resolvedApiKey, gatewayKeys, {
      parentSignal: request.signal,
    });

    const succeeded = results.filter((item) => item.ok).length;
    return NextResponse.json({
      total: results.length,
      succeeded,
      failed: results.length - succeeded,
      results,
    });
  }
);
