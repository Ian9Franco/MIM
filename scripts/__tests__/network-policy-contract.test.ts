import assert from "node:assert/strict";
import {
  calculateNextRetry,
  classifyNetworkError,
  DEFAULT_RETRY_POLICY,
  parseRetryAfter,
  sanitizeEndpoint,
  type NetworkDiagnosticReport,
  type RetryState,
} from "@/lib/network";

async function testSanitization(): Promise<void> {
  // 1. Basic auth redaction
  const sanitizedAuth = sanitizeEndpoint("https://admin:superSecret123@api.curseforge.com/v1/mods");
  assert.equal(sanitizedAuth, "https://[REDACTED]:[REDACTED]@api.curseforge.com/v1/mods");

  // 2. Sensitive query parameters
  const sanitizedParams = sanitizeEndpoint(
    "https://api.modrinth.com/v2/search?query=fabric&token=my_secret_token&apiKey=12345&version=1.20.1"
  );
  assert.ok(!sanitizedParams.includes("my_secret_token"));
  assert.ok(!sanitizedParams.includes("12345"));
  assert.ok(sanitizedParams.includes("query=fabric"));
  assert.ok(sanitizedParams.includes("version=1.20.1"));
  assert.ok(sanitizedParams.includes("token=%5BREDACTED%5D") || sanitizedParams.includes("token=[REDACTED]"));

  // 3. Relative URLs
  const relativeSanitized = sanitizeEndpoint("/api/sync/server?key=abcde&tab=mods");
  assert.ok(!relativeSanitized.includes("abcde"));
  assert.ok(relativeSanitized.includes("tab=mods"));

  console.log("✔ Sanitization tests passed");
}

async function testErrorClassification(): Promise<void> {
  const fixedNow = 1700000000000;
  const nowFn = () => fixedNow;

  // 1. Node DNS failure
  const dnsErr = Object.assign(new Error("getaddrinfo ENOTFOUND api.modrinth.com"), { code: "ENOTFOUND" });
  const dnsReport = classifyNetworkError({ rawUrl: "https://api.modrinth.com", error: dnsErr }, nowFn);
  assert.equal(dnsReport.category, "dns_resolution_failed");
  assert.equal(dnsReport.isRetryable, true);
  assert.equal(dnsReport.suggestedAction, "check_internet");
  assert.equal(dnsReport.phases[0]?.phase, "dns");
  assert.equal(dnsReport.phases[0]?.status, "failed");

  // 2. Node Connection Refused
  const connErr = Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:25565"), { code: "ECONNREFUSED" });
  const connReport = classifyNetworkError({ rawUrl: "http://127.0.0.1:25565", error: connErr }, nowFn);
  assert.equal(connReport.category, "connection_refused");
  assert.equal(connReport.isRetryable, true);
  assert.equal(connReport.suggestedAction, "check_service_status");

  // 3. Node Timeout
  const timeoutErr = Object.assign(new Error("Connection timed out"), { code: "ETIMEDOUT" });
  const timeoutReport = classifyNetworkError({ rawUrl: "https://example.com", error: timeoutErr }, nowFn);
  assert.equal(timeoutReport.category, "timeout");
  assert.equal(timeoutReport.isRetryable, true);
  assert.equal(timeoutReport.suggestedAction, "retry_later");

  // 4. TLS Certificate Expired (Non-retryable)
  const tlsErr = Object.assign(new Error("certificate has expired"), { code: "CERT_HAS_EXPIRED" });
  const tlsReport = classifyNetworkError({ rawUrl: "https://expired.badssl.com", error: tlsErr }, nowFn);
  assert.equal(tlsReport.category, "tls_certificate_invalid");
  assert.equal(tlsReport.isRetryable, false);
  assert.equal(tlsReport.suggestedAction, "check_credentials");

  // 5. AbortError / Cancellation (Non-retryable)
  const abortErr = new Error("The operation was aborted");
  abortErr.name = "AbortError";
  const abortReport = classifyNetworkError({ rawUrl: "https://example.com/download", error: abortErr }, nowFn);
  assert.equal(abortReport.category, "request_aborted");
  assert.equal(abortReport.isRetryable, false);
  assert.equal(abortReport.suggestedAction, "do_not_retry");

  // 6. HTTP 429 Rate Limited with Retry-After header
  const rateLimitReport = classifyNetworkError(
    {
      rawUrl: "https://api.curseforge.com/v1/mods/123",
      httpStatus: 429,
      headers: { "retry-after": "15" },
    },
    nowFn
  );
  assert.equal(rateLimitReport.category, "rate_limited");
  assert.equal(rateLimitReport.isRetryable, true);
  assert.equal(rateLimitReport.retryAfterSeconds, 15);

  // 7. HTTP 503 Service Unavailable (Transient) vs HTTP 404 (Permanent)
  const report503 = classifyNetworkError({ httpStatus: 503 }, nowFn);
  assert.equal(report503.category, "http_server_error");
  assert.equal(report503.isRetryable, true);

  const report404 = classifyNetworkError({ httpStatus: 404 }, nowFn);
  assert.equal(report404.category, "http_client_error");
  assert.equal(report404.isRetryable, false);
  assert.equal(report404.suggestedAction, "do_not_retry");

  console.log("✔ Classification tests passed");
}

async function testRetryAfterParsing(): Promise<void> {
  const baseTime = new Date("2026-09-09T00:00:00Z").getTime();

  // Numeric seconds
  assert.equal(parseRetryAfter("30", baseTime), 30);
  assert.equal(parseRetryAfter(" 120 ", baseTime), 120);

  // HTTP Date (IMF-fixdate)
  const targetDate = new Date("2026-09-09T00:00:45Z").toUTCString();
  assert.equal(parseRetryAfter(targetDate, baseTime), 45);

  // Invalid / missing
  assert.equal(parseRetryAfter(undefined, baseTime), undefined);
  assert.equal(parseRetryAfter("invalid-format", baseTime), undefined);

  console.log("✔ Retry-After parsing tests passed");
}

