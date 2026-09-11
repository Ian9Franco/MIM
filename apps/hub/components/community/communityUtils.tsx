"use client";

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

/** Reads both persisted share formats so older community posts remain compatible. */
export function parseShareMeta(summary?: string | null): ShareMeta {
  if (!summary) return { comment: "" };
  const trimmed = summary.trim();

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
    } catch {
      // Invalid legacy JSON is rendered as regular user text below.
    }
  }

  const metaPattern = /<!--mim:([\s\S]*?)-->/;
  const match = trimmed.match(metaPattern);
  const comment = trimmed.replace(metaPattern, "").trim();
  if (match?.[1]) {
    try {
      const meta = JSON.parse(match[1]);
      return { comment, ...meta, projectType: meta.projectType || "mod", priority: !!meta.priority };
    } catch {
      // Keep the visible comment even if hidden metadata is malformed.
    }
  }
  return { comment: trimmed };
}

export function formatCommunityDate(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("es-AR", { year: "numeric", month: "long" });
}

export function formatTimeAgo(dateStr?: string) {
  if (!dateStr) return "";
  const time = new Date(dateStr).getTime();
  const elapsed = Date.now() - time;
  const minutes = Math.floor(elapsed / 60000);
  const hours = Math.floor(elapsed / 3600000);
  const days = Math.floor(elapsed / 86400000);
  if (minutes < 1) return "ahora mismo";
  if (minutes < 60) return `hace ${minutes} min`;
  if (hours < 24) return `hace ${hours} h`;
  if (days === 1) return "ayer";
  if (days < 7) return `hace ${days} días`;
  return new Date(time).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

/** Skeleton mirrors the final card geometry to avoid a layout jump after loading. */
export function CommunityFeedSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[1, 2, 3].map((item) => (
        <div key={item} className="animate-pulse rounded-2xl border border-white/[0.06] bg-surface/60 p-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-white/10" />
            <div className="space-y-1.5"><div className="h-2.5 w-24 rounded bg-white/10" /><div className="h-2 w-14 rounded bg-white/5" /></div>
          </div>
          <div className="mt-3 h-16 rounded-xl bg-white/[0.04]" />
        </div>
      ))}
    </div>
  );
}

