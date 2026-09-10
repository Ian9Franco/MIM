"use client";

import React from "react";
import { motion } from "framer-motion";
import { ExternalLink, ChevronRight } from "lucide-react";
import { DefaultModIcon } from "../../DefaultModIcon";
import { CollectibleSurface } from "../../CollectibleSurface";
import { formatDownloads, getBannerFallbackStyle } from "./discoverConstants";
import type { ModHit } from "../../SpotlightMarquees";

interface DiscoverModCardProps {
  mod: ModHit;
  resultIndex: number;
  handleOpenModDetails: (mod: ModHit) => void;
}

export function DiscoverModCard({
  mod,
  resultIndex,
  handleOpenModDetails,
}: DiscoverModCardProps) {
  const isCurse = mod._source === "curseforge";
  const cardRoundedClass = isCurse ? "rounded-xl" : "rounded-3xl";
  const iconRoundedClass = isCurse ? "rounded-lg" : "rounded-2xl";

  const pType = mod.projectType || "mod";
  const bannerUrl = mod.gallery?.[0]?.url || undefined;
  const { bannerBgColor, fallbackTexture } = getBannerFallbackStyle(pType);

  const platformBorderClass = isCurse
    ? "border-orange-500/20 hover:border-orange-500/45"
    : "border-emerald-500/20 hover:border-emerald-500/45";

  return (
    <CollectibleSurface
      key={mod.projectId}
      onClick={() => handleOpenModDetails(mod)}
      label={`Ver detalles de ${mod.title}`}
      className={`mim-discover-card flex flex-col overflow-hidden ${cardRoundedClass} ${platformBorderClass}`}
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(resultIndex * 0.025, 0.18) }}
        whileHover={{ y: -3 }}
        whileTap={{ scale: 0.985 }}
        className="flex h-full flex-col"
      >
        {/* Banner/Header of the card */}
        <div
          className="h-12 w-full relative shrink-0 overflow-hidden"
          style={
            bannerUrl
              ? {
                  backgroundImage: `url(${bannerUrl})`,
                  backgroundPosition: "center",
                  backgroundSize: "cover",
                }
              : {
                  backgroundColor: bannerBgColor,
                  ...fallbackTexture,
                }
          }
        >
          {/* Small tag/badge on the banner */}
          <div className="absolute top-2 left-2.5 flex items-center gap-1 z-10">
            <span className="text-[7.5px] font-black uppercase tracking-wider bg-black/75 text-white px-1.5 py-0.5 rounded">
              {pType}
            </span>
          </div>

          {/* Platform Badge Tag */}
          <div className="absolute top-2 right-2.5 z-10">
            <span
              className={`text-[7.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shadow-sm ${
                isCurse
                  ? "bg-orange-600 text-white border border-orange-500/20"
                  : "bg-emerald-600 text-white border border-emerald-500/20"
              }`}
            >
              {isCurse ? "CurseForge" : "Modrinth"}
            </span>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-3 pt-6 relative flex-grow flex flex-col justify-between">
          {/* Floating Icon Container */}
          <div
            className={`absolute -top-6 left-3 w-10 h-10 bg-surface border border-white/[0.08] flex items-center justify-center overflow-hidden shadow-md ${iconRoundedClass}`}
          >
            {mod.iconUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mod.iconUrl}
                  alt=""
                  className="object-cover w-full h-full"
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
          </div>

          <div className="flex-grow min-w-0 mt-1">
            <h4 className="text-[11px] font-bold text-white leading-tight line-clamp-2 pr-1">
              {mod.title}
            </h4>
            <p className="text-[9px] text-white/40 mt-1 truncate">
              por <span className="text-white/60 font-semibold">{mod.author || "Comunidad"}</span>
            </p>
          </div>

          <div className="flex items-center justify-between border-t border-white/[0.04] pt-2 mt-2.5">
            {mod.downloads !== undefined ? (
              <span className="text-[9px] font-mono text-white/30 font-semibold">
                {formatDownloads(mod.downloads)} ↓
              </span>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2">
              <a
                href={mod.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all flex items-center justify-center"
                title={`Abrir en ${isCurse ? "CurseForge" : "Modrinth"}`}
              >
                <ExternalLink className="w-3 h-3" />
              </a>
              <span className="text-[9px] font-bold text-orange-400/90 flex items-center gap-0.5">
                Ver <ChevronRight className="w-2.5 h-2.5" />
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </CollectibleSurface>
  );
}