async function testDeterministicRetryPolicy(): Promise<void> {
  const startTime = 1000000;
  let simulatedNow = startTime;
  const nowFn = () => simulatedNow;

  // Predictable mock random generator: returns fixed multiplier (0.5 for half-jitter, 1.0 for max jitter)
  let mockRandomVal = 0.5;
  const randomFn = () => mockRandomVal;

  const retryableReport: NetworkDiagnosticReport = {
    sanitizedEndpoint: "https://api.example.com/mods",
    category: "timeout",
    suggestedAction: "retry_later",
    isRetryable: true,
    phases: [{ phase: "timeout", status: "failed" }],
    errorMessage: "ETIMEDOUT",
    timestamp: simulatedNow,
  };

  const state: RetryState = {
    attemptCount: 0,
    startTimeMs: startTime,
  };

  // Attempt 0: baseDelay = 400ms, factor = 2^0 = 1 -> cappedBackoff = 400ms. With random = 0.5 -> delay = 200ms
  const decision0 = calculateNextRetry(
    state,
    retryableReport,
    { baseDelayMs: 400, maxAttempts: 3, budgetMs: 10000 },
    { now: nowFn, random: randomFn }
  );
  assert.equal(decision0.shouldRetry, true);
  assert.equal(decision0.delayMs, 200);

  // Attempt 1: backoff = 400 * 2^1 = 800ms. With random = 0.5 -> delay = 400ms
  state.attemptCount = 1;
  simulatedNow += 200;
  const decision1 = calculateNextRetry(
    state,
    retryableReport,
    { baseDelayMs: 400, maxAttempts: 3, budgetMs: 10000 },
    { now: nowFn, random: randomFn }
  );
  assert.equal(decision1.shouldRetry, true);
  assert.equal(decision1.delayMs, 400);

  // Attempt 2: backoff = 400 * 2^2 = 1600ms. With random = 0.5 -> delay = 800ms
  state.attemptCount = 2;
  simulatedNow += 400;
  const decision2 = calculateNextRetry(
    state,
    retryableReport,
    { baseDelayMs: 400, maxAttempts: 3, budgetMs: 10000 },
    { now: nowFn, random: randomFn }
  );
  assert.equal(decision2.shouldRetry, true);
  assert.equal(decision2.delayMs, 800);

  // Attempt 3: Max attempts reached (3/3)
  state.attemptCount = 3;
  const decision3 = calculateNextRetry(
    state,
    retryableReport,
    { baseDelayMs: 400, maxAttempts: 3, budgetMs: 10000 },
    { now: nowFn, random: randomFn }
  );
  assert.equal(decision3.shouldRetry, false);
  assert.ok(decision3.reason.includes("Max attempts reached"));

  // Non-retryable error must be rejected on attempt 0
  const nonRetryableReport: NetworkDiagnosticReport = {
    sanitizedEndpoint: "https://api.example.com",
    category: "http_client_error",
    httpStatus: 401,
    suggestedAction: "check_credentials",
    isRetryable: false,
    phases: [{ phase: "http", status: "failed" }],
    errorMessage: "Unauthorized (401)",
    timestamp: simulatedNow,
  };
  const decisionNonRetryable = calculateNextRetry(
    { attemptCount: 0, startTimeMs: startTime },
    nonRetryableReport,
    DEFAULT_RETRY_POLICY,
    { now: nowFn, random: randomFn }
  );
  assert.equal(decisionNonRetryable.shouldRetry, false);
  assert.ok(decisionNonRetryable.reason.includes("non-retryable"));

  // Respect Retry-After header overrides jitter if larger
  const rateLimitReportWithRetryAfter: NetworkDiagnosticReport = {
    sanitizedEndpoint: "https://api.example.com/ratelimit",
    category: "rate_limited",
    httpStatus: 429,
    retryAfterSeconds: 5,
    suggestedAction: "retry_later",
    isRetryable: true,
    phases: [{ phase: "http", status: "failed" }],
    errorMessage: "Rate limited",
    timestamp: simulatedNow,
  };
  const decisionRateLimit = calculateNextRetry(
    { attemptCount: 0, startTimeMs: startTime },
    rateLimitReportWithRetryAfter,
    { baseDelayMs: 400, maxDelayMs: 10000, budgetMs: 30000 },
    { now: nowFn, random: randomFn }
  );
  assert.equal(decisionRateLimit.shouldRetry, true);
  assert.equal(decisionRateLimit.delayMs, 5000); // 5 seconds from Retry-After

  // Budget exhaustion check
  const decisionBudgetExceeded = calculateNextRetry(
    { attemptCount: 0, startTimeMs: startTime },
    retryableReport,
    { baseDelayMs: 400, budgetMs: 100 }, // budget is only 100ms, calculated delay is 200ms
    { now: () => startTime, random: randomFn }
  );
  assert.equal(decisionBudgetExceeded.shouldRetry, false);
  assert.ok(decisionBudgetExceeded.reason.includes("Time budget exceeded"));

  console.log("✔ Deterministic retry policy tests passed");
}

async function run(): Promise<void> {
  console.log("Starting network policy and classification contract test suite...");
  await testSanitization();
  await testErrorClassification();
  await testRetryAfterParsing();
  await testDeterministicRetryPolicy();
  console.log("\nAll network contract tests passed successfully!");
}

run().catch((err) => {
  console.error("Test failure:", err);
  process.exit(1);
});
