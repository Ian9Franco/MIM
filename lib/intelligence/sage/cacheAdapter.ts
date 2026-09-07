import type { SageCacheStore } from "./cacheTypes";

export interface SageCacheAdapter {
  load(): SageCacheStore;
  save(store: SageCacheStore): Promise<SageCacheStore>;
}

export interface BrowserStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function parseSageCacheStore(raw: string): SageCacheStore {
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return {};
  }
  return parsed as SageCacheStore;
}
