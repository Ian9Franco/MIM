import assert from "node:assert/strict";
import { fetchOpenRouterAccountSnapshot } from "../../lib/intelligence/ai/openRouterAccount";

async function main() {
  const empty = await fetchOpenRouterAccountSnapshot("");
  assert.equal(empty.configured, false);
  assert.ok(empty.fetchedAt);

  const whitespace = await fetchOpenRouterAccountSnapshot("   ");
  assert.equal(whitespace.configured, false);

  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response("Unauthorized", { status: 401 });
    const unauthorized = await fetchOpenRouterAccountSnapshot("sk-invalid");
    assert.equal(unauthorized.configured, true);
    assert.match(unauthorized.error ?? "", /401/);

    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          data: {
            label: "MIM Desktop",
            usage: 1.25,
            limit: 10,
            is_free_tier: true,
            rate_limit: { requests: 20, interval: "1m" },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    const snapshot = await fetchOpenRouterAccountSnapshot("sk-test");
    assert.equal(snapshot.configured, true);
    assert.equal(snapshot.label, "MIM Desktop");
    assert.equal(snapshot.usageUsd, 1.25);
    assert.equal(snapshot.limitUsd, 10);
    assert.equal(snapshot.isFreeTier, true);
    assert.equal(snapshot.rateLimitRequests, 20);
    assert.equal(snapshot.rateLimitInterval, "1m");
  } finally {
    globalThis.fetch = originalFetch;
  }

  console.log("OpenRouter account snapshot suite passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
