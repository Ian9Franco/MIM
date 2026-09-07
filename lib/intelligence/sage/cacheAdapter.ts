import type { SageCacheStore } from "./cacheTypes";

export interface SageCacheAdapter {
  load(): SageCacheStore;
  save(store: SageCacheStore): Promise<SageCacheStore>;
}

export interface BrowserStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
