export type GeminiKeyStatus = "missing" | "valid" | "invalid" | "rate_limited";

export async function probeGeminiApiKey(apiKey: string): Promise<GeminiKeyStatus> {
  const trimmed = apiKey.trim();
  if (!trimmed) return "missing";

  try {
    const geminiRes = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
      headers: {
        "x-goog-api-key": trimmed,
        "x-goog-api-client": "mim-app/1.0.0",
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (geminiRes.ok) return "valid";
    if (geminiRes.status === 429) return "rate_limited";
    return "invalid";
  } catch {
    return "invalid";
  }
}
