import type { BrowserStorageLike, SageCacheAdapter } from "./cacheAdapter";
import { parseSageCacheStore } from "./cacheAdapter";
import type { SageCacheStore } from "./cacheTypes";

export function createBrowserCacheAdapter(
  storage: BrowserStorageLike,
  storageKey: string
): SageCacheAdapter {
  return {
    load(): SageCacheStore {
      try {
        const raw = storage.getItem(storageKey);
        return raw ? parseSageCacheStore(raw) : {};
      } catch (error) {
        console.warn("[/lib/intelligence/sage/cacheEngine] Corrupted browser cache, starting empty:", error);
        return {};
      }
    },

    async save(store: SageCacheStore): Promise<SageCacheStore> {
      try {
        storage.setItem(storageKey, JSON.stringify(store));
      } catch (error) {
        console.warn("[/lib/intelligence/sage/cacheEngine] Failed browser cache write:", error);
      }
      return store;
    },
  };
}
