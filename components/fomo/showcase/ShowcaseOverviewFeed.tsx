"use client";

import React from "react";
import { LayoutGrid, RefreshCw } from "lucide-react";
import { FomoSkeleton } from "@/components/fomo/core/FomoSkeleton";
import { ShowcaseCompactCard } from "./ShowcaseCompactCard";
import { mergeOverviewItems } from "./showcaseOverviewTypes";
import type { ShowcaseContentType } from "./showcaseOverviewTypes";

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
  const items = React.useMemo(
    () => mergeOverviewItems(videos, shorts, posts, 24),
    [videos, shorts, posts]
  );

  const handleClick = (item: ReturnType<typeof mergeOverviewItems>[number]) => {
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

  if (loading && items.length === 0) {
    return <FomoSkeleton variant="list" message="Cargando resumen del canal..." count={6} />;
  }

  if (items.length === 0) {
    return (
      <div className="py-16 text-center flex flex-col items-center opacity-50 gap-3">
        <LayoutGrid className="w-14 h-14" />
        <h3 className="font-headline text-base">Sin actividad reciente</h3>
        <p className="text-xs max-w-sm">
          El resumen mezcla videos, shorts y posts del canal activo.
        </p>
      </div>
    );
  }

  const channelLabel = activeChannel.includes("@")
    ? activeChannel.split("@")[1].split("/")[0]
    : activeChannel.split("/").pop();

  return (
    <div className="space-y-3">
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
          isModern
            ? "bg-primary/5 border-primary/15 text-slate-600"
            : "bg-white/5 border-white/8 text-white/60"
        }`}
      >
        <LayoutGrid className="w-3.5 h-3.5 text-primary shrink-0" />
        <p className="text-[10px]">
          Resumen de <span className="font-bold">@{channelLabel}</span> — {items.length} elementos recientes
        </p>
        {loading && <RefreshCw className="w-3 h-3 animate-spin ml-auto text-primary" />}
      </div>

      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <ShowcaseCompactCard
            key={`${item.type}-${item.id}`}
            item={item}
            isModern={isModern}
            onClick={() => handleClick(item)}
          />
        ))}
      </div>
    </div>
  );
}
