"use client";
import { CollectibleSurface } from "./CollectibleSurface";
import { DefaultModIcon } from "./DefaultModIcon";

import React, { useEffect, useState } from "react";
import { TvMinimalPlay, X, Puzzle } from "lucide-react";
import { useSmoothMarquee } from "../hooks/useSmoothMarquee";

export interface ModHit {
  id?: string;
  itemId?: string;
  projectId: string;
  slug?: string;
  title: string;
  author: string;
  iconUrl?: string | null;
  projectType: string;
  categories?: string[];
  description?: string;
  url?: string;
  _source?: string;
  downloads?: number;
  gameVersions?: string[];
  loaders?: string[];
  side?: string;
  versionId?: string | null;
  gallery?: {
    url: string;
    thumbnailUrl?: string;
    title?: string;
    featured?: boolean;
  }[];
}

function CollapsibleVideoDescription({ text }: { text: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLong = text.split("\n").length > 6 || text.length > 300;

  if (!isLong) {
    return (
      <div className="text-[10px] text-white/70 leading-relaxed font-mono whitespace-pre-wrap bg-black/25 border border-white/5 p-2 rounded-lg select-text">
        {text}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 w-full">
      <div 
        className={`text-[10px] text-white/70 leading-relaxed font-mono whitespace-pre-wrap bg-black/25 border border-white/5 p-2 rounded-lg select-text transition-all duration-300 relative ${
          isExpanded ? "max-h-80 overflow-y-auto scrollbar-none" : "max-h-24 overflow-hidden"
        }`}
      >
        {text}
        {!isExpanded && (
          <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
        )}
      </div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-[9px] font-bold text-orange-400 hover:text-orange-300 transition-colors self-start mt-0.5"
      >
        {isExpanded ? "Mostrar menos ▲" : "Mostrar descripción completa ▼"}
      </button>
    </div>
  );
}

interface VerticalTickerProps {
  mods: ModHit[];
  onSelectMod: (mod: ModHit) => void;
  speed?: number;
  color?: string;
  reverse?: boolean;
}

/**
 * Vertical auto-scrolling ticker for mods. Uses CSS variables for all
 * backgrounds and borders so it adapts to every theme (official, vampire, modern).
 */
export function VerticalTicker({ mods, onSelectMod, speed = 0.5, color = "text-orange-500", reverse = false }: VerticalTickerProps) {
  const duplicatedMods = [...mods, ...mods, ...mods, ...mods];
  const { containerRef, innerRef, handlers } = useSmoothMarquee(speed, reverse, true);

  return (
    <div
      ref={containerRef}
      className="mim-marquee-isolated mim-marquee-vertical mim-marquee-stage absolute inset-0 cursor-pointer overflow-hidden"
      {...handlers}
    >
      <div ref={innerRef} className="flex w-full flex-col gap-3.5 px-1 py-3 pb-4">
        {duplicatedMods.map((mod, i) => {
          const knownLoaders = ["forge", "fabric", "neoforge", "quilt"];
          const loaderTag = mod.categories?.map((c: any) => {
            if (typeof c === "string") return c;
            if (c && typeof c === "object" && typeof c.name === "string") return c.name;
            return "";
          }).find((c: string) => c && knownLoaders.includes(c.toLowerCase()));

          const pType = mod.projectType === "mod" ? "Mod" : mod.projectType === "resourcepack" ? "Texture" : "Shader";

          return (
            <div key={`${mod.projectId}-${i}`} className="mim-marquee-card-slot">
            <CollectibleSurface
              variant="row"
              label={`Ver detalles de ${mod.title}`}
              onClick={() => onSelectMod(mod)}
              className="group flex w-full gap-3 p-3.5 active:scale-[0.98]"
            >
              {/* Image box */}
              <div
                className="mim-collectible-media relative flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg"
                style={{
                  background: "color-mix(in srgb, var(--color-surface) 60%, transparent)",
                  border: "1px solid var(--color-border)",
                }}
              >
                {mod.iconUrl ? (
                  <>
                    <img
                      src={mod.iconUrl}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        const sibling = e.currentTarget.nextSibling as HTMLElement;
                        if (sibling) sibling.style.display = "block";
                      }}
                    />
                    <div className="hidden w-full h-full">
                      <DefaultModIcon platform={mod._source} />
                    </div>
                  </>
                ) : (
                  <DefaultModIcon platform={mod._source} />
                )}
                <span
                  className="absolute bottom-0 right-0 px-1 rounded-tl text-[8px] font-mono"
                  style={{ background: "rgba(0,0,0,0.5)", color: "var(--color-muted)" }}
                >
                  {String((i % mods.length) + 1).padStart(2, "0")}
                </span>
              </div>

              {/* Title & Tags */}
              <div className="flex-1 flex flex-col justify-center min-w-0">
                <p
                  className="font-medium text-xs truncate transition-colors"
                  style={{ color: "var(--color-foreground)" }}
                >
                  {mod.title}
                </p>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  {pType && (
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                      style={{
                        background: "color-mix(in srgb, var(--color-primary) 8%, transparent)",
                        border: "1px solid var(--color-border)",
                        color: "var(--color-muted)",
                      }}
                    >
                      {pType}
                    </span>
                  )}
                  {loaderTag && (
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                      style={{
                        background: "color-mix(in srgb, var(--color-surface) 60%, transparent)",
                        border: "1px solid var(--color-border)",
                        color: loaderTag.toLowerCase() === "fabric" ? "#fbbf24"
                          : loaderTag.toLowerCase() === "forge"  ? "#f87171" : "#38bdf8",
                      }}
                    >
                      {loaderTag.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              {/* Dot indicators */}
              <div className="flex flex-col justify-center gap-1 opacity-30 transition-opacity group-hover:opacity-60">
                <span className="h-1 w-1 rounded-full" style={{ background: "var(--color-muted)" }} />
                <span className="h-1 w-1 rounded-full" style={{ background: "var(--color-muted)" }} />
              </div>
            </CollectibleSurface>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Horizontal auto-scrolling marquee for mods or collections.
 */
const PICK_CARD_SIZE = "h-[228px] w-[200px] min-w-[200px] max-w-[200px] shrink-0";

export function HorizontalEditorialMarquee({
  items,
  type = "mod",
  onSelectMod,
  onSelectCollection,
  speed = 0.6,
  reverse = false,
  paused = false,
}: {
  items: any[];
  type?: "mod" | "collection";
  onSelectMod?: (mod: any) => void;
  onSelectCollection?: (coll: any) => void;
  speed?: number;
  reverse?: boolean;
  paused?: boolean;
}) {
  const duplicatedItems = [...items, ...items, ...items, ...items];
  const { containerRef, innerRef, handlers } = useSmoothMarquee(speed, reverse, false, paused);

  return (
    <div
      ref={containerRef}
      className="mim-marquee-isolated mim-marquee-horizontal mim-marquee-stage relative w-full overflow-x-auto mask-horizontal-edges cursor-grab active:cursor-grabbing select-none scrollbar-none"
      {...handlers}
    >
      <div ref={innerRef} className="flex w-max items-start gap-4 px-1">
        {duplicatedItems.map((item, i) => {
          if (type === "collection") {
            return (
              <div key={`${item.id}-${i}`} className="mim-marquee-card-slot">
              <CollectibleSurface
                label={`Abrir colección ${item.name}`}
                onClick={() => onSelectCollection?.(item)}
                className={`flex flex-col ${PICK_CARD_SIZE}`}
              >
                <div className="mim-collectible-media relative flex h-24 shrink-0 items-center justify-center overflow-hidden border-b border-white/[0.06] bg-white/5">
                  {item.iconUrl ? (
                    <>
                      <img
                        src={item.iconUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          const sibling = e.currentTarget.nextSibling as HTMLElement;
                          if (sibling) sibling.style.display = "block";
                        }}
                      />
                      <div className="hidden w-full h-full">
                        <DefaultModIcon platform={item.source} />
                      </div>
                    </>
                  ) : (
                    <DefaultModIcon platform={item.source} />
                  )}
                  <span className="absolute bottom-2 right-2 bg-black/60 border border-white/[0.05] rounded-md px-1.5 py-0.5 text-[8px] font-mono text-white/70">
                    {item.projectCount || item.mods?.length || 0} mods
                  </span>
                </div>
                <div className="flex h-[132px] flex-col px-4 pb-3 pt-3">
                  <h4 className="h-4 truncate text-xs font-bold leading-4 text-white">{item.name}</h4>
                  <p className="mt-1.5 h-[2.625rem] line-clamp-2 text-[9px] leading-[1.45] text-white/40">
                    {item.description || "\u00A0"}
                  </p>
                </div>
              </CollectibleSurface>
              </div>
            );
          } else {
            return (
              <div key={`${item.projectId}-${i}`} className="mim-marquee-card-slot">
              <CollectibleSurface
                label={`Ver detalles de ${item.title}`}
                onClick={() => onSelectMod?.(item)}
                className={`flex flex-col ${PICK_CARD_SIZE}`}
              >
                <div className="mim-collectible-media relative flex h-24 shrink-0 items-center justify-center overflow-hidden border-b border-white/[0.06] bg-white/5">
                  {(() => {
                    const bannerImg = item.gallery?.find((g: any) => g.featured)?.url || item.gallery?.[0]?.url;
                    if (bannerImg) {
                      return (
                        <>
                          <img
                            src={bannerImg}
                            alt=""
                            className="w-full h-full object-cover scale-110 opacity-90"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                              const nextSibling = e.currentTarget.nextSibling as HTMLElement;
                              if (nextSibling) nextSibling.style.display = "block";
                            }}
                          />
                          <div className="hidden w-full h-full">
                            {item.iconUrl ? (
                              <>
                                <img
                                  src={item.iconUrl}
                                  alt=""
                                  className="w-full h-full object-cover scale-110 opacity-90"
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                    const nextSibling = e.currentTarget.nextSibling as HTMLElement;
                                    if (nextSibling) nextSibling.style.display = "block";
                                  }}
                                />
                                <div className="hidden w-full h-full">
                                  <DefaultModIcon platform={item._source} />
                                </div>
                              </>
                            ) : (
                              <DefaultModIcon platform={item._source} />
                            )}
                          </div>
                        </>
                      );
                    } else if (item.iconUrl) {
                      return (
                        <>
                          <img
                            src={item.iconUrl}
                            alt=""
                            className="w-full h-full object-cover scale-110 opacity-90"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                              const nextSibling = e.currentTarget.nextSibling as HTMLElement;
                              if (nextSibling) nextSibling.style.display = "block";
                            }}
                          />
                          <div className="hidden w-full h-full">
                            <DefaultModIcon platform={item._source} />
                          </div>
                        </>
                      );
                    } else {
                      return <DefaultModIcon platform={item._source} />;
                    }
                  })()}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
                  <span className="absolute bottom-2 right-2 bg-black/60 border border-white/[0.05] rounded-md px-1.5 py-0.5 text-[8px] font-mono text-white/70 capitalize">
                    {item.projectType || "mod"}
                  </span>
                </div>
                <div className="flex h-[132px] flex-col px-4 pb-3 pt-3">
                  <h4 className="h-4 truncate text-xs font-bold leading-4 text-white">{item.title}</h4>
                  <p className="mt-1.5 h-[2.625rem] line-clamp-2 text-[9px] leading-[1.45] text-white/40">
                    {item.description || "\u00A0"}
                  </p>
                  <div className="mt-auto flex h-5 items-center justify-between border-t border-white/[0.04] pt-1.5">
                    <span className="text-[9px] text-orange-400 capitalize">{item._source || "modrinth"}</span>
                    <span className="text-[9px] font-mono text-white/30">#{String((i % items.length) + 1).padStart(2, "0")}</span>
                  </div>
                </div>
              </CollectibleSurface>
              </div>
            );
          }
        })}
      </div>
    </div>
  );
}

export interface ShowcaseVideo {
  videoId: string;
  title: string;
  thumbnail: string;
  videoUrl: string;
  channelName: string;
  publishedAt?: string;
  modSlugs?: string[];
  description?: string;
}

/**
 * Default channels used if none are provided from the parent.
 * Mirrors DEFAULT_SHOWCASE_CHANNELS in the desktop SpotlightShowcaseRow.
 */
const DEFAULT_SHOWCASE_CHANNELS = [
  "https://www.youtube.com/@EnderVerseMC",
  "https://www.youtube.com/@KreksuMinecraft",
  "https://www.youtube.com/@NoxusMods",
  "https://www.youtube.com/@sir_color",
  "https://www.youtube.com/@Wero_lovernite",
];

type YouTubeThumbQuality = "maxres" | "hq" | "sd" | "mq";

function getYouTubeThumbnail(videoId: string, quality: YouTubeThumbQuality = "hq"): string {
  const file =
    quality === "maxres" ? "maxresdefault"
    : quality === "sd" ? "sddefault"
    : quality === "mq" ? "mqdefault"
    : "hqdefault";
  return `https://i.ytimg.com/vi/${videoId}/${file}.jpg`;
}

function normalizeYouTubeThumbnail(videoId: string, thumbnail?: string): string {
  if (thumbnail && thumbnail.startsWith("http")) {
    return thumbnail.startsWith("//") ? `https:${thumbnail}` : thumbnail;
  }
  return getYouTubeThumbnail(videoId, "hq");
}

function cycleYouTubeThumbnail(videoId: string, currentSrc: string): string | null {
  if (currentSrc.includes("maxresdefault")) return getYouTubeThumbnail(videoId, "hq");
  if (currentSrc.includes("hqdefault")) return getYouTubeThumbnail(videoId, "sd");
  if (currentSrc.includes("sddefault")) return getYouTubeThumbnail(videoId, "mq");
  return null;
}

const FALLBACK_SHOWCASES: ShowcaseVideo[] = [
  {
    videoId: "M7lc1UVf-VE",
    title: "Showcase de mods detectado por FOMO",
    thumbnail: getYouTubeThumbnail("M7lc1UVf-VE", "hq"),
    videoUrl: "https://www.youtube.com/results?search_query=minecraft+mod+showcase",
    channelName: "Fallback",
    publishedAt: "20260707",
    modSlugs: ["modrinth:mod:appleskin", "modrinth:mod:moonlight"],
  },
  {
    videoId: "aqz-KE-bpKQ",
    title: "Ideas rápidas para armar un modpack mobile first",
    thumbnail: getYouTubeThumbnail("aqz-KE-bpKQ", "hq"),
    videoUrl: "https://www.youtube.com/results?search_query=minecraft+modpack+showcase",
    channelName: "Fallback",
    publishedAt: "20260625",
    modSlugs: ["modrinth:mod:immediatelyfast"],
  },
];

function getHandle(url: string): string {
  return url.includes("@")
    ? "@" + url.split("@")[1]?.split("/")[0]
    : url.split("/").pop() ?? url;
}

/** Compact YYYYMMDD → human-readable date like "25 jun 2026" */
function formatDate(raw?: string): string {
  if (!raw || raw.length !== 8) return raw ?? "";
  const months = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  const y = raw.substring(0, 4);
  const m = parseInt(raw.substring(4, 6), 10) - 1;
  const d = parseInt(raw.substring(6, 8), 10);
  return `${d} ${months[m] ?? ""} ${y}`;
}

/**
 * HorizontalShowcaseMarquee — fetches real YouTube videos from
 * /api/fomo/youtube-showcase for each channel and scrolls them.
 */
export function HorizontalShowcaseMarquee({
  channels = DEFAULT_SHOWCASE_CHANNELS,
  speed = 0.5,
  reverse = false,
  onSelectMod,
}: {
  channels?: string[];
  speed?: number;
  reverse?: boolean;
  onSelectMod?: (mod: ModHit) => void;
}) {
  const [videos, setVideos] = useState<ShowcaseVideo[]>([]);
  const [selectedVideoForMods, setSelectedVideoForMods] = useState<ShowcaseVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const { containerRef, innerRef, handlers } = useSmoothMarquee(speed, reverse, false);

  useEffect(() => {
    let cancelled = false;
    const videosPerChannel = channels.length >= 4 ? 3 : channels.length === 3 ? 4 : 5;

    async function fetchAll() {
      setLoading(true);
      const results: ShowcaseVideo[] = [];

      await Promise.allSettled(
        channels.map(async (channelUrl) => {
          try {
            const res = await fetch(
              `/api/fomo/youtube-showcase?channel=${encodeURIComponent(channelUrl)}&limit=${videosPerChannel}`
            );
            if (!res.ok) return;
            const data = await res.json();
            const entries: ShowcaseVideo[] = (data.showcases || []).map((v: any) => ({
              videoId: v.videoId,
              title: v.title,
              thumbnail: normalizeYouTubeThumbnail(v.videoId, v.thumbnail),
              videoUrl: v.videoUrl,
              channelName: v.channelName || getHandle(channelUrl),
              publishedAt: v.publishedAt,
              modSlugs: v.modSlugs || [],
              description: v.description,
            }));
            results.push(...entries);
          } catch {
            // silently skip failed channels
          }
        })
      );

      if (!cancelled) {
        // Sort newest first using publishedAt YYYYMMDD string
        results.sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
        setVideos(results.length ? results : FALLBACK_SHOWCASES);
        setLoading(false);
      }
    }

    void fetchAll();
    return () => { cancelled = true; };
  }, [channels.join(",")]);

  // Skeleton cards while loading
  if (loading) {
    return (
      <div className="w-full overflow-hidden py-1.5">
        <div className="flex gap-4 px-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              style={{ width: "180px", height: "255px" }}
              className="shrink-0 rounded-2xl bg-surface/90 border border-border animate-pulse"
            >
              <div style={{ height: "125px" }} className="w-full bg-white/5 rounded-t-2xl" />
              <div className="p-3 flex flex-col gap-2">
                <div className="h-2 w-16 rounded-full bg-white/10" />
                <div className="h-2 w-full rounded-full bg-white/10" />
                <div className="h-2 w-4/5 rounded-full bg-white/10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="py-4 text-center text-xs opacity-40" style={{ color: "var(--color-muted)" }}>
        No se encontraron videos
      </div>
    );
  }

  const displayVideos = [...videos, ...videos, ...videos, ...videos];

  return (
    <div
      ref={containerRef}
      className="mim-marquee-isolated mim-marquee-horizontal mim-marquee-stage relative w-full overflow-x-auto mask-horizontal-edges cursor-grab active:cursor-grabbing select-none scrollbar-none"
      {...handlers}
    >
      <div ref={innerRef} className="flex w-max items-start gap-4 px-1">
        {displayVideos.map((video, i) => (
          <div key={`${video.videoId}-${i}`} className="mim-marquee-card-slot">
          <CollectibleSurface
            variant="compact"
            label={`Reproducir ${video.title}`}
            onClick={() => {
              window.dispatchEvent(new CustomEvent("fomo-play-video", { detail: { videoId: video.videoId } }));
            }}
            className="group flex h-[255px] w-[180px] flex-col"
          >
            {/* Thumbnail */}
            <div style={{ height: "125px" }} className="mim-collectible-media mim-showcase-thumb relative shrink-0 overflow-hidden rounded-t-[calc(1rem-1px)] bg-[#0b0f17]">
              <img
                src={video.thumbnail}
                alt={video.title}
                loading="lazy"
                decoding="async"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                className="transition-transform duration-300 group-hover:scale-[1.03]"
                onError={(e) => {
                  const img = e.currentTarget;
                  const next = cycleYouTubeThumbnail(video.videoId, img.src);
                  if (next && next !== img.src) {
                    img.src = next;
                    return;
                  }
                  img.src = getYouTubeThumbnail(video.videoId, "mq");
                }}
              />

              {/* Subtle bottom vignette for badges */}
              <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/55 via-black/10 to-transparent" />

              {/* YouTube badge */}
              <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-600/90 backdrop-blur-sm px-1.5 py-0.5 rounded-full z-10">
                <TvMinimalPlay className="w-2 h-2 text-white" />
                <span className="text-[7px] font-black text-white uppercase tracking-wider">YouTube</span>
              </div>

              {/* Mod count badge */}
              {video.modSlugs && video.modSlugs.length > 0 && (
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedVideoForMods(video);
                  }}
                  className="absolute top-2 right-2 bg-orange-600/80 hover:bg-orange-500 backdrop-blur-sm text-[7px] font-black text-white px-1.5 py-0.5 rounded-full z-30 transition-colors cursor-pointer"
                >
                  {video.modSlugs.length}
                </div>
              )}

              {/* Play overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 z-20">
                <div className="w-10 h-10 rounded-full bg-orange-600 text-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-all duration-300">
                  <TvMinimalPlay className="w-4 h-4 ml-0.5" />
                </div>
              </div>
            </div>

            {/* Text zone */}
            <div className="flex flex-col flex-1 p-3 gap-1 min-h-0">
              <div className="flex items-center gap-1">
                <span className="text-[7.5px] font-black uppercase tracking-widest truncate text-orange-400">
                  ◇ {video.channelName}
                </span>
                {video.publishedAt && (
                  <span className="text-[7px] shrink-0" style={{ color: "var(--color-muted)", opacity: 0.5 }}>
                    · {formatDate(video.publishedAt)}
                  </span>
                )}
              </div>
              <h3
                className="font-semibold text-[10px] leading-tight line-clamp-4 mt-0.5 flex-1"
                style={{ color: "var(--color-foreground)" }}
              >
                {video.title}
              </h3>
              {(video.description || (video.modSlugs && video.modSlugs.length > 0)) && (
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedVideoForMods(video);
                  }}
                  className="mt-auto pt-2 border-t hover:text-orange-400 transition-colors cursor-pointer flex items-center justify-between" 
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <span className="text-[8px] font-bold uppercase tracking-wide">
                    {video.modSlugs && video.modSlugs.length > 0 
                      ? `${video.modSlugs.length} mods detectados` 
                      : "Ver descripción"}
                  </span>
                  <Puzzle className="w-2.5 h-2.5 text-orange-500" />
                </div>
              )}
            </div>
          </CollectibleSurface>
          </div>
        ))}
      </div>

      {selectedVideoForMods && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn"
          onClick={() => setSelectedVideoForMods(null)}
        >
          <div 
            className="w-full max-w-sm bg-surface border border-border p-5 rounded-2xl flex flex-col gap-4 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "var(--color-card)",
              borderColor: "var(--color-border)",
            }}
          >
            <button 
              onClick={() => setSelectedVideoForMods(null)}
              className="absolute top-4 right-4 text-white/40 hover:text-white/85 active:scale-90 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3" style={{ borderColor: "var(--color-border)" }}>
              <Puzzle className="w-5 h-5 text-orange-500" />
              <h3 className="text-xs font-bold text-white/95">
                {selectedVideoForMods.modSlugs && selectedVideoForMods.modSlugs.length > 0
                  ? `Mods Detectados (${selectedVideoForMods.modSlugs.length})`
                  : "Descripción del Video"}
              </h3>
            </div>
            
            <p className="text-[10px] text-white/50 leading-relaxed font-medium">
              {selectedVideoForMods.title}
            </p>

            {selectedVideoForMods.description && (
              <CollapsibleVideoDescription text={selectedVideoForMods.description} />
            )}
            
            {selectedVideoForMods.modSlugs && selectedVideoForMods.modSlugs.length > 0 && (
              <div className="flex flex-col gap-2 max-h-60 overflow-y-auto scrollbar-none pt-1.5 border-t border-white/5">
                <span className="text-[8px] font-bold text-white/40 uppercase tracking-wider mb-1">
                  Mods Detectados:
                </span>
                {selectedVideoForMods.modSlugs.map((slugStr, idx) => {
                  const parts = slugStr.split(":");
                  const source = parts[0];
                  const type = parts.length >= 3 ? parts[1] : "mod";
                  const slug = parts.length >= 3 ? parts[2] : parts[1];
                  
                  const isCurse = source === "curseforge";
                  const displayName = slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
                  
                  return (
                    <div
                      key={slugStr + idx}
                      onClick={() => {
                        if (onSelectMod) {
                          onSelectMod({
                            projectId: slug,
                            title: displayName,
                            description: "",
                            iconUrl: "",
                            author: "",
                            projectType: type,
                            categories: [],
                            url: source === "curseforge" 
                              ? `https://www.curseforge.com/minecraft/mc-mods/${slug}` 
                              : `https://modrinth.com/${type}/${slug}`,
                            _source: source as "modrinth" | "curseforge"
                          });
                        }
                        setSelectedVideoForMods(null);
                      }}
                      className="p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/5 active:scale-98 transition-all cursor-pointer flex items-center gap-3"
                      style={{
                        borderColor: isCurse ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)",
                      }}
                    >
                      <div 
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-[8px] font-black uppercase shrink-0"
                        style={{
                          background: isCurse ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)",
                          color: isCurse ? "#f87171" : "#34d399",
                        }}
                      >
                        {source.substring(0, 2)}
                      </div>
                      <span className="text-[11px] font-bold text-white/80 truncate flex-1">
                        {displayName}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
