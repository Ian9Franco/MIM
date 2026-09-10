import { AIProviderError, isAIProviderError } from "./errors";
import { GeminiProvider } from "./geminiProvider";
import { OpenRouterProvider } from "./openRouterProvider";
import { resolveGeminiApiKey, resolveOpenRouterApiKey } from "./createAIProvider";
import type { AIIntent } from "./intents";
import { resolveModelRoute } from "./modelRouter";
import type { AIMessage, AIProvider, AIRequest, AIResponse } from "./types";

export type GatewayKeyOptions = {
  clientGeminiKey?: string;
  headerGeminiKey?: string;
  openrouterKey?: string;
  env?: NodeJS.ProcessEnv;
};

export type GatewayGenerateOptions = GatewayKeyOptions & {
  intent: AIIntent;
  messages: AIMessage[];
  temperature?: number;
  maxOutputTokens?: number;
  signal?: AbortSignal;
  timeoutMs?: number;
  preferredGeminiModel?: string;
  wantsSearchGrounding?: boolean;
};

export type GatewayGenerateResult = AIResponse & {
  routeReason: string;
};

/**
 * Resolves BYOK + env keys for both providers so intent routing can pick
 * the best path per request without a global env switch.
 */
export function resolveGatewayKeys(options: GatewayKeyOptions = {}): {
  geminiKey: string;
  openrouterKey: string;
  hasGeminiKey: boolean;
  hasOpenRouterKey: boolean;
} {
  const env = options.env ?? process.env;
  const geminiKey = resolveGeminiApiKey(
    options.clientGeminiKey,
    options.headerGeminiKey,
    env
  );
  const openrouterKey =
    options.openrouterKey?.trim() || resolveOpenRouterApiKey(env);

  return {
    geminiKey,
    openrouterKey,
    hasGeminiKey: Boolean(geminiKey),
    hasOpenRouterKey: Boolean(openrouterKey),
  };
}

/**
 * Creates the provider instance for a resolved route decision.
 */
export function createProviderForRoute(
  providerId: "gemini" | "openrouter",
  keys: { geminiKey: string; openrouterKey: string }
): AIProvider | null {
  if (providerId === "openrouter") {
    return keys.openrouterKey ? new OpenRouterProvider(keys.openrouterKey) : null;
  }
  return keys.geminiKey ? new GeminiProvider(keys.geminiKey) : null;
}

/**
 * Central gateway entry: route by intent, then generate with the appropriate
 * provider cascade (GLM for text, Gemini for multimodal/search).
 */
export async function generateWithModelGateway(
  options: GatewayGenerateOptions
): Promise<GatewayGenerateResult> {
  const keys = resolveGatewayKeys(options);

  if (!keys.hasGeminiKey && !keys.hasOpenRouterKey) {
    throw new AIProviderError("NO_API_KEY", "NO_API_KEY");
  }

  const route = resolveModelRoute(options.intent, {
    hasGeminiKey: keys.hasGeminiKey,
    hasOpenRouterKey: keys.hasOpenRouterKey,
    env: options.env,
    wantsSearchGrounding: options.wantsSearchGrounding,
    preferredGeminiModel: options.preferredGeminiModel,
  });

  const provider = createProviderForRoute(route.providerId, keys);
  if (!provider) {
    throw new AIProviderError("NO_API_KEY", "NO_API_KEY", {
      provider: route.providerId,
    });
  }

  const baseRequest: Omit<AIRequest, "model"> = {
    messages: options.messages,
    temperature: options.temperature,
    maxOutputTokens: options.maxOutputTokens,
    signal: options.signal,
    timeoutMs: options.timeoutMs,
    tools: route.googleSearch ? { googleSearch: true } : undefined,
  };

  let response: AIResponse;

  if (provider.id === "openrouter") {
    response = await (provider as OpenRouterProvider).generateWithFallback(
      baseRequest,
      route.openRouterModels
    );
  } else {
    response = await generateGeminiCascade(provider, baseRequest, route.geminiModels);
  }

  return { ...response, routeReason: route.reason };
}

async function generateGeminiCascade(
  provider: AIProvider,
  request: Omit<AIRequest, "model">,
  models: readonly string[]
): Promise<AIResponse> {
  let lastError: unknown = null;

  for (const model of models) {
    try {
      const result = await provider.generate({ ...request, model });
      if (result.text) return result;
    } catch (err: unknown) {
      lastError = err;
      const retryable =
        isAIProviderError(err) &&
        (err.code === "RATE_LIMITED" ||
          (err.status !== undefined && err.status >= 500));

      if (!retryable) throw err;
      console.warn(`[ModelGateway] Gemini ${model} failed, trying fallback...`);
    }
  }

  if (lastError instanceof Error) throw lastError;
  throw new AIProviderError(
    "All Gemini fallback models exhausted",
    "HTTP_ERROR",
    { provider: "gemini" }
  );
}
