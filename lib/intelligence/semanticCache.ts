/**
 * MIM Intelligence — Semantic Context Caching Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Computes deterministic SHA-256 signatures over context packages and prompts.
 * Provides fast 0 ms responses for identical context + query pairs, preventing
 * redundant token consumption and protecting provider quota limits (RPM/RPD).
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface SemanticCacheEntry {
  hash: string;
  text: string;
  model: string;
  provider: string;
  intent?: string;
  timestamp: number;
  expiresAt: number;
}

export type SemanticCacheStore = Record<string, SemanticCacheEntry>;

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const LOCAL_STORAGE_KEY = "mim_semantic_cache_store";

let inMemoryStore: SemanticCacheStore | null = null;
let writeQueue: Promise<void> = Promise.resolve();

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

/**
 * Computes a deterministic SHA-256 signature from arbitrary structured context.
 */
export function computeContextHash(
  intent: string,
  domain: string,
  evidenceOrPrompt: string | Record<string, unknown> | unknown[],
  question = "",
  personality = "",
  targetModel = ""
): string {
  const normIntent = (intent || "default").toLowerCase().trim();
  const normDomain = (domain || "general").toLowerCase().trim();
  const normQuestion = (question || "").toLowerCase().trim();
  const normPersonality = (personality || "standard").toLowerCase().trim();
  const normModel = (targetModel || "default").toLowerCase().trim();

  let serializedEvidence = "";
  if (typeof evidenceOrPrompt === "string") {
    serializedEvidence = evidenceOrPrompt.trim();
  } else {
    try {
      serializedEvidence = JSON.stringify(evidenceOrPrompt);
    } catch {
      serializedEvidence = String(evidenceOrPrompt);
    }
  }

  const payload = `${normIntent}|${normDomain}|${normPersonality}|${normModel}|${normQuestion}|${serializedEvidence}`;
  const nodeCrypto = getNodeCrypto();

  if (nodeCrypto) {
    return nodeCrypto.createHash("sha256").update(payload).digest("hex");
  }

  // Fallback 64-char deterministic hash for browser environments
  let h1 = 0xdeadbeef;
  let h2 = 0x41c64e6d;
  for (let i = 0; i < payload.length; i += 1) {
    const ch = payload.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const p1 = (h1 >>> 0).toString(16).padStart(8, "0");
  const p2 = (h2 >>> 0).toString(16).padStart(8, "0");
  return (p1 + p2).repeat(4).slice(0, 64);
}

function loadStore(): SemanticCacheStore {
  if (inMemoryStore !== null) return inMemoryStore;

  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage?.getItem(LOCAL_STORAGE_KEY);
      inMemoryStore = raw ? JSON.parse(raw) : {};
    } catch {
      inMemoryStore = {};
    }
    return inMemoryStore || {};
  }

  if (typeof process !== "undefined" && typeof process.getBuiltinModule === "function") {
    const fs = process.getBuiltinModule("fs");
    const path = process.getBuiltinModule("path");
    if (fs && path) {
      try {
        const { getMimIndexPath } = require("../core/settings");
        const filePath = path.join(getMimIndexPath(), "cache", "semantic-cache.json");
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, "utf-8");
          inMemoryStore = JSON.parse(content);
          return inMemoryStore || {};
        }
      } catch {
        // Fall back to empty store
      }
    }
  }

  inMemoryStore = {};
  return inMemoryStore;
}

function persistStore(store: SemanticCacheStore): Promise<void> {
  if (typeof window !== "undefined") {
    try {
      window.localStorage?.setItem(LOCAL_STORAGE_KEY, JSON.stringify(store));
    } catch {
      // Best-effort storage
    }
    return Promise.resolve();
  }

  if (typeof process !== "undefined" && typeof process.getBuiltinModule === "function") {
    const fs = process.getBuiltinModule("fs");
    const path = process.getBuiltinModule("path");
    if (fs && path) {
      writeQueue = writeQueue.then(async () => {
        try {
          const { getMimIndexPath } = require("../core/settings");
          const filePath = path.join(getMimIndexPath(), "cache", "semantic-cache.json");
          const dir = path.dirname(filePath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          fs.writeFileSync(filePath, JSON.stringify(store, null, 2), "utf-8");
        } catch {
          // Best-effort persistence
        }
      });
      return writeQueue;
    }
  }

  return Promise.resolve();
}

/**
 * Retrieves a cached semantic response if present and unexpired.
 */
export function getCachedSemanticResponse(hash: string): SemanticCacheEntry | null {
  if (!hash) return null;
  const store = loadStore();
  const entry = store[hash];
  if (!entry) return null;

  const now = Date.now();
  if (entry.expiresAt && entry.expiresAt <= now) {
    delete store[hash];
    void persistStore(store);
    return null;
  }

  return entry;
}

/**
 * Saves a semantic response into the cache store.
 */
export async function saveSemanticResponse(params: {
  hash: string;
  text: string;
  model: string;
  provider: string;
  intent?: string;
  ttlMs?: number;
}): Promise<SemanticCacheEntry> {
  const store = loadStore();
  const now = Date.now();
  const ttl = params.ttlMs ?? DEFAULT_TTL_MS;

  const entry: SemanticCacheEntry = {
    hash: params.hash,
    text: params.text,
    model: params.model,
    provider: params.provider,
    intent: params.intent,
    timestamp: now,
    expiresAt: now + ttl,
  };

  store[params.hash] = entry;
  inMemoryStore = store;
  await persistStore(store);
  return entry;
}

/**
 * Clears the in-memory semantic cache (for testing/cleanup).
 */
export function _resetSemanticCacheForTests(): void {
  inMemoryStore = {};
}
