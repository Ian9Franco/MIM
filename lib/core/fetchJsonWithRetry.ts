import { fetchWithRetry } from "@/lib/network";
import type { NetworkDiagnosticReport } from "@/lib/network";

/**
 * Client-side JSON fetch with resilient retries, exponential backoff, jitter, and classification.
 * Backward compatible with existing callers while leveraging the unified network resilience engine.
 */
export async function fetchJsonWithRetry<T = unknown>(
  path: string,
  options?: RequestInit & { retries?: number; retryDelayMs?: number }
): Promise<
  | { ok: true; data: T; report?: NetworkDiagnosticReport }
  | { ok: false; error: string; report?: NetworkDiagnosticReport }
> {
  const { retries, retryDelayMs, ...init } = options ?? {};

  const policy =
    retries !== undefined || retryDelayMs !== undefined
      ? {
          maxAttempts: retries ?? 3,
          baseDelayMs: retryDelayMs ?? 400,
        }
      : undefined;

  const result = await fetchWithRetry<T>(path, {
    ...init,
    policy,
  });

  if (result.ok) {
    return { ok: true, data: result.data, report: result.report };
  }

  return { ok: false, error: result.error, report: result.report };
}
