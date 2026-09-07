import type { SageCacheAdapter } from "./cacheAdapter";
import { parseSageCacheStore } from "./cacheAdapter";
import type { SageCacheStore } from "./cacheTypes";

type NodeFs = Pick<
  typeof import("fs"),
  "copyFileSync" | "existsSync" | "mkdirSync" | "readFileSync" | "renameSync" | "unlinkSync" | "writeFileSync"
>;
type NodePath = Pick<typeof import("path"), "dirname" | "join">;
type NodeCrypto = Pick<typeof import("crypto"), "randomUUID">;

export interface NodeCacheDependencies {
  fs: NodeFs;
  path: NodePath;
  crypto: NodeCrypto;
  cwd(): string;
}

function errorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
}

export function createNodeCacheAdapter(deps: NodeCacheDependencies): SageCacheAdapter {
  const cacheFile = () => deps.path.join(deps.cwd(), ".mim-index", "cache", "sage-cache.json");

  const read = (warnLabel: string): SageCacheStore => {
    const file = cacheFile();
    if (!deps.fs.existsSync(file)) return {};
    try {
      return parseSageCacheStore(deps.fs.readFileSync(file, "utf-8"));
    } catch (error) {
      console.warn(`[/lib/intelligence/sage/cacheEngine] ${warnLabel}:`, error);
      return {};
    }
  };

  return {
    load(): SageCacheStore {
      return read("Corrupted disk cache, starting empty");
    },

    async save(store: SageCacheStore): Promise<SageCacheStore> {
      const file = cacheFile();
      const dir = deps.path.dirname(file);
      if (!deps.fs.existsSync(dir)) {
        deps.fs.mkdirSync(dir, { recursive: true });
      }

      const diskData = read("Failed to parse disk cache during merge");
      const merged: SageCacheStore = { ...diskData, ...store };
      const tempFile = `${file}.tmp.${deps.crypto.randomUUID()}`;
      const payload = JSON.stringify(merged, null, 2);

      try {
        deps.fs.writeFileSync(tempFile, payload, "utf-8");

        let renamed = false;
        for (let attempt = 1; !renamed && attempt <= 5; attempt += 1) {
          try {
            deps.fs.renameSync(tempFile, file);
            renamed = true;
          } catch (error: unknown) {
            const code = errorCode(error);
            if (code === "EBUSY" || code === "EPERM") {
              await new Promise((resolve) => setTimeout(resolve, 20 * attempt));
            } else {
              throw error;
            }
          }
        }

        if (!renamed) {
          deps.fs.copyFileSync(tempFile, file);
          try {
            deps.fs.unlinkSync(tempFile);
          } catch {}
        }
      } catch (error) {
        console.error("[/lib/intelligence/sage/cacheEngine] Failed atomic cache write:", error);
        if (deps.fs.existsSync(tempFile)) {
          try {
            deps.fs.unlinkSync(tempFile);
          } catch {}
        }
      }

      return merged;
    },
  };
}
