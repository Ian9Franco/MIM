/**
 * Pure Domain Contracts: Network & Diagnostics
 *
 * Structured error categories, lifecycle phases, deterministic retry decisions,
 * and sanitized diagnostic contracts.
 */

export type NetworkPhase =
  | "dns"
  | "tcp"
  | "tls"
  | "http"
  | "request_headers"
  | "request_body"
  | "response_headers"
  | "response_body"
  | "timeout"
  | "abort"
  | "idle"
  | "unknown";

export type PhaseStatus =
  | "ok"
  | "failed"
  | "unknown"
  | "unsupported"
  | "skipped";

export type NetworkErrorCategory =
  | "network_offline"
  | "dns_resolution_failed"
  | "connection_refused"
  | "connection_reset"
  | "tls_handshake_failed"
  | "tls_certificate_invalid"
  | "timeout"
  | "timeout_connect"
  | "timeout_read"
  | "http_client_error"
  | "http_server_error"
  | "rate_limited"
  | "http_rate_limit"
  | "request_aborted"
  | "aborted_by_caller"
  | "malformed_response"
  | "unsupported_in_environment"
  | "unknown_network_error"
  | "unknown";

export type DiagnosticSuggestedAction =
  | "check_internet"
  | "retry_later"
  | "retry_with_backoff"
  | "retry_after_delay"
  | "check_credentials"
  | "firewall_proxy_suspected"
  | "check_dns"
  | "check_endpoint_url"
  | "check_service_status"
  | "do_not_retry"
  | "report_upstream_issue"
  | "inspect_logs";

export type SuggestedRemediation = DiagnosticSuggestedAction;

export type NetworkDiagnosticPhase = {
  phase: NetworkPhase;
  status: PhaseStatus;
  durationMs?: number;
  detail?: string;
};

export type NetworkDiagnosticReport = {
  sanitizedEndpoint: string;
  category: NetworkErrorCategory;
  httpStatus?: number;
  suggestedAction: DiagnosticSuggestedAction;
  isRetryable: boolean;
  retryAfterSeconds?: number;
  phases: NetworkDiagnosticPhase[];
  errorMessage: string;
  timestamp: number;
};

export interface NetworkDiagnosticContract {
  timestamp: string;
  durationMs: number;
  url: string;
  method: string;
  phase: NetworkPhase;
  category: NetworkErrorCategory;
  suggestedAction: DiagnosticSuggestedAction;
  httpStatus?: number;
  systemErrorCode?: string;
  retryAfterSeconds?: number;
  rawErrorMessage?: string;
  isRetryable: boolean;
  metadata?: Record<string, string | number | boolean | null>;
}

export type RetryDecision = {
  shouldRetry: boolean;
  delayMs: number;
  reason: string;
  attemptIndex?: number;
  exhaustedBudget?: boolean;
};

export type RetryState = {
  attemptCount: number;
  startTimeMs: number;
  lastDelayMs?: number;
};

export type RetryPolicyConfig = {
  /** Maximum number of retry attempts allowed before failing */
  maxAttempts: number;
  /** Base delay in milliseconds for backoff calculation */
  baseDelayMs: number;
  /** Upper bound ceiling for any single backoff delay in ms */
  maxDelayMs: number;
  /** Total maximum duration allowed across all attempts in ms */
  budgetMs: number;
  /** HTTP status codes explicitly eligible for retry */
  retryableStatuses?: number[];
  /** Exponential backoff factor (defaults to 2) */
  backoffFactor?: number;
  /** Total timeout in ms (optional alias) */
  totalTimeoutMs?: number;
  /** Flag for jitter */
  enableJitter?: boolean;
};

export interface SanitizedDiagnostic extends NetworkDiagnosticContract {
  sanitizedUrl: string;
}
