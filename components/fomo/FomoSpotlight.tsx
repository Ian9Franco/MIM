"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Sparkles, Loader2, Download, ChevronRight, Clock, TrendingUp, Spotlight, Calendar, Library, CirclePlay } from "lucide-react";
import { COLORS } from "@/theme/tokens";
import { FomoSkeleton } from "./FomoSkeleton";
import { fetchCurseForgeFeatured, fetchOfficialCollections, fetchCollectionMods } from "@/services/api";
import type { ModHit, CollectionEntry } from "@/lib/types";
import { FomoYoutubeShowcase } from "./FomoYoutubeShowcase";
import { mimDB } from "@/lib/indexeddb";

interface FomoSpotlightProps {
  onOpenVersions: (mod: ModHit) => void;
  onOpenCollection?: (collection: CollectionEntry) => void;
  onDownloadMod: (mod: ModHit) => Promise<void>;
  downloading: Record<string, boolean>;
  selectedMods?: ModHit[];
  onToggleSelect?: (mod: ModHit) => void;
  sinytraActive?: boolean;
  loader?: string;
  gameVersion?: string;
  /** Canal de YouTube para el Showcase (default: EnderVerse) */
  showcaseChannelUrl?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Dynamic Typewriter Headline
// ─────────────────────────────────────────────────────────────────────────────
const HEADLINE_PHRASES = [
  { p1: "Explora las", h: "{tendencias}", p2: "de la comunidad" },
  { p1: "Y los", h: "{picks}", p2: "mensuales" }
];

function AnimatedHeadline() {
  const [index, setIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [blink, setBlink] = useState(true);

  useEffect(() => {
    if (subIndex === 0 && index === 0 && !isDeleting) {
      setSubIndex(1);
    }
  }, [subIndex, index, isDeleting]);

  useEffect(() => {
    const phrase = HEADLINE_PHRASES[index];
    const fullText = `${phrase.p1}\n${phrase.h}\n${phrase.p2}`;

    if (subIndex === fullText.length && !isDeleting) {
      const timeout = setTimeout(() => setIsDeleting(true), 5000); // Pausa de 5s
      return () => clearTimeout(timeout);
    }
    
    if (subIndex === 0 && isDeleting) {
      setIsDeleting(false);
      setIndex((prev) => (prev + 1) % HEADLINE_PHRASES.length);
      return;
    }
    
    const timeout = setTimeout(() => {
      setSubIndex((prev) => prev + (isDeleting ? -1 : 1));
    }, isDeleting ? 12 : 32);

    return () => clearTimeout(timeout);
  }, [subIndex, isDeleting, index]);

  useEffect(() => {
    const timeout = setInterval(() => setBlink((prev) => !prev), 500);
    return () => clearTimeout(timeout);
  }, []);

  const phrase = HEADLINE_PHRASES[index];
  const fullText = `${phrase.p1}\n${phrase.h}\n${phrase.p2}`;
  const currentText = fullText.substring(0, subIndex);
  const lines = currentText.split('\n');

  return (
    <h1 className="font-headline text-5xl xl:text-7xl leading-[1.1] tracking-tight text-white mb-6 min-h-[160px] xl:min-h-[230px]">
      {lines.map((line, i, arr) => {
        if (i === 1) {
          return (
            <React.Fragment key={i}>
              <span className="italic font-light text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-200">
                {line}
              </span>
              {i < arr.length - 1 && <br />}
            </React.Fragment>
          );
        }
        return (
          <React.Fragment key={i}>
            {line}
            {i < arr.length - 1 && <br />}
          </React.Fragment>
        );
      })}
      <span className={`inline-block w-[4px] h-[0.8em] bg-white ml-2 align-middle transition-opacity duration-100 ${blink ? 'opacity-100' : 'opacity-0'}`} />
    </h1>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Custom Spotlight Skeleton
// ─────────────────────────────────────────────────────────────────────────────
function SpotlightSkeleton() {
  return (
    <div className="flex-1 flex flex-col xl:flex-row h-full overflow-hidden p-6 gap-8">
      <style>{`
        @keyframes skel-typewriter {
          0% { width: 20%; }
          50% { width: 90%; }
          100% { width: 20%; }
        }
        @keyframes skel-pulse-scale {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(0.97); opacity: 0.1; }
        }
        @keyframes shimmer-bg {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .skel-line {
          animation: skel-typewriter 4s ease-in-out infinite, shimmer-bg 2s linear infinite;
          background: linear-gradient(90deg, rgba(255,255,255,0.02) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.02) 75%);
          background-size: 200% 100%;
        }
        .skel-card {
          animation: skel-pulse-scale 3s ease-in-out infinite, shimmer-bg 2s linear infinite;
          background: linear-gradient(135deg, rgba(255,255,255,0.02) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.02) 75%);
          background-size: 200% 100%;
        }
        
        /* Overrides para tema claro (Modern) */
        [data-theme="modern"] .skel-line {
          background: linear-gradient(90deg, rgba(0,0,0,0.05) 25%, rgba(0,0,0,0.12) 50%, rgba(0,0,0,0.05) 75%);
        }
        [data-theme="modern"] .skel-card {
          background: linear-gradient(135deg, rgba(0,0,0,0.05) 25%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.05) 75%);
        }
      `}</style>

      {/* Left Pane Skeleton */}
      <div className="flex-1 flex flex-col justify-between h-full relative xl:max-w-md 2xl:max-w-lg">
        <div className="mt-8 xl:mt-16 space-y-6">
          <div className="h-4 rounded-full mb-8 skel-line" style={{ animationDelay: "0s", animationDuration: "3s" }}></div>
          <div className="h-16 rounded-2xl skel-line" style={{ animationDelay: "0.2s", animationDuration: "5s" }}></div>
          <div className="h-16 rounded-2xl skel-line" style={{ animationDelay: "0.4s", animationDuration: "4s" }}></div>
          <div className="h-4 rounded-full mt-12 skel-line" style={{ animationDelay: "0.6s", animationDuration: "3.5s" }}></div>
          <div className="h-4 rounded-full mt-3 skel-line" style={{ animationDelay: "0.8s", animationDuration: "4.5s" }}></div>
        </div>
        <div className="mt-8 xl:mt-auto flex h-[40vh] xl:h-[280px] gap-4 pb-2">
          <div className="flex-1 rounded-[2rem] skel-card" style={{ animationDelay: "0s" }}></div>
          <div className="flex-1 rounded-[2rem] skel-card" style={{ animationDelay: "0.5s" }}></div>
        </div>
      </div>
      
      {/* Right Pane Skeleton */}
      <div className="flex-1 h-[70vh] xl:h-full relative rounded-[2.5rem] flex flex-col gap-6 py-6 p-4" style={{ background: "var(--glass-bg)", boxShadow: "var(--shadow-neomorphic-inner)" }}>
        <div className="flex-1 w-full flex items-center gap-6 overflow-hidden">
           <div className="w-[240px] xl:w-[260px] h-full max-h-[300px] rounded-[2rem] shrink-0 skel-card" style={{ animationDelay: "0s" }}></div>
           <div className="w-[240px] xl:w-[260px] h-full max-h-[300px] rounded-[2rem] shrink-0 skel-card" style={{ animationDelay: "0.2s" }}></div>
           <div className="w-[240px] xl:w-[260px] h-full max-h-[300px] rounded-[2rem] shrink-0 skel-card" style={{ animationDelay: "0.4s" }}></div>
        </div>
        <div className="flex-1 w-full flex items-center gap-6 overflow-hidden">
           <div className="w-[240px] xl:w-[260px] h-full max-h-[300px] rounded-[2rem] shrink-0 skel-card" style={{ animationDelay: "0.6s" }}></div>
           <div className="w-[240px] xl:w-[260px] h-full max-h-[300px] rounded-[2rem] shrink-0 skel-card" style={{ animationDelay: "0.8s" }}></div>
           <div className="w-[240px] xl:w-[260px] h-full max-h-[300px] rounded-[2rem] shrink-0 skel-card" style={{ animationDelay: "1s" }}></div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Smooth Marquee Hook
// ─────────────────────────────────────────────────────────────────────────────
function useSmoothMarquee(speed: number, reverse: boolean, isVertical: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const offset = useRef(0);
  const targetOffset = useRef(0);
  const isDragging = useRef(false);
  const startPos = useRef(0);
  const startOffset = useRef(0);
  const isHovered = useRef(false);
  const contentSize = useRef(0);

  useEffect(() => {
    let animationFrameId: number;
    const inner = innerRef.current;
    if (!inner) return;

    if (offset.current === 0 && targetOffset.current === 0 && reverse) {
       const initialHalf = (isVertical ? inner.scrollHeight : inner.scrollWidth) / 2;
       offset.current = initialHalf;
       targetOffset.current = initialHalf;
    }

    const step = () => {
      contentSize.current = isVertical ? inner.scrollHeight : inner.scrollWidth;
      const halfSize = contentSize.current / 2;

      if (!isDragging.current) {
        if (!isHovered.current) {
           targetOffset.current += reverse ? -speed : speed;
        }
        offset.current += (targetOffset.current - offset.current) * 0.08;
      } else {
        offset.current = targetOffset.current;
      }

      if (reverse) {
         if (offset.current <= 0) {
            offset.current += halfSize;
            targetOffset.current += halfSize;
         }
      } else {
         if (offset.current >= halfSize) {
            offset.current -= halfSize;
            targetOffset.current -= halfSize;
         }
      }

      if (isVertical) {
        inner.style.transform = `translateY(-${offset.current}px)`;
      } else {
        inner.style.transform = `translateX(-${offset.current}px)`;
      }

      animationFrameId = requestAnimationFrame(step);
    };

    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [speed, reverse, isVertical]);

  const handlers = {
    onMouseEnter: () => { isHovered.current = true; },
    onMouseLeave: () => { isDragging.current = false; isHovered.current = false; },
    onMouseDown: (e: React.MouseEvent) => {
      isDragging.current = true;
      startPos.current = isVertical ? e.pageY : e.pageX;
      startOffset.current = offset.current;
    },
    onMouseUp: () => { isDragging.current = false; },
    onMouseMove: (e: React.MouseEvent) => {
      if (!isDragging.current) return;
      e.preventDefault();
      const currentPos = isVertical ? e.pageY : e.pageX;
      const walk = (currentPos - startPos.current) * 1.5;
      targetOffset.current = startOffset.current - walk;
    },
    onWheel: (e: React.WheelEvent) => {
      const delta = isVertical ? e.deltaY : (e.deltaX || e.deltaY);
      targetOffset.current += delta;
    }
  };

  return { containerRef, innerRef, handlers };
}

// ─────────────────────────────────────────────────────────────────────────────
// Vertical Scrolling Ticker (Marquee Y) - Used for small items
// ─────────────────────────────────────────────────────────────────────────────
function VerticalTicker({ mods, onOpenVersions, speed = 1, color, reverse = false, globalLoader, theme }: { mods: ModHit[], onOpenVersions: (m: ModHit) => void, speed?: number, color?: string, reverse?: boolean, globalLoader?: string, theme?: string }) {
  const duplicatedMods = [...mods, ...mods, ...mods, ...mods, ...mods, ...mods, ...mods, ...mods];
  const { containerRef, innerRef, handlers } = useSmoothMarquee(speed, reverse, true);

  return (
    <div 
      ref={containerRef}
      className="relative h-full w-full overflow-hidden mask-vertical-edges cursor-grab active:cursor-grabbing"
      {...handlers}
    >
      <div ref={innerRef} className="flex flex-col gap-3 w-full px-2 pb-2">
        {duplicatedMods.map((mod, i) => {
          const knownLoaders = ["forge", "fabric", "neoforge", "quilt"];
          const loaderTag = mod.categories?.map((c: any) => {
            if (typeof c === "string") return c;
            if (c && typeof c === "object" && typeof c.name === "string") return c.name;
            return "";
          }).find((c: string) => c && knownLoaders.includes(c.toLowerCase())) || globalLoader;
          const pType = mod.projectType === "mod" ? "Mod" : mod.projectType === "resourcepack" ? "Texture" : mod.projectType === "shader" ? "Shader" : mod.projectType;

          return (
            <div 
              key={`${mod.projectId}-${i}`} 
              className="spotlight-ec-mini-card group" 
              onClick={() => onOpenVersions(mod)}
            >
              {/* Corner brackets at the card level */}
              <span className="spotlight-ec-mini-bracket spotlight-ec-mini-bracket--tl" />
              <span className="spotlight-ec-mini-bracket spotlight-ec-mini-bracket--bl" />

              <div className="spotlight-ec-mini-image-zone">
                <span className="spotlight-ec-mini-number">{String((i % 99) + 1).padStart(2, "0")}</span>
                
                {mod.iconUrl ? (
                  <img src={mod.iconUrl} alt="" className="w-full h-full object-cover rounded-md" />
                ) : (
                  <span className="font-headline text-[10px] font-black text-white/30 uppercase">
                    {mod.title.substring(0, 2)}
                  </span>
                )}
              </div>
              
              <div className="spotlight-ec-mini-text-zone">
                <p className={`spotlight-ec-mini-title transition-colors group-hover:${color}`}>
                  {mod.title}
                </p>
                <div className="spotlight-ec-mini-meta">
                  {pType && <span className="spotlight-ec-mini-badge">{pType}</span>}
                  {loaderTag && (
                    <span 
                      className="spotlight-ec-mini-badge" 
                      style={{ 
                        color: loaderTag.toLowerCase() === "fabric" ? "#fbbf24" : 
                               loaderTag.toLowerCase() === "forge" ? "#f87171" : "#38bdf8" 
                      }}
                    >
                      {loaderTag}
                    </span>
                  )}
                  {!pType && !loaderTag && (
                    <span className="font-caption text-[8px] truncate opacity-50">
                      {mod.author}
                    </span>
                  )}
                </div>
              </div>
              <div className="spotlight-ec-mini-dots" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Horizontal Scrolling Marquee - Used for big cards
// ─────────────────────────────────────────────────────────────────────────────
function HorizontalEditorialMarquee({ 
  title, 
  items, 
  type = "mod",
  onOpenVersions, 
  onOpenCollection,
  onDownload, 
  downloading, 
  speed = 1, 
  reverse = false, 
  accentColor, 
  globalLoader,
  theme
}: any) {
  // Para un loop infinito seamless: exactamente 2 copias.
  // El hook resetea al llegar a halfSize (mitad del contenido = 1 copia).
  // Como copia1 = copia2, el salte es invisible.
  const duplicatedItems = [...items, ...items];
  const { containerRef, innerRef, handlers } = useSmoothMarquee(speed, reverse, false);

  return (
    <div className="relative w-full h-full flex flex-col group/marquee">
      {/* Title */}
      {title && (
        <div className="px-8 mb-3 flex items-center gap-3">
          <span className="px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase bg-white/5 text-white/80 border border-white/10 shadow-sm backdrop-blur-md">
            {title}
          </span>
        </div>
      )}

      <div 
        ref={containerRef}
        className="relative w-full flex-1 overflow-hidden mask-horizontal-edges cursor-grab active:cursor-grabbing"
        {...handlers}
      >
        <div ref={innerRef} className="flex gap-6 w-max px-4 py-2 h-full">
          {duplicatedItems.map((item: any, i: number) => (
            type === "collection" ? (
              <SpotlightCollectionCard
                key={`${item.id}-${i}`}
                collection={item}
                onClick={() => onOpenCollection?.(item)}
                accentColor={accentColor}
                index={i % items.length}
                theme={theme}
              />
            ) : (
              <SpotlightEditorialCard
                key={`${item.projectId}-${i}`}
                mod={item}
                onOpenVersions={onOpenVersions}
                onDownload={onDownload}
                isDownloading={!!downloading[item.projectId]}
                accentColor={item.color || accentColor}
                globalLoader={globalLoader}
                index={i % items.length}
                theme={theme}
              />
            )
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Square Editorial Card for Collections
// ─────────────────────────────────────────────────────────────────────────────
function SpotlightCollectionCard({
  collection,
  onClick,
  accentColor = COLORS.primary,
  index = 0,
  theme
}: {
  collection: CollectionEntry;
  onClick: () => void;
  accentColor?: string;
  index?: number;
  theme?: string;
}) {
  const [imgError, setImgError] = React.useState(false);
  const cardNum = String((index % 999) + 1).padStart(3, "0");
  const isCurseForge = collection.source === "curseforge";
  const isModern = theme === "modern";
  const isVampire = theme === "vampire";

  const cardBg = isModern ? "#f0ede3" : isVampire ? "#1a1525" : "hsl(220 14% 10%)";
  const cardBorder = isModern ? "1.5px solid #d4cfc0" : isVampire ? "1.5px solid rgba(187, 150, 228, 0.15)" : "1.5px solid hsl(220 14% 18%)";
  const cardShadow = isModern ? "0 10px 40px rgba(0,0,0,0.08)" : isVampire ? "0 4px 32px rgba(187, 150, 228, 0.1)" : "0 4px 32px rgba(0,0,0,0.5)";

  const sepColor = isModern ? "1px solid #d4cfc0" : isVampire ? "1px solid rgba(187, 150, 228, 0.15)" : "1px solid hsl(220 14% 18%)";
  const numColor = isModern ? "hsl(30 20% 40%)" : isVampire ? "rgba(187, 150, 228, 0.5)" : "hsl(220 14% 40%)";
  const sepColorThick = isModern ? "1.5px solid #d4cfc0" : isVampire ? "1.5px solid rgba(187, 150, 228, 0.15)" : "1.5px solid hsl(220 14% 18%)";
  
  const bracketColor = isModern ? "rgba(0,0,0,0.25)" : isVampire ? "rgba(187, 150, 228, 0.3)" : "rgba(255,255,255,0.2)";
  const iconBorder = isModern ? "rgba(0,0,0,0.12)" : isVampire ? "rgba(187, 150, 228, 0.2)" : "rgba(255,255,255,0.1)";
  const iconBg = isModern ? "rgba(0,0,0,0.06)" : isVampire ? "rgba(187, 150, 228, 0.05)" : "rgba(255,255,255,0.05)";
  const iconFallback = isModern ? "rgba(0,0,0,0.3)" : isVampire ? "rgba(187, 150, 228, 0.3)" : "rgba(255,255,255,0.3)";
  
  const titleColor = isModern ? "hsl(30 20% 15%)" : isVampire ? "#DEDEDE" : "hsl(0 0% 92%)";
  const authorColor = isModern ? "hsl(30 20% 45%)" : isVampire ? "#BB96E4" : "hsl(220 14% 45%)";
  const statColor = isModern ? "hsl(30 20% 50%)" : isVampire ? "rgba(187, 150, 228, 0.6)" : "hsl(220 14% 40%)";
  const dotColor = isModern ? "rgba(0,0,0,0.2)" : isVampire ? "rgba(187, 150, 228, 0.3)" : "rgba(255,255,255,0.15)";

  return (
    <div
      className="w-[190px] xl:w-[210px] h-[300px] shrink-0 rounded-[1.5rem] relative group cursor-pointer overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl flex flex-col"
      style={{
        background: cardBg,
        border: cardBorder,
        boxShadow: cardShadow,
      }}
      onClick={onClick}
    >
      {/* Top label row — Estilo Showcase */}
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5" style={{ borderBottom: sepColor }}>
        <span 
          className="text-[8px] font-black uppercase tracking-[0.25em] flex items-center gap-1" 
          style={{ color: isCurseForge ? "#f87171" : "#4ade80" }}
        >
          <CirclePlay className="w-2 h-2" />
          {isCurseForge ? "CurseForge" : "Modrinth"}
        </span>
        <span className="text-[8px] font-black tabular-nums" style={{ color: numColor }}>
          {cardNum}
        </span>
      </div>

      {/* Visual area */}
      <div
        className="relative flex items-center justify-center"
        style={{ height: "160px", borderBottom: sepColorThick }}
      >
        {/* Bracket corners */}
        {[["top-2 left-2", "border-t-2 border-l-2"], ["top-2 right-2", "border-t-2 border-r-2"], ["bottom-2 left-2", "border-b-2 border-l-2"], ["bottom-2 right-2", "border-b-2 border-r-2"]].map(([pos, borders], i) => (
          <div key={i} className={`absolute ${pos} w-3 h-3 ${borders}`} style={{ borderColor: bracketColor }} />
        ))}

        <div className="relative w-28 h-28 rounded-2xl overflow-hidden border flex items-center justify-center shadow-lg transition-transform duration-500 group-hover:scale-110" style={{ borderColor: iconBorder, background: iconBg }}>
          {!imgError && collection.iconUrl ? (
            <img src={collection.iconUrl} alt="" className="w-full h-full object-cover" onError={() => setImgError(true)} />
          ) : (
            <div className="text-2xl font-black" style={{ color: iconFallback }}>
              {collection.name.substring(0, 2).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* Text area */}
      <div className="flex-1 flex flex-col p-3 gap-1 relative">
        <h3 className="font-headline text-sm leading-tight line-clamp-2" style={{ color: titleColor }}>
          {collection.name}
        </h3>
        <p className="text-[8px] font-black uppercase tracking-[0.2em] mt-0.5" style={{ color: authorColor }}>
          {collection.projectCount || 0} PROYECTOS
        </p>

        <div className="flex items-center justify-between mt-auto pt-2" style={{ borderTop: sepColor }}>
          <span className="text-[7.5px] font-black uppercase tracking-widest" style={{ color: statColor }}>
            Colección
          </span>
          <div className="flex gap-0.5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="w-1 h-1 rounded-full" style={{ background: dotColor }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Square Editorial Card
// ─────────────────────────────────────────────────────────────────────────────
function SpotlightEditorialCard({ 
  mod, 
  onOpenVersions, 
  onDownload, 
  isDownloading,
  accentColor = COLORS.primary,
  globalLoader,
  index = 0,
  theme
}: { 
  mod: ModHit & { versions?: string[] }; 
  onOpenVersions: (m: ModHit) => void;
  onDownload: (m: ModHit) => void;
  isDownloading: boolean;
  accentColor?: string;
  globalLoader?: string;
  index?: number;
  theme?: string;
}) {
  const cardNum = String((index % 999) + 1).padStart(3, "0");
  const isCurseForge = mod.url?.includes("curseforge.com") || mod._source === "curseforge";
  const isModern = theme === "modern";
  const isVampire = theme === "vampire";

  const dls = mod.downloads >= 1_000_000 
    ? `${(mod.downloads / 1_000_000).toFixed(1)}M` 
    : mod.downloads >= 1_000 
    ? `${Math.round(mod.downloads / 1_000)}K` 
    : mod.downloads;

  const cardBg = isModern ? "#f0ede3" : isVampire ? "#1a1525" : "hsl(220 14% 10%)";
  const cardBorder = isModern ? "1.5px solid #d4cfc0" : isVampire ? "1.5px solid rgba(187, 150, 228, 0.15)" : "1.5px solid hsl(220 14% 18%)";
  const cardShadow = isModern ? "0 10px 40px rgba(0,0,0,0.08)" : isVampire ? "0 4px 32px rgba(187, 150, 228, 0.1)" : "0 4px 32px rgba(0,0,0,0.5)";

  const sepColor = isModern ? "1px solid #d4cfc0" : isVampire ? "1px solid rgba(187, 150, 228, 0.15)" : "1px solid hsl(220 14% 18%)";
  const numColor = isModern ? "hsl(30 20% 40%)" : isVampire ? "rgba(187, 150, 228, 0.5)" : "hsl(220 14% 40%)";
  const sepColorThick = isModern ? "1.5px solid #d4cfc0" : isVampire ? "1.5px solid rgba(187, 150, 228, 0.15)" : "1.5px solid hsl(220 14% 18%)";
  
  const bracketColor = isModern ? "rgba(0,0,0,0.25)" : isVampire ? "rgba(187, 150, 228, 0.3)" : "rgba(255,255,255,0.2)";
  const iconBorder = isModern ? "rgba(0,0,0,0.12)" : isVampire ? "rgba(187, 150, 228, 0.2)" : "rgba(255,255,255,0.1)";
  const iconBg = isModern ? "rgba(0,0,0,0.06)" : isVampire ? "rgba(187, 150, 228, 0.05)" : "rgba(255,255,255,0.05)";
  const iconFallback = isModern ? "rgba(0,0,0,0.3)" : isVampire ? "rgba(187, 150, 228, 0.3)" : "rgba(255,255,255,0.3)";
  
  const titleColor = isModern ? "hsl(30 20% 15%)" : isVampire ? "#DEDEDE" : "hsl(0 0% 92%)";
  const authorColor = isModern ? "hsl(30 20% 45%)" : isVampire ? "#BB96E4" : "hsl(220 14% 45%)";
  const statColor = isModern ? "hsl(30 20% 50%)" : isVampire ? "rgba(187, 150, 228, 0.6)" : "hsl(220 14% 40%)";
  const dotColor = isModern ? "rgba(0,0,0,0.2)" : isVampire ? "rgba(187, 150, 228, 0.3)" : "rgba(255,255,255,0.15)";
  const dlBtnBg = isModern ? "rgba(0,0,0,0.7)" : isVampire ? "rgba(187, 150, 228, 0.2)" : "rgba(255,255,255,0.15)";

  return (
    <div
      className="w-[190px] xl:w-[210px] h-[300px] shrink-0 rounded-[1.5rem] relative group cursor-pointer overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl flex flex-col"
      style={{
        background: cardBg,
        border: cardBorder,
        boxShadow: cardShadow,
      }}
      onClick={() => onOpenVersions(mod)}
    >
      {/* Top label row — Estilo Showcase */}
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5" style={{ borderBottom: sepColor }}>
        <span 
          className="text-[8px] font-black uppercase tracking-[0.25em] flex items-center gap-1" 
          style={{ color: isCurseForge ? "#f87171" : "#4ade80" }}
        >
          <CirclePlay className="w-2 h-2" />
          {isCurseForge ? "CurseForge" : "Modrinth"}
        </span>
        <span className="text-[8px] font-black tabular-nums" style={{ color: numColor }}>
          {cardNum}
        </span>
      </div>

      {/* Visual area */}
      <div
        className="relative flex items-center justify-center"
        style={{ height: "160px", borderBottom: sepColorThick }}
      >
        {/* Bracket corners */}
        {[["top-2 left-2", "border-t-2 border-l-2"], ["top-2 right-2", "border-t-2 border-r-2"], ["bottom-2 left-2", "border-b-2 border-l-2"], ["bottom-2 right-2", "border-b-2 border-r-2"]].map(([pos, borders], i) => (
          <div key={i} className={`absolute ${pos} w-3 h-3 ${borders}`} style={{ borderColor: bracketColor }} />
        ))}

        <div className="relative w-28 h-28 rounded-2xl overflow-hidden border flex items-center justify-center shadow-lg transition-transform duration-500 group-hover:scale-110" style={{ borderColor: iconBorder, background: iconBg }}>
          {mod.iconUrl ? (
            <img src={mod.iconUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="text-2xl font-black" style={{ color: iconFallback }}>
              {mod.title.substring(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        {/* Download button */}
        <button
          onClick={(e) => { e.stopPropagation(); onDownload(mod); }}
          disabled={isDownloading}
          className="absolute bottom-3 right-3 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 active:scale-90"
          style={{ background: dlBtnBg, backdropFilter: "blur(8px)" }}
        >
          {isDownloading ? <Loader2 className="w-3 h-3 animate-spin text-white" /> : <Download className="w-3 h-3 text-white" />}
        </button>
      </div>

      {/* Text area */}
      <div className="flex-1 flex flex-col p-3 gap-1 relative">
        <h3 className="font-headline text-sm leading-tight line-clamp-2" style={{ color: titleColor }}>
          {mod.title}
        </h3>
        <p className="text-[8px] font-black uppercase tracking-[0.2em] mt-0.5" style={{ color: authorColor }}>
          {mod.author}
        </p>

        <div className="flex items-center justify-between mt-auto pt-2" style={{ borderTop: sepColor }}>
          <span className="text-[7.5px] font-black uppercase tracking-widest" style={{ color: statColor }}>
            {dls} ↓
          </span>
          <div className="flex gap-0.5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="w-1 h-1 rounded-full" style={{ background: dotColor }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Spotlight Component
// ─────────────────────────────────────────────────────────────────────────────
export function FomoSpotlight({
  onOpenVersions,
  onOpenCollection,
  onDownloadMod,
  downloading,
  loader = "forge",
  gameVersion = "1.20.1",
  sinytraActive = false,
  showcaseChannelUrl = "https://www.youtube.com/@EnderVerseMC",
}: FomoSpotlightProps) {
  const [activePlatform, setActivePlatform] = useState<"modrinth" | "curseforge">("modrinth");
  const [cfPicks, setCfPicks] = useState<CollectionEntry[]>([]);
  const [cfPopular, setCfPopular] = useState<ModHit[]>([]);
  const [cfRecent, setCfRecent] = useState<ModHit[]>([]);
  const [newestMods, setNewestMods] = useState<ModHit[]>([]);
  const [latestCollection, setLatestCollection] = useState<CollectionEntry | null>(null);
  const [latestCollectionMods, setLatestCollectionMods] = useState<ModHit[]>([]);
  const [loading, setLoading] = useState(true);
  const [latestCfCollection, setLatestCfCollection] = useState<CollectionEntry | null>(null);
  const [latestCfMods, setLatestCfMods] = useState<ModHit[]>([]);

  const [currentTheme, setCurrentTheme] = useState("official");
  useEffect(() => {
    const update = () => setCurrentTheme(document.documentElement.getAttribute("data-theme") || "official");
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  const isModern = currentTheme === "modern";
  const isVampire = currentTheme === "vampire";

  // Compute styles for the right pane container
  const paneBg = isModern 
    ? "linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(240,237,227,0.4) 100%)" 
    : isVampire 
    ? "linear-gradient(135deg, rgba(30,22,45,0.75) 0%, rgba(15,10,25,0.5) 100%)" 
    : "linear-gradient(135deg, rgba(40,40,40,0.6) 0%, rgba(15,15,15,0.4) 100%)";

  const paneBorder = isModern 
    ? "1px solid rgba(255,255,255,0.9)" 
    : isVampire 
    ? "1px solid rgba(187,150,228,0.25)" 
    : "1px solid rgba(255,255,255,0.08)";

  const paneShadow = isModern 
    ? "0 30px 60px rgba(0,0,0,0.08), inset 0 2px 5px rgba(255,255,255,1), inset 0 -5px 20px rgba(0,0,0,0.03)" 
    : isVampire 
    ? "0 30px 60px rgba(0,0,0,0.6), inset 0 2px 4px rgba(187,150,228,0.4), inset 0 -5px 20px rgba(0,0,0,0.5)" 
    : "0 30px 60px rgba(0,0,0,0.6), inset 0 2px 4px rgba(255,255,255,0.15), inset 0 -5px 20px rgba(0,0,0,0.5)";

  // El cache se carga sincrónicamente en el useState para evitar flickeos de UI

  useEffect(() => {
    const loadCache = async () => {
      try {
        await mimDB.init();
        
        let cachedPicks = null;
        let cachedMods = null;
        
        const cachePicksEntry = await mimDB.getCache("fomo_cf_picks");
        const cacheModsEntry = await mimDB.getCache("fomo_modrinth_mods");
        
        if (cachePicksEntry?.data) cachedPicks = cachePicksEntry.data;
        if (cacheModsEntry?.data) cachedMods = cacheModsEntry.data;
        
        const lsPicks = localStorage.getItem("fomo_cf_picks");
        const lsMods = localStorage.getItem("fomo_modrinth_mods");
        
        if (!cachedPicks && lsPicks) {
          try {
            cachedPicks = JSON.parse(lsPicks);
            await mimDB.setCache("fomo_cf_picks", cachedPicks, 12 * 60 * 60 * 1000);
            localStorage.removeItem("fomo_cf_picks");
          } catch (e) {}
        }
        
        if (!cachedMods && lsMods) {
          try {
            cachedMods = JSON.parse(lsMods);
            await mimDB.setCache("fomo_modrinth_mods", cachedMods, 12 * 60 * 60 * 1000);
            localStorage.removeItem("fomo_modrinth_mods");
          } catch (e) {}
        }
        
        if (cachedPicks) setCfPicks(cachedPicks);
        if (cachedMods) setLatestCollectionMods(cachedMods);
        
        if (cachedPicks || cachedMods) {
          setLoading(false);
        }
      } catch (err) {
        console.error("Error loading spotlight cache from IndexedDB", err);
      }
    };
    loadCache();
  }, []);

  const loadSpotlight = useCallback(async () => {
    try {
      const cachePicksEntry = await mimDB.getCache("fomo_cf_picks");
      const cacheModsEntry = await mimDB.getCache("fomo_modrinth_mods");
      
      if (!cachePicksEntry?.data && !cacheModsEntry?.data) {
        setLoading(true);
      }
      
      // 1. Fetch CurseForge Community Picks (Collections)
      const picksRes = await fetch("/api/curseforge/picks");
      if (picksRes.ok) {
        const d = await picksRes.json();
        const picks = d.picks || [];
        setCfPicks(picks);
        await mimDB.setCache("fomo_cf_picks", picks, 12 * 60 * 60 * 1000);
        
        // Pick the latest CurseForge collection to feature its mods
        if (picks.length > 0) {
          const latest = picks[0];
          setLatestCfCollection(latest);
          const cfModsRes = await fetch(`/api/curseforge/picks/${latest.slug}`);
          if (cfModsRes.ok) {
            const md = await cfModsRes.json();
            setLatestCfMods(md.mods || []);
          }
        }
      }

      // 2. We fetch contextual popular and recent from CurseForge
      const cLoader = loader === "fabric" ? "Fabric" : loader === "neoforge" ? "NeoForge" : "Forge";
      
      const cfPopPromise = fetch(`/api/curseforge/discover?sortField=6&sortOrder=desc&gameVersion=${gameVersion}&modLoaderType=${cLoader}`).then(r => r.json());
      const cfRecPromise = fetch(`/api/curseforge/discover?sortField=2&sortOrder=desc&gameVersion=${gameVersion}&modLoaderType=${cLoader}`).then(r => r.json());
      
      // 3. We fetch contextual newest from Modrinth
      const mdLoader = (sinytraActive && (loader === "forge" || loader === "neoforge")) ? "[\"categories:forge\",\"categories:fabric\"]" : `["categories:${loader}"]`;
      const facets = `[${mdLoader},["versions:${gameVersion}"]]`;
      const mdNewPromise = fetch(`https://api.modrinth.com/v2/search?index=newest&limit=10&facets=${encodeURIComponent(facets)}`).then(r => r.json());

      // 4. We fetch the Modrinth official collections (global)
      const collPromise = fetchOfficialCollections();

      const [popData, recData, newMdData, collsData] = await Promise.all([cfPopPromise, cfRecPromise, mdNewPromise, collPromise]);

      if (popData?.mods) setCfPopular(popData.mods.map((m: any) => ({ ...m, _source: "curseforge" })));
      if (recData?.mods) {
        setCfRecent(recData.mods.map((m: any) => ({ ...m, projectType: m.projectType || "mod", _source: "curseforge" })));
      }
      
      if (newMdData?.hits) {
        const mapped = newMdData.hits.map((m: any) => ({
          projectId: m.project_id,
          slug: m.slug,
          title: m.title,
          description: m.description,
          iconUrl: m.icon_url,
          author: m.author,
          downloads: m.downloads,
          projectType: m.project_type,
          categories: m.categories,
          versions: m.versions,
          url: `https://modrinth.com/${m.project_type}/${m.slug}`,
          _source: "modrinth"
        }));
        setNewestMods(mapped);
      }

      if (collsData?.collections && collsData.collections.length > 0) {
        // Tomamos siempre la última colección (la más reciente)
        const latestColl = collsData.collections[0];
        setLatestCollection(latestColl);
        
        const modsData = await fetchCollectionMods(latestColl.id);
        let allMods = modsData.mods ? [...modsData.mods] : [];

        // Añadimos otras 3 colecciones aleatorias para que el carrusel sea muy largo
        const otherColls = collsData.collections.slice(1);
        if (otherColls.length > 0) {
          // Mezclamos y tomamos 3
          const shuffledColls = [...otherColls].sort(() => Math.random() - 0.5).slice(0, 3);
          for (const coll of shuffledColls) {
            const moreModsData = await fetchCollectionMods(coll.id);
            if (moreModsData.mods) {
              allMods.push(...moreModsData.mods);
            }
          }
        }
        
        const mappedMods = allMods.map((m: any) => ({ ...m, _source: "modrinth" }));
        setLatestCollectionMods(mappedMods);
        await mimDB.setCache("fomo_modrinth_mods", mappedMods, 12 * 60 * 60 * 1000);
      }

    } catch (e) {
      console.error("Error loading spotlight", e);
    } finally {
      setLoading(false);
    }
  }, [loader, gameVersion, sinytraActive]);

  useEffect(() => { loadSpotlight(); }, [loadSpotlight]);

  if (loading) {
    return <SpotlightSkeleton />;
  }

  const modrinthMods = latestCollectionMods.map(m => ({ ...m, color: "#1ED760" }));
  const curseForgeFeaturedMods = latestCfMods.map(m => ({ ...m, color: "#f87171" }));

  return (
    <div className="flex-1 flex flex-col xl:flex-row h-full overflow-hidden p-6 gap-8 animate-fade-in">
      
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* LEFT PANE: Typography & Trending (Vertical Tickers) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-between h-full relative xl:max-w-md 2xl:max-w-lg">
        {/* Editorial Header */}
        <div className="mt-8 xl:mt-16 shrink-0">
          <p className="font-mono text-xs uppercase tracking-widest opacity-60 mb-6 flex items-center gap-2">
            <Spotlight className="w-4 h-4" /> Editorial
          </p>
          <AnimatedHeadline />
          <p className="font-caption text-sm xl:text-base opacity-60 leading-relaxed">
            Explora las colecciones dinámicas de CurseForge y Modrinth. Te traemos los mejores mods curados mes a mes.
          </p>
        </div>

        {/* Bottom Area: Vertical Tickers side-by-side */}
        <div className="mt-8 xl:mt-auto flex h-[40vh] xl:h-[280px] gap-4 pb-2">
          
          {/* Recently Updated Ticker (Y) */}
          {cfRecent.length > 0 && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <h3 className="font-subhead text-xs text-white/80 tracking-wide mb-3 flex items-center gap-2 shrink-0">
                <Clock className="w-3.5 h-3.5 text-blue-400" /> Actualizados
              </h3>
              <div className="flex-1 relative">
                <VerticalTicker 
                  mods={cfRecent} 
                  onOpenVersions={onOpenVersions} 
                  speed={0.5} 
                  color="text-blue-400" 
                  reverse={true}
                  theme={currentTheme}
                />
              </div>
            </div>
          )}

          {/* Newest Created Ticker (Y) */}
          {newestMods.length > 0 && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <h3 className="font-subhead text-xs text-white/80 tracking-wide mb-3 flex items-center gap-2 shrink-0">
                <Calendar className="w-3.5 h-3.5 text-purple-400" /> Recién Creados
              </h3>
              <div className="flex-1 relative">
                <VerticalTicker 
                  mods={newestMods} 
                  onOpenVersions={onOpenVersions} 
                  speed={0.6} 
                  color="text-purple-400" 
                  theme={currentTheme}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* RIGHT PANE: Horizontal Editorial Marquees (Stacked) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div 
        className="flex-1 h-[70vh] xl:h-full relative rounded-[2.5rem] overflow-hidden flex flex-col gap-6 py-6" 
        style={{ 
          background: paneBg,
          border: paneBorder,
          boxShadow: paneShadow,
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)"
        }}
      >
        {/* Decorative Glass Highlights and Ambient Glow */}
        <div 
          className="absolute inset-x-0 top-0 h-px w-full z-0 opacity-70" 
          style={{ 
            background: isModern 
              ? "linear-gradient(90deg, transparent, rgba(255,255,255,1), transparent)" 
              : isVampire 
              ? "linear-gradient(90deg, transparent, rgba(187,150,228,0.8), transparent)" 
              : "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)" 
          }} 
        />
        <div 
          className="absolute -top-40 -left-40 w-96 h-96 rounded-full blur-[120px] opacity-30 pointer-events-none z-0" 
          style={{ background: isModern ? "#ffffff" : isVampire ? "#bb96e4" : "#ffffff" }} 
        />
        
        {/* Row 1 & 2 Toggled: Modrinth / CurseForge */}
        <div className="flex-1 w-full min-h-0 flex flex-col relative z-10">
          {/* Header with Toggle */}
          <div className="px-8 mb-3 flex items-center justify-between">
            <span className="px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase bg-white/5 text-white/80 border border-white/10 shadow-sm backdrop-blur-md">
              {activePlatform === "modrinth" 
                ? (latestCollection?.name || "Modrinth Picks")
                : "CurseForge Community Picks"}
            </span>
            
            {/* Toggle Button */}
            <button
              onClick={() => setActivePlatform(activePlatform === "modrinth" ? "curseforge" : "modrinth")}
              className="flex items-center gap-1 px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase bg-white/5 text-white/80 border border-white/10 shadow-sm backdrop-blur-md hover:bg-white/10 transition-colors"
            >
              <span>{activePlatform === "modrinth" ? "Ver CurseForge" : "Ver Modrinth"}</span>
              <ChevronRight className={`w-3 h-3 transform transition-transform ${activePlatform === "curseforge" ? "rotate-180" : ""}`} />
            </button>
          </div>

          {/* Marquee Content */}
          <div className="flex-1 w-full min-h-0">
            {activePlatform === "modrinth" ? (
              <HorizontalEditorialMarquee 
                items={modrinthMods} 
                type="mod"
                onOpenVersions={onOpenVersions} 
                onDownload={onDownloadMod} 
                downloading={downloading} 
                speed={0.7}
                reverse={true} 
                globalLoader={loader}
                theme={currentTheme}
              />
            ) : (
              <HorizontalEditorialMarquee 
                items={cfPicks} 
                type="collection"
                onOpenCollection={onOpenCollection}
                speed={0.6}
                reverse={true} 
                accentColor={COLORS.primary}
                theme={currentTheme}
              />
            )}
          </div>
        </div>

        {/* Row 3: YouTube Showcase — solo el último video de EnderVerse */}
        <div className="w-full shrink-0 pb-2">
          <FomoYoutubeShowcase
            channelUrl={showcaseChannelUrl}
            onOpenVersions={onOpenVersions}
            onDownloadMod={onDownloadMod}
            downloading={downloading}
            globalLoader={loader}
            theme={currentTheme}
          />
        </div>
      </div>

    </div>
  );
}
