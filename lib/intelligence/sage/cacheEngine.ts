/**
 * SAGE 3.0 Local Cache & Deduplication Engine
 * 
 * Isomorphic cache: runs seamlessly in both Node.js (disk persistence with atomic
 * rename and retry backoff) and Browser / Electron renderer (localStorage persistence),
 * preventing bundlers (Turbopack) from failing on client-side imports.
 */

export interface SageActionableItem {
  id: string;
  label: string;
  action: "disable_mod" | "update_mod" | "install_dependency" | "optimize_jvm";
  modId?: string;
  targetFile?: string;
  url?: string;
}

export interface SageEliminationCandidate {
  modId: string;
  confidence: number;
  reason: string;
  hasDirectMixinCollision: boolean;
  isMissingDependency: boolean;
}

export interface SageCacheEntry {
  signature: string;
  timestamp: number;
  loader: string;
  mcVersion: string;
  culprit: string;
  suspects: string[];
  severity: "critical" | "warning" | "info";
  summary: string;
  mimbotExplanation: string;
  personality: "bully" | "standard";
  solutions: string[];
  actionableFixes: SageActionableItem[];
  eliminationTree: SageEliminationCandidate[];
  sources?: string[];
}

export type SageCacheStore = Record<string, SageCacheEntry>;

type NodeFs = typeof import("fs");
type NodePath = typeof import("path");
type NodeCrypto = typeof import("crypto");

// Dynamic Node loader to keep frontend bundlers clean
let nodeFs: NodeFs | null = null;
let nodePath: NodePath | null = null;
let nodeCrypto: NodeCrypto | null = null;

if (typeof window === "undefined") {
  try {
    nodeFs = eval("require")("fs");
    nodePath = eval("require")("path");
    nodeCrypto = eval("require")("crypto");
  } catch {}
}

const LOCAL_STORAGE_KEY = "mim_sage_cache_store";
let inMemoryCache: SageCacheStore | null = null;
let writeQueue: Promise<void> = Promise.resolve();

function getDiskCachePath(): string {
  if (!nodePath) return "";
  return nodePath.join(process.cwd(), ".mim-index", "cache", "sage-cache.json");
}

/**
 * Computes a deterministic 64-char SHA-256 signature for a crash report.
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
    .map((s) => s.toLowerCase().trim())
    .sort()
    .join(",");

  const payload = `${normLoader}|${normVersion}|${sortedSuspects}|${cleanSnippet}`;

  if (nodeCrypto) {
    return nodeCrypto.createHash("sha256").update(payload).digest("hex");
  }

  // Deterministic 64-character hash for browser client environments
  let h1 = 0xdeadbeef;
  let h2 = 0x41c64e6d;
  for (let i = 0; i < payload.length; i++) {
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

/**
 * Loads the local cache from disk (Node) or localStorage (Browser).
 */
export function loadSageCache(): SageCacheStore {
  if (inMemoryCache !== null) {
    return inMemoryCache;
  }

  // Node runtime: load from disk
  if (nodeFs && nodePath) {
    const cacheFile = getDiskCachePath();
    if (nodeFs.existsSync(cacheFile)) {
      try {
        const raw = nodeFs.readFileSync(cacheFile, "utf-8");
        inMemoryCache = JSON.parse(raw) as SageCacheStore;
        return inMemoryCache || {};
      } catch (err) {
        console.warn("[/lib/intelligence/sage/cacheEngine] Corrupted disk cache, starting empty:", err);
      }
    }
  } else if (typeof window !== "undefined" && window.localStorage) {
    // Browser runtime: load from localStorage
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        inMemoryCache = JSON.parse(raw) as SageCacheStore;
        return inMemoryCache || {};
      }
    } catch {}
  }

  inMemoryCache = {};
  return inMemoryCache;
}

/**
 * Retrieves a cached diagnosis by its cryptographic signature.
 */
export function getCachedDiagnosis(signature: string): SageCacheEntry | null {
  const store = loadSageCache();
  return store[signature] || null;
}

/**
 * Atomically saves a diagnosis entry to the local cache.
 */
export function saveSageCacheEntry(entry: SageCacheEntry): Promise<void> {
  const current = loadSageCache();
  current[entry.signature] = entry;
  inMemoryCache = current;

  // Browser: synchronous localStorage persist
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(current));
    } catch {}
    return Promise.resolve();
  }

  // Node runtime: atomic disk persist
  writeQueue = writeQueue.then(async () => {
    if (!nodeFs || !nodePath) return;

    const cacheFile = getDiskCachePath();
    const dir = nodePath.dirname(cacheFile);
    if (!nodeFs.existsSync(dir)) {
      nodeFs.mkdirSync(dir, { recursive: true });
    }

    let diskData: SageCacheStore = {};
    if (nodeFs.existsSync(cacheFile)) {
      try {
        diskData = JSON.parse(nodeFs.readFileSync(cacheFile, "utf-8")) as SageCacheStore;
      } catch (err) {
        console.warn("[/lib/intelligence/sage/cacheEngine] Failed to parse disk cache during merge:", err);
      }
    }

    const merged: SageCacheStore = { ...diskData, ...inMemoryCache };
    inMemoryCache = merged;

    const tempFile = `${cacheFile}.tmp.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}`;
    const payload = JSON.stringify(merged, null, 2);

    try {
      nodeFs.writeFileSync(tempFile, payload, "utf-8");

      let renamed = false;
      let attempts = 0;
      while (!renamed && attempts < 5) {
        try {
          nodeFs.renameSync(tempFile, cacheFile);
          renamed = true;
        } catch (renameErr: unknown) {
          attempts++;
          const errCode = (renameErr as { code?: string })?.code;
          if (errCode === "EBUSY" || errCode === "EPERM") {
            await new Promise((r) => setTimeout(r, 20 * attempts));
          } else {
            throw renameErr;
          }
        }
      }

      if (!renamed) {
        nodeFs.copyFileSync(tempFile, cacheFile);
        try { nodeFs.unlinkSync(tempFile); } catch {}
      }
    } catch (err) {
      console.error("[/lib/intelligence/sage/cacheEngine] Failed atomic cache write:", err);
      if (nodeFs.existsSync(tempFile)) {
        try { nodeFs.unlinkSync(tempFile); } catch {}
      }
    }
  });

  return writeQueue;
}

/**
 * Clears the in-memory cache mirror (useful for isolated unit tests).
 */
export function _resetInMemoryCacheForTests(): void {
  inMemoryCache = null;
}
