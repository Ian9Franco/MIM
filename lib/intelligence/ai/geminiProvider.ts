import { AIProviderError } from "./errors";
import type {
  AIContentPart,
  AIGroundedSource,
  AIMessage,
  AIProvider,
  AIRequest,
  AIResponse,
} from "./types";

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

type GeminiContent = {
  role: "user" | "model";
  parts: GeminiPart[];
};

export class GeminiProvider implements AIProvider {
  readonly id = "gemini" as const;

  constructor(private readonly apiKey: string) {}

  async generate(request: AIRequest): Promise<AIResponse> {
    if (!this.apiKey) {
      throw new AIProviderError("NO_API_KEY", "NO_API_KEY", { provider: this.id });
    }

    const payload = {
      contents: toGeminiContents(request.messages),
      generationConfig: {
        temperature: request.temperature ?? 0.65,
        maxOutputTokens: request.maxOutputTokens ?? 800,
      },
      ...(request.tools?.googleSearch ? { tools: [{ googleSearch: {} }] } : {}),
    };

    const endpoint = `${GEMINI_ENDPOINT}/${encodeURIComponent(request.model)}:generateContent`;
    let response = await postGemini(endpoint, this.apiKey, payload);

    if (response.status === 429) {
      const errText = await response.text();
      const retryMatch = errText.match(/retry in\s*([\d.]+)\s*s/i);
      const waitSeconds = retryMatch ? Math.min(Math.ceil(parseFloat(retryMatch[1])), 8) : 3;
      await sleep(waitSeconds * 1000);
      response = await postGemini(endpoint, this.apiKey, payload);
    }

    if (!response.ok) {
      const errText = await response.text();
      const code = response.status === 429 ? "RATE_LIMITED" : "HTTP_ERROR";
      throw new AIProviderError(
        `Gemini ${request.model} responded ${response.status}: ${errText.slice(0, 180)}`,
        code,
        { status: response.status, provider: this.id }
      );
    }

    const data: unknown = await response.json();
    const parsed = parseGeminiResponse(data);
    if (!parsed.text) {
      throw new AIProviderError("Gemini returned an empty candidate", "EMPTY_RESPONSE", {
        provider: this.id,
      });
    }

    return {
      text: parsed.text,
      model: request.model,
      provider: this.id,
      searchUsed: parsed.searchUsed,
      groundedSources: parsed.groundedSources,
    };
  }
}

function toGeminiContents(messages: AIMessage[]): GeminiContent[] {
  return messages.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: message.parts.map(toGeminiPart),
  }));
}

function toGeminiPart(part: AIContentPart): GeminiPart {
  if (part.type === "image") {
    return { inlineData: { mimeType: part.mimeType, data: part.data } };
  }
  return { text: part.text };
}

async function postGemini(
  endpoint: string,
  apiKey: string,
  payload: unknown
): Promise<Response> {
  return fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(payload),
  });
}

function parseGeminiResponse(value: unknown): {
  text: string;
  searchUsed: boolean;
  groundedSources: AIGroundedSource[];
} {
  if (!isRecord(value) || !Array.isArray(value.candidates)) {
    return { text: "", searchUsed: false, groundedSources: [] };
  }

  const candidate = value.candidates[0];
  if (!isRecord(candidate) || !isRecord(candidate.content) || !Array.isArray(candidate.content.parts)) {
    return { text: "", searchUsed: false, groundedSources: [] };
  }

  const text = candidate.content.parts
    .map((part) => (isRecord(part) && typeof part.text === "string" ? part.text : ""))
    .join("")
    .trim();

  const groundedSources: AIGroundedSource[] = [];
  const groundingMetadata = isRecord(candidate.groundingMetadata) ? candidate.groundingMetadata : null;
  const searchChunks = groundingMetadata && Array.isArray(groundingMetadata.groundingChunks)
    ? groundingMetadata.groundingChunks
    : [];

  for (const chunk of searchChunks) {
    if (!isRecord(chunk) || !isRecord(chunk.web) || typeof chunk.web.uri !== "string") continue;
    groundedSources.push({
      title: typeof chunk.web.title === "string" ? chunk.web.title : chunk.web.uri,
      url: chunk.web.uri,
    });
  }

  const searchQueries = groundingMetadata && Array.isArray(groundingMetadata.webSearchQueries)
    ? groundingMetadata.webSearchQueries
    : [];
  const searchUsed = groundedSources.length > 0 || searchQueries.length > 0;

  return { text, searchUsed, groundedSources };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
