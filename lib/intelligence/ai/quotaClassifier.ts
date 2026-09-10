import type { AIProviderId } from "./types";

/** Provider-reported or inferred quota limit category (BOT-06). */
export type QuotaLimitKind = "rpm" | "tpm" | "daily" | "concurrency" | "unknown";

export type ClassifiedQuotaLimit = {
  kind: QuotaLimitKind;
  retryAfterSeconds?: number;
  provider: AIProviderId;
  /** User-facing hint — does not claim undocumented provider limits. */
  userHint: string;
};

export function parseRetryAfterSeconds(message: string): number | undefined {
  const match = message.match(/retry in\s*([\d.]+)\s*s/i);
  if (!match) return undefined;
  return Math.min(Math.ceil(parseFloat(match[1])), 300);
}

/**
 * Classifies provider 429/quota errors using response metadata when available.
 * Does not infer daily vs RPM from any 429 — requires explicit signals in the message.
 */
export function classifyProviderQuotaError(
  message: string,
  provider: AIProviderId
): ClassifiedQuotaLimit {
  const lower = message.toLowerCase();
  const retryAfterSeconds = parseRetryAfterSeconds(message);

  if (
    lower.includes("per day") ||
    lower.includes("perday") ||
    lower.includes("daily") ||
    lower.includes("quota exceeded for quota metric") && lower.includes("day")
  ) {
    return {
      kind: "daily",
      retryAfterSeconds,
      provider,
      userHint:
        "Cuota diaria del proveedor alcanzada. Reintentá mañana o revisá el plan en la consola del proveedor.",
    };
  }

  if (
    lower.includes("tokens per minute") ||
    lower.includes("tpm") ||
    lower.includes("token limit")
  ) {
    return {
      kind: "tpm",
      retryAfterSeconds,
      provider,
      userHint:
        "Límite de tokens por minuto (TPM) alcanzado. Esperá unos segundos antes de enviar prompts más largos.",
    };
  }

  if (
    lower.includes("requests per minute") ||
    lower.includes("rpm") ||
    lower.includes("rate limit") ||
    lower.includes("resource_exhausted")
  ) {
    return {
      kind: "rpm",
      retryAfterSeconds,
      provider,
      userHint: retryAfterSeconds
        ? `Límite de consultas por minuto (RPM). Reintentá en ~${retryAfterSeconds}s.`
        : "Límite de consultas por minuto (RPM) alcanzado. Esperá unos segundos antes de reintentar.",
    };
  }

  if (lower.includes("concurrent") || lower.includes("in flight")) {
    return {
      kind: "concurrency",
      retryAfterSeconds,
      provider,
      userHint: "Demasiadas solicitudes simultáneas al proveedor. Esperá a que terminen las anteriores.",
    };
  }

  return {
    kind: "unknown",
    retryAfterSeconds,
    provider,
    userHint: retryAfterSeconds
      ? `El proveedor rechazó la solicitud por cuota. Reintentá en ~${retryAfterSeconds}s.`
      : "El proveedor rechazó la solicitud por cuota. Esperá antes de reintentar.",
  };
}
