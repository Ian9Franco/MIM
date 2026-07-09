"use client";

import React from "react";
import { motion } from "framer-motion";
import { Clock, Calendar, Loader2, Settings2, ChevronRight } from "lucide-react";
import {
  VerticalTicker,
  HorizontalEditorialMarquee,
  HorizontalShowcaseMarquee,
  type ModHit,
} from "../SpotlightMarquees";
import type { CollectionItem } from "../../app/types";
import { SpotlightSkeleton } from "../FomoSkeletons";

interface SpotlightTabProps {
  latestCollectionName: string;
  curseForgeFeatured: CollectionItem[];
  activeSpotlightPlatform: "modrinth" | "curseforge";
  setActiveSpotlightPlatform: (p: "modrinth" | "curseforge") => void;
  loadingLatestMods: boolean;
  latestFeaturedMods: ModHit[];
  handleOpenModDetails: (mod: ModHit) => void;
  handleEnterCollection: (coll: CollectionItem) => void;
  showcaseChannels: string[];
  setShowChannelPicker: (v: boolean) => void;
  updatedMods: ModHit[];
  newestMods: ModHit[];
}

/**
 * SpotlightTab — Mods destacados, marquee de showcases y tickers verticales.
 * El HorizontalShowcaseMarquee va de derecha a izquierda (reverse=false)
 * y admite scroll táctil/mouse gracias al useSmoothMarquee hook existente.
 */
export function SpotlightTab({
  latestCollectionName, curseForgeFeatured, activeSpotlightPlatform,
  setActiveSpotlightPlatform, loadingLatestMods, latestFeaturedMods,
  handleOpenModDetails, handleEnterCollection, showcaseChannels,
  setShowChannelPicker, updatedMods, newestMods,
}: SpotlightTabProps) {
  return (
    <motion.div
      key="spotlight"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="flex-1 flex flex-col min-h-0 overflow-y-auto pb-24 scrollbar-none"
    >
      {/* Section header */}
      <div
        className="border-l-2 rounded-r-lg p-3 mb-6 shrink-0"
        style={{
          background: "linear-gradient(to right, color-mix(in srgb, var(--color-primary) 10%, transparent), transparent)",
          borderColor: "var(--color-primary)"
        }}
      >
        <p className="text-[10px] font-mono uppercase tracking-wider font-bold" style={{ color: "var(--color-primary)" }}>
          Showcases Spotlight
        </p>
        <h2 className="text-xs font-semibold text-white/95 mt-1">
          Minecraft Mods e ideas editoriales en vivo.
        </h2>
      </div>

      {/* Featured mods carousel */}
      <div className="flex flex-col gap-3 mb-6 shrink-0">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-xs font-bold text-white/80 tracking-wide flex items-center gap-1.5">
            {activeSpotlightPlatform === "modrinth"
              ? `Destacados: ${latestCollectionName || "Modrinth Featured"}`
              : `Destacados: ${curseForgeFeatured[0]?.name || "CurseForge Community Picks"}`}
          </h3>
          <button
            onClick={() => setActiveSpotlightPlatform(activeSpotlightPlatform === "modrinth" ? "curseforge" : "modrinth")}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold tracking-widest uppercase bg-white/5 text-white/80 border border-white/10 shadow-sm backdrop-blur-md hover:bg-white/10 transition-colors"
          >
            <span>{activeSpotlightPlatform === "modrinth" ? "Ver CurseForge" : "Ver Modrinth"}</span>
            <ChevronRight className={`w-3 h-3 transform transition-transform ${activeSpotlightPlatform === "curseforge" ? "rotate-180" : ""}`} />
          </button>
        </div>

        {loadingLatestMods ? (
          <SpotlightSkeleton />
        ) : (
          <div className="w-full">
            {activeSpotlightPlatform === "modrinth" ? (
              <HorizontalEditorialMarquee
                items={latestFeaturedMods}
                type="mod"
                onSelectMod={handleOpenModDetails}
                speed={0.8}
                reverse={true}
              />
            ) : (
              <HorizontalEditorialMarquee
                items={curseForgeFeatured}
                type="collection"
                onSelectCollection={handleEnterCollection}
                speed={0.75}
                reverse={true}
              />
            )}
          </div>
        )}
      </div>

      {/* Multi-channel showcase marquee — derecha a izquierda (reverse=false) */}
      <div className="flex flex-col gap-3 mb-6 shrink-0">
        <div className="px-1 flex items-center justify-between">
          <span
            className="px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase border shadow-sm backdrop-blur-md"
            style={{
              backgroundColor: "color-mix(in srgb, var(--color-primary) 12%, transparent)",
              color: "var(--color-primary)",
              borderColor: "color-mix(in srgb, var(--color-primary) 25%, transparent)"
            }}
          >
            Showcase · {showcaseChannels.length} canal{showcaseChannels.length !== 1 ? "es" : ""}
          </span>
          <button
            onClick={() => setShowChannelPicker(true)}
            className="p-1.5 rounded-xl hover:bg-white/5 active:scale-95 text-white/35 hover:text-white/80 transition-all"
            title="Configurar canales"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>
        </div>
        <HorizontalShowcaseMarquee channels={showcaseChannels} speed={0.85} reverse={false} />
      </div>

      {/* Vertical tickers */}
      <div className="flex gap-4 h-[300px] min-h-[300px] mb-4">
        <div className="flex-1 flex flex-col min-h-0">
          <h3 className="text-[11px] font-bold text-white/80 tracking-wide mb-3 flex items-center gap-1.5 shrink-0">
            <Clock className="w-3.5 h-3.5 text-blue-400" /> Actualizados
          </h3>
          <div className="flex-1 relative bg-white/[0.01] rounded-xl border border-white/[0.03]">
            <VerticalTicker mods={updatedMods} onSelectMod={handleOpenModDetails} speed={0.4} color="text-blue-400" reverse={true} />
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          <h3 className="text-[11px] font-bold text-white/80 tracking-wide mb-3 flex items-center gap-1.5 shrink-0">
            <Calendar className="w-3.5 h-3.5 text-purple-400" /> Creados
          </h3>
          <div className="flex-1 relative bg-white/[0.01] rounded-xl border border-white/[0.03]">
            <VerticalTicker mods={newestMods} onSelectMod={handleOpenModDetails} speed={0.5} color="text-purple-400" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
