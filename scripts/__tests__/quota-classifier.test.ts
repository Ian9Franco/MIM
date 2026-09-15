import {
  classifyProviderQuotaError,
  parseRetryAfterSeconds,
} from "../../lib/intelligence/ai/quotaClassifier";
import {
  getAiQuotaSnapshots,
  recordAiProviderRateLimit,
  recordAiProviderRequest,
  resetAiQuotaTrackerForTests,
} from "../../lib/intelligence/ai/quotaTracker";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
  console.log(`✓ ${message}`);
}

async function testClassifyRpm(): Promise<void> {
  const result = classifyProviderQuotaError(
    "RESOURCE_EXHAUSTED; retry in 12s — requests per minute",
    "gemini"
  );
  assert(result.kind === "rpm", "Detects RPM from explicit provider message");
  assert(result.retryAfterSeconds === 12, "Parses retry-after seconds");
  assert(result.userHint.includes("RPM"), "User hint mentions RPM");
}

async function testClassifyTpm(): Promise<void> {
  const result = classifyProviderQuotaError(
    "Rate limit exceeded: 250000 tokens per minute (TPM). try again in 5.8s",
    "gemini"
  );
  assert(result.kind === "tpm", "Detects TPM token limits");
  assert(result.retryAfterSeconds === 6, "Parses ceil of retry seconds");
  assert(result.userHint.includes("TPM"), "User hint mentions TPM");
}

async function testClassifyDaily(): Promise<void> {
  const geminiDaily = classifyProviderQuotaError(
    "Quota exceeded for quota metric 'GenerateContent requests per day' in FreeTier",
    "gemini"
  );
  assert(geminiDaily.kind === "daily", "Detects Gemini FreeTier daily quota");
  assert(geminiDaily.userHint.includes("diaria"), "User hint explains daily quota");

  const openRouterDaily = classifyProviderQuotaError(
    "Insufficient credits: Credits exhausted for your account",
    "openrouter"
  );
  assert(openRouterDaily.kind === "daily", "Detects OpenRouter credit/daily exhaustion");
}

async function testClassifyConcurrency(): Promise<void> {
  const result = classifyProviderQuotaError(
    "Too many concurrent requests in flight",
    "openrouter"
  );
  assert(result.kind === "concurrency", "Detects concurrency limits");
  assert(result.userHint.includes("simultáneas"), "User hint explains concurrency");
}

async function testTrackerRecordsRequests(): Promise<void> {
  resetAiQuotaTrackerForTests();
  recordAiProviderRequest("gemini");
  recordAiProviderRequest("gemini");
  const snapshots = getAiQuotaSnapshots();
  const gemini = snapshots.find((s) => s.provider === "gemini");
  assert(gemini?.requestsLastMinute === 2, "Tracks local request count per provider");
}

async function testTrackerRecordsRateLimitKind(): Promise<void> {
  resetAiQuotaTrackerForTests();
  recordAiProviderRateLimit("openrouter", "rate limit exceeded rpm");
  const openrouter = getAiQuotaSnapshots().find((s) => s.provider === "openrouter");
  assert(openrouter?.lastRateLimit?.kind === "rpm", "Stores classified rate-limit kind");
}

async function main(): Promise<void> {
  assert(parseRetryAfterSeconds("retry in 4.2s") === 5, "Parses fractional retry seconds");
  assert(parseRetryAfterSeconds("try again in 10s") === 10, "Parses try again in format");
  await testClassifyRpm();
  await testClassifyTpm();
  await testClassifyDaily();
  await testClassifyConcurrency();
  await testTrackerRecordsRequests();
  await testTrackerRecordsRateLimitKind();
  console.log("Quota classifier and tracker tests passed.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

