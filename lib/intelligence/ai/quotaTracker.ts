import { classifyProviderQuotaError, type ClassifiedQuotaLimit, type QuotaLimitKind } from "./quotaClassifier";
import type { AIProviderId } from "./types";

const WINDOW_MS = 60_000;

type ProviderQuotaSnapshot = {
  provider: AIProviderId;
  requestsLastMinute: number;
  lastRateLimit: {
    kind: QuotaLimitKind;
    at: string;
    retryAfterSeconds?: number;
    userHint: string;
  } | null;
};

const requestTimestamps = new Map<AIProviderId, number[]>();
const lastRateLimits = new Map<AIProviderId, ClassifiedQuotaLimit & { at: number }>();

function pruneTimestamps(provider: AIProviderId, now = Date.now()): number[] {
  const cutoff = now - WINDOW_MS;
  const kept = (requestTimestamps.get(provider) ?? []).filter((ts) => ts >= cutoff);
  requestTimestamps.set(provider, kept);
  return kept;
}

export function recordAiProviderRequest(provider: AIProviderId): void {
  const now = Date.now();
  const kept = pruneTimestamps(provider, now);
  kept.push(now);
  requestTimestamps.set(provider, kept);
}

export function recordAiProviderRateLimit(provider: AIProviderId, message: string): ClassifiedQuotaLimit {
  const classified = classifyProviderQuotaError(message, provider);
  lastRateLimits.set(provider, { ...classified, at: Date.now() });
  return classified;
}

export function getAiQuotaSnapshots(): ProviderQuotaSnapshot[] {
  const providers: AIProviderId[] = ["gemini", "openrouter"];
  const now = Date.now();

  return providers.map((provider) => {
    const requestsLastMinute = pruneTimestamps(provider, now).length;
    const last = lastRateLimits.get(provider);

    return {
      provider,
      requestsLastMinute,
      lastRateLimit: last
        ? {
            kind: last.kind,
            at: new Date(last.at).toISOString(),
            retryAfterSeconds: last.retryAfterSeconds,
            userHint: last.userHint,
          }
        : null,
    };
  });
}

/** Test helper */
export function resetAiQuotaTrackerForTests(): void {
  requestTimestamps.clear();
  lastRateLimits.clear();
}
