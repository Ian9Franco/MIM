/**
 * Critical API Integration & Schema Validation Test Suite
 * ─────────────────────────────────────────────────────────────────────────────
 * Tests core endpoint request contracts and Zod schemas:
 * 1. app/api/settings/validate: Array validation and rejection of invalid payloads
 * 2. app/api/settings/validate-keys: Schema validation of API key check inputs
 * 3. app/api/staging: Action enum validation ("resolve" | "clear")
 * 4. app/api/sage/player-rescue/save: Strict NBT and filePath schema enforcement
 * 5. web/lib/translator: Resilient official translation dispatch and graceful degradation
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest } from "next/server";
import { POST as validatePost } from "../../app/api/settings/validate/route";
import { POST as validateKeysPost } from "../../app/api/settings/validate-keys/route";
import { POST as stagingPost } from "../../app/api/staging/route";
import { POST as savePlayerPost } from "../../app/api/sage/player-rescue/save/route";
import { POST as sageChatPost } from "../../app/api/sage/chat/route";
import { consumeSageStream, SageStreamFailure } from "../../lib/intelligence/sage/streamContract";
import { translateText } from "../../web/lib/translator";
import { POST as deletePost } from "../../app/api/delete/route";
import { POST as minecraftDeletePost } from "../../app/api/minecraft/delete/route";
import { getSettings } from "../../lib/core/settings";
import path from "path";

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m"
};

function pass(msg: string) {
  console.log(`  ${colors.green}✓${colors.reset} ${msg}`);
}

function fail(msg: string, details?: unknown) {
  console.error(`  ${colors.red}✗${colors.reset} ${msg}`);
  if (details) console.error("    Details:", details);
  process.exit(1);
}

function assert(condition: boolean, msg: string, details?: unknown) {
  if (!condition) {
    fail(msg, details);
  } else {
    pass(msg);
  }
}

function createJsonRequest(url: string, body: unknown): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createMalformedRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{ malformed: json [",
  });
}

async function run() {
  console.log(`\n${colors.bold}${colors.cyan}▶ Executing Critical API Integration & Schema Test Suite...${colors.reset}\n`);

  // ─────────────────────────────────────────────────────────────────────────
  // 1. /api/settings/validate
  // ─────────────────────────────────────────────────────────────────────────
  console.log(`${colors.bold}1. Route: /api/settings/validate (POST)${colors.reset}`);

  const badReq1 = createMalformedRequest("/api/settings/validate");
  const resBad1 = await validatePost(badReq1);
  assert(resBad1.status === 400, "Rejects malformed JSON with HTTP 400");

  const emptyReq1 = createJsonRequest("/api/settings/validate", { paths: [] });
  const resEmpty1 = await validatePost(emptyReq1);
  assert(resEmpty1.status === 400, "Rejects empty paths array with HTTP 400");

  const goodReq1 = createJsonRequest("/api/settings/validate", { paths: [process.cwd()] });
  const resGood1 = await validatePost(goodReq1);
  assert(resGood1.status === 200, "Accepts valid paths array with HTTP 200");
  const dataGood1 = await resGood1.json();
  assert(dataGood1.results[process.cwd()] === true, "Correctly validates that current directory exists");

  // ─────────────────────────────────────────────────────────────────────────
  // 2. /api/settings/validate-keys
  // ─────────────────────────────────────────────────────────────────────────
  console.log(`\n${colors.bold}2. Route: /api/settings/validate-keys (POST)${colors.reset}`);

  const badReq2 = createMalformedRequest("/api/settings/validate-keys");
  const resBad2 = await validateKeysPost(badReq2);
  assert(resBad2.status === 400, "Rejects malformed JSON with HTTP 400");

  const goodReq2 = createJsonRequest("/api/settings/validate-keys", {
    curseforge: "",
    modrinth: null,
    virusTotal: "",
    gemini: null
  });
  const resGood2 = await validateKeysPost(goodReq2);
  assert(resGood2.status === 200, "Processes empty/null keys safely with HTTP 200");
  const dataGood2 = await resGood2.json();
  assert(dataGood2.results.curseforge === false, "Unprovided required key marked false");
  assert(dataGood2.results.modrinth === null, "Unprovided optional key marked null");
  assert(dataGood2.results.gemini === null, "Unprovided optional Gemini key marked null");

  const invalidGeminiReq = createJsonRequest("/api/settings/validate-keys", {
    curseforge: "",
    gemini: 12345
  });
  const invalidGeminiRes = await validateKeysPost(invalidGeminiReq);
  assert(invalidGeminiRes.status === 400, "Rejects non-string Gemini key with HTTP 400");

  // ─────────────────────────────────────────────────────────────────────────
  // 3. /api/staging
  // ─────────────────────────────────────────────────────────────────────────
  console.log(`\n${colors.bold}3. Route: /api/staging (POST)${colors.reset}`);

  const invalidActionReq = createJsonRequest("/api/staging", { action: "invalid_action_xyz" });
  const resInvalidAction = await stagingPost(invalidActionReq);
  assert(resInvalidAction.status === 400, "Rejects invalid action enum with HTTP 400");

  // ─────────────────────────────────────────────────────────────────────────
  // 4. /api/sage/player-rescue/save
  // ─────────────────────────────────────────────────────────────────────────
  console.log(`\n${colors.bold}4. Route: /api/sage/player-rescue/save (POST)${colors.reset}`);

  const badSaveReq = createJsonRequest("/api/sage/player-rescue/save", {
    filePath: "",
    nbtData: null
  });
  const resBadSave = await savePlayerPost(badSaveReq);
  assert(resBadSave.status === 400, "Rejects empty filePath and null nbtData with HTTP 400");

  // ─────────────────────────────────────────────────────────────────────────
  // 5. Official Translation Service (web/lib/translator.ts)
  // ─────────────────────────────────────────────────────────────────────────
  console.log(`\n${colors.bold}5. Service: Official Translation Engine Resilience${colors.reset}`);

  const testText = "Armor and weapons are now customizable with gems.";
  const transResult = await translateText(testText, "es");

  assert(typeof transResult.translatedText === "string", "Returns translatedText string");
  assert(typeof transResult.degraded === "boolean", "Returns degraded boolean flag");
  assert(["deepl", "google-cloud", "libretranslate", "none"].includes(transResult.provider), `Identifies valid provider: ${transResult.provider}`);

  if (transResult.provider === "none") {
    assert(transResult.degraded === true, "Gracefully degrades when no official API keys are present in env");
    assert(transResult.translatedText === testText, "Preserves original text without throwing fatal errors");
    pass("Safe zero-downtime degradation verified for unconfigured environments");
  } else {
    pass(`Official translation executed via provider: ${transResult.provider}`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 6. SAGE MIM-Bot Chat Defense & Schema Contract (app/api/sage/chat)
  // ─────────────────────────────────────────────────────────────────────────
  console.log(`\n${colors.bold}6. Endpoint: /api/sage/chat Defense Perimeter & Contracts${colors.reset}`);

  const emptyChatReq = createJsonRequest("/api/sage/chat", {
    personality: "bully"
  });
  const resEmptyChat = await sageChatPost(emptyChatReq);
  assert(resEmptyChat.status === 400, "Rejects request missing question parameter with HTTP 400");
  assert(resEmptyChat.headers.has("X-RateLimit-Limit"), "Response includes X-RateLimit-Limit header");

  const badPersonalityReq = createJsonRequest("/api/sage/chat", {
    question: "¿Qué pasó?",
    personality: "super_aggressive"
  });
  const resBadPersonality = await sageChatPost(badPersonalityReq);
  assert(resBadPersonality.status === 400, "Rejects invalid personality enum with HTTP 400");

  const malformedChatReq = createMalformedRequest("/api/sage/chat");
  const resMalformedChat = await sageChatPost(malformedChatReq);
  assert(resMalformedChat.status === 400, "Rejects malformed JSON body with HTTP 400");

  const originalFetch = globalThis.fetch;
  let capturedGeminiUrl = "";
  let capturedGeminiHeaders = new Headers();
  const sentinelGeminiKey = "mim-test-key-must-not-appear-in-url";

  globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    capturedGeminiUrl =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    capturedGeminiHeaders = new Headers(init?.headers);

    const event = JSON.stringify({
      candidates: [{ content: { parts: [{ text: "Respuesta de prueba" }] } }],
    });
    return new Response(`data: ${event}\n\n`, {
      status: 200,
      headers: { "Content-Type": "text/event-stream" },
    });
  }) as typeof fetch;

  try {
    const authenticatedChatReq = createJsonRequest("/api/sage/chat", {
      question: "¿Qué mod causó el crash?",
      personality: "standard",
      clientApiKey: sentinelGeminiKey,
    });
    const authenticatedChatRes = await sageChatPost(authenticatedChatReq);
    assert(authenticatedChatRes.status === 200, "Gemini-backed chat succeeds with mocked provider response");
    assert(authenticatedChatRes.body !== null, "Gemini-backed chat returns a readable response body");
    if (!authenticatedChatRes.body) throw new Error("Expected SAGE stream body");
    let streamedReply = "";
    await consumeSageStream(authenticatedChatRes.body, (event) => {
      if (event.type === "delta") streamedReply += event.text;
    });
    assert(streamedReply === "Respuesta de prueba", "Gemini-backed chat streams the provider text");
    assert(capturedGeminiUrl.includes(":streamGenerateContent?alt=sse"), "Gemini streaming endpoint is used");
    assert(!capturedGeminiUrl.includes(sentinelGeminiKey), "Gemini API key is never embedded in the request URL");
    assert(capturedGeminiHeaders.get("x-goog-api-key") === sentinelGeminiKey, "Gemini API key is sent through x-goog-api-key header");

    globalThis.fetch = (async () => new Response(
      `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: "Respuesta parcial" }] } }] })}\n\ndata: {malformed}\n\n`,
      { status: 200, headers: { "Content-Type": "text/event-stream" } },
    )) as typeof fetch;
    const interruptedChatRes = await sageChatPost(createJsonRequest("/api/sage/chat", {
      question: "¿Podés terminar el diagnóstico?",
      clientApiKey: sentinelGeminiKey,
    }));
    assert(interruptedChatRes.body !== null, "Interrupted provider stream still returns a readable contract stream");
    if (!interruptedChatRes.body) throw new Error("Expected interrupted SAGE stream body");
    let partialReply = "";
    let interruptedFailure: unknown;
    try {
      await consumeSageStream(interruptedChatRes.body, (event) => {
        if (event.type === "delta") partialReply += event.text;
      });
    } catch (error: unknown) {
      interruptedFailure = error;
    }
    assert(
      interruptedFailure instanceof SageStreamFailure && interruptedFailure.payload.retryable,
      "Interrupted provider stream emits a retryable typed failure",
    );
    assert(partialReply === "Respuesta parcial", "Partial text is delivered before a typed stream failure");

    globalThis.fetch = (async () => new Response(
      JSON.stringify({ error: { message: "RESOURCE_EXHAUSTED quota" } }),
      { status: 429, headers: { "Content-Type": "application/json" } },
    )) as typeof fetch;
    const limitedChatRes = await sageChatPost(createJsonRequest("/api/sage/chat", {
      question: "¿Qué ocurrió?",
      clientApiKey: sentinelGeminiKey,
    }));
    const limitedPayload: unknown = await limitedChatRes.json();
    assert(limitedChatRes.status === 429, "Provider quota exhaustion remains an HTTP 429 before streaming starts");
    assert(
      typeof limitedPayload === "object" &&
        limitedPayload !== null &&
        Reflect.get(limitedPayload, "code") === "MIM_PROVIDER_RATE_LIMIT",
      "Provider quota uses the typed SAGE error taxonomy",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 7. Path Containment Defense: /api/delete & /api/minecraft/delete
  // ─────────────────────────────────────────────────────────────────────────
  console.log(`\n${colors.bold}7. Endpoints: Path Containment Defense (/api/delete & /api/minecraft/delete)${colors.reset}`);

  // /api/delete tests
  const emptyDeleteReq = createJsonRequest("/api/delete", {});
  const emptyDeleteRes = await deletePost(emptyDeleteReq);
  assert(emptyDeleteRes.status === 400, "/api/delete rejects empty body with HTTP 400");

  const relativeDeleteReq = createJsonRequest("/api/delete", { path: "relative/traversal/mod.jar" });
  const relativeDeleteRes = await deletePost(relativeDeleteReq);
  assert(relativeDeleteRes.status === 400, "/api/delete rejects relative path with HTTP 400");

  const systemDeleteReq = createJsonRequest("/api/delete", { path: "C:\\Windows\\System32\\cmd.exe" });
  const systemDeleteRes = await deletePost(systemDeleteReq);
  assert(systemDeleteRes.status === 400, "/api/delete rejects path outside downloads with HTTP 400");

  const { downloadsPath, minecraftPath } = getSettings();
  const safeDownloadPath = path.join(downloadsPath, "safe-candidate-nonexistent.jar");
  const validDownloadReq = createJsonRequest("/api/delete", { path: safeDownloadPath });
  const validDownloadRes = await deletePost(validDownloadReq);
  assert(validDownloadRes.status === 200, "/api/delete allows safe path contained in downloads");

  // /api/minecraft/delete tests
  const emptyMcDeleteReq = createJsonRequest("/api/minecraft/delete", {});
  const emptyMcDeleteRes = await minecraftDeletePost(emptyMcDeleteReq);
  assert(emptyMcDeleteRes.status === 400, "/api/minecraft/delete rejects empty body with HTTP 400");

  const outsideMcDeleteReq = createJsonRequest("/api/minecraft/delete", { path: "C:\\Windows\\System32\\cmd.exe" });
  const outsideMcDeleteRes = await minecraftDeletePost(outsideMcDeleteReq);
  assert(outsideMcDeleteRes.status === 400, "/api/minecraft/delete rejects path outside minecraft with HTTP 400");

  const forbiddenDirReq = createJsonRequest("/api/minecraft/delete", { path: path.join(minecraftPath, "options.txt") });
  const forbiddenDirRes = await minecraftDeletePost(forbiddenDirReq);
  assert(forbiddenDirRes.status === 400, "/api/minecraft/delete rejects non-content minecraft files with HTTP 400");

  const safeModPath = path.join(minecraftPath, "mods", "safe-mod-nonexistent.jar");
  const validModDeleteReq = createJsonRequest("/api/minecraft/delete", { path: safeModPath });
  const validModDeleteRes = await minecraftDeletePost(validModDeleteReq);
  assert(validModDeleteRes.status === 200, "/api/minecraft/delete allows safe path contained in mods directory");

  console.log(`\n${colors.green}${colors.bold}✓ All Critical API integration & schema tests passed successfully!${colors.reset}\n`);
}

run().catch(err => {
  fail("Unhandled exception in Critical API tests", err);
});
