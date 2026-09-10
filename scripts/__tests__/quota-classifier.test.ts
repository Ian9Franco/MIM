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
}

async function testClassifyDaily(): Promise<void> {
  const result = classifyProviderQuotaError("Quota exceeded for quota metric per day", "gemini");
  assert(result.kind === "daily", "Detects daily quota separately from generic 429");
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
  await testClassifyRpm();
  await testClassifyDaily();
  await testTrackerRecordsRequests();
  await testTrackerRecordsRateLimitKind();
  console.log("Quota classifier and tracker tests passed.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
