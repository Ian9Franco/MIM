/** Default Gemini cascade for resilience (429 / 5xx). */
export const GEMINI_MODEL_CASCADE = [
  "gemini-flash-lite-latest",
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.6-flash",
] as const;

export const DEFAULT_GEMINI_MODEL = GEMINI_MODEL_CASCADE[0];
