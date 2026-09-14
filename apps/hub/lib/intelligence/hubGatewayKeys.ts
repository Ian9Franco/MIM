/**
 * HUB serverless gateway keys — env + BYOK headers only (no Desktop safeStorage).
 */
import type { GatewayKeyOptions } from "@mim-intelligence/ai/modelGateway";

export function withHubGatewayKeys(options: GatewayKeyOptions = {}): GatewayKeyOptions {
  const envGemini =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY?.trim() ||
    "";
  const envOpenRouter = process.env.OPENROUTER_API_KEY?.trim() || "";

  const headerGemini = options.headerGeminiKey?.trim() || "";
  const clientGemini = options.clientGeminiKey?.trim() || "";

  return {
    ...options,
    clientGeminiKey: clientGemini || undefined,
    headerGeminiKey: headerGemini || envGemini || undefined,
    openrouterKey: options.openrouterKey?.trim() || envOpenRouter || undefined,
  };
}
