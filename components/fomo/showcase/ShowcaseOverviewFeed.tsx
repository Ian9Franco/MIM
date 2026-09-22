"use client";

import React from "react";
import { LayoutGrid, Play, RefreshCw, Film, Newspaper } from "lucide-react";
import { FomoSkeleton } from "@/components/fomo/core/FomoSkeleton";
import { ShowcaseCompactCard } from "./ShowcaseCompactCard";
import { toOverviewItem } from "./showcaseOverviewTypes";
import type { ShowcaseContentType } from "./showcaseOverviewTypes";
import { useSmoothMarquee } from "@/hooks/fomo/useSmoothMarquee";
import { playFomoVideo } from "@/lib/fomo/playVideo";

interface ShowcaseOverviewFeedProps {
  activeChannel: string;
  videos: Record<string, unknown>[];
  shorts: Record<string, unknown>[];
  posts: Record<string, unknown>[];
  loading: boolean;
  isModern?: boolean;
  onNavigateToType?: (type: ShowcaseContentType) => void;
  onPlayVideo?: (videoId: string) => void;
}

function OverviewVideoCard({
  item,
  isModern,
  onPlay,
}: {
  item: ReturnType<typeof toOverviewItem>;
  isModern: boolean;
  onPlay: () => void;
}) {
  const thumb =
    item.thumbnail ||
    (item.videoId ? `https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg` : undefined);

  return (
    <button
      type="button"
      onClick={onPlay}
      className={`group relative rounded-2xl overflow-hidden border text-left transition-all hover:-translate-y-1 hover:shadow-xl ${
        isModern ? "border-slate-200 bg-white" : "border-white/10 bg-white/3"
      }`}
    >
      <div className="relative aspect-video bg-black/40">
        {thumb ? (
          <img src={thumb} alt="" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center opacity-30">
            <Play className="w-10 h-10" />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
          <div className="w-12 h-12 rounded-full bg-primary/95 text-background flex items-center justify-center shadow-lg">
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </div>
        </div>
      </div>
      <div className="p-3">
        <p className={`text-sm font-bold line-clamp-2 ${isModern ? "text-slate-800" : "text-white/90"}`}>
          {item.title}
        </p>
      </div>
    </button>
  );
}

function ShortsMarquee({
  shorts,
  isModern,
}: {
  shorts: ReturnType<typeof toOverviewItem>[];
  isModern: boolean;
}) {
  const duplicated = [...shorts, ...shorts];
  const { containerRef, innerRef, handlers } = useSmoothMarquee(0.6, false, false, false);

  if (shorts.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Film className="w-4 h-4 text-primary" />
        <h4 className={`text-xs font-black uppercase tracking-wider ${isModern ? "text-slate-700" : "text-white/80"}`}>
          Shorts
        </h4>
      </div>
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden mask-horizontal-edges cursor-grab active:cursor-grabbing py-2"
        {...handlers}
      >
        <div ref={innerRef} className="flex gap-3 w-max px-2">
          {duplicated.map((item, i) => {
            const thumb =
              item.thumbnail ||
              (item.videoId ? `https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg` : undefined);
            return (
              <button
                key={`${item.id}-${i}`}
                type="button"
                onClick={() => item.videoId && playFomoVideo(item.videoId, { isShort: true })}
                className={`w-28 shrink-0 rounded-xl overflow-hidden border transition-transform hover:-translate-y-1 ${
                  isModern ? "border-slate-200 bg-white" : "border-white/10 bg-white/3"
                }`}
              >
                <div className="aspect-9/16 bg-black/40 relative">
                  {thumb ? (
                    <img src={thumb} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-40">
                      <Film className="w-6 h-6" />
                    </div>
                  )}
                </div>
                <p className={`p-2 text-[9px] font-semibold line-clamp-2 text-left ${isModern ? "text-slate-700" : "text-white/80"}`}>
                  {item.title}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function ShowcaseOverviewFeed({
  activeChannel,
  videos,
  shorts,
  posts,
  loading,
  isModern = false,
  onNavigateToType,
  onPlayVideo,
}: ShowcaseOverviewFeedProps) {
  const topVideos = React.useMemo(
    () =>
      [...videos]
        .map((v) => toOverviewItem(v, "video"))
        .sort((a, b) => b.publishedAtMs - a.publishedAtMs)
        .slice(0, 3),
    [videos]
  );

  const topShorts = React.useMemo(
    () =>
      [...shorts]
        .map((s) => toOverviewItem(s, "short"))
        .sort((a, b) => b.publishedAtMs - a.publishedAtMs)
        .slice(0, 12),
    [shorts]
  );

  const topPosts = React.useMemo(
    () =>
      [...posts]
        .map((p) => toOverviewItem(p, "post"))
        .sort((a, b) => b.publishedAtMs - a.publishedAtMs)
        .slice(0, 3),
    [posts]
  );

  const isEmpty = topVideos.length === 0 && topShorts.length === 0 && topPosts.length === 0;

  const playItem = (item: ReturnType<typeof toOverviewItem>) => {
    const playId = item.embeddedVideoId || item.videoId;
    if (playId && onPlayVideo) {
      onPlayVideo(playId);
      return;
    }
    if (item.videoUrl) {
      window.open(item.videoUrl, "_blank", "noopener,noreferrer");
      return;
    }
    onNavigateToType?.(item.type);
  };

  if (loading && isEmpty) {
    return <FomoSkeleton variant="list" message="Cargando resumen del canal..." count={6} />;
  }

  if (isEmpty) {
    return (
      <div className="py-16 text-center flex flex-col items-center opacity-50 gap-3">
        <LayoutGrid className="w-14 h-14" />
        <h3 className="font-headline text-base">Sin actividad reciente</h3>
        <p className="text-xs max-w-sm">Videos, shorts y posts del canal activo aparecerán acá.</p>
      </div>
    );
  }

  const channelLabel = activeChannel.includes("@")
    ? activeChannel.split("@")[1].split("/")[0]
    : activeChannel.split("/").pop();

  return (
    <div className="space-y-6 max-h-[min(70vh,720px)] overflow-y-auto custom-scrollbar pr-1">
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
          isModern
            ? "bg-primary/5 border-primary/15 text-slate-600"
            : "bg-white/5 border-white/8 text-white/60"
        }`}
      >
        <LayoutGrid className="w-3.5 h-3.5 text-primary shrink-0" />
        <p className="text-[10px]">
          Resumen de <span className="font-bold">@{channelLabel}</span>
        </p>
        {loading && <RefreshCw className="w-3 h-3 animate-spin ml-auto text-primary" />}
      </div>

      {topVideos.length > 0 && (
        <section className="space-y-2">
          <h4 className={`text-xs font-black uppercase tracking-wider ${isModern ? "text-slate-700" : "text-white/80"}`}>
            Últimos videos
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {topVideos.map((item) => (
              <OverviewVideoCard
                key={item.id}
                item={item}
                isModern={isModern}
                onPlay={() => playItem(item)}
              />
            ))}
          </div>
        </section>
      )}

      <ShortsMarquee shorts={topShorts} isModern={isModern} />

      {topPosts.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-primary" />
            <h4 className={`text-xs font-black uppercase tracking-wider ${isModern ? "text-slate-700" : "text-white/80"}`}>
              Publicaciones recientes
            </h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {topPosts.map((item) => (
              <ShowcaseCompactCard
                key={item.id}
                item={item}
                isModern={isModern}
                variant="block"
                onClick={() => playItem(item)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
