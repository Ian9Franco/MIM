/**
 * /api/fomo/explain-deps — POST
 * Explains a mod's dependency tree via the Context Builder → AIProvider pipeline.
 * Returns a structured markdown explanation of missing, outdated, and incompatible deps.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiGuard } from "@/lib/apiGuard";
import { generateWithModelGateway, isAIProviderError, resolveGatewayKeys } from "@/lib/intelligence/ai";
import { buildDependencyExplainContext, type DependencyInfo } from "@/lib/intelligence/contextBuilder";
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

    // Resolve provider
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

    // Build evidence-tagged context
    const ctx = buildDependencyExplainContext(
      modId,
      modName,
      dependencies as DependencyInfo[],
      loader,
      mcVersion,
      resolvedPersonality
    );

    const promptText = `${ctx.systemPrompt}\n\n${ctx.userPrompt}`;

    try {
      const result = await generateWithModelGateway({
        intent: "dependency-explain",
        messages: [{ role: "user", parts: [{ type: "text", text: promptText }] }],
        temperature: 0.5,
        maxOutputTokens: 500,
        signal: request.signal,
        ...gatewayKeys,
      });

      return NextResponse.json({
        modId,
        explanation: result.text,
        model: result.model,
        provider: result.provider,
      });
    } catch (err: unknown) {
      const msg = isAIProviderError(err) ? err.message : err instanceof Error ? err.message : String(err);
      console.warn("[/api/fomo/explain-deps] Generation failed:", msg);

      return NextResponse.json(
        { error: "GENERATION_FAILED", message: msg },
        { status: 502 }
      );
    }
  }
);
