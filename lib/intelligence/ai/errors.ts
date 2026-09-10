export type AIProviderErrorCode =
  | "NO_API_KEY"
  | "RATE_LIMITED"
  | "HTTP_ERROR"
  | "EMPTY_RESPONSE";

export class AIProviderError extends Error {
  readonly code: AIProviderErrorCode;
  readonly status?: number;
  readonly provider?: string;

  constructor(
    message: string,
    code: AIProviderErrorCode,
    options?: { status?: number; provider?: string }
  ) {
    super(message);
    this.name = "AIProviderError";
    this.code = code;
    this.status = options?.status;
    this.provider = options?.provider;
  }
}

export function isAIProviderError(error: unknown): error is AIProviderError {
  return error instanceof AIProviderError;
}
