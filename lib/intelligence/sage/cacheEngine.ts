/**
 * SAGE 3.0 Local Cache & Deduplication Engine
 *
 * Owns the public cache API and runtime selection. Persistence details live in
 * dedicated Node/browser adapters so client bundles never need static Node
 * built-in imports and the engine no longer relies on eval("require").
 */

import type { SageCacheAdapter } from "./cacheAdapter";
import { createBrowserCacheAdapter } from "./cacheBrowserAdapter";
import { createNodeCacheAdapter } from "./cacheNodeAdapter";
import type { SageCacheEntry, SageCacheStore } from "./cacheTypes";

export type {
  SageActionableItem,
  SageCacheEntry,
  SageCacheStore,
  SageEliminationCandidate,
} from "./cacheTypes";

const LOCAL_STORAGE_KEY = "mim_sage_cache_store";
let inMemoryCache: SageCacheStore | null = null;
let writeQueue: Promise<void> = Promise.resolve();
let runtimeAdapter: SageCacheAdapter | null | undefined;

function getNodeCrypto(): Pick<typeof import("crypto"), "createHash"> | null {
  if (
    typeof window !== "undefined" ||
    typeof process === "undefined" ||
    typeof process.getBuiltinModule !== "function"
  ) {
    return null;
  }
  return process.getBuiltinModule("crypto") ?? null;
}

function resolveRuntimeAdapter(): SageCacheAdapter | null {
  if (runtimeAdapter !== undefined) return runtimeAdapter;

  if (typeof window !== "undefined") {
    try {
      runtimeAdapter = window.localStorage
        ? createBrowserCacheAdapter(window.localStorage, LOCAL_STORAGE_KEY)
        : null;
    } catch {
      runtimeAdapter = null;
    }
    return runtimeAdapter;
  }

  if (typeof process === "undefined" || typeof process.getBuiltinModule !== "function") {
    runtimeAdapter = null;
    return runtimeAdapter;
  }

  const fs = process.getBuiltinModule("fs");
  const path = process.getBuiltinModule("path");
  const crypto = process.getBuiltinModule("crypto");

  runtimeAdapter = fs && path && crypto
    ? createNodeCacheAdapter({ fs, path, crypto, cwd: () => process.cwd() })
    : null;

  return runtimeAdapter;
}

/**
 * Computes a deterministic 64-char SHA-256 signature for a crash report in
 * Node. Browser clients retain the existing deterministic 64-char fallback.
 */
export function computeCrashSignature(
  loader: string,
  mcVersion: string,
  stackTraceSnippet: string,
  suspects: string[] = []
): string {
  const normLoader = (loader || "unknown").toLowerCase().trim();
  const normVersion = (mcVersion || "unknown").toLowerCase().trim();

  const cleanSnippet = (stackTraceSnippet || "")
    .replace(/0x[0-9a-fA-F]+/g, "")
    .replace(/:\d+\)/g, ")")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim()
    .slice(0, 1000);

  const sortedSuspects = [...suspects]
    .map((suspect) => suspect.toLowerCase().trim())
    .sort()
    .join(",");

  const payload = `${normLoader}|${normVersion}|${sortedSuspects}|${cleanSnippet}`;
  const nodeCrypto = getNodeCrypto();

  if (nodeCrypto) {
    return nodeCrypto.createHash("sha256").update(payload).digest("hex");
  }

  let h1 = 0xdeadbeef;
  let h2 = 0x41c64e6d;
  for (let index = 0; index < payload.length; index += 1) {
    const ch = payload.charCodeAt(index);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const p1 = (h1 >>> 0).toString(16).padStart(8, "0");
  const p2 = (h2 >>> 0).toString(16).padStart(8, "0");
  return (p1 + p2).repeat(4).slice(0, 64);
}

/** Loads the local cache from the selected runtime adapter. */
export function loadSageCache(): SageCacheStore {
  if (inMemoryCache !== null) return inMemoryCache;

  const adapter = resolveRuntimeAdapter();
  inMemoryCache = adapter?.load() ?? {};
  return inMemoryCache;
}

/** Retrieves a cached diagnosis by its deterministic signature. */
export function getCachedDiagnosis(signature: string): SageCacheEntry | null {
  const store = loadSageCache();
  return store[signature] || null;
}

/** Atomically saves a diagnosis entry to the selected runtime cache. */
export function saveSageCacheEntry(entry: SageCacheEntry): Promise<void> {
  const current = loadSageCache();
  current[entry.signature] = entry;
  inMemoryCache = current;

  const adapter = resolveRuntimeAdapter();
  if (!adapter) return Promise.resolve();

  if (typeof window !== "undefined") {
    return adapter.save(current).then((saved) => {
      inMemoryCache = saved;
    });
  }

  writeQueue = writeQueue.then(async () => {
    const latest = inMemoryCache ?? {};
    inMemoryCache = await adapter.save(latest);
  });

  return writeQueue;
}

/** Clears the in-memory cache mirror (useful for isolated unit tests). */
export function _resetInMemoryCacheForTests(): void {
  inMemoryCache = null;
}
