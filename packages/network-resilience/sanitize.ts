/**
 * URL and Endpoint Sanitization for Network Diagnostics
 * Removes basic auth credentials, API keys, passwords, and tokens from URLs
 * before passing them to logs, telemetry, or UI diagnostic views.
 */

const SENSITIVE_QUERY_PARAMS = new Set([
  "token",
  "key",
  "apikey",
  "api_key",
  "auth",
  "secret",
  "password",
  "passwd",
  "bearer",
  "access_token",
  "refresh_token",
]);

export function sanitizeEndpoint(rawUrl: string): string {
  if (!rawUrl) return "";

  try {
    const url = new URL(rawUrl);

    if (url.username || url.password) {
      url.username = "REDACTED";
      url.password = "REDACTED";
    }

    for (const key of Array.from(url.searchParams.keys())) {
      if (SENSITIVE_QUERY_PARAMS.has(key.toLowerCase())) {
        url.searchParams.set(key, "[REDACTED]");
      }
    }

    return url.toString().replace(/REDACTED:REDACTED@/g, "[REDACTED]:[REDACTED]@");
  } catch {
    // If not a full valid URL, apply basic regex sanitization
    return rawUrl
      .replace(/(:\/\/[^:]+:)[^@]+(@)/g, "$1[REDACTED]$2")
      .replace(/([?&](?:token|key|api_key|auth|secret|password)=)[^&]*/gi, "$1[REDACTED]");
  }
}
