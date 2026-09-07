import * as crypto from "crypto";
import * as fs from "fs";
import { tmpdir } from "os";
import * as path from "path";
import { createBrowserCacheAdapter } from "../../lib/intelligence/sage/cacheBrowserAdapter";
import { createNodeCacheAdapter } from "../../lib/intelligence/sage/cacheNodeAdapter";
import { computeCrashSignature } from "../../lib/intelligence/sage/cacheEngine";
import type { BrowserStorageLike } from "../../lib/intelligence/sage/cacheAdapter";
import type { SageCacheEntry } from "../../lib/intelligence/sage/cacheTypes";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

class MemoryStorage implements BrowserStorageLike {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const entry: SageCacheEntry = {
  signature: "sig-runtime-test",
  timestamp: 1,
  loader: "fabric",
  mcVersion: "1.21.1",
  culprit: "example-mod",
  suspects: ["example-mod"],
  severity: "warning",
  summary: "Runtime adapter test",
  mimbotExplanation: "Runtime adapter test",
  personality: "standard",
  solutions: ["Inspect the mod"],
  actionableFixes: [],
  eliminationTree: [],
};

async function testBrowserAdapter(): Promise<void> {
  const storage = new MemoryStorage();
  const adapter = createBrowserCacheAdapter(storage, "sage-cache-test");

  const saved = await adapter.save({ [entry.signature]: entry });
  assert(saved[entry.signature]?.culprit === entry.culprit, "browser adapter must preserve saved entries");
  assert(adapter.load()[entry.signature]?.mcVersion === entry.mcVersion, "browser adapter must reload persisted entries");

  storage.setItem("sage-cache-test", "{ broken-json");
  assert(Object.keys(adapter.load()).length === 0, "browser adapter must recover from corrupt JSON");
}

async function testNodeAdapter(): Promise<void> {
  const root = fs.mkdtempSync(path.join(tmpdir(), "mim-sage-runtime-"));
  const adapter = createNodeCacheAdapter({ fs, path, crypto, cwd: () => root });
  const cacheFile = path.join(root, ".mim-index", "cache", "sage-cache.json");

  try {
    await adapter.save({ [entry.signature]: entry });
    assert(fs.existsSync(cacheFile), "node adapter must persist the cache on disk");
    assert(adapter.load()[entry.signature]?.culprit === entry.culprit, "node adapter must reload persisted entries");

    const tempFiles = fs.readdirSync(path.dirname(cacheFile)).filter((name) => name.includes(".tmp."));
    assert(tempFiles.length === 0, "atomic node writes must not leave temporary files behind");

    fs.writeFileSync(cacheFile, "{ broken-json", "utf-8");
    assert(Object.keys(adapter.load()).length === 0, "node adapter must recover from corrupt JSON");

    await adapter.save({ [entry.signature]: entry });
    const repaired = JSON.parse(fs.readFileSync(cacheFile, "utf-8")) as Record<string, SageCacheEntry>;
    assert(repaired[entry.signature]?.culprit === entry.culprit, "node adapter must repair corrupt persisted JSON");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

async function main(): Promise<void> {
  await testBrowserAdapter();
  await testNodeAdapter();

  const signature = computeCrashSignature("fabric", "1.21.1", "at Example.main(Example.java:42) 0x1234", ["Example"]);
  assert(/^[a-f0-9]{64}$/.test(signature), "public crash signatures must remain 64 lowercase hex characters");

  console.log("✓ SAGE cache Node/browser runtime adapters passed");
}

main().catch((error: unknown) => {
  console.error("SAGE cache runtime contract failed:", error);
  process.exit(1);
});
