import { parseMapLayout, type DraftMapLayout } from "./draftMapLayout";

const KEY_PREFIX = "mim:draft-map:";

export type DraftMapLayoutCacheEntry = {
  savedAt: number;
  layout: DraftMapLayout;
};

export function draftMapLayoutCacheKey(draftId: string): string {
  return `${KEY_PREFIX}${draftId}`;
}

export function readDraftMapLayoutCache(draftId: string): DraftMapLayoutCacheEntry | null {
  if (typeof window === "undefined" || !draftId) return null;
  try {
    const raw = sessionStorage.getItem(draftMapLayoutCacheKey(draftId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftMapLayoutCacheEntry;
    if (!parsed?.layout || typeof parsed.savedAt !== "number") return null;
    return { savedAt: parsed.savedAt, layout: parseMapLayout(parsed.layout) };
  } catch {
    return null;
  }
}

export function writeDraftMapLayoutCache(draftId: string, layout: DraftMapLayout): void {
  if (typeof window === "undefined" || !draftId) return;
  try {
    const entry: DraftMapLayoutCacheEntry = { savedAt: Date.now(), layout };
    sessionStorage.setItem(draftMapLayoutCacheKey(draftId), JSON.stringify(entry));
  } catch {
    /* quota / private mode */
  }
}

export function clearDraftMapLayoutCache(draftId: string): void {
  if (typeof window === "undefined" || !draftId) return;
  try {
    sessionStorage.removeItem(draftMapLayoutCacheKey(draftId));
  } catch {
    /* ignore */
  }
}

/** Server `map_layout` is the source of truth (shared across devices). */
export function resolveSessionMapLayout(mapLayout: unknown, _draftId: string): DraftMapLayout {
  return parseMapLayout(mapLayout);
}
