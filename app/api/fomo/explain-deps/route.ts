/**
 * /api/fomo/explain-deps — POST
 * Explains a mod's dependency tree with structured JSON validation (BOT-JSON).
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiGuard } from "@/lib/apiGuard";
import { resolveGatewayKeys } from "@/lib/intelligence/ai";
import { explainModDependencies } from "@/lib/intelligence/dependencyExplain";
import type { DependencyInfo } from "@/lib/intelligence/contextBuilder";
import { resolveBotPersonality } from "@/lib/intelligence/modExplainer";

const depSchema = z.object({
  modId: z.string(),
  name: z.string(),
  requiredBy: z.string().optional(),
  currentVersion: z.string().optional(),
  requiredVersion: z.string().optional(),
  loader: z.string().optional(),
  status: z.enum(["installed", "missing", "outdated", "incompatible"]),
});

const bodySchema = z.object({
  modId: z.string().trim().min(1),
  modName: z.string().trim().min(1),
  dependencies: z.array(depSchema).min(1),
  loader: z.string().optional(),
  mcVersion: z.string().optional(),
  personality: z.enum(["bully", "standard"]).optional(),
});

export const POST = withApiGuard(
  {
    rateLimit: { windowMs: 60 * 1000, maxRequests: 20 },
    bodySchema,
  },
  async ({ request, body }) => {
    const { modId, modName, dependencies, loader, mcVersion, personality } = body;

    const headerGeminiKey = request.headers.get("x-gemini-key") || "";
    const headerOpenRouterKey = request.headers.get("x-openrouter-key") || "";

    const gatewayKeys = { headerGeminiKey, openrouterKey: headerOpenRouterKey };
    const { hasGeminiKey, hasOpenRouterKey } = resolveGatewayKeys(gatewayKeys);

    if (!hasGeminiKey && !hasOpenRouterKey) {
      return NextResponse.json(
        { error: "NO_API_KEY", message: "No API key configured." },
        { status: 401 }
      );
    }

    const resolvedPersonality = resolveBotPersonality(personality);

    const result = await explainModDependencies({
      modId,
      modName,
      dependencies: dependencies as DependencyInfo[],
      loader,
      mcVersion,
      personality: resolvedPersonality,
      gatewayKeys,
      signal: request.signal,
    });

    return NextResponse.json({
      modId: result.modId,
      explanation: result.explanation,
      structured: result.structured,
      fallback: result.fallback,
      model: result.model,
      provider: result.provider,
    });
  }
);
