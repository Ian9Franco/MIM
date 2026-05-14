/**
 * MIM — FOMO Spotlight
 * Optimized for v5.9: Modularized into hooks and components.
 */

"use client";

import React from "react";
import { Clock, Calendar, Heart, Spotlight } from "lucide-react";
import { COLORS } from "@/theme/tokens";
import { useFomoSpotlightManager } from "@/hooks/useFomoSpotlightManager";
import { AnimatedHeadline, VerticalTicker, SpotlightEditorialCard } from "./FomoSpotlightComponents";
import { useSmoothMarquee } from "@/hooks/useSmoothMarquee";
import { FomoSkeleton } from "./FomoSkeleton";
import type { ModHit } from "@/lib/types";

interface FomoSpotlightProps {
  onOpenVersions: (mod: ModHit) => void;
  onDownloadMod: (mod: ModHit) => Promise<void>;
  downloading: Record<string, boolean>;
  loader?: string;
  gameVersion?: string;
  sinytraActive?: boolean;
}

export function FomoSpotlight({ onOpenVersions, onDownloadMod, downloading, loader = "forge", gameVersion = "1.20.1", sinytraActive = false }: FomoSpotlightProps) {
  const { loading, cfFeatured, cfRecent, newestMods, latestCollectionMods, followedUpdates, theme } = useFomoSpotlightManager(loader, gameVersion, sinytraActive);

  if (loading) return <FomoSkeleton variant="spotlight" message="Descubriendo tendencias..." />;

  const themeStyles = {
    modern: { rightBg: "rgba(255,255,255,0.9)", border: "1px solid #fff", shadow: "0 20px 40px rgba(0,0,0,0.1)" },
    vampire: { rightBg: "linear-gradient(180deg, #2a0a0a 0%, #000 100%)", border: "1px solid #450a0a", shadow: "0 32px 64px #000" },
    official: { rightBg: "var(--glass-bg)", border: "1px solid rgba(255,255,255,0.05)", shadow: "var(--shadow-drop)" }
  }[theme] || { rightBg: "var(--glass-bg)", border: "1px solid rgba(255,255,255,0.05)", shadow: "var(--shadow-drop)" };

  return (
    <div className="flex-1 flex flex-col xl:flex-row h-full overflow-hidden p-6 gap-8">
      <div className="flex-1 flex flex-col justify-between xl:max-w-[400px]">
        {followedUpdates.length > 0 && (
          <div className="p-4 rounded-2xl bg-pink-500/10 border border-pink-500/20 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3"><Heart className="w-5 h-5 text-pink-400 fill-pink-400" /><div><p className="text-xs font-bold text-pink-300">Updates Seguidos</p><p className="text-[10px] text-pink-200/50">{followedUpdates.length} pendientes</p></div></div>
            <div className="flex -space-x-2">{followedUpdates.slice(0,3).map(m => <img key={m.projectId} src={m.iconUrl || undefined} className="w-6 h-6 rounded-full border border-pink-500/50" />)}</div>
          </div>
        )}
        <div><p className="text-[10px] uppercase tracking-widest opacity-60 mb-2 flex items-center gap-2"><Spotlight className="w-3.5 h-3.5" /> Editorial</p><AnimatedHeadline /><p className="text-xs opacity-60 mt-1">Picks mensuales y selecciones de la comunidad.</p></div>
        <div className="mt-8 flex h-[380px] gap-4">
          <div className="flex-1 flex flex-col overflow-hidden"><h3 className="text-xs text-white/80 mb-3 flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-blue-400" /> Actualizados</h3><div className="flex-1 relative"><VerticalTicker mods={cfRecent} onOpenVersions={onOpenVersions} speed={0.5} reverse={true} theme={theme} /></div></div>
          <div className="flex-1 flex flex-col overflow-hidden"><h3 className="text-xs text-white/80 mb-3 flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-purple-400" /> Nuevos</h3><div className="flex-1 relative"><VerticalTicker mods={newestMods} onOpenVersions={onOpenVersions} speed={0.6} theme={theme} /></div></div>
        </div>
      </div>

      <div className="flex-1 relative rounded-[2.5rem] flex flex-col gap-6 py-6 overflow-hidden" style={{ background: themeStyles.rightBg, border: themeStyles.border, boxShadow: themeStyles.shadow }}>
        <MarqueeRow title="Modrinth Picks" mods={latestCollectionMods} onOpenVersions={onOpenVersions} onDownload={onDownloadMod} downloading={downloading} speed={0.8} theme={theme} />
        <MarqueeRow title="CurseForge Picks" mods={cfFeatured} onOpenVersions={onOpenVersions} onDownload={onDownloadMod} downloading={downloading} speed={0.9} reverse theme={theme} />
      </div>
    </div>
  );
}

function MarqueeRow({ title, mods, onOpenVersions, onDownload, downloading, speed, reverse, theme }: any) {
  const { containerRef, innerRef, handlers } = useSmoothMarquee(speed, reverse, false);
  return (
    <div className="flex-1 flex flex-col min-h-[270px]">
      <div className="px-8 mb-3"><span className="px-3 py-1 rounded-full text-[9px] font-black uppercase bg-white/5 border border-white/10">{title}</span></div>
      <div ref={containerRef} className="relative flex-1 overflow-hidden mask-horizontal-edges cursor-grab py-4" {...handlers}>
        <div ref={innerRef} className="flex gap-6 w-max px-4 h-full">
          {[...mods, ...mods, ...mods].map((m: any, i: number) => <SpotlightEditorialCard key={`${m.projectId}-${i}`} mod={m} onOpenVersions={onOpenVersions} onDownload={onDownload} isDownloading={!!downloading[m.projectId]} theme={theme} />)}
        </div>
      </div>
    </div>
  );
}
