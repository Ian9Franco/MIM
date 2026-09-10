import { AIProviderError } from "./errors";
import type {
  AIContentPart,
  AIMessage,
  AIProvider,
  AIRequest,
  AIResponse,
} from "./types";

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

// ─── GLM Model Constants ────────────────────────────────────────────

/** GLM-4 Flash (free tier via OpenRouter). Primary model for MIMbot. */
export const GLM_PRIMARY = "zhipu-ai/glm-4-flash-250414";

/** GLM-4 Plus (paid tier). Fallback when the free model is unavailable. */
export const GLM_PAID_FALLBACK = "zhipu-ai/glm-4-plus";

/** Default cascade: try free first, then paid. */
export const GLM_MODEL_CASCADE = [GLM_PRIMARY, GLM_PAID_FALLBACK] as const;

// ─── OpenRouter Message Types ───────────────────────────────────────

type OpenRouterContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

type OpenRouterMessage = {
  role: "system" | "user" | "assistant";
  content: string | OpenRouterContentPart[];
};

export class OpenRouterProvider implements AIProvider {
  readonly id = "openrouter" as const;

  constructor(private readonly apiKey: string) {}

  async generate(request: AIRequest): Promise<AIResponse> {
    if (!this.apiKey) {
      throw new AIProviderError("NO_API_KEY", "NO_API_KEY", { provider: this.id });
    }

    const payload = {
      model: request.model,
      messages: toOpenRouterMessages(request.messages),
      temperature: request.temperature ?? 0.65,
      max_tokens: request.maxOutputTokens ?? 800,
    };

    let response = await postOpenRouter(this.apiKey, payload);

    if (response.status === 429) {
      await sleep(3000);
      response = await postOpenRouter(this.apiKey, payload);
    }

    if (!response.ok) {
      const errText = await response.text();
      const code = response.status === 429 ? "RATE_LIMITED" : "HTTP_ERROR";
      throw new AIProviderError(
        `OpenRouter ${request.model} responded ${response.status}: ${errText.slice(0, 180)}`,
        code,
        { status: response.status, provider: this.id }
      );
    }

    const data: unknown = await response.json();
    const text = extractOpenRouterText(data);
    if (!text) {
      throw new AIProviderError("OpenRouter returned an empty completion", "EMPTY_RESPONSE", {
        provider: this.id,
      });
    }

    return {
      text,
      model: request.model,
      provider: this.id,
      searchUsed: false,
      groundedSources: [],
    };
  }

  /**
   * Tries the primary model, then cascades through fallback models on
   * 429 (rate limit) or 5xx (server error). Mirrors the GeminiProvider
   * cascade pattern used by modExplainer.
   */
  async generateWithFallback(
    request: Omit<AIRequest, "model">,
    models: readonly string[] = GLM_MODEL_CASCADE
  ): Promise<AIResponse> {
    let lastError: Error | null = null;

    for (const model of models) {
      try {
        return await this.generate({ ...request, model });
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        const isRetryable =
          err instanceof AIProviderError &&
          (err.code === "RATE_LIMITED" ||
            (err.status !== undefined && err.status >= 500));

        if (!isRetryable) throw err;
        console.warn(
          `[OpenRouterProvider] ${model} failed (${err instanceof AIProviderError ? err.code : "unknown"}), trying next fallback...`
        );
      }
    }

    throw (
      lastError ??
      new AIProviderError(
        "All OpenRouter fallback models exhausted",
        "HTTP_ERROR",
        { provider: this.id }
      )
    );
  }
}

// ─── Internal Helpers ───────────────────────────────────────────────

function toOpenRouterMessages(messages: AIMessage[]): OpenRouterMessage[] {
  return messages.map((message) => ({
    role: message.role,
    content: toOpenRouterContent(message.parts),
  }));
}

function toOpenRouterContent(parts: AIContentPart[]): string | OpenRouterContentPart[] {
  const hasImage = parts.some((part) => part.type === "image");
  if (!hasImage) {
    return parts
      .filter((part): part is Extract<AIContentPart, { type: "text" }> => part.type === "text")
      .map((part) => part.text)
      .join("\n");
  }

  return parts.map((part) => {
    if (part.type === "image") {
      return {
        type: "image_url" as const,
        image_url: { url: `data:${part.mimeType};base64,${part.data}` },
      };
    }
    return { type: "text" as const, text: part.text };
  });
}

async function postOpenRouter(apiKey: string, payload: unknown): Promise<Response> {
  return fetch(OPENROUTER_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://github.com/Ian9Franco/MIM",
      "X-Title": "MIM MIMbot",
    },
    body: JSON.stringify(payload),
  });
}

function extractOpenRouterText(value: unknown): string {
  if (!isRecord(value) || !Array.isArray(value.choices)) return "";
  const choice = value.choices[0];
  if (!isRecord(choice) || !isRecord(choice.message) || typeof choice.message.content !== "string") {
    return "";
  }
  return choice.message.content.trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

