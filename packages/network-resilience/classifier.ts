import { sanitizeEndpoint } from "./sanitize";
import type {
  DiagnosticSuggestedAction,
  NetworkDiagnosticPhase,
  NetworkDiagnosticReport,
  NetworkErrorCategory,
} from "@mim/contracts-core/network";

export type ClassificationInput = {
  rawUrl?: string;
  error?: unknown;
  httpStatus?: number;
  headers?: Record<string, string> | Headers | null;
  elapsedMs?: number;
  environment?: "node" | "browser" | "unknown";
};

/**
 * Parses a Retry-After header value into seconds (supports delta-seconds and IMF-fixdate HTTP-date).
 */
export function parseRetryAfter(headerValue: string | null | undefined, nowMs: number = Date.now()): number | undefined {
  if (!headerValue) return undefined;

  const trimmed = headerValue.trim();
  const seconds = Number.parseInt(trimmed, 10);
  if (!Number.isNaN(seconds) && /^\d+$/.test(trimmed)) {
    return Math.max(0, seconds);
  }

  const parsedDate = Date.parse(trimmed);
  if (!Number.isNaN(parsedDate)) {
    const diffSeconds = Math.round((parsedDate - nowMs) / 1000);
    return Math.max(0, diffSeconds);
  }

  return undefined;
}

/**
 * Extracts header value safely regardless of whether headers are a plain object or standard Web Headers.
 */
function getHeaderCaseInsensitive(
  headers: Record<string, string> | Headers | null | undefined,
  targetKey: string
): string | undefined {
  if (!headers) return undefined;

  if (typeof (headers as Headers).get === "function") {
    return (headers as Headers).get(targetKey) ?? undefined;
  }

  const targetLower = targetKey.toLowerCase();
  for (const [key, value] of Object.entries(headers as Record<string, string>)) {
    if (key.toLowerCase() === targetLower) {
      return value;
    }
  }

  return undefined;
}

/**
 * Pure classifier that evaluates network errors, HTTP statuses, and headers into a structured diagnostic report.
 */
