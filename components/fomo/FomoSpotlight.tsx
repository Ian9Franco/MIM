"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Sparkles, Loader2, Download, ChevronRight, Clock, TrendingUp, Spotlight, Calendar, Heart } from "lucide-react";
import { COLORS } from "@/theme/tokens";
import { FomoSkeleton } from "./FomoSkeleton";
import { fetchCurseForgeFeatured, fetchOfficialCollections, fetchCollectionMods } from "@/services/api";
import type { ModHit, CollectionEntry } from "@/lib/types";

interface FomoSpotlightProps {
  onOpenVersions: (mod: ModHit) => void;
  onDownloadMod: (mod: ModHit) => Promise<void>;
  downloading: Record<string, boolean>;
  selectedMods?: ModHit[];
  onToggleSelect?: (mod: ModHit) => void;
  sinytraActive?: boolean;
  loader?: string;
  gameVersion?: string;
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
    <h1 className="font-headline text-4xl xl:text-5xl 2xl:text-6xl leading-[1.1] tracking-tight text-white mb-2 min-h-[110px] xl:min-h-[150px]">
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
// Custom Spotlight Skeleton (improved)
// ─────────────────────────────────────────────────────────────────────────────
function SpotlightSkeleton({ theme = "official" }: { theme?: string }) {
  const isModern = theme === "modern";
  const rightPaneBg = isModern 
    ? "linear-gradient(135deg, rgba(238, 241, 245, 0.95) 0%, rgba(224, 228, 234, 0.8) 100%)" 
    : "var(--glass-bg)";
  const rightPaneBorder = isModern 
    ? "1px solid rgba(255, 255, 255, 0.9)" 
    : "1px solid rgba(255, 255, 255, 0.05)";
  const rightPaneShadow = isModern 
    ? "0 20px 40px -10px rgba(13, 39, 80, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.9), inset 0 0 30px rgba(255, 255, 255, 0.8)" 
    : "0 32px 64px -16px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.06), inset 0 0 40px rgba(0, 0, 0, 0.3)";

  return (
    <div className="flex-1 flex flex-col xl:flex-row h-full overflow-hidden p-6 gap-8">
      <style>{`
        @keyframes skel-typewriter {
          0% { width: 20%; }
          50% { width: 90%; }
          100% { width: 20%; }
        }
        @keyframes skel-pulse-scale {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(0.98); opacity: 0.6; }
        }
        @keyframes shimmer-bg {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .skel-line {
          animation: skel-typewriter 5s ease-in-out infinite, shimmer-bg 3s linear infinite;
          background: ${isModern 
            ? "linear-gradient(90deg, rgba(13,39,80,0.03) 25%, rgba(13,39,80,0.09) 50%, rgba(13,39,80,0.03) 75%)" 
            : "linear-gradient(90deg, rgba(255,255,255,0.01) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.01) 75%)"};
          background-size: 200% 100%;
        }
        .skel-card {
          animation: skel-pulse-scale 2.5s ease-in-out infinite, float-slow 4s ease-in-out infinite;
          background: ${isModern 
            ? "linear-gradient(135deg, rgba(13,39,80,0.04) 25%, rgba(13,39,80,0.1) 50%, rgba(13,39,80,0.04) 75%)" 
            : "linear-gradient(135deg, rgba(255,255,255,0.02) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.02) 75%)"};
          background-size: 200% 100%;
          position: relative;
          overflow: hidden;
          border: ${isModern ? "1px solid rgba(13,39,80,0.05)" : "none"};
        }
        .skel-card::after {
          content: '';
          position: absolute;
          inset: 0;
          background: ${isModern 
            ? "linear-gradient(90deg, transparent, rgba(13,39,80,0.06), transparent)" 
            : "linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)"};
          transform: translateX(-100%);
          animation: shimmer-bg 2s linear infinite;
        }
      `}</style>

      {/* Left Pane Skeleton */}
      <div className="flex-1 flex flex-col justify-between h-full relative xl:max-w-[400px] 2xl:max-w-[440px]">
        <div className="mt-2 xl:mt-4 space-y-4">
          <div className="h-4 w-24 rounded-full mb-4 skel-line" style={{ animationDelay: "0s" }}></div>
          <div className="h-14 rounded-2xl skel-line" style={{ animationDelay: "0.15s" }}></div>
          <div className="h-14 rounded-2xl skel-line" style={{ animationDelay: "0.3s" }}></div>
          <div className="h-3 w-48 rounded-full mt-10 skel-line" style={{ animationDelay: "0.45s" }}></div>
          <div className="h-3 w-36 rounded-full mt-2 skel-line" style={{ animationDelay: "0.6s" }}></div>
        </div>
        <div className="mt-8 xl:mt-auto flex h-[40vh] xl:h-[280px] gap-4 pb-2">
          <div className="flex-1 rounded-[2rem] skel-card" style={{ animationDelay: "0s" }}></div>
          <div className="flex-1 rounded-[2rem] skel-card" style={{ animationDelay: "0.5s" }}></div>
        </div>
      </div>
      
      {/* Right Pane Skeleton */}
      <div className="flex-1 h-[70vh] xl:h-full relative rounded-[2.5rem] flex flex-col gap-6 py-6 p-4" style={{ 
        background: rightPaneBg, 
        border: rightPaneBorder,
        boxShadow: rightPaneShadow 
      }}>
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
// Small Card for Vertical Ticker (Actualizados/Recién Creados) - uses similar style to big cards
// ─────────────────────────────────────────────────────────────────────────────
function SmallSpotlightCard({ 
  mod, 
  onOpenVersions, 
  accentColor, 
  globalLoader,
  theme = "official"
}: { 
  mod: ModHit, 
  onOpenVersions: (m: ModHit) => void, 
  accentColor: string, 
  globalLoader?: string,
  theme?: string
}) {
  const knownLoaders = ["forge", "fabric", "neoforge", "quilt"];
  const loaderTag = mod.categories?.find(c => knownLoaders.includes(c.toLowerCase())) || globalLoader;
  const pType = mod.projectType === "mod" 
    ? "Mod" 
    : mod.projectType === "resourcepack" || mod.projectType === "texture"
    ? "Textura" 
    : mod.projectType === "shader" 
    ? "Shader" 
    : mod.projectType;

  const isModern = theme === "modern";
  const bgStyle = isModern 
    ? "linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.75) 100%)" 
    : "var(--glass-bg)";
  const borderStyle = isModern 
    ? "1px solid rgba(255, 255, 255, 0.9)" 
    : "1px solid rgba(255, 255, 255, 0.05)";
  const shadowStyle = isModern 
    ? "0 8px 24px -6px rgba(13, 39, 80, 0.06), inset 0 1px 0 #ffffff, inset 0 0 12px #ffffff" 
    : "var(--shadow-drop), var(--shadow-neomorphic-inner, inset 0 1px 0 rgba(255,255,255,0.05))";

  return (
    <div 
      className="w-full shrink-0 rounded-2xl relative group cursor-pointer overflow-hidden backdrop-blur-xl transition-all duration-500"
      style={{ 
        background: bgStyle,
        border: borderStyle,
        boxShadow: shadowStyle
      }}
      onClick={() => onOpenVersions(mod)}
    >
      {/* Dynamic Top Glow */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Background Soft Glow */}
      <div 
        className="absolute -inset-20 opacity-0 group-hover:opacity-15 transition-opacity duration-700 blur-3xl pointer-events-none rounded-full"
        style={{ background: accentColor }}
      />

      <div className="p-3 flex items-center gap-3 relative z-10">
        {/* Mod Icon */}
        <div className="w-10 h-10 rounded-xl overflow-hidden bg-black/40 border border-white/10 flex items-center justify-center shrink-0 shadow-lg relative group-hover:scale-110 transition-transform duration-500">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {mod.iconUrl ? (
            <img src={mod.iconUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div 
              className="w-full h-full flex items-center justify-center font-headline text-sm font-black text-white/40"
              style={{ background: `linear-gradient(135deg, ${accentColor}20 0%, rgba(0,0,0,0.8) 100%)`, boxShadow: `inset 0 0 20px ${accentColor}10` }}
            >
              {mod.title.substring(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-headline text-sm leading-tight text-white group-hover:opacity-80 transition-opacity duration-300 truncate">
            {mod.title}
          </h3>
          
          {/* Badges for Type and Loader */}
          <div className="flex flex-wrap items-center gap-1 mt-1">
            {pType && (
              <span className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-white/10 text-white opacity-80 border border-white/5 shadow-sm">
                {pType}
              </span>
            )}
            {loaderTag && (
              <span className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md text-white/80 border border-white/5 shadow-sm" style={{ background: loaderTag.toLowerCase() === "fabric" ? "rgba(234,179,8,0.15)" : loaderTag.toLowerCase() === "forge" ? "rgba(239,68,68,0.15)" : "rgba(14,165,233,0.15)" }}>
                {loaderTag}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Vertical Scrolling Ticker (Marquee Y) - Used for small items
// ─────────────────────────────────────────────────────────────────────────────
function VerticalTicker({ 
  mods, 
  onOpenVersions, 
  speed = 1, 
  color, 
  reverse = false, 
  globalLoader, 
  accentColor,
  theme = "official"
}: { 
  mods: ModHit[], 
  onOpenVersions: (m: ModHit) => void, 
  speed?: number, 
  color?: string, 
  reverse?: boolean, 
  globalLoader?: string, 
  accentColor: string,
  theme?: string
}) {
  const duplicatedMods = [...mods, ...mods, ...mods, ...mods, ...mods, ...mods, ...mods, ...mods];
  const { containerRef, innerRef, handlers } = useSmoothMarquee(speed, reverse, true);

  return (
    <div 
      ref={containerRef}
      className="relative h-full w-full overflow-hidden mask-vertical-edges cursor-grab active:cursor-grabbing"
      {...handlers}
    >
      <div ref={innerRef} className="flex flex-col gap-3 w-full pb-2">
        {duplicatedMods.map((mod, i) => (
          <SmallSpotlightCard 
            key={`${mod.projectId}-${i}`} 
            mod={mod} 
            onOpenVersions={onOpenVersions} 
            accentColor={accentColor}
            globalLoader={globalLoader}
            theme={theme}
          />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Horizontal Scrolling Marquee - Used for big cards
// ─────────────────────────────────────────────────────────────────────────────
function HorizontalEditorialMarquee({ 
  title, 
  mods, 
  onOpenVersions, 
  onDownload, 
  downloading, 
  speed = 1, 
  reverse = false, 
  accentColor, 
  globalLoader,
  theme = "official"
}: any) {
  const duplicatedMods = [...mods, ...mods, ...mods, ...mods, ...mods, ...mods, ...mods, ...mods];
  const { containerRef, innerRef, handlers } = useSmoothMarquee(speed, reverse, false);

  return (
    <div className="relative w-full h-full flex flex-col group/marquee">
      {/* Title */}
      <div className="px-8 mb-3 flex items-center gap-3">
        <span 
          className="px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase shadow-sm backdrop-blur-md animate-fade-in"
          style={{
            background: theme === "modern" 
              ? `color-mix(in srgb, ${accentColor} 12%, transparent)` 
              : `color-mix(in srgb, ${accentColor} 18%, transparent)`,
            color: theme === "modern" 
              ? `color-mix(in srgb, ${accentColor} 85%, black)` 
              : accentColor,
            borderColor: theme === "modern" 
              ? `color-mix(in srgb, ${accentColor} 30%, transparent)` 
              : `color-mix(in srgb, ${accentColor} 35%, transparent)`,
            borderWidth: "1px",
            borderStyle: "solid"
          }}
        >
          {title}
        </span>
      </div>

      <div 
        ref={containerRef}
        className="relative w-full flex-1 overflow-hidden mask-horizontal-edges cursor-grab active:cursor-grabbing py-4"
        {...handlers}
      >
        <div ref={innerRef} className="flex gap-6 w-max px-4 py-4 h-full">
          {duplicatedMods.map((mod: any, i: number) => (
            <SpotlightEditorialCard
              key={`${mod.projectId}-${i}`}
              mod={mod}
              onOpenVersions={onOpenVersions}
              onDownload={onDownload}
              isDownloading={!!downloading[mod.projectId]}
              accentColor={mod.color || accentColor}
              globalLoader={globalLoader}
              theme={theme}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Square Editorial Card (improved)
// ─────────────────────────────────────────────────────────────────────────────
function SpotlightEditorialCard({ 
  mod, 
  onOpenVersions, 
  onDownload, 
  isDownloading,
  accentColor = COLORS.primary,
  globalLoader,
  theme = "official"
}: { 
  mod: ModHit & { versions?: string[] }; 
  onOpenVersions: (m: ModHit) => void;
  onDownload: (m: ModHit) => void;
  isDownloading: boolean;
  accentColor?: string;
  globalLoader?: string;
  theme?: string;
}) {
  
  const knownLoaders = ["forge", "fabric", "neoforge", "quilt"];
  const loaderTag = mod.categories?.find(c => knownLoaders.includes(c.toLowerCase())) || globalLoader;
  const pType = mod.projectType === "mod" 
    ? "Mod" 
    : mod.projectType === "resourcepack" || mod.projectType === "texture"
    ? "Textura" 
    : mod.projectType === "shader" 
    ? "Shader" 
    : mod.projectType === "datapack"
    ? "Datapack"
    : mod.projectType === "modpack"
    ? "Modpack"
    : mod.projectType;

  let versionsString = null;
  let versionRange = null;
  if (mod.versions && mod.versions.length > 0) {
    const sorted = [...mod.versions].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    if (sorted.length > 1) {
      versionsString = `${sorted[0]} - ${sorted[sorted.length - 1]}`;
      versionRange = versionsString;
    } else {
      versionsString = sorted[0];
      versionRange = sorted[0];
    }
  }

  const isModern = theme === "modern";
  const bgStyle = isModern 
    ? "linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.75) 100%)" 
    : "var(--glass-bg)";
  const borderStyle = isModern 
    ? "1px solid rgba(255, 255, 255, 0.9)" 
    : "1px solid rgba(255, 255, 255, 0.05)";
  const shadowStyle = isModern 
    ? "0 12px 32px -8px rgba(13, 39, 80, 0.08), inset 0 1px 0 #ffffff, inset 0 0 20px #ffffff" 
    : "var(--shadow-drop), var(--shadow-neomorphic-inner, inset 0 1px 0 rgba(255,255,255,0.05))";

  return (
    <div 
      className="w-[220px] xl:w-[260px] h-[240px] sm:h-[300px] shrink-0 rounded-[2rem] sm:rounded-[2.5rem] relative group cursor-pointer overflow-hidden backdrop-blur-xl hover:border-white/10 transition-all duration-500 hover:z-10 spotlight-animate-float"
      style={{ 
        background: bgStyle,
        border: borderStyle,
        boxShadow: shadowStyle,
        whiteSpace: "normal" // Fix for whitespace-nowrap parent
      }}
      onClick={() => onOpenVersions(mod)}
    >
      {/* Dynamic Top Glow */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Background Soft Glow */}
      <div 
        className="absolute -inset-20 opacity-0 group-hover:opacity-15 transition-opacity duration-700 blur-3xl pointer-events-none rounded-full"
        style={{ background: accentColor }}
      />

      <div className="p-6 flex flex-col h-full relative z-10 items-center text-center">
        {/* Mod Icon */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl overflow-hidden bg-black/40 border border-white/10 flex items-center justify-center mb-4 shrink-0 shadow-2xl relative group-hover:-translate-y-2 transition-transform duration-500">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {mod.iconUrl ? (
            <img src={mod.iconUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div 
              className="w-full h-full flex items-center justify-center font-headline text-2xl font-black text-white/40"
              style={{ background: `linear-gradient(135deg, ${accentColor}20 0%, rgba(0,0,0,0.8) 100%)`, boxShadow: `inset 0 0 20px ${accentColor}10` }}
            >
              {mod.title.substring(0, 2).toUpperCase()}
            </div>
          )}
          
          {/* Hover Download Button */}
          <button 
            onClick={(e) => { e.stopPropagation(); onDownload(mod); }}
            disabled={isDownloading}
            className="absolute bottom-2 right-2 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/60 hover:bg-white hover:text-black backdrop-blur-md"
            style={{ border: "1px solid rgba(255,255,255,0.2)" }}
          >
            {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          </button>
        </div>

        <h3 className="font-headline text-base sm:text-lg leading-tight text-white group-hover:opacity-80 transition-opacity duration-300 line-clamp-2">
          {mod.title}
        </h3>
        
        {/* Badges for Type, Loader, and Version */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2">
          {pType && (
            <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-white/10 text-white opacity-80 border border-white/5 shadow-sm">
              {pType}
            </span>
          )}
          {loaderTag && (
            <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md text-white/80 border border-white/5 shadow-sm" style={{ background: loaderTag.toLowerCase() === "fabric" ? "rgba(234,179,8,0.15)" : loaderTag.toLowerCase() === "forge" ? "rgba(239,68,68,0.15)" : "rgba(14,165,233,0.15)" }}>
              {loaderTag}
            </span>
          )}
          {versionRange && (
            <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-white/5 text-white opacity-60 border border-white/5 shadow-sm">
              {versionRange}
            </span>
          )}
        </div>

        {/* Author / Metadata */}
        <div className="mt-auto pt-4 w-full flex items-center justify-between text-[9px] font-subhead uppercase tracking-widest text-white opacity-40 border-t border-white/5">
          <span className="font-bold">{mod.author}</span>
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
  onDownloadMod,
  downloading,
  loader = "forge",
  gameVersion = "1.20.1",
  sinytraActive = false,
}: FomoSpotlightProps) {
  const [loading, setLoading] = useState(true);
  const [cfFeatured, setCfFeatured] = useState<ModHit[]>([]);
  const [cfPopular, setCfPopular] = useState<ModHit[]>([]);
  const [cfRecent, setCfRecent] = useState<ModHit[]>([]);
  const [newestMods, setNewestMods] = useState<ModHit[]>([]);
  const [latestCollection, setLatestCollection] = useState<CollectionEntry | null>(null);
  const [latestCollectionMods, setLatestCollectionMods] = useState<ModHit[]>([]);
  const [theme, setTheme] = useState<"official" | "vampire" | "modern">("official");
  const [followedUpdates, setFollowedUpdates] = useState<ModHit[]>([]);

  useEffect(() => {
    const checkFollowedUpdates = () => {
      try {
        const storedMods = localStorage.getItem("mim_followed_mods");
        const status = localStorage.getItem("mim_modrinth_status");
        if (storedMods && status) {
          const mods: ModHit[] = JSON.parse(storedMods);
          const updates = JSON.parse(status);
          const withUpdates = mods.filter(m => {
            const updateInfo = updates[`collection:${m.projectId}`];
            return updateInfo && updateInfo.status === "update_available";
          });
          setFollowedUpdates(withUpdates);
        } else {
          setFollowedUpdates([]);
        }
      } catch (e) {
        console.warn("[FomoSpotlight] Failed to check followed updates", e);
      }
    };

    checkFollowedUpdates();
    
    window.addEventListener("mim-followed-mods-changed", checkFollowedUpdates);
    window.addEventListener("mim-modrinth-status-changed", checkFollowedUpdates);
    
    return () => {
      window.removeEventListener("mim-followed-mods-changed", checkFollowedUpdates);
      window.removeEventListener("mim-modrinth-status-changed", checkFollowedUpdates);
    };
  }, []);

  const loadSpotlight = useCallback(async () => {
    setLoading(true);
    try {
      // 1. We fetch the global Featured Mods from CurseForge
      const cfData = await fetchCurseForgeFeatured();
      if (cfData.featured) setCfFeatured(cfData.featured.map((m: any) => ({ ...m, _source: "curseforge" })));

      const cLoader = loader === "fabric" ? "Fabric" : loader === "neoforge" ? "NeoForge" : "Forge";

      const cfPopPromise = fetch(`/api/curseforge/discover?sortField=6&sortOrder=desc&gameVersion=${gameVersion}&modLoaderType=${cLoader}`)
        .then(async (r) => {
          if (!r.ok) return { mods: [] };
          const text = await r.text();
          try {
            return JSON.parse(text);
          } catch {
            return { mods: [] };
          }
        })
        .catch(() => ({ mods: [] }));

      const cfRecPromise = fetch(`/api/curseforge/discover?sortField=2&sortOrder=desc&gameVersion=${gameVersion}&modLoaderType=${cLoader}`)
        .then(async (r) => {
          if (!r.ok) return { mods: [] };
          const text = await r.text();
          try {
            return JSON.parse(text);
          } catch {
            return { mods: [] };
          }
        })
        .catch(() => ({ mods: [] }));
      
      // 3. We fetch contextual newest from Modrinth
      // Modrinth uses lower case loaders and strict versioning
      const mdLoader = (sinytraActive && (loader === "forge" || loader === "neoforge")) ? "[\"categories:forge\",\"categories:fabric\"]" : `["categories:${loader}"]`;
      const facets = `[${mdLoader},["versions:${gameVersion}"]]`;
      const mdNewPromise = fetch(`https://api.modrinth.com/v2/search?index=newest&limit=10&facets=${encodeURIComponent(facets)}`)
        .then(async (r) => {
          if (!r.ok) return { hits: [] };
          const text = await r.text();
          try {
            return JSON.parse(text);
          } catch {
            return { hits: [] };
          }
        })
        .catch(() => ({ hits: [] }));

      // 4. We fetch the Modrinth official collections (global)
      const collPromise = fetchOfficialCollections();

      const [popData, recData, newMdData, collsData] = await Promise.all([cfPopPromise, cfRecPromise, mdNewPromise, collPromise]);

      if (popData?.mods) setCfPopular(popData.mods.map((m: any) => ({ ...m, _source: "curseforge" })));
      if (recData?.mods) {
        // Asegurar que CurseForge devuelva 'mod' como tipo por defecto en estos resultados si no lo trae
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
        const latest = collsData.collections[0];
        setLatestCollection(latest);
        const modsData = await fetchCollectionMods(latest.id);
        if (modsData.mods) setLatestCollectionMods(modsData.mods.map((m: any) => ({ ...m, _source: "modrinth" })));
      }

    } catch (e) {
      console.error("Error loading spotlight", e);
    } finally {
      setLoading(false);
    }
  }, [loader, gameVersion, sinytraActive]);

  useEffect(() => { loadSpotlight(); }, [loadSpotlight]);

  // Detect and track current theme
  useEffect(() => {
    const updateTheme = () => {
      const currentTheme = document.documentElement.getAttribute("data-theme") as "official" | "vampire" | "modern";
      if (currentTheme) setTheme(currentTheme);
    };
    
    updateTheme();
    
    // Watch for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "data-theme") {
          updateTheme();
        }
      });
    });
    
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  if (loading) {
    return <SpotlightSkeleton theme={theme} />;
  }

  const modrinthMods = latestCollectionMods.map(m => ({ ...m, color: "#1ED760" }));
  const curseForgeMods = cfFeatured.map(m => ({ ...m, color: COLORS.primary }));

  // Theme-specific styles
  const getThemeStyles = () => {
    switch (theme) {
      case "vampire":
        return {
          rightPaneBg: "linear-gradient(180deg, rgba(185,28,28,0.08) 0%, rgba(0,0,0,0.4) 100%)",
          leftGlow: "#DC2626",
          rightGlow: "#991B1B",
          border: "1px solid rgba(255, 255, 255, 0.05)",
          boxShadow: "0 32px 64px -16px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.06), inset 0 0 40px rgba(0, 0, 0, 0.3)"
        };
      case "modern":
        return {
          leftPaneBg: "rgba(255, 255, 255, 0.4)",
          rightPaneBg: "linear-gradient(135deg, rgba(238, 241, 245, 0.95) 0%, rgba(224, 228, 234, 0.8) 100%)",
          border: "1px solid rgba(255, 255, 255, 0.9)",
          boxShadow: "0 20px 40px -10px rgba(13, 39, 80, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.9), inset 0 0 30px rgba(255, 255, 255, 0.8)"
        };
      default:
        return {
          rightPaneBg: "var(--glass-bg)",
          leftGlow: "#1ED760",
          rightGlow: "#FF6C3E",
          border: "1px solid rgba(255, 255, 255, 0.05)",
          boxShadow: "0 32px 64px -16px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.06), inset 0 0 40px rgba(0, 0, 0, 0.3)"
        };
    }
  };

  const themeStyles = getThemeStyles();

  const getBannerStyles = () => {
    switch (theme) {
      case "vampire":
        return {
          bg: "rgba(244, 63, 94, 0.04)", // Rose glow on dark background
          border: "1px solid rgba(244, 63, 94, 0.15)",
          shadow: "0 8px 32px rgba(244, 63, 94, 0.03)",
          iconBg: "rgba(244, 63, 94, 0.15)",
          iconColor: "text-rose-400",
          titleColor: "text-rose-300",
          descColor: "text-rose-200/50",
          pillBg: "bg-black/60 hover:bg-black/85",
          pillBorder: "border-rose-950/40 hover:border-rose-900/60",
          pillTextColor: "text-rose-100"
        };
      case "modern":
        return {
          bg: "rgba(219, 39, 119, 0.07)", // Vibrant pink translucent for high contrast light mode
          border: "1px solid rgba(219, 39, 119, 0.22)",
          shadow: "0 4px 16px rgba(219, 39, 119, 0.04)",
          iconBg: "rgba(219, 39, 119, 0.12)",
          iconColor: "text-pink-600",
          titleColor: "text-pink-800",
          descColor: "text-pink-700/70",
          pillBg: "bg-white/90 hover:bg-pink-50/90",
          pillBorder: "border-pink-200 hover:border-pink-300",
          pillTextColor: "text-pink-950"
        };
      default: // "official"
        return {
          bg: "rgba(236, 72, 153, 0.05)", // Pure glass rose
          border: "1px solid rgba(236, 72, 153, 0.15)",
          shadow: "0 8px 32px rgba(236, 72, 153, 0.03)",
          iconBg: "rgba(236, 72, 153, 0.15)",
          iconColor: "text-pink-400",
          titleColor: "text-pink-300",
          descColor: "text-pink-300/60",
          pillBg: "bg-black/40 hover:bg-black/60",
          pillBorder: "border-pink-500/20 hover:border-pink-500/40",
          pillTextColor: "text-white"
        };
    }
  };

  const bannerStyles = getBannerStyles();

  return (
    <div className="flex-1 flex flex-col xl:flex-row h-full overflow-hidden p-6 gap-8">
      
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* LEFT PANE: Typography & Trending (Vertical Tickers) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-between h-full relative xl:max-w-[400px] 2xl:max-w-[440px] spotlight-animate-fade-in" style={{ animationDelay: "0s" }}>
        
        {/* Row 0: Followed Mods Updates (Rose Themed) */}
        {followedUpdates.length > 0 && (
          <div className="w-full shrink-0 relative z-20 animate-fade-in mb-4">
            <div className="p-3.5 px-4 rounded-2xl relative overflow-hidden flex items-center justify-between gap-5" style={{
              background: bannerStyles.bg,
              border: bannerStyles.border,
              boxShadow: bannerStyles.shadow
            }}>
              <div className="absolute inset-0 bg-gradient-to-r from-pink-500/5 via-purple-500/5 to-transparent pointer-events-none" />
              
              {/* Left: Compact Icon & Text */}
              <div className="flex items-center gap-3 relative z-10 shrink-0 min-w-0">
                <div className={`w-9 h-9 rounded-xl ${bannerStyles.iconBg} flex items-center justify-center animate-pulse shrink-0`}>
                  <Heart className={`w-4.5 h-4.5 fill-current ${bannerStyles.iconColor}`} />
                </div>
                <div className="flex flex-col shrink-0 min-w-0">
                  <h4 className={`font-headline text-[12px] font-black uppercase tracking-widest leading-tight ${bannerStyles.titleColor}`}>Seguidos</h4>
                  <p className={`text-[10px] font-medium leading-none opacity-80 mt-0.5 ${bannerStyles.descColor}`}>{followedUpdates.length} {followedUpdates.length === 1 ? "update" : "updates"}</p>
                </div>
              </div>
              
              {/* Right: Stock Market Style Marquee Ticker */}
              <div className="flex-1 max-w-[210px] xl:max-w-[290px] overflow-hidden relative z-10 [mask-image:linear-gradient(to_right,transparent,white_10%,white_90%,transparent)]">
                {followedUpdates.length === 1 ? (
                  <div className="flex justify-end">
                    <div
                      onClick={() => onOpenVersions(followedUpdates[0])}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all cursor-pointer scale-95 hover:scale-100 ${bannerStyles.pillBg} ${bannerStyles.pillBorder}`}
                    >
                      {followedUpdates[0].iconUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={followedUpdates[0].iconUrl} alt="" className="w-4.5 h-4.5 rounded-md object-cover" />
                      ) : (
                        <div className="w-4.5 h-4.5 rounded-md bg-pink-500/20 text-pink-300 flex items-center justify-center text-[8px] font-bold shrink-0">
                          {followedUpdates[0].title.charAt(0)}
                        </div>
                      )}
                      <span className={`text-[11px] font-bold truncate max-w-[140px] ${bannerStyles.pillTextColor}`}>{followedUpdates[0].title}</span>
                    </div>
                  </div>
                ) : (
                  <div className="fomo-ticker-container">
                    <div className="fomo-ticker-track" style={{ gap: "10px" }}>
                      {[...followedUpdates, ...followedUpdates, ...followedUpdates].map((mod, idx) => (
                        <div
                          key={`${mod.projectId}-${idx}`}
                          onClick={() => onOpenVersions(mod)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all cursor-pointer scale-95 hover:scale-100 shrink-0 ${bannerStyles.pillBg} ${bannerStyles.pillBorder}`}
                        >
                          {mod.iconUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={mod.iconUrl} alt="" className="w-4.5 h-4.5 rounded-md object-cover" />
                          ) : (
                            <div className="w-4.5 h-4.5 rounded-md bg-pink-500/20 text-pink-300 flex items-center justify-center text-[8px] font-bold shrink-0">
                              {mod.title.charAt(0)}
                            </div>
                          )}
                          <span className={`text-[11px] font-bold truncate max-w-[120px] ${bannerStyles.pillTextColor}`}>{mod.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Editorial Header */}
        <div className="mt-1 xl:mt-2 shrink-0">
          <p className="font-mono text-[10px] xl:text-xs uppercase tracking-widest opacity-60 mb-2 flex items-center gap-2 spotlight-animate-glow">
            <Spotlight className="w-3.5 h-3.5" /> Editorial
          </p>
          <AnimatedHeadline />
          <p className="font-caption text-xs xl:text-sm opacity-60 leading-relaxed mt-1">
            Te traemos los picks mensuales de Modrinth y las selecciones de la comunidad de CurseForge.
          </p>
        </div>

        {/* Bottom Area: Vertical Tickers side-by-side */}
        <div className="mt-4 xl:mt-auto flex h-[50vh] xl:h-[380px] gap-4 pb-2">
          
          {/* Recently Updated Ticker (Y) */}
          {cfRecent.length > 0 && (
            <div className="flex-1 flex flex-col overflow-hidden spotlight-animate-fade-in" style={{ animationDelay: "0.2s" }}>
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
                  globalLoader={loader}
                  accentColor={theme === "vampire" ? "#DC2626" : "#3B82F6"}
                  theme={theme}
                />
              </div>
            </div>
          )}

          {/* Newest Created Ticker (Y) */}
          {newestMods.length > 0 && (
            <div className="flex-1 flex flex-col overflow-hidden spotlight-animate-fade-in" style={{ animationDelay: "0.4s" }}>
              <h3 className="font-subhead text-xs text-white/80 tracking-wide mb-3 flex items-center gap-2 shrink-0">
                <Calendar className="w-3.5 h-3.5 text-purple-400" /> Recién Creados
              </h3>
              <div className="flex-1 relative">
                <VerticalTicker 
                  mods={newestMods} 
                  onOpenVersions={onOpenVersions} 
                  speed={0.6} 
                  color="text-purple-400" 
                  globalLoader={loader}
                  accentColor={theme === "vampire" ? "#991B1B" : "#A855F7"}
                  theme={theme}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* RIGHT PANE: Horizontal Editorial Marquees (Stacked) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="flex-1 h-[70vh] xl:h-full relative rounded-[2.5rem] overflow-hidden flex flex-col gap-6 py-6 spotlight-animate-fade-in" style={{ 
        animationDelay: "0.3s",
        background: themeStyles.rightPaneBg, 
        border: themeStyles.border,
        boxShadow: themeStyles.boxShadow 
      }}>

        {/* Ambient glow effect */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full opacity-20 blur-3xl spotlight-animate-glow" style={{ background: themeStyles.leftGlow }} />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full opacity-20 blur-3xl spotlight-animate-glow" style={{ background: themeStyles.rightGlow, animationDelay: "1.5s" }} />
        </div>

        {/* Row 1: Modrinth (Scrolls Right to Left) */}
        <div className="flex-1 w-full min-h-[270px] sm:min-h-[345px] relative z-10">
          <HorizontalEditorialMarquee 
            title="Modrinth Picks"
            mods={modrinthMods} 
            onOpenVersions={onOpenVersions} 
            onDownload={onDownloadMod} 
            downloading={downloading} 
            speed={0.8}
            reverse={false} 
            accentColor={theme === "vampire" ? "#DC2626" : "#1ED760"}
            globalLoader={loader}
            theme={theme}
          />
        </div>

        {/* Row 2: CurseForge (Scrolls Left to Right) */}
        <div className="flex-1 w-full min-h-[270px] sm:min-h-[345px] relative z-10">
          <HorizontalEditorialMarquee 
            title="CurseForge Picks"
            mods={curseForgeMods} 
            onOpenVersions={onOpenVersions} 
            onDownload={onDownloadMod} 
            downloading={downloading} 
            speed={0.9}
            reverse={true} 
            accentColor={theme === "vampire" ? "#991B1B" : COLORS.primary}
            globalLoader={loader}
            theme={theme}
          />
        </div>
      </div>

    </div>
  );
}
