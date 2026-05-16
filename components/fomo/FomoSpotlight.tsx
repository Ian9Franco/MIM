"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Sparkles, Loader2, Download, ChevronRight, Clock, TrendingUp, Spotlight, Calendar } from "lucide-react";
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
function VerticalTicker({ mods, onOpenVersions, speed = 1, color, reverse = false, globalLoader }: { mods: ModHit[], onOpenVersions: (m: ModHit) => void, speed?: number, color?: string, reverse?: boolean, globalLoader?: string }) {
  const duplicatedMods = [...mods, ...mods, ...mods, ...mods, ...mods, ...mods, ...mods, ...mods];
  const { containerRef, innerRef, handlers } = useSmoothMarquee(speed, reverse, true);

  return (
    <div 
      ref={containerRef}
      className="relative h-full w-full overflow-hidden mask-vertical-edges cursor-grab active:cursor-grabbing"
      {...handlers}
    >
      <div ref={innerRef} className="flex flex-col gap-3 w-full pb-2">
        {duplicatedMods.map((mod, i) => {
          const knownLoaders = ["forge", "fabric", "neoforge", "quilt"];
          const loaderTag = mod.categories?.find(c => knownLoaders.includes(c.toLowerCase())) || globalLoader;
          const pType = mod.projectType === "mod" ? "Mod" : mod.projectType === "resourcepack" ? "Texture" : mod.projectType === "shader" ? "Shader" : mod.projectType;

          return (
            <div 
              key={`${mod.projectId}-${i}`} 
              className="flex items-center gap-3 cursor-pointer group bg-black/20 hover:bg-white/10 transition-colors border border-white/5 hover:border-white/20 rounded-2xl p-2.5 shrink-0 relative" 
              onClick={() => onOpenVersions(mod)}
            >
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/5 border border-white/10 shrink-0 shadow-lg relative group-hover:scale-105 transition-transform flex items-center justify-center pointer-events-none">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {mod.iconUrl ? <img src={mod.iconUrl} alt="" className="w-full h-full object-cover" /> : <span className="font-headline text-[10px] font-black text-white/30 uppercase">{mod.title.substring(0, 2)}</span>}
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-center pointer-events-none">
                <p className={`font-subhead text-xs text-white truncate transition-colors group-hover:${color}`}>{mod.title}</p>
                <div className="flex items-center gap-1.5 mt-1 opacity-60 group-hover:opacity-100 transition-opacity">
                  {pType && (
                    <span className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-white/10 text-white opacity-80">
                      {pType}
                    </span>
                  )}
                  {loaderTag && (
                    <span className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md text-white opacity-80" style={{ background: loaderTag.toLowerCase() === "fabric" ? "rgba(234,179,8,0.2)" : loaderTag.toLowerCase() === "forge" ? "rgba(239,68,68,0.2)" : "rgba(14,165,233,0.2)" }}>
                      {loaderTag}
                    </span>
                  )}
                  {(!pType && !loaderTag) && <span className="font-caption text-[9px] truncate">{mod.author}</span>}
                </div>
              </div>
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
function HorizontalEditorialMarquee({ title, mods, onOpenVersions, onDownload, downloading, speed = 1, reverse = false, accentColor, globalLoader }: any) {
  const duplicatedMods = [...mods, ...mods, ...mods, ...mods, ...mods, ...mods, ...mods, ...mods];
  const { containerRef, innerRef, handlers } = useSmoothMarquee(speed, reverse, false);

  return (
    <div className="relative w-full h-full flex flex-col group/marquee">
      {/* Title */}
      <div className="px-8 mb-3 flex items-center gap-3">
        <span className="px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase bg-white/5 text-white/80 border border-white/10 shadow-sm backdrop-blur-md">
          {title}
        </span>
      </div>

      <div 
        ref={containerRef}
        className="relative w-full flex-1 overflow-hidden mask-horizontal-edges cursor-grab active:cursor-grabbing"
        {...handlers}
      >
        <div ref={innerRef} className="flex gap-6 w-max px-4 py-2 h-full">
          {duplicatedMods.map((mod: any, i: number) => (
            <SpotlightEditorialCard
              key={`${mod.projectId}-${i}`}
              mod={mod}
              onOpenVersions={onOpenVersions}
              onDownload={onDownload}
              isDownloading={!!downloading[mod.projectId]}
              accentColor={mod.color || accentColor}
              globalLoader={globalLoader}
            />
          ))}
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
  globalLoader
}: { 
  mod: ModHit & { versions?: string[] }; 
  onOpenVersions: (m: ModHit) => void;
  onDownload: (m: ModHit) => void;
  isDownloading: boolean;
  accentColor?: string;
  globalLoader?: string;
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

  return (
    <div 
      className="w-[180px] sm:w-[220px] h-[240px] sm:h-[300px] shrink-0 rounded-[2rem] sm:rounded-[2.5rem] relative group cursor-pointer overflow-hidden backdrop-blur-xl border border-white/5 hover:border-white/10 transition-all duration-500 hover:z-10"
      style={{ 
        background: `var(--glass-bg)`,
        boxShadow: `var(--shadow-drop), var(--shadow-neomorphic-inner, inset 0 1px 0 rgba(255,255,255,0.05))`,
        whiteSpace: "normal" // Fix for whitespace-nowrap parent
      }}
      onClick={() => onOpenVersions(mod)}
    >
      {/* Dynamic Top Glow */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Background Soft Glow */}
      <div 
        className="absolute -inset-20 opacity-0 group-hover:opacity-10 transition-opacity duration-700 blur-3xl pointer-events-none rounded-full"
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

  const loadSpotlight = useCallback(async () => {
    setLoading(true);
    try {
      // 1. We fetch the global Featured Mods from CurseForge
      const cfData = await fetchCurseForgeFeatured();
      if (cfData.featured) setCfFeatured(cfData.featured.map((m: any) => ({ ...m, _source: "curseforge" })));

      // 2. We fetch contextual popular and recent from CurseForge
      const cLoader = loader === "fabric" ? "Fabric" : loader === "neoforge" ? "NeoForge" : "Forge";
      
      const cfPopPromise = fetch(`/api/curseforge/discover?sortField=6&sortOrder=desc&gameVersion=${gameVersion}&modLoaderType=${cLoader}`).then(r => r.json());
      const cfRecPromise = fetch(`/api/curseforge/discover?sortField=2&sortOrder=desc&gameVersion=${gameVersion}&modLoaderType=${cLoader}`).then(r => r.json());
      
      // 3. We fetch contextual newest from Modrinth
      // Modrinth uses lower case loaders and strict versioning
      const mdLoader = (sinytraActive && (loader === "forge" || loader === "neoforge")) ? "[\"categories:forge\",\"categories:fabric\"]" : `["categories:${loader}"]`;
      const facets = `[${mdLoader},["versions:${gameVersion}"]]`;
      const mdNewPromise = fetch(`https://api.modrinth.com/v2/search?index=newest&limit=10&facets=${encodeURIComponent(facets)}`).then(r => r.json());

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

  if (loading) {
    return <SpotlightSkeleton />;
  }

  const modrinthMods = latestCollectionMods.map(m => ({ ...m, color: "#1ED760" }));
  const curseForgeMods = cfFeatured.map(m => ({ ...m, color: COLORS.primary }));

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
            Te traemos los picks mensuales de Modrinth y las selecciones de la comunidad de CurseForge.
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
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* RIGHT PANE: Horizontal Editorial Marquees (Stacked) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="flex-1 h-[70vh] xl:h-full relative rounded-[2.5rem] overflow-hidden flex flex-col gap-6 py-6" style={{ background: "var(--glass-bg)", boxShadow: "var(--shadow-neomorphic-inner, inset 0 0 20px rgba(0,0,0,0.05))" }}>

        {/* Row 1: Modrinth (Scrolls Right to Left) */}
        <div className="flex-1 w-full min-h-0 pt-4">
          <HorizontalEditorialMarquee 
            title="Modrinth Picks"
            mods={modrinthMods} 
            onOpenVersions={onOpenVersions} 
            onDownload={onDownloadMod} 
            downloading={downloading} 
            speed={0.8}
            reverse={false} 
            globalLoader={loader}
          />
        </div>

        {/* Row 2: CurseForge (Scrolls Left to Right) */}
        <div className="flex-1 w-full min-h-0 pb-4">
          <HorizontalEditorialMarquee 
            title="CurseForge Picks"
            mods={curseForgeMods} 
            onOpenVersions={onOpenVersions} 
            onDownload={onDownloadMod} 
            downloading={downloading} 
            speed={0.9}
            reverse={true} 
            globalLoader={loader}
          />
        </div>
      </div>

    </div>
  );
}
