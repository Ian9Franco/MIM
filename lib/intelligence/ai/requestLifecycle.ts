export const DEFAULT_AI_REQUEST_TIMEOUT_MS = 15_000;

export function createAIRequestSignal(
  parentSignal?: AbortSignal,
  timeoutMs = DEFAULT_AI_REQUEST_TIMEOUT_MS
): AbortSignal {
  const normalizedTimeout = Number.isFinite(timeoutMs)
    ? Math.max(1, Math.floor(timeoutMs))
    : DEFAULT_AI_REQUEST_TIMEOUT_MS;
  const timeoutSignal = AbortSignal.timeout(normalizedTimeout);

  return parentSignal
    ? AbortSignal.any([parentSignal, timeoutSignal])
    : timeoutSignal;
}

export function waitForRetry(delayMs: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.reject(signal.reason);

  return new Promise((resolve, reject) => {
    const timer = setTimeout(complete, delayMs);

    function complete(): void {
      signal.removeEventListener("abort", cancel);
      resolve();
    }

    function cancel(): void {
      clearTimeout(timer);
      signal.removeEventListener("abort", cancel);
      reject(signal.reason);
    }

    signal.addEventListener("abort", cancel, { once: true });
  });
}
