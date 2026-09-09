/**
 * Sanitizes URLs and endpoints by stripping embedded credentials and redacting sensitive query parameters.
 */

const SENSITIVE_QUERY_KEYS = new Set([
  "token",
  "key",
  "apikey",
  "api_key",
  "secret",
  "password",
  "pass",
  "auth",
  "authorization",
  "access_token",
  "refresh_token",
  "signature",
  "sig",
  "bearer",
]);

/**
 * Strips basic auth credentials (user:pass@host) and redacts sensitive query param values.
 * Returns safe string suitable for error reporting, diagnostic dumps, and telemetry.
 */
export function sanitizeEndpoint(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== "string") {
    return "";
  }

  // Handle relative paths without breaking
  const isRelative = rawUrl.startsWith("/") || !rawUrl.includes("://");
  const dummyBase = "http://localhost.localdomain";

  try {
    const url = new URL(rawUrl, isRelative ? dummyBase : undefined);

    // Redact embedded username and password in origin
    if (url.username || url.password) {
      url.username = "[REDACTED]";
      url.password = "[REDACTED]";
    }

    // Redact sensitive query parameters
    const searchParams = url.searchParams;
    for (const key of Array.from(searchParams.keys())) {
      if (SENSITIVE_QUERY_KEYS.has(key.toLowerCase())) {
        searchParams.set(key, "[REDACTED]");
      }
    }

    let result = isRelative ? `${url.pathname}${url.search}${url.hash}` : url.toString();
    result = result.replace(/%5BREDACTED%5D/gi, "[REDACTED]");
    return result;
  } catch {
    // If URL parsing fails, perform regex-based fallback redaction
    return rawUrl
      .replace(/\/\/([^:]+):([^@]+)@/g, "//[REDACTED]:[REDACTED]@")
      .replace(/([?&](?:token|key|apiKey|secret|password|auth|access_token)=)[^&]+/gi, "$1[REDACTED]");
  }
}
