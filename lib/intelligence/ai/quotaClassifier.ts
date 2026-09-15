import type { AIProviderId } from "./types";

/** Provider-reported or inferred quota limit category (BOT-06). */
export type QuotaLimitKind = "rpm" | "tpm" | "daily" | "concurrency" | "unknown";

export type ClassifiedQuotaLimit = {
  kind: QuotaLimitKind;
  retryAfterSeconds?: number;
  provider: AIProviderId;
  /** User-facing hint — clear, distinguishable, and actionable */
  userHint: string;
};

export function parseRetryAfterSeconds(message: string): number | undefined {
  const match = message.match(/retry (?:in|after)\s*([\d.]+)\s*s/i) ||
    message.match(/try again in\s*([\d.]+)\s*s/i) ||
    message.match(/rate_limit_reset:\s*([\d.]+)/i);
  if (!match) return undefined;
  return Math.min(Math.ceil(parseFloat(match[1])), 300);
}

/**
 * Classifies provider 429/quota errors using response metadata when available.
 * Accurately distinguishes short-term rate limits (RPM / TPM) from daily exhaustion (RPD).
 */
export function classifyProviderQuotaError(
  message: string,
  provider: AIProviderId
): ClassifiedQuotaLimit {
  const lower = message.toLowerCase();
  const retryAfterSeconds = parseRetryAfterSeconds(message);

  // Daily quota exhaust patterns (Google Gemini & OpenRouter)
  if (
    lower.includes("per day") ||
    lower.includes("perday") ||
    lower.includes("daily") ||
    lower.includes("rpd") ||
    lower.includes("freetier daily") ||
    lower.includes("daily request limit") ||
    lower.includes("daily quota") ||
    lower.includes("credits exhausted") ||
    lower.includes("insufficient_quota") ||
    (lower.includes("quota exceeded") && lower.includes("day")) ||
    (lower.includes("quota") && lower.includes("exceeded") && !lower.includes("minute") && !lower.includes("second"))
  ) {
    return {
      kind: "daily",
      retryAfterSeconds,
      provider,
      userHint:
        "Cuota diaria del proveedor alcanzada. Tu límite de hoy se terminó: reintentá mañana o configurá una clave de otro proveedor / tier pago en Configuración.",
    };
  }

  // Token per minute (TPM) limits
  if (
    lower.includes("tokens per minute") ||
    lower.includes("tpm") ||
    lower.includes("token limit") ||
    lower.includes("tokens per second")
  ) {
    return {
      kind: "tpm",
      retryAfterSeconds,
      provider,
      userHint: retryAfterSeconds
        ? `Límite de tokens por minuto (TPM) alcanzado. Reintentá en ~${retryAfterSeconds}s con mensajes más cortos.`
        : "Límite de tokens por minuto (TPM) alcanzado. Esperá unos segundos antes de enviar prompts extensos.",
    };
  }

  // Requests per minute (RPM) limits
  if (
    lower.includes("requests per minute") ||
    lower.includes("rpm") ||
    lower.includes("rate limit") ||
    lower.includes("rate_limited") ||
    lower.includes("resource_exhausted") ||
    lower.includes("too many requests") ||
    lower.includes("429")
  ) {
    return {
      kind: "rpm",
      retryAfterSeconds,
      provider,
      userHint: retryAfterSeconds
        ? `Límite de consultas por minuto (RPM). Reintentá en ~${retryAfterSeconds}s.`
        : "Límite de consultas por minuto (RPM) alcanzado. Aguardá unos segundos antes de reintentar.",
    };
  }

  // Concurrency limits
  if (lower.includes("concurrent") || lower.includes("in flight") || lower.includes("simultaneous")) {
    return {
      kind: "concurrency",
      retryAfterSeconds,
      provider,
      userHint: "Demasiadas solicitudes simultáneas al proveedor. Esperá a que finalicen las anteriores.",
    };
  }

  return {
    kind: "unknown",
    retryAfterSeconds,
    provider,
    userHint: retryAfterSeconds
      ? `El proveedor rechazó la solicitud por cuota. Reintentá en ~${retryAfterSeconds}s.`
      : "El proveedor rechazó la solicitud por cuota. Esperá un momento antes de reintentar.",
  };
}

