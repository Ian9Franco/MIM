import assert from "assert";
import { POST as explainProjectRoute } from "../../app/api/fomo/explain/route";
import {
  buildMultimodalPrompt,
  explainModWithGemini,
  getGeminiModel,
  type ModExplainerInput,
} from "../../lib/intelligence/modExplainer";

function pass(message: string): void {
  console.log(`  ✓ ${message}`);
}

async function testRealMultimodalRequest(): Promise<void> {
  const originalFetch = globalThis.fetch;
  let geminiBody = "";

  const mockFetch: typeof fetch = async (input, init) => {
    const url = String(input);
    if (url === "https://example.test/gallery.webp") {
      return new Response(Uint8Array.from([1, 2, 3, 4]), {
        status: 200,
        headers: { "content-type": "image/webp" },
      });
    }

    geminiBody = typeof init?.body === "string" ? init.body : "";
    return Response.json({
      candidates: [{
        content: { parts: [{ text: "  Explicación grounded del proyecto.  " }] },
        groundingMetadata: {
          webSearchQueries: ["Complementary Reimagined shader"],
          groundingChunks: [{
            web: {
              title: "Complementary Reimagined",
              uri: "https://example.test/source",
            },
          }],
        },
      }],
    });
  };

  const input: ModExplainerInput = {
    projectId: "complementary-reimagined",
    title: "Complementary Reimagined",
    categories: ["shaders"],
    loaders: ["iris"],
    galleryUrls: ["https://example.test/gallery.webp"],
    model: "gemini-test-model",
    personality: "standard",
  };

  try {
    globalThis.fetch = mockFetch;
    const result = await explainModWithGemini(input, "test-key");

    assert.strictEqual(result.summaryMarkdown, "Explicación grounded del proyecto.");
    assert.strictEqual(result.imagesAnalyzed, 1);
    assert.strictEqual(result.searchUsed, true);
    assert.strictEqual(result.groundedSources[0]?.url, "https://example.test/source");
    assert.strictEqual(result.model, "gemini-test-model");
    assert.ok(geminiBody.includes("Complementary Reimagined"));
    assert.ok(geminiBody.includes("shaders"));
    assert.ok(geminiBody.includes("inlineData"));
    assert.ok(geminiBody.includes("AQIDBA=="));
    pass("real engine sends metadata + inline gallery image and parses grounding metadata");
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function testRealFallback(): Promise<void> {
  const originalFetch = globalThis.fetch;
  const mockFetch: typeof fetch = async () => new Response("provider unavailable", { status: 500 });
  const input: ModExplainerInput = {
    projectId: "fallback-project",
    title: "Fallback Project",
    categories: ["utility"],
    loaders: ["fabric"],
    personality: "standard",
  };

  try {
    globalThis.fetch = mockFetch;
    const result = await explainModWithGemini(input, "test-key");
    assert.strictEqual(result.model, "mim-bot-offline-fallback-standard");
    assert.strictEqual(result.searchUsed, false);
    assert.strictEqual(result.imagesAnalyzed, 0);
    assert.ok(result.summaryMarkdown.includes("Fallback Project"));
    pass("real engine falls back locally when every provider model fails");
  } finally {
    globalThis.fetch = originalFetch;
  }
}

function makeRouteRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/fomo/explain", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "203.0.113.53",
    },
    body: JSON.stringify(body),
  });
}

async function testHttpConsumerMultimodalRequest(): Promise<void> {
  const originalFetch = globalThis.fetch;
  const mockFetch: typeof fetch = async (input) => {
    if (String(input) === "https://example.test/route-gallery.webp") {
      return new Response(Uint8Array.from([5, 6, 7, 8]), {
        status: 200,
        headers: { "content-type": "image/webp" },
      });
    }

    return Response.json({
      candidates: [{
        content: { parts: [{ text: "Explicación desde el consumidor HTTP." }] },
        groundingMetadata: {
          webSearchQueries: ["Route Project mod"],
          groundingChunks: [{ web: { title: "Route Source", uri: "https://example.test/route-source" } }],
        },
      }],
    });
  };

  try {
    globalThis.fetch = mockFetch;
    const response = await explainProjectRoute(makeRouteRequest({
      projectId: "route-project",
      title: "Route Project",
      categories: ["technology"],
      loaders: ["fabric"],
      galleryUrls: ["https://example.test/route-gallery.webp"],
      model: "gemini-route-test",
      personality: "standard",
      clientApiKey: "test-key",
    }));
    const result = await response.json();

    assert.strictEqual(response.status, 200);
    assert.strictEqual(result.summaryMarkdown, "Explicación desde el consumidor HTTP.");
    assert.strictEqual(result.imagesAnalyzed, 1);
    assert.strictEqual(result.searchUsed, true);
    assert.strictEqual(result.groundedSources[0]?.url, "https://example.test/route-source");
    pass("HTTP consumer forwards metadata + gallery images through the real explainer");
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function testHttpConsumerFallback(): Promise<void> {
  const originalFetch = globalThis.fetch;
  const mockFetch: typeof fetch = async () => new Response("provider unavailable", { status: 500 });

  try {
    globalThis.fetch = mockFetch;
    const response = await explainProjectRoute(makeRouteRequest({
      projectId: "route-fallback",
      title: "Route Fallback",
      categories: ["utility"],
      loaders: ["fabric"],
      personality: "standard",
      clientApiKey: "test-key",
    }));
    const result = await response.json();

    assert.strictEqual(response.status, 200);
    assert.strictEqual(result.model, "mim-bot-offline-fallback-standard");
    assert.strictEqual(result.searchUsed, false);
    assert.strictEqual(result.imagesAnalyzed, 0);
    pass("HTTP consumer preserves the real explainer fallback contract");
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function run(): Promise<void> {
  const prompt = buildMultimodalPrompt({ projectId: "p", title: "Prompt Project" }, 2, "standard");
  assert.ok(prompt.includes("2 captura(s)"));
  assert.strictEqual(getGeminiModel(" custom-model "), "custom-model");
  pass("real prompt/model helpers are imported instead of copied into the suite");

  await testRealMultimodalRequest();
  await testRealFallback();
  await testHttpConsumerMultimodalRequest();
  await testHttpConsumerFallback();
  console.log("✓ Real multimodal explainer contract suite passed");
}

run().catch((error: unknown) => {
  console.error("Mod explainer contract suite failed:", error);
  process.exit(1);
});
