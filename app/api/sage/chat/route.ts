/**
 * /api/sage/chat — POST
 * Chat interactivo de MIM-Bot con contexto de crash report (SAGE).
 * Delegates generation to sageChatEngine (BOT-05b).
 */

import { z } from "zod";
import { withApiGuard } from "@/lib/apiGuard";
import { classifyProviderQuotaError, resolveGatewayKeys } from "@/lib/intelligence/ai";
import { withStoredGatewayKeys } from "@/lib/intelligence/ai/storedGatewayKeys";
import {
  errorMessage,
  sageErrorResponse,
} from "@/lib/intelligence/sage/errorContract";
import {
  mapSageChatError,
  runSageChat,
} from "@/lib/intelligence/sage/sageChatEngine";
import { encodeSageStreamEvent } from "@/lib/intelligence/sage/streamContract";
import { isAIProviderError } from "@/lib/intelligence/ai";

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

    const headerGeminiKey = request.headers.get("x-gemini-key") || "";
    const headerOpenRouterKey = request.headers.get("x-openrouter-key") || "";

    const gatewayKeys = withStoredGatewayKeys({
      clientGeminiKey: clientApiKey || undefined,
      headerGeminiKey,
      openrouterKey: headerOpenRouterKey,
    });
    const { hasGeminiKey, hasOpenRouterKey } = resolveGatewayKeys(gatewayKeys);

    if (!hasGeminiKey && !hasOpenRouterKey) {
      return sageErrorResponse("MIM_CREDENTIAL_MISSING");
    }

    try {
      const result = await runSageChat({
        question,
        personality,
        messages,
        crashContext,
        gatewayKeys,
        signal: request.signal,
      });

      if (result.guardrails.status === "blocked") {
        console.warn(
          "[/api/sage/chat] Provider response blocked by SAGE guardrails:",
          result.guardrails.violations.join(", "),
        );
      }

      return createBufferedStreamResponse(
        result.text,
        result.model,
        result.guardrails.status,
      );
    } catch (err: unknown) {
      const msg = errorMessage(err);
      console.warn("[/api/sage/chat] Provider generation failed:", msg);

      const mapped = mapSageChatError(err);
      if (mapped.code === "MIM_PROVIDER_RATE_LIMIT") {
        const classified = classifyProviderQuotaError(mapped.details ?? msg, "gemini");
        return sageErrorResponse("MIM_PROVIDER_RATE_LIMIT", {
          details: mapped.details,
          quotaKind: classified.kind,
          quotaHint: classified.userHint,
        });
      }
      if (mapped.code === "MIM_CREDENTIAL_MISSING") {
        return sageErrorResponse("MIM_CREDENTIAL_MISSING");
      }
      if (mapped.code === "MIM_CREDENTIAL_INVALID") {
        return sageErrorResponse("MIM_CREDENTIAL_INVALID", { details: mapped.details });
      }

      if (isAIProviderError(err) && err.code === "RATE_LIMITED") {
        const provider = err.provider === "openrouter" ? "openrouter" : "gemini";
        const classified = classifyProviderQuotaError(msg, provider);
        return sageErrorResponse("MIM_PROVIDER_RATE_LIMIT", {
          details: msg,
          quotaKind: classified.kind,
          quotaHint: classified.userHint,
        });
      }

      return sageErrorResponse("MIM_AI_GENERATION_FAILED", {
        message: "MIM-Bot no pudo generar respuesta.",
        details: msg,
      });
    }
  }
);

function createBufferedStreamResponse(
  text: string,
  model: string,
  guardrailStatus: "passed" | "blocked",
): Response {
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
      "X-MIM-SAGE-Guardrail": guardrailStatus,
    },
  });
}
