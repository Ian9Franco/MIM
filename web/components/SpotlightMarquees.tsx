"use client";

import React from "react";
import { TvMinimalPlay } from "lucide-react";
import { useSmoothMarquee } from "../hooks/useSmoothMarquee";

export interface ModHit {
  projectId: string;
  title: string;
  author: string;
  iconUrl?: string;
  projectType: string;
  categories?: string[];
  description?: string;
  url?: string;
  _source?: string;
  downloads?: number;
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
      className="absolute inset-0 overflow-hidden mask-vertical-edges cursor-pointer"
      {...handlers}
    >
      <div ref={innerRef} className="flex flex-col gap-3.5 w-full px-1 pb-4">
        {duplicatedMods.map((mod, i) => {
          const knownLoaders = ["forge", "fabric", "neoforge", "quilt"];
          const loaderTag = mod.categories?.map((c: any) => {
            if (typeof c === "string") return c;
            if (c && typeof c === "object" && typeof c.name === "string") return c.name;
            return "";
          }).find((c: string) => c && knownLoaders.includes(c.toLowerCase()));

          const pType = mod.projectType === "mod" ? "Mod" : mod.projectType === "resourcepack" ? "Texture" : "Shader";

          return (
            <div
              key={`${mod.projectId}-${i}`}
              onClick={() => onSelectMod(mod)}
              className="rounded-xl p-3.5 flex gap-3 transition-all duration-300 relative overflow-hidden group active:scale-[0.98]"
              style={{
                background: "color-mix(in srgb, var(--color-card) 90%, transparent)",
                border: "1px solid var(--color-border)",
              }}
            >
              {/* Image box */}
              <div
                className="w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 relative"
                style={{
                  background: "color-mix(in srgb, var(--color-surface) 60%, transparent)",
                  border: "1px solid var(--color-border)",
                }}
              >
                {mod.iconUrl ? (
                  <img src={mod.iconUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-bold text-xs uppercase" style={{ color: "var(--color-muted)" }}>
                    {mod.title.substring(0, 2)}
                  </span>
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
              <div className="flex flex-col justify-center gap-1 opacity-30 group-hover:opacity-60 transition-opacity">
                <span className="w-1 h-1 rounded-full" style={{ background: "var(--color-muted)" }} />
                <span className="w-1 h-1 rounded-full" style={{ background: "var(--color-muted)" }} />
              </div>
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
export function HorizontalEditorialMarquee({
  items,
  type = "mod",
  onSelectMod,
  onSelectCollection,
  speed = 0.6,
  reverse = false
}: {
  items: any[];
  type?: "mod" | "collection";
  onSelectMod?: (mod: any) => void;
  onSelectCollection?: (coll: any) => void;
  speed?: number;
  reverse?: boolean;
}) {
  const duplicatedItems = [...items, ...items, ...items, ...items];
  const { containerRef, innerRef, handlers } = useSmoothMarquee(speed, reverse, false);

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden mask-horizontal-edges cursor-pointer select-none py-1.5"
      {...handlers}
    >
      <div ref={innerRef} className="flex gap-4 w-max px-1">
        {duplicatedItems.map((item, i) => {
          if (type === "collection") {
            return (
              <div
                key={`${item.id}-${i}`}
                onClick={() => onSelectCollection?.(item)}
                className="bg-surface/90 border border-border rounded-2xl p-4 flex flex-col gap-3 min-w-[200px] max-w-[200px] hover:border-border active:scale-[0.98] transition-all shadow-sm"
              >
                <div className="h-24 rounded-xl bg-white/5 border border-white/[0.05] overflow-hidden relative flex items-center justify-center">
                  {item.iconUrl ? (
                    <img src={item.iconUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-bold text-xs uppercase" style={{ color: "var(--color-muted)" }}>
                      {item.name?.substring(0, 2) || "CO"}
                    </span>
                  )}
                  <span className="absolute bottom-2 right-2 bg-black/60 border border-white/[0.05] rounded-md px-1.5 py-0.5 text-[8px] font-mono text-white/70">
                    {item.projectCount || item.mods?.length || 0} mods
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white truncate">{item.name}</h4>
                  <p className="text-[9px] text-white/40 mt-1 leading-relaxed line-clamp-2">{item.description}</p>
                </div>
              </div>
            );
          } else {
            return (
              <div
                key={`${item.projectId}-${i}`}
                onClick={() => onSelectMod?.(item)}
                className="bg-surface/95 border border-border rounded-2xl p-4 flex flex-col gap-3.5 min-w-[200px] max-w-[200px] hover:border-border active:scale-[0.97] transition-all shadow-md"
              >
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/[0.08] flex items-center justify-center overflow-hidden flex-shrink-0">
                  {item.iconUrl ? (
                    <img src={item.iconUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white/40 font-bold uppercase">{item.title?.substring(0, 2) || "MD"}</span>
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white truncate">{item.title}</h4>
                  <p className="text-[9px] text-white/40 mt-1 line-clamp-2 leading-relaxed">{item.description}</p>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-white/[0.04] mt-0.5">
                  <span className="text-[9px] text-orange-400 capitalize">{item._source || "modrinth"}</span>
                  <span className="text-[9px] text-white/30 font-mono">#{String((i % items.length) + 1).padStart(2, "0")}</span>
                </div>
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
}

export const mockShowcaseVideos: ShowcaseVideo[] = [
  {
    videoId: "qX1tGg_FfL4",
    title: "10 Increíbles Mods que Cambiarán tu Minecraft 1.20.1",
    thumbnail: "https://i.ytimg.com/vi/qX1tGg_FfL4/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/watch?v=qX1tGg_FfL4",
    channelName: "@EnderVerseMC",
    publishedAt: "Hace 2 días"
  },
  {
    videoId: "UjQ9R_oEskc",
    title: "Minecraft pero con Gráficos Ultrarrealistas de Siguiente Gen",
    thumbnail: "https://i.ytimg.com/vi/UjQ9R_oEskc/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/watch?v=UjQ9R_oEskc",
    channelName: "@KreksuMinecraft",
    publishedAt: "Hace 1 semana"
  },
  {
    videoId: "N6eW21XpI7g",
    title: "Este mod añade jefes gigantescos a tu Survival",
    thumbnail: "https://i.ytimg.com/vi/N6eW21XpI7g/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/watch?v=N6eW21XpI7g",
    channelName: "@NoxusMods",
    publishedAt: "Hace 3 días"
  },
  {
    videoId: "gX_b1dKqHjA",
    title: "15 Trucos de Decoración Increíbles sin usar Mods",
    thumbnail: "https://i.ytimg.com/vi/gX_b1dKqHjA/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/watch?v=gX_b1dKqHjA",
    channelName: "@sir_color",
    publishedAt: "Hace 5 días"
  },
  {
    videoId: "p8Lscg2n6vQ",
    title: "Sobreviví 100 Días en el Mundo de Fantasía de Minecraft",
    thumbnail: "https://i.ytimg.com/vi/p8Lscg2n6vQ/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/watch?v=p8Lscg2n6vQ",
    channelName: "@Wero_lovernite",
    publishedAt: "Hace 2 semanas"
  }
];

export function HorizontalShowcaseMarquee({
  speed = 0.5,
  reverse = true
}: {
  speed?: number;
  reverse?: boolean;
}) {
  const duplicatedVideos = [...mockShowcaseVideos, ...mockShowcaseVideos, ...mockShowcaseVideos, ...mockShowcaseVideos];
  const { containerRef, innerRef, handlers } = useSmoothMarquee(speed, reverse, false);

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden mask-horizontal-edges cursor-pointer select-none py-1.5"
      {...handlers}
    >
      <div ref={innerRef} className="flex gap-4 w-max px-1">
        {duplicatedVideos.map((video, i) => (
          <a
            key={`${video.videoId}-${i}`}
            href={video.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ width: "180px", height: "255px" }}
            className="shrink-0 rounded-2xl relative group overflow-hidden flex flex-col cursor-pointer transition-all duration-300 hover:shadow-xl bg-surface/90 border border-border"
          >
            {/* Thumbnail */}
            <div style={{ height: "125px" }} className="relative overflow-hidden rounded-t-[calc(1rem-1px)] bg-black/40 shrink-0">
              <img
                src={video.thumbnail}
                alt={video.title}
                referrerPolicy="no-referrer"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                className="opacity-75 group-hover:opacity-95 transition-opacity duration-300"
              />

              {/* Gradient overlay */}
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(to bottom, transparent 30%, var(--color-surface) 100%)" }}
              />

              {/* YouTube badge */}
              <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-600/90 backdrop-blur-sm px-1.5 py-0.5 rounded-full z-10">
                <TvMinimalPlay className="w-2 h-2 text-white" />
                <span className="text-[7px] font-black text-white uppercase tracking-wider">YouTube</span>
              </div>

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
                  <span className="text-[7.5px] text-white/30 truncate">
                    · {video.publishedAt}
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-[10px] leading-tight line-clamp-4 mt-0.5 flex-1" style={{ color: "var(--color-foreground)" }}>
                {video.title}
              </h3>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

