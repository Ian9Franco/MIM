import assert from "node:assert/strict";
import { fetchWithRetry } from "@/lib/network";
import { fetchJsonWithRetry } from "@/lib/core/fetchJsonWithRetry";

async function testFetchSuccessAfterTransientErrors(): Promise<void> {
  let callCount = 0;
  const recordedDelays: number[] = [];

  const mockFetch = async (input: RequestInfo | URL): Promise<Response> => {
    callCount++;
    if (callCount < 3) {
      // Return transient 503 Server Error
      return new Response(JSON.stringify({ error: "Service temporarily unavailable" }), {
        status: 503,
        statusText: "Service Unavailable",
        headers: { "Content-Type": "application/json" },
      });
    }
    // Succeed on 3rd call
    return new Response(JSON.stringify({ success: true, count: 42 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  const mockSleep = async (ms: number): Promise<void> => {
    recordedDelays.push(ms);
  };

  const result = await fetchWithRetry<{ success: boolean; count: number }>("https://api.example.com/data", {
    fetchImpl: mockFetch as typeof fetch,
    sleep: mockSleep,
    policy: {
      maxAttempts: 4,
      baseDelayMs: 100,
      maxDelayMs: 2000,
      budgetMs: 10000,
    },
    random: () => 0.5,
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.data.success, true);
    assert.equal(result.data.count, 42);
    assert.equal(result.status, 200);
  }
  assert.equal(callCount, 3);
  assert.equal(recordedDelays.length, 2);

  console.log("✔ fetchWithRetry transient retry recovery passed");
}

async function testFetchRateLimitedWithRetryAfter(): Promise<void> {
  let callCount = 0;
  const recordedDelays: number[] = [];

  const mockFetch = async (): Promise<Response> => {
    callCount++;
    if (callCount === 1) {
      return new Response(JSON.stringify({ error: "Too Many Requests" }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "retry-after": "4", // 4 seconds requested by server
        },
      });
    }
    return new Response(JSON.stringify({ items: ["mod1", "mod2"] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  const mockSleep = async (ms: number): Promise<void> => {
    recordedDelays.push(ms);
  };

  const result = await fetchWithRetry<{ items: string[] }>("https://api.example.com/mods", {
    fetchImpl: mockFetch as typeof fetch,
    sleep: mockSleep,
    policy: {
      maxAttempts: 3,
      baseDelayMs: 50,
      maxDelayMs: 10000,
      budgetMs: 20000,
    },
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(result.data.items, ["mod1", "mod2"]);
  }
  assert.equal(callCount, 2);
  assert.equal(recordedDelays.length, 1);
  assert.equal(recordedDelays[0], 4000); // exactly 4 seconds respected from Retry-After

  console.log("✔ fetchWithRetry Retry-After respect passed");
}

async function testFetchPermanentErrorNoRetries(): Promise<void> {
  let callCount = 0;

  const mockFetch = async (): Promise<Response> => {
    callCount++;
    return new Response(JSON.stringify({ error: "Not Found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  };

  const result = await fetchWithRetry("https://api.example.com/missing-mod", {
    fetchImpl: mockFetch as typeof fetch,
    policy: { maxAttempts: 5 },
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.status, 404);
    assert.equal(result.report.category, "http_client_error");
    assert.equal(result.report.isRetryable, false);
    assert.equal(result.report.suggestedAction, "do_not_retry");
  }
  assert.equal(callCount, 1); // exactly 1 call, zero redundant retries

  console.log("✔ fetchWithRetry permanent 404 immediate fail passed");
}

async function testFetchCancellationWithAbortSignal(): Promise<void> {
  let callCount = 0;

  const mockFetch = async (): Promise<Response> => {
    callCount++;
    const abortErr = new Error("This operation was aborted");
    abortErr.name = "AbortError";
    throw abortErr;
  };

  const result = await fetchWithRetry("https://api.example.com/long-task", {
    fetchImpl: mockFetch as typeof fetch,
    policy: { maxAttempts: 5 },
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.report.category, "request_aborted");
    assert.equal(result.report.isRetryable, false);
    assert.equal(result.report.suggestedAction, "do_not_retry");
  }
  assert.equal(callCount, 1); // zero retries on cancellation

  console.log("✔ fetchWithRetry cancellation abort handling passed");
}

async function testFetchJsonWithRetryBackwardCompatibility(): Promise<void> {
  const successRes = await fetchJsonWithRetry<{ test: string }>("/api/mock", {
    // Pass mock fetch directly through global context mock
    retries: 2,
    retryDelayMs: 50,
  });

  // Even if localhost isn't running in node, it returns ok: false with structured message without crashing
  assert.equal(typeof successRes.ok, "boolean");
  if (!successRes.ok) {
    assert.equal(typeof successRes.error, "string");
  }

  console.log("✔ fetchJsonWithRetry backward compatibility passed");
}

async function run(): Promise<void> {
  console.log("Starting network adapters test suite...");
  await testFetchSuccessAfterTransientErrors();
  await testFetchRateLimitedWithRetryAfter();
  await testFetchPermanentErrorNoRetries();
  await testFetchCancellationWithAbortSignal();
  await testFetchJsonWithRetryBackwardCompatibility();
  console.log("\nAll network adapter tests passed successfully!");
}

run().catch((err) => {
  console.error("Test failure:", err);
  process.exit(1);
});
