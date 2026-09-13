export type ShowcaseContentType = "video" | "short" | "post";

export interface ShowcaseOverviewItem {
  id: string;
  type: ShowcaseContentType;
  title: string;
  thumbnail?: string;
  publishedAt: string;
  publishedAtMs: number;
  videoId?: string;
  videoUrl?: string;
  embeddedVideoId?: string;
  raw: Record<string, unknown>;
}

export function parsePublishedMs(raw?: string): number {
  if (!raw) return 0;
  const trimmed = raw.trim();
  if (/^\d{8}$/.test(trimmed)) {
    const y = parseInt(trimmed.slice(0, 4), 10);
    const m = parseInt(trimmed.slice(4, 6), 10) - 1;
    const d = parseInt(trimmed.slice(6, 8), 10);
    return new Date(y, m, d).getTime();
  }
  const parsed = Date.parse(trimmed);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function formatRelativeDate(raw?: string): string {
  if (!raw) return "Reciente";
  const ms = parsePublishedMs(raw);
  if (!ms) return raw;
  const diff = Date.now() - ms;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days < 1) return "Hoy";
  if (days === 1) return "Ayer";
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.floor(days / 7)}sem`;
  if (days < 365) return `${Math.floor(days / 30)}m`;
  return `${Math.floor(days / 365)}a`;
}

export function toOverviewItem(
  item: Record<string, unknown>,
  type: ShowcaseContentType
): ShowcaseOverviewItem {
  const id = String(item.videoId || item.postId || item.id || `${type}-${Math.random()}`);
  const publishedAt = String(item.publishedAt || item.upload_date || "");
  return {
    id,
    type,
    title: String(item.title || item.description || "Sin título").slice(0, 120),
    thumbnail: (item.thumbnail as string) || undefined,
    publishedAt,
    publishedAtMs: parsePublishedMs(publishedAt),
    videoId: item.videoId ? String(item.videoId) : undefined,
    videoUrl: item.videoUrl ? String(item.videoUrl) : undefined,
    embeddedVideoId: item.embeddedVideoId ? String(item.embeddedVideoId) : undefined,
    raw: item,
  };
}

export function mergeOverviewItems(
  videos: Record<string, unknown>[],
  shorts: Record<string, unknown>[],
  posts: Record<string, unknown>[],
  limit = 20
): ShowcaseOverviewItem[] {
  const merged = [
    ...videos.map((v) => toOverviewItem(v, "video")),
    ...shorts.map((s) => toOverviewItem(s, "short")),
    ...posts.map((p) => toOverviewItem(p, "post")),
  ];
  return merged
    .sort((a, b) => b.publishedAtMs - a.publishedAtMs)
    .slice(0, limit);
}
