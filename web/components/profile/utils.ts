import React from "react";

export const CACHE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes
export const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export const globalRecentUpdatesCache: Record<string, boolean> = {};
export const globalRecentUpdatesFetchedAt: Record<string, number> = {};

export function projectUpdateKey(source: string | undefined, projectId: string): string {
  return `${source || "modrinth"}:${projectId}`;
}

export function isUpdatedInLastMonth(value?: string | null): boolean {
  if (!value) return false;
  const time = new Date(value).getTime();
  return Number.isFinite(time) && Date.now() - time <= THIRTY_DAYS_MS;
}

export async function fetchProjectUpdatedAt(source: string | undefined, projectId: string): Promise<string | null> {
  if (!projectId || projectId.startsWith("youtube:")) return null;

  if (source === "curseforge") {
    const res = await fetch(`/api/curseforge/project?projectId=${encodeURIComponent(projectId)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.details?.updated_at || data.details?.dateModified || null;
  }

  const res = await fetch(`/api/modrinth/project?projectId=${encodeURIComponent(projectId)}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.updated_at || data.published || null;
}

export function readFavoriteMeta(fav: any): Record<string, any> {
  try {
    return fav.summary?.trim?.().startsWith("{") ? JSON.parse(fav.summary) : {};
  } catch {
    return {};
  }
}

export function getCreatedTime(item: any): number {
  const value = item.created_at || item.inserted_at || item.updated_at || "";
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

export function handleHorizontalWheel(event: React.WheelEvent<HTMLDivElement>): void {
  const delta = event.shiftKey ? event.deltaY : event.deltaX;
  if (!delta) return;

  const target = event.currentTarget;
  const maxScroll = target.scrollWidth - target.clientWidth;
  if (maxScroll <= 0) return;

  const canScroll =
    (delta > 0 && target.scrollLeft < maxScroll) ||
    (delta < 0 && target.scrollLeft > 0);

  if (!canScroll) return;
  target.scrollLeft += delta;
  event.preventDefault();
}

export interface ShareMeta {
  comment: string;
  gameVersion?: string;
  modloader?: string;
  projectType?: string;
  videoUrl?: string;
  thumbnail?: string;
  embeddedVideoId?: string;
  mode?: string;
  publishedAt?: string;
  priority?: boolean;
}

export function parseShareMeta(summary?: string | null): ShareMeta {
  if (!summary) return { comment: "" };
  const trimmed = summary.trim();

  // 1. Try old JSON format
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      return {
        comment: parsed.comment || parsed.description || "",
        gameVersion: parsed.gameVersion,
        modloader: parsed.modloader,
        projectType: parsed.projectType || "mod",
        videoUrl: parsed.videoUrl,
        thumbnail: parsed.thumbnail,
        embeddedVideoId: parsed.embeddedVideoId,
        mode: parsed.mode,
        publishedAt: parsed.publishedAt,
        priority: !!parsed.priority,
      };
    } catch (e) {
      console.debug("[ProfileTab] Could not parse favorite summary JSON directly:", e);
    }
  }

  // 2. Try new HTML comment format
  const META_RE = /<!--mim:([\s\S]*?)-->/;
  const match = trimmed.match(META_RE);
  const comment = trimmed.replace(META_RE, "").trim();

  if (match && match[1]) {
    try {
      const meta = JSON.parse(match[1]);
      return {
        comment,
        gameVersion: meta.gameVersion,
        modloader: meta.modloader,
        projectType: meta.projectType || "mod",
        videoUrl: meta.videoUrl,
        thumbnail: meta.thumbnail,
        embeddedVideoId: meta.embeddedVideoId,
        mode: meta.mode,
        publishedAt: meta.publishedAt,
        priority: !!meta.priority,
      };
    } catch (e) {
      console.debug("[ProfileTab] Could not parse HTML comment metadata in favorite summary:", e);
    }
  }

  // Fallback: entire summary is the comment
  return { comment: trimmed };
}
