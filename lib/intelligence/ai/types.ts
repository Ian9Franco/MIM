export type AIProviderId = "gemini" | "openrouter";

export type AIMessageRole = "system" | "user" | "assistant";

export type AITextPart = {
  type: "text";
  text: string;
};

export type AIImagePart = {
  type: "image";
  mimeType: string;
  data: string;
};

export type AIContentPart = AITextPart | AIImagePart;

export type AIMessage = {
  role: AIMessageRole;
  parts: AIContentPart[];
};

export type AIRequest = {
  model: string;
  messages: AIMessage[];
  temperature?: number;
  maxOutputTokens?: number;
  tools?: {
    googleSearch?: boolean;
  };
};

export type AIGroundedSource = {
  title: string;
  url: string;
};

export type AIResponse = {
  text: string;
  model: string;
  provider: AIProviderId;
  searchUsed: boolean;
  groundedSources: AIGroundedSource[];
};

export interface AIProvider {
  readonly id: AIProviderId;
  generate(request: AIRequest): Promise<AIResponse>;
}
