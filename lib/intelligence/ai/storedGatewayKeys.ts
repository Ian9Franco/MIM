/**
 * Server-only helper: merges stored Settings keys into gateway options.
 * Import only from app/api routes — never from client-reachable modules.
 */
import { getApiKey } from "@/lib/core/settings";
import type { GatewayKeyOptions } from "./modelGateway";

export function withStoredGatewayKeys(options: GatewayKeyOptions = {}): GatewayKeyOptions {
  return {
    ...options,
    headerGeminiKey: options.headerGeminiKey?.trim() || getApiKey("gemini"),
    openrouterKey: options.openrouterKey?.trim() || getApiKey("openrouter"),
  };
}
