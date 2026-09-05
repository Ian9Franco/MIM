import { NextResponse } from "next/server";

export type SageErrorCode =
  | "MIM_CREDENTIAL_MISSING"
  | "MIM_CREDENTIAL_INVALID"
  | "MIM_PROVIDER_RATE_LIMIT"
  | "MIM_AI_GENERATION_FAILED";

export type SageErrorSeverity = "warning" | "error";

export type SageErrorDefinition = {
  status: number;
  legacyError: "NO_API_KEY" | "RATE_LIMITED" | "GENERATION_FAILED";
  message: string;
  retryable: boolean;
  severity: SageErrorSeverity;
  action: string;
};

export const SAGE_ERROR_DEFINITIONS: Readonly<Record<SageErrorCode, SageErrorDefinition>> = {
  MIM_CREDENTIAL_MISSING: {
    status: 401,
    legacyError: "NO_API_KEY",
    message: "No hay clave de Gemini API configurada.",
    retryable: false,
    severity: "warning",
    action: "Configurá una clave de Gemini válida antes de volver a intentar.",
  },
  MIM_CREDENTIAL_INVALID: {
    status: 401,
    legacyError: "NO_API_KEY",
    message: "Clave de Gemini API inválida o expirada.",
    retryable: false,
    severity: "warning",
    action: "Reemplazá o revalidá la clave de Gemini configurada.",
  },
  MIM_PROVIDER_RATE_LIMIT: {
    status: 429,
    legacyError: "RATE_LIMITED",
    message: "Se alcanzó temporalmente el límite de consultas o cuota de la API de Gemini.",
    retryable: true,
    severity: "warning",
    action: "Esperá antes de volver a consultar; no reemplaces la clave salvo que la validación indique que es inválida.",
  },
  MIM_AI_GENERATION_FAILED: {
    status: 502,
    legacyError: "GENERATION_FAILED",
    message: "MIM-Bot no pudo generar una respuesta con los modelos disponibles.",
    retryable: true,
    severity: "error",
    action: "Reintentá más tarde o revisá el estado del proveedor si el problema persiste.",
  },
};

export function sageErrorResponse(
  code: SageErrorCode,
  options: { message?: string; details?: string } = {},
): NextResponse {
  const definition = SAGE_ERROR_DEFINITIONS[code];
  return NextResponse.json(
    {
      error: definition.legacyError,
      code,
      message: options.message ?? definition.message,
      retryable: definition.retryable,
      severity: definition.severity,
      action: definition.action,
      ...(options.details ? { details: options.details } : {}),
    },
    { status: definition.status },
  );
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
