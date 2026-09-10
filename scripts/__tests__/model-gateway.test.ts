import {
  generateWithModelGateway,
  isIntentRoutingEnabled,
  resolveModelRoute,
} from "../../lib/intelligence/ai";
import { GeminiProvider } from "../../lib/intelligence/ai/geminiProvider";
import { OpenRouterProvider } from "../../lib/intelligence/ai/openRouterProvider";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
  console.log(`✓ ${message}`);
}

function inputUrl(input: Parameters<typeof fetch>[0]): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

async function testIntentRoutingDefaultsOn(): Promise<void> {
  assert(isIntentRoutingEnabled({} as NodeJS.ProcessEnv), "Intent routing is enabled by default");
  assert(
    !isIntentRoutingEnabled({ MIMBOT_INTENT_ROUTING: "false" } as unknown as NodeJS.ProcessEnv),
    "Intent routing can be disabled via env"
  );
}

async function testTextIntentPrefersGlmWhenBothKeys(): Promise<void> {
  const route = resolveModelRoute("sage-chat", {
    hasGeminiKey: true,
    hasOpenRouterKey: true,
  });
  assert(route.providerId === "openrouter", "Text chat routes to OpenRouter when GLM key exists");
  assert(route.reason === "text-intent-glm-cost-path", "Routing reason documents GLM text path");
}

async function testMultimodalForcesGemini(): Promise<void> {
  const route = resolveModelRoute("mod-explain-multimodal", {
    hasGeminiKey: true,
    hasOpenRouterKey: true,
  });
  assert(route.providerId === "gemini", "Multimodal explain always routes to Gemini");
  assert(route.reason === "multimodal-requires-gemini", "Multimodal routing reason is explicit");
}

async function testSearchGroundingForcesGemini(): Promise<void> {
  const route = resolveModelRoute("mod-explain-text", {
    hasGeminiKey: true,
    hasOpenRouterKey: true,
    wantsSearchGrounding: true,
  });
  assert(route.providerId === "gemini", "Search grounding routes to Gemini");
  assert(route.googleSearch === true, "Search grounding enables googleSearch tool");
}

async function testGatewayUsesOpenRouterForText(): Promise<void> {
  let url = "";
  globalThis.fetch = (async (input) => {
    url = inputUrl(input);
    return Response.json({ choices: [{ message: { content: "ruta glm" } }] });
  }) as typeof fetch;

  const result = await generateWithModelGateway({
    intent: "mim-bot-chat",
    messages: [{ role: "user", parts: [{ type: "text", text: "Hola" }] }],
    openrouterKey: "or-test-key",
    clientGeminiKey: "gemini-test-key",
    env: { MIMBOT_INTENT_ROUTING: "true" } as unknown as NodeJS.ProcessEnv,
  });

  assert(result.provider === "openrouter", "Gateway generates via OpenRouter for text intent");
  assert(url.includes("openrouter.ai"), "Gateway calls OpenRouter endpoint for text intent");
  assert(result.routeReason === "text-intent-glm-cost-path", "Gateway surfaces routing reason");
}

async function testGatewayUsesGeminiForMultimodal(): Promise<void> {
  let url = "";
  globalThis.fetch = (async (input) => {
    url = inputUrl(input);
    return Response.json({
      candidates: [{ content: { parts: [{ text: "multimodal ok" }] } }],
    });
  }) as typeof fetch;

  const result = await generateWithModelGateway({
    intent: "mod-explain-multimodal",
    messages: [
      {
        role: "user",
        parts: [
          { type: "text", text: "Describe" },
          { type: "image", mimeType: "image/png", data: "abc" },
        ],
      },
    ],
    openrouterKey: "or-test-key",
    clientGeminiKey: "gemini-test-key",
  });

  assert(result.provider === "gemini", "Gateway generates via Gemini for multimodal intent");
  assert(url.includes("generativelanguage.googleapis.com"), "Gateway calls Gemini for multimodal");
}

async function main(): Promise<void> {
  const originalFetch = globalThis.fetch;
  try {
    await testIntentRoutingDefaultsOn();
    await testTextIntentPrefersGlmWhenBothKeys();
    await testMultimodalForcesGemini();
    await testSearchGroundingForcesGemini();
    await testGatewayUsesOpenRouterForText();
    await testGatewayUsesGeminiForMultimodal();
    console.log("Model gateway routing tests passed.");
  } finally {
    globalThis.fetch = originalFetch;
    void GeminiProvider;
    void OpenRouterProvider;
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
