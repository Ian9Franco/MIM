import { GeminiProvider } from "../../lib/intelligence/ai/geminiProvider";
import { OpenRouterProvider } from "../../lib/intelligence/ai/openRouterProvider";
import type { AIRequest } from "../../lib/intelligence/ai/types";
import { chatWithProjectAssistant } from "../../lib/intelligence/modExplainer";

const baseRequest: AIRequest = {
  model: "test-model",
  messages: [{ role: "user", parts: [{ type: "text", text: "Diagnose" }] }],
  timeoutMs: 200,
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
  console.log(`✓ ${message}`);
}

function inputUrl(input: Parameters<typeof fetch>[0]): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

async function testGeminiRequestContract(): Promise<void> {
  let url = "";
  let init: RequestInit | undefined;
  globalThis.fetch = (async (input, requestInit) => {
    url = inputUrl(input);
    init = requestInit;
    return Response.json({ candidates: [{ content: { parts: [{ text: "ok" }] } }] });
  }) as typeof fetch;

  const result = await new GeminiProvider("gemini-secret").generate(baseRequest);
  assert(result.text === "ok", "Gemini provider parses its real JSON response contract");
  assert(url.endsWith("/test-model:generateContent"), "Gemini provider targets generateContent");
  assert(!url.includes("gemini-secret"), "Gemini credentials never enter the request URL");
  assert(new Headers(init?.headers).get("x-goog-api-key") === "gemini-secret", "Gemini authenticates by header");
  assert(init?.signal instanceof AbortSignal, "Gemini fetch receives a lifecycle signal");
}

async function testOpenRouterRequestContract(): Promise<void> {
  let url = "";
  let init: RequestInit | undefined;
  globalThis.fetch = (async (input, requestInit) => {
    url = inputUrl(input);
    init = requestInit;
    return Response.json({ choices: [{ message: { content: "ok" } }] });
  }) as typeof fetch;

  const result = await new OpenRouterProvider("openrouter-secret").generate(baseRequest);
  assert(result.text === "ok", "OpenRouter provider parses its completion contract");
  assert(url === "https://openrouter.ai/api/v1/chat/completions", "OpenRouter uses its provider endpoint");
  assert(!url.includes("openrouter-secret"), "OpenRouter credentials never enter the request URL");
  assert(new Headers(init?.headers).get("Authorization") === "Bearer openrouter-secret", "OpenRouter authenticates by header");
  assert(init?.signal instanceof AbortSignal, "OpenRouter fetch receives a lifecycle signal");
}

async function testProviderTimeout(): Promise<void> {
  let receivedSignal: AbortSignal | undefined;
  globalThis.fetch = ((_input, init) => new Promise<Response>((_resolve, reject) => {
    receivedSignal = init?.signal instanceof AbortSignal ? init.signal : undefined;
    if (!receivedSignal) return reject(new Error("missing signal"));
    const watchdog = setTimeout(() => reject(new Error("provider timeout did not fire")), 250);
    receivedSignal.addEventListener("abort", () => {
      clearTimeout(watchdog);
      reject(receivedSignal?.reason);
    }, { once: true });
  })) as typeof fetch;

  let rejected = false;
  try {
    await new GeminiProvider("gemini-secret").generate({ ...baseRequest, timeoutMs: 10 });
  } catch {
    rejected = true;
  }
  assert(rejected, "Provider timeout rejects stalled upstream work");
  assert(receivedSignal?.aborted, "Provider timeout aborts the underlying fetch signal");
}

async function testProjectChatUsesSelectedProvider(): Promise<void> {
  let url = "";
  globalThis.fetch = (async (input) => {
    url = inputUrl(input);
    return Response.json({ choices: [{ message: { content: "respuesta" } }] });
  }) as typeof fetch;

  const result = await chatWithProjectAssistant({
    projectContext: { projectId: "mod-1", title: "Test Mod" },
    messages: [],
    question: "¿Es compatible?",
    personality: "standard",
  }, "provider-managed", new OpenRouterProvider("openrouter-secret"));

  assert(result.reply === "respuesta", "Project mini-chat returns the selected provider response");
  assert(url.startsWith("https://openrouter.ai/"), "Project mini-chat honors the selected provider");
  assert(!url.includes("openrouter-secret"), "Project mini-chat keeps provider credentials out of URLs");
}

async function main(): Promise<void> {
  const originalFetch = globalThis.fetch;
  try {
    await testGeminiRequestContract();
    await testOpenRouterRequestContract();
    await testProviderTimeout();
    await testProjectChatUsesSelectedProvider();
    console.log("AI provider request lifecycle contract passed.");
  } finally {
    globalThis.fetch = originalFetch;
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
