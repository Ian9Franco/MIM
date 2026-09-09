import type { NetworkDiagnosticReport, RetryDecision, RetryPolicyConfig, RetryState } from "@mim/contracts-core/network";

export const DEFAULT_RETRY_POLICY: RetryPolicyConfig = {
  maxAttempts: 3,
  baseDelayMs: 400,
  maxDelayMs: 10000,
  budgetMs: 30000,
  backoffFactor: 2,
};

export type RetryPolicyDependencies = {
  now?: () => number;
  random?: () => number;
};

/**
 * Pure, deterministic evaluation of the next retry decision based on policy, error diagnostic, and elapsed budget.
 */
export function calculateNextRetry(
  state: RetryState,
  report: NetworkDiagnosticReport,
  configOverrides?: Partial<RetryPolicyConfig>,
  deps?: RetryPolicyDependencies
): RetryDecision {
  const config: RetryPolicyConfig = {
    ...DEFAULT_RETRY_POLICY,
    ...configOverrides,
  };

  const nowFn = deps?.now ?? Date.now;
  const randomFn = deps?.random ?? Math.random;

  // 1. If error category or status is explicitly non-retryable, abort immediately
  if (!report.isRetryable) {
    return {
      shouldRetry: false,
      delayMs: 0,
      reason: `Error is non-retryable (${report.category})`,
    };
  }

  // 2. If retryable status filter is provided, enforce it
  if (config.retryableStatuses && report.httpStatus !== undefined) {
    if (!config.retryableStatuses.includes(report.httpStatus)) {
      return {
        shouldRetry: false,
        delayMs: 0,
        reason: `HTTP status ${report.httpStatus} is not in retryableStatuses whitelist`,
      };
    }
  }

  // 3. Check attempt limit
  if (state.attemptCount >= config.maxAttempts) {
    return {
      shouldRetry: false,
      delayMs: 0,
      reason: `Max attempts reached (${state.attemptCount}/${config.maxAttempts})`,
    };
  }

  // 4. Calculate exponential backoff with full jitter
  const factor = config.backoffFactor ?? 2;
  const rawBackoff = config.baseDelayMs * Math.pow(factor, state.attemptCount);
  const cappedBackoff = Math.min(config.maxDelayMs, rawBackoff);

  // Full jitter: uniformly distributed random delay between 0 and cappedBackoff
  const jitteredDelay = Math.floor(randomFn() * cappedBackoff);

  // If Retry-After header was specified by server, respect it as minimum delay
  let finalDelayMs = jitteredDelay;
  if (report.retryAfterSeconds !== undefined && report.retryAfterSeconds > 0) {
    const serverRequestedDelayMs = report.retryAfterSeconds * 1000;
    finalDelayMs = Math.max(jitteredDelay, serverRequestedDelayMs);
  }

  // Ensure delay stays within max ceiling
  finalDelayMs = Math.min(config.maxDelayMs, finalDelayMs);

  // 5. Check overall time budget
  const currentTime = nowFn();
  const elapsedMs = Math.max(0, currentTime - state.startTimeMs);

  if (elapsedMs + finalDelayMs > config.budgetMs) {
    return {
      shouldRetry: false,
      delayMs: 0,
      reason: `Time budget exceeded (elapsed ${elapsedMs}ms + next delay ${finalDelayMs}ms > budget ${config.budgetMs}ms)`,
    };
  }

  return {
    shouldRetry: true,
    delayMs: finalDelayMs,
    reason: `Retry attempt ${state.attemptCount + 1} scheduled after ${finalDelayMs}ms`,
  };
}
