import { resolveConfiguredAIProviderId } from "./createAIProvider";
import { GEMINI_MODEL_CASCADE } from "./modelConstants";
import { GLM_MODEL_CASCADE } from "./openRouterProvider";
import type { AIIntent } from "./intents";
import type { AIProviderId } from "./types";

export type RouteDecision = {
  providerId: AIProviderId;
  /** Human-readable routing rationale for logs and observability. */
  reason: string;
  geminiModels: readonly string[];
  openRouterModels: readonly string[];
  /** Enable Gemini search grounding when routed to Gemini. */
  googleSearch: boolean;
};

export function isIntentRoutingEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const value = env.MIMBOT_INTENT_ROUTING?.trim().toLowerCase();
  if (value === "0" || value === "false" || value === "off") return false;
  return true;
}

export function resolveModelRoute(
  intent: AIIntent,
  options: {
    hasGeminiKey: boolean;
    hasOpenRouterKey: boolean;
    env?: NodeJS.ProcessEnv;
    wantsSearchGrounding?: boolean;
    preferredGeminiModel?: string;
  }
): RouteDecision {
  const env = options.env ?? process.env;
  const geminiModels = buildGeminiCascade(options.preferredGeminiModel);

  if (!isIntentRoutingEnabled(env)) {
    const providerId = resolveConfiguredAIProviderId(env);
    return {
      providerId,
      reason: "global-config-override",
      geminiModels,
      openRouterModels: GLM_MODEL_CASCADE,
      googleSearch: false,
    };
  }

  if (intent === "mod-explain-multimodal") {
    return {
      providerId: "gemini",
      reason: "multimodal-requires-gemini",
      geminiModels,
      openRouterModels: GLM_MODEL_CASCADE,
      googleSearch: false,
    };
  }

  if (
    intent === "mod-explain-text" &&
    options.wantsSearchGrounding &&
    options.hasGeminiKey
  ) {
    return {
      providerId: "gemini",
      reason: "search-grounding-requires-gemini",
      geminiModels,
      openRouterModels: GLM_MODEL_CASCADE,
      googleSearch: true,
    };
  }

  const textIntents: AIIntent[] = [
    "sage-chat",
    "mim-bot-chat",
    "mod-explain-text",
    "dependency-explain",
  ];

  if (textIntents.includes(intent) && options.hasOpenRouterKey) {
    return {
      providerId: "openrouter",
      reason: "text-intent-glm-cost-path",
      geminiModels,
      openRouterModels: GLM_MODEL_CASCADE,
      googleSearch: false,
    };
  }

  const useSearch =
    Boolean(options.wantsSearchGrounding) &&
    intent === "mod-explain-text" &&
    options.hasGeminiKey;

  if (options.hasGeminiKey) {
    return {
      providerId: "gemini",
      reason: useSearch ? "gemini-with-search-grounding" : "gemini-default-or-fallback",
      geminiModels,
      openRouterModels: GLM_MODEL_CASCADE,
      googleSearch: useSearch,
    };
  }

  if (options.hasOpenRouterKey) {
    return {
      providerId: "openrouter",
      reason: "openrouter-only-key-available",
      geminiModels,
      openRouterModels: GLM_MODEL_CASCADE,
      googleSearch: false,
    };
  }

  return {
    providerId: resolveConfiguredAIProviderId(env),
    reason: "no-keys-resolved",
    geminiModels,
    openRouterModels: GLM_MODEL_CASCADE,
    googleSearch: false,
  };
}

function buildGeminiCascade(preferred?: string): readonly string[] {
  const base = preferred?.trim() || GEMINI_MODEL_CASCADE[0];
  return [base, ...GEMINI_MODEL_CASCADE.filter((model) => model !== base)];
}
