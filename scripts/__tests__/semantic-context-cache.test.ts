import {
  computeContextHash,
  getCachedSemanticResponse,
  saveSemanticResponse,
  _resetSemanticCacheForTests,
} from "../../lib/intelligence/semanticCache";
import { runSageChat } from "../../lib/intelligence/sage/sageChatEngine";
import { explainModDependencies } from "../../lib/intelligence/dependencyExplain";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
  console.log(`✓ ${message}`);
}

async function testDeterministicHash(): Promise<void> {
  const hash1 = computeContextHash(
    "sage-chat",
    "crash",
    { loader: "fabric", gameVersion: "1.20.1", category: "mixin" },
    "Why did it crash?",
    "bully"
  );
  const hash2 = computeContextHash(
    "sage-chat",
    "crash",
    { loader: "fabric", gameVersion: "1.20.1", category: "mixin" },
    "Why did it crash?",
    "bully"
  );
  const hashDifferent = computeContextHash(
    "sage-chat",
    "crash",
    { loader: "forge", gameVersion: "1.20.1", category: "mixin" },
    "Why did it crash?",
    "bully"
  );

  assert(hash1.length === 64, "Generates 64-character SHA-256 hash");
  assert(hash1 === hash2, "Identical context payloads produce identical hash");
  assert(hash1 !== hashDifferent, "Different context payloads produce different hash");
}

async function testCacheSaveAndRetrieve(): Promise<void> {
  _resetSemanticCacheForTests();
  const hash = "test-hash-1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab";

  assert(getCachedSemanticResponse(hash) === null, "Initial cache lookup returns null");

  await saveSemanticResponse({
    hash,
    text: "MIM-Bot cached response text",
    model: "mock-model",
    provider: "mock-provider",
    intent: "sage-chat",
  });

  const cached = getCachedSemanticResponse(hash);
  assert(cached !== null, "Retrieves saved cache entry");
  assert(cached?.text === "MIM-Bot cached response text", "Cache stores response text accurately");
  assert(cached?.model === "mock-model", "Cache stores model identifier");
}

async function testCacheTtlExpiration(): Promise<void> {
  _resetSemanticCacheForTests();
  const hash = "expired-hash-1234567890abcdef1234567890abcdef1234567890abcdef12345678";

  await saveSemanticResponse({
    hash,
    text: "Expiring text",
    model: "mock-model",
    provider: "mock-provider",
    ttlMs: -1000, // already expired
  });

  const cached = getCachedSemanticResponse(hash);
  assert(cached === null, "Expired cache entries are not returned");
}

async function testSageEngineCacheHit(): Promise<void> {
  _resetSemanticCacheForTests();
  const crashContext = {
    loader: "fabric",
    gameVersion: "1.20.1",
    category: "MISSING_DEPENDENCY",
    explanation: "Missing cloth-config",
  };
  const question = "How to fix this missing dependency?";
  const personality = "standard" as const;

  const hash = computeContextHash("sage-chat", "crash", crashContext, question, personality);
  await saveSemanticResponse({
    hash,
    text: JSON.stringify({
      answer: "Install Cloth Config API to fix the missing dependency.",
      evidenceRefs: ["category", "explanation"],
      culpritClaims: [],
      actions: ["install cloth-config"],
    }),
    model: "glm-mock",
    provider: "openrouter",
  });

  // Call runSageChat without any real API key; should hit cache directly with 0 ms
  const result = await runSageChat({
    question,
    personality,
    crashContext,
    gatewayKeys: {},
  });

  assert(result.routeReason === "semantic-cache-hit", "Returns semantic-cache-hit route reason");
  assert(result.model.includes("cache"), "Marks model as cache");
  assert(result.text.includes("Cloth Config"), "Returns cached text through guardrails");
}

async function testDependencyExplainCacheHit(): Promise<void> {
  _resetSemanticCacheForTests();
  const deps = [
    { modId: "cloth-config", name: "Cloth Config", status: "missing" as const },
  ];
  const modId = "ad_astra";
  const modName = "Ad Astra";
  const personality = "standard" as const;

  const hash = computeContextHash(
    "dependency-explain",
    "dependencies",
    deps,
    modId,
    personality,
    "fabric"
  );

  await saveSemanticResponse({
    hash,
    text: JSON.stringify({
      summary: "Ad Astra requiere Cloth Config para funcionar.",
      severity: "critical",
      actions: [
        { type: "install", modId: "cloth-config", modName: "Cloth Config", label: "Instalar Cloth Config" },
      ],
    }),
    model: "glm-mock",
    provider: "openrouter",
  });

  const result = await explainModDependencies({
    modId,
    modName,
    dependencies: deps,
    loader: "fabric",
    personality,
    gatewayKeys: {},
  });

  assert(result.fallback === false, "Not a fallback response");
  assert(result.model.includes("cache"), "Identified as cached result");
  assert(result.structured?.actions[0].modId === "cloth-config", "Parsed structured actions from cache");
}

async function main(): Promise<void> {
  await testDeterministicHash();
  await testCacheSaveAndRetrieve();
  await testCacheTtlExpiration();
  await testSageEngineCacheHit();
  await testDependencyExplainCacheHit();
  console.log("All semantic context cache tests passed.");
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
