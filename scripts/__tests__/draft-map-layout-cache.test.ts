import test from "node:test";
import assert from "node:assert/strict";
import {
  draftMapLayoutCacheKey,
  resolveSessionMapLayout,
  writeDraftMapLayoutCache,
} from "../../lib/fomo/draftMapLayoutCache";

test("resolveSessionMapLayout uses server map_layout, not session overlay", () => {
  const draftId = "draft-test-1";
  const storage = new Map<string, string>();
  const sessionStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
  };
  const original = globalThis.sessionStorage;
  Object.defineProperty(globalThis, "sessionStorage", { value: sessionStorage, configurable: true });

  writeDraftMapLayoutCache(draftId, {
    categories: {},
    labels: { "both:custom": "Solo en este navegador" },
    children: [{ id: "both:custom", parent: "both", label: "Solo en este navegador", slug: "custom" }],
    itemOrder: {},
  });

  const remote = {
    labels: { "both:custom": "Desde servidor" },
    children: [{ id: "both:custom", parent: "both", label: "Desde servidor", slug: "custom" }],
  };
  const resolved = resolveSessionMapLayout(remote, draftId);
  assert.equal(resolved.labels["both:custom"], "Desde servidor");
  assert.equal(draftMapLayoutCacheKey(draftId), "mim:draft-map:draft-test-1");

  if (original) Object.defineProperty(globalThis, "sessionStorage", { value: original, configurable: true });
});
