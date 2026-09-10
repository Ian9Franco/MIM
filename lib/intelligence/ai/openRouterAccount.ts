/**
 * BOT-06b — OpenRouter account usage snapshot (server-side, BYOK).
 */

import { getApiKey } from "@/lib/core/settings";

export type OpenRouterAccountSnapshot = {
  configured: boolean;
  label?: string;
  usageUsd?: number;
  limitUsd?: number | null;
  isFreeTier?: boolean;
  rateLimitRequests?: number;
  rateLimitInterval?: string;
  fetchedAt: string;
  error?: string;
};

type OpenRouterKeyResponse = {
  data?: {
    label?: string;
    usage?: number;
    limit?: number | null;
    is_free_tier?: boolean;
    rate_limit?: {
      requests?: number;
      interval?: string;
    };
  };
};

export async function fetchOpenRouterAccountSnapshot(
  apiKeyOverride?: string
): Promise<OpenRouterAccountSnapshot> {
  const apiKey = (apiKeyOverride ?? getApiKey("openrouter")).trim();
  const fetchedAt = new Date().toISOString();

  if (!apiKey) {
    return { configured: false, fetchedAt };
  }

  try {
    const res = await fetch("https://openrouter.ai/api/v1/auth/key", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      return {
        configured: true,
        fetchedAt,
        error: `OpenRouter respondió ${res.status}`,
      };
    }

    const payload = (await res.json()) as OpenRouterKeyResponse;
    const data = payload.data;

    return {
      configured: true,
      fetchedAt,
      label: data?.label,
      usageUsd: typeof data?.usage === "number" ? data.usage : undefined,
      limitUsd: data?.limit ?? null,
      isFreeTier: data?.is_free_tier,
      rateLimitRequests: data?.rate_limit?.requests,
      rateLimitInterval: data?.rate_limit?.interval,
    };
  } catch (error: unknown) {
    return {
      configured: true,
      fetchedAt,
      error: error instanceof Error ? error.message : "No se pudo consultar OpenRouter",
    };
  }
}