export function classifyNetworkError(input: ClassificationInput, now: () => number = Date.now): NetworkDiagnosticReport {
  const { rawUrl = "", error, httpStatus, headers, elapsedMs, environment = "unknown" } = input;
  const sanitizedEndpoint = sanitizeEndpoint(rawUrl);
  const currentTime = now();

  const retryAfterHeader = getHeaderCaseInsensitive(headers, "retry-after");
  const retryAfterSeconds = parseRetryAfter(retryAfterHeader, currentTime);

  let category: NetworkErrorCategory = "unknown";
  let suggestedAction: DiagnosticSuggestedAction = "inspect_logs";
  let isRetryable = false;
  let errorMessage = "";
  const phases: NetworkDiagnosticPhase[] = [];

  // 1. Analyze AbortError (explicit cancellation or client-side timeout)
  const isAbort =
    (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) ||
    (typeof error === "object" && error !== null && "name" in error && (error as { name: string }).name === "AbortError");

  if (isAbort) {
    category = "request_aborted";
    suggestedAction = "do_not_retry";
    isRetryable = false;
    errorMessage = error instanceof Error ? error.message : "Request was aborted";
    phases.push({ phase: "abort", status: "failed", durationMs: elapsedMs, detail: errorMessage });
    return {
      sanitizedEndpoint,
      category,
      httpStatus,
      suggestedAction,
      isRetryable,
      phases,
      errorMessage,
      timestamp: currentTime,
    };
  }

  // 2. Analyze Node-specific error codes
  const nodeErrorCode = typeof error === "object" && error !== null && "code" in error ? String((error as { code: unknown }).code) : "";
  const errorMsgStr = error instanceof Error ? error.message : typeof error === "string" ? error : "";

  if (nodeErrorCode) {
    switch (nodeErrorCode) {
      case "ENOTFOUND":
      case "EAI_AGAIN":
        category = "dns_resolution_failed";
        suggestedAction = "check_internet";
        isRetryable = true;
        errorMessage = `DNS resolution failed (${nodeErrorCode})`;
        phases.push({ phase: "dns", status: "failed", durationMs: elapsedMs, detail: errorMessage });
        break;

      case "ECONNREFUSED":
        category = "connection_refused";
        suggestedAction = "check_service_status";
        isRetryable = true;
        errorMessage = `Connection refused (${nodeErrorCode})`;
        phases.push({ phase: "dns", status: "ok" });
        phases.push({ phase: "tcp", status: "failed", durationMs: elapsedMs, detail: errorMessage });
        break;

      case "ETIMEDOUT":
      case "ESOCKETTIMEDOUT":
      case "UND_ERR_CONNECT_TIMEOUT":
      case "UND_ERR_HEADERS_TIMEOUT":
        category = "timeout";
        suggestedAction = "retry_later";
        isRetryable = true;
        errorMessage = `Operation timed out (${nodeErrorCode})`;
        phases.push({ phase: "timeout", status: "failed", durationMs: elapsedMs, detail: errorMessage });
        break;

      case "CERT_HAS_EXPIRED":
      case "UNABLE_TO_VERIFY_LEAF_SIGNATURE":
      case "ERR_TLS_CERT_ALTNAME_INVALID":
      case "DEPTH_ZERO_SELF_SIGNED_CERT":
        category = "tls_certificate_invalid";
        suggestedAction = "check_credentials";
        isRetryable = false;
        errorMessage = `TLS certificate error (${nodeErrorCode})`;
        phases.push({ phase: "dns", status: "ok" });
        phases.push({ phase: "tcp", status: "ok" });
        phases.push({ phase: "tls", status: "failed", durationMs: elapsedMs, detail: errorMessage });
        break;

      case "ECONNRESET":
      case "EPIPE":
      case "UND_ERR_SOCKET":
        category = "network_offline";
        suggestedAction = "retry_later";
        isRetryable = true;
        errorMessage = `Connection reset by peer (${nodeErrorCode})`;
        phases.push({ phase: "tcp", status: "failed", durationMs: elapsedMs, detail: errorMessage });
        break;

      default:
        break;
    }
  }

  // 3. Analyze Browser opaque fetch failure (TypeError: Failed to fetch)
  if (category === "unknown" && errorMsgStr.toLowerCase().includes("failed to fetch")) {
    if (environment === "browser" && typeof navigator !== "undefined" && !navigator.onLine) {
      category = "network_offline";
      suggestedAction = "check_internet";
      isRetryable = true;
      errorMessage = "Client is offline";
      phases.push({ phase: "tcp", status: "failed", detail: "Browser offline" });
    } else {
      category = "unknown";
      suggestedAction = "firewall_proxy_suspected";
      isRetryable = true;
      errorMessage = "Failed to fetch (network error or CORS restriction)";
      phases.push({ phase: "dns", status: "unknown" });
      phases.push({ phase: "tcp", status: "unknown" });
      phases.push({ phase: "http", status: "failed", detail: errorMessage });
    }
  }

  // 4. Analyze HTTP Status Code if received
  if (httpStatus !== undefined && httpStatus > 0) {
    errorMessage = errorMessage || `HTTP Error ${httpStatus}`;

    if (httpStatus === 429) {
      category = "rate_limited";
      suggestedAction = "retry_later";
      isRetryable = true;
      phases.push({ phase: "http", status: "failed", detail: `Rate limited (429)` });
    } else if (httpStatus === 408) {
      category = "timeout";
      suggestedAction = "retry_later";
      isRetryable = true;
      phases.push({ phase: "http", status: "failed", detail: `Request timeout (408)` });
    } else if (httpStatus >= 500) {
      category = "http_server_error";
      suggestedAction = "check_service_status";
      // 500 might be bug, 502/503/504 are transient proxy/gateway errors
      isRetryable = [502, 503, 504].includes(httpStatus);
      phases.push({ phase: "http", status: "failed", detail: `Server error (${httpStatus})` });
    } else if (httpStatus >= 400) {
      category = "http_client_error";
      suggestedAction = [401, 403].includes(httpStatus) ? "check_credentials" : "do_not_retry";
      isRetryable = false;
      phases.push({ phase: "http", status: "failed", detail: `Client error (${httpStatus})` });
    }
  }

  if (category === "unknown") {
    errorMessage = errorMessage || (error instanceof Error ? error.message : "Unknown network error");
  }

  return {
    sanitizedEndpoint,
    category,
    httpStatus,
    suggestedAction,
    isRetryable,
    retryAfterSeconds,
    phases,
    errorMessage,
    timestamp: currentTime,
  };
}
