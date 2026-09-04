/**
 * SAGE 3.0 Local Cache & Deduplication Engine
 * 
 * Provides deterministic cryptographic signature calculation for crash reports
 * and manages atomic local persistence in `.mim-index/cache/sage-cache.json`.
 * Features in-memory caching, FIFO promise-based disk write serialization,
 * and Windows EBUSY/EPERM retry loops with graceful fallbacks.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

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

const CACHE_FILE = path.join(process.cwd(), ".mim-index", "cache", "sage-cache.json");

let inMemoryCache: SageCacheStore | null = null;
let writeQueue: Promise<void> = Promise.resolve();

/**
 * Computes a deterministic SHA-256 signature for a crash report.
 * Normalizes stack trace, suspects, and environmental parameters to avoid spurious cache misses.
 */
export function computeCrashSignature(
  loader: string,
  mcVersion: string,
  stackTraceSnippet: string,
  suspects: string[] = []
): string {
  const normLoader = (loader || "unknown").toLowerCase().trim();
  const normVersion = (mcVersion || "unknown").toLowerCase().trim();
  
  // Clean stack trace: remove line numbers and memory addresses that vary between executions
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
  return crypto.createHash("sha256").update(payload).digest("hex");
}

/**
 * Loads the local cache from disk with fallback to memory cache.
 */
export function loadSageCache(): SageCacheStore {
  if (inMemoryCache !== null) {
    return inMemoryCache;
  }

  if (fs.existsSync(CACHE_FILE)) {
    try {
      const raw = fs.readFileSync(CACHE_FILE, "utf-8");
      inMemoryCache = JSON.parse(raw) as SageCacheStore;
      return inMemoryCache || {};
    } catch (err) {
      console.warn("[/lib/intelligence/sage/cacheEngine] Corrupted cache file, starting with empty store:", err);
      inMemoryCache = {};
      return inMemoryCache;
    }
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
 * Atomically saves a diagnosis entry to the local cache on disk.
 */
export function saveSageCacheEntry(entry: SageCacheEntry): Promise<void> {
  const current = loadSageCache();
  current[entry.signature] = entry;
  inMemoryCache = current;

  writeQueue = writeQueue.then(async () => {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    let diskData: SageCacheStore = {};
    if (fs.existsSync(CACHE_FILE)) {
      try {
        diskData = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8")) as SageCacheStore;
      } catch (err) {
        console.warn("[/lib/intelligence/sage/cacheEngine] Failed to parse disk cache during merge:", err);
      }
    }

    const merged: SageCacheStore = { ...diskData, ...inMemoryCache };
    inMemoryCache = merged;

    const tempFile = `${CACHE_FILE}.tmp.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}`;
    const payload = JSON.stringify(merged, null, 2);

    try {
      fs.writeFileSync(tempFile, payload, "utf-8");

      // Windows-resilient atomic rename loop
      let renamed = false;
      let attempts = 0;
      while (!renamed && attempts < 5) {
        try {
          fs.renameSync(tempFile, CACHE_FILE);
          renamed = true;
        } catch (renameErr: any) {
          attempts++;
          if (renameErr.code === "EBUSY" || renameErr.code === "EPERM") {
            await new Promise((r) => setTimeout(r, 20 * attempts));
          } else {
            throw renameErr;
          }
        }
      }

      if (!renamed) {
        // Fallback: copy and unlink
        fs.copyFileSync(tempFile, CACHE_FILE);
        try { fs.unlinkSync(tempFile); } catch {}
      }
    } catch (err) {
      console.error("[/lib/intelligence/sage/cacheEngine] Failed atomic cache write:", err);
      if (fs.existsSync(tempFile)) {
        try { fs.unlinkSync(tempFile); } catch {}
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
