import { getApiKey } from "@/lib/core/settings";
import { GeminiProvider } from "./geminiProvider";
import { OpenRouterProvider } from "./openRouterProvider";
import type { AIProvider, AIProviderId } from "./types";

export function resolveConfiguredAIProviderId(
  env: NodeJS.ProcessEnv = process.env
): AIProviderId {
  const value = env.MIMBOT_AI_PROVIDER?.trim().toLowerCase();
  if (value === "openrouter") return "openrouter";
  return "gemini";
}

/**
 * Resolves the OpenRouter API key from server-side env vars only.
 * Security: never reads from NEXT_PUBLIC_* — the key must stay on the server.
 */
export function resolveOpenRouterApiKey(
  env: NodeJS.ProcessEnv = process.env
): string {
  return (
    env.OPENROUTER_API_KEY?.trim() ||
    getApiKey("openrouter").trim() ||
    ""
  );
}

/**
 * Resolves the Gemini API key from env vars or settings.
 * Supports both server-side and BYOK overrides.
 */
export function resolveGeminiApiKey(
  clientKey?: string,
  headerKey?: string,
  env: NodeJS.ProcessEnv = process.env
): string {
  if (clientKey?.trim()) return clientKey.trim();
  if (headerKey?.trim()) return headerKey.trim();
  return (
    env.GEMINI_API_KEY?.trim() ||
    env.NEXT_PUBLIC_GEMINI_API_KEY?.trim() ||
    getApiKey("gemini").trim() ||
    ""
  );
}

export function createAIProvider(options: {
  apiKey: string;
  provider?: AIProviderId;
  env?: NodeJS.ProcessEnv;
}): AIProvider {
  const id = options.provider ?? resolveConfiguredAIProviderId(options.env);
  if (id === "openrouter") {
    return new OpenRouterProvider(options.apiKey);
  }
  return new GeminiProvider(options.apiKey);
}

/**
 * Convenience factory: resolves the configured provider + key from env
 * and returns a ready-to-use AIProvider instance.
 *
 * Accepts optional BYOK overrides for Gemini (clientKey, headerKey) and
 * OpenRouter (openrouterKey). These take precedence when provided.
 *
 * @returns `{ provider, providerId }` — provider is null if no key was found.
 */
export function createDefaultProvider(options?: {
  /** BYOK Gemini key from request body */
  clientGeminiKey?: string;
  /** BYOK Gemini key from x-gemini-key header */
  headerGeminiKey?: string;
  /** BYOK OpenRouter key from x-openrouter-key header */
  openrouterKey?: string;
  env?: NodeJS.ProcessEnv;
}): { provider: AIProvider | null; providerId: AIProviderId } {
  const env = options?.env ?? process.env;
  const providerId = resolveConfiguredAIProviderId(env);

  if (providerId === "openrouter") {
    const key = options?.openrouterKey?.trim() || resolveOpenRouterApiKey(env);
    if (!key) return { provider: null, providerId };
    return { provider: new OpenRouterProvider(key), providerId };
  }

  // Gemini path
  const key = resolveGeminiApiKey(
    options?.clientGeminiKey,
    options?.headerGeminiKey,
    env
  );
  if (!key) return { provider: null, providerId };
  return { provider: new GeminiProvider(key), providerId };
}
