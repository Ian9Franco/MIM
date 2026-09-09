import { classifyNetworkError } from "./classifier";
import { calculateNextRetry, DEFAULT_RETRY_POLICY } from "./retryPolicy";
import type { NetworkDiagnosticReport, RetryPolicyConfig, RetryState } from "./types";

export type FetchWithRetryOptions<T = unknown> = RequestInit & {
  /** Optional custom retry policy configuration */
  policy?: Partial<RetryPolicyConfig>;
  /** Optional custom response parser (defaults to parsing JSON) */
  parser?: (res: Response) => Promise<T>;
  /** Optional custom fetch implementation (useful for tests or mocking) */
  fetchImpl?: typeof fetch;
  /** Optional sleep implementation for tests */
  sleep?: (ms: number) => Promise<void>;
  /** Injected clock */
  now?: () => number;
  /** Injected random generator */
  random?: () => number;
  /** Environment hint */
  environment?: "node" | "browser" | "unknown";
};

export type FetchSuccessResult<T> = {
  ok: true;
  data: T;
  status: number;
  report?: NetworkDiagnosticReport;
};

export type FetchFailureResult = {
  ok: false;
  error: string;
  status?: number;
  report: NetworkDiagnosticReport;
};

export type FetchWithRetryResult<T> = FetchSuccessResult<T> | FetchFailureResult;

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveFetchUrl(rawUrl: string | URL): string {
  const urlStr = typeof rawUrl === "string" ? rawUrl : rawUrl.toString();
  if (typeof window !== "undefined" && urlStr.startsWith("/")) {
    try {
      return new URL(urlStr, window.location.origin).toString();
    } catch {
      return urlStr;
    }
  }
  return urlStr;
}

/**
 * Executes an HTTP fetch request with intelligent error classification, exponential backoff,
 * jitter, time budgeting, and single-owner retry management.
 */
export async function fetchWithRetry<T = unknown>(
  input: string | URL,
  options?: FetchWithRetryOptions<T>
): Promise<FetchWithRetryResult<T>> {
  const {
    policy,
    parser,
    fetchImpl = (typeof globalThis.fetch === "function" ? globalThis.fetch.bind(globalThis) : fetch),
    sleep = defaultSleep,
    now = Date.now,
    random = Math.random,
    environment = typeof window !== "undefined" ? "browser" : "node",
    ...requestInit
  } = options ?? {};

  const targetUrl = resolveFetchUrl(input);
  const startTime = now();

  const state: RetryState = {
    attemptCount: 0,
    startTimeMs: startTime,
  };

  const effectivePolicy: RetryPolicyConfig = {
    ...DEFAULT_RETRY_POLICY,
    ...policy,
  };

  while (true) {
    const attemptStartTime = now();
    let response: Response | null = null;
    let thrownError: unknown = null;

    try {
      response = await fetchImpl(targetUrl, requestInit);
      if (response.ok) {
        // Parse response body
        const parsedData = parser ? await parser(response) : ((await response.json()) as T);
        return {
          ok: true,
          data: parsedData,
          status: response.status,
        };
      }
    } catch (err: unknown) {
      thrownError = err;
    }

    const elapsedAttemptMs = now() - attemptStartTime;

    // Convert response headers to plain object if available
    let responseHeaders: Record<string, string> | null = null;
    if (response?.headers) {
      responseHeaders = {};
      response.headers.forEach((val, key) => {
        if (responseHeaders) responseHeaders[key] = val;
      });
    }

    // Classify the outcome
    const diagnosticReport = classifyNetworkError(
      {
        rawUrl: targetUrl,
        error: thrownError,
        httpStatus: response?.status,
        headers: responseHeaders,
        elapsedMs: elapsedAttemptMs,
        environment,
      },
      now
    );

    // Check if we should retry
    const decision = calculateNextRetry(state, diagnosticReport, effectivePolicy, { now, random });

    if (!decision.shouldRetry) {
      return {
        ok: false,
        error: diagnosticReport.errorMessage || `Request failed (${decision.reason})`,
        status: response?.status,
        report: diagnosticReport,
      };
    }

    // Wait for the calculated delay before next iteration
    if (decision.delayMs > 0) {
      await sleep(decision.delayMs);
    }

    state.attemptCount += 1;
    state.lastDelayMs = decision.delayMs;
  }
}
