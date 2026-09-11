"use client";

import React from "react";
import { motion } from "framer-motion";
import { Loader2, Languages, ExternalLink } from "lucide-react";
import type { ModHit } from "../SpotlightMarquees";
import type { FomoModDetails, FomoGalleryItem } from "../../types/fomo";
import { environmentSideLabel, environmentToneClass, type InterpretedEnvironment } from "../../lib/projectEnvironment";
import { stripHtml, normalizeLoaderLabel, CONTENT_TYPE_LABELS } from "./utils";
import type { ModDetailsTabId } from "./ModDetailsTabs";

interface ModDetailsSummaryTabProps {
  selectedMod: ModHit;
  selectedModDetails: FomoModDetails | null;
  environment: InterpretedEnvironment;
  availableLoaders: string[];
  availableContentTypes: string[];
  galleryImages: FomoGalleryItem[];
  explainedBody: string | null;
  isExplaining: boolean;
  handleExplain: () => void;
  setModalTab: (t: ModDetailsTabId) => void;
  translatedSummary: string | null;
  isTranslatingSummary: boolean;
  handleTranslateSummary: () => void;
  handleGalleryWheel: (e: React.WheelEvent<HTMLDivElement>) => void;
  setDragEnabled: (val: boolean) => void;
  setActiveImageIndex: (idx: number | null) => void;
}

export function ModDetailsSummaryTab({
  selectedMod,
  selectedModDetails,
  environment,
  availableLoaders,
  availableContentTypes,
  galleryImages,
  explainedBody,
  isExplaining,
  handleExplain,
  setModalTab,
  translatedSummary,
  isTranslatingSummary,
  handleTranslateSummary,
  handleGalleryWheel,
  setDragEnabled,
  setActiveImageIndex,
}: ModDetailsSummaryTabProps) {
  return (
    <motion.div
      key="summary"
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col gap-4 w-full pb-2"
    >
      {/* Stats row */}
      <div className="flex gap-3 text-[10px] border-b border-white/[0.04] pb-3 flex-wrap">
        <div className="flex-1 min-w-[70px]">
          <span className="text-white/30 block uppercase font-mono tracking-wider">Origen</span>
          <span className="text-white/70 font-semibold mt-0.5 block capitalize">
            {selectedMod._source || "Modrinth"}
          </span>
        </div>
        {selectedMod.categories && selectedMod.categories.length > 0 && (
          <div className="flex-1 min-w-[120px]">
            <span className="text-white/30 block uppercase font-mono tracking-wider">Etiquetas</span>
            <span className="text-white/70 font-semibold mt-0.5 block truncate capitalize">
              {selectedMod.categories.join(", ")}
            </span>
          </div>
        )}
        {selectedMod.downloads !== undefined && (
          <div className="min-w-[50px]">
            <span className="text-white/30 block uppercase font-mono tracking-wider">Descargas</span>
            <span className="text-orange-400 font-bold mt-0.5 block font-mono">
              {selectedMod.downloads >= 1_000_000
                ? `${(selectedMod.downloads / 1_000_000).toFixed(1)}M`
                : selectedMod.downloads >= 1_000
                  ? `${Math.round(selectedMod.downloads / 1_000)}K`
                  : selectedMod.downloads}
            </span>
          </div>
        )}
      </div>

      {/* Description / Summary */}
      <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4">
        <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-white/[0.04]">
          <span className="text-[10px] font-mono uppercase tracking-widest text-white/35 font-bold">
            Resumen
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                if (!explainedBody) {
                  handleExplain();
                }
                setModalTab("desc");
              }}
              disabled={isExplaining}
              className={`mim-control-3d px-2 py-1 rounded-md border text-[9px] font-bold flex items-center gap-1 transition-all disabled:opacity-50 text-purple-300 bg-purple-500/10 border-purple-500/25 hover:bg-purple-500/20 ${explainedBody || isExplaining ? "mim-control-3d-active" : ""}`}
              title="Explicar e investigar con MIM-Bot"
            >
              {isExplaining ? (
                <Loader2 className="w-2.5 h-2.5 animate-spin" />
              ) : (
                <img src="/icon.png" alt="" className="w-3 h-3 object-contain animate-slime shrink-0" />
              )}
              {isExplaining ? "Sintetizando..." : "MIM-Bot"}
            </button>
            <button
              type="button"
              onClick={handleTranslateSummary}
              disabled={isTranslatingSummary || !selectedMod.description}
              className={`mim-control-3d px-2 py-1 rounded-md border text-[9px] font-bold flex items-center gap-1 transition-all disabled:opacity-50 ${translatedSummary || isTranslatingSummary ? "mim-control-3d-active" : ""}`}
              style={{
                color: "var(--color-primary)",
                background: "color-mix(in srgb, var(--color-primary) 10%, transparent)",
                borderColor: "color-mix(in srgb, var(--color-primary) 24%, transparent)",
              }}
            >
              {isTranslatingSummary ? (
                <Loader2 className="w-2.5 h-2.5 animate-spin" />
              ) : (
                <Languages className="w-2.5 h-2.5" />
              )}
              {isTranslatingSummary ? "Traduciendo" : translatedSummary ? "Original" : "Traducir"}
            </button>
          </div>
        </div>
        {translatedSummary ? (
          <p
            className="text-xs font-semibold leading-relaxed whitespace-pre-wrap"
            style={{ color: "var(--color-primary)" }}
          >
            {translatedSummary}
          </p>
        ) : (
          <p className="text-xs text-white/75 leading-relaxed">
            {stripHtml(selectedMod.description || "") ||
              "Este mod expande las opciones de automatización y es totalmente compatible con la versión activa."}
          </p>
        )}
      </div>

      {/* Compatibility */}
      <div className="grid grid-cols-2 gap-3 bg-white/[0.02] border border-white/[0.04] rounded-xl p-3.5 text-[11px] text-white/70">
        <div className={`col-span-2 rounded-xl border p-3 ${environmentToneClass(environment.tone)}`}>
          <span className="text-[9px] uppercase font-mono block opacity-60">Entorno</span>
          <span className="font-black block text-[12px] mt-1">{environment.label}</span>
          <p className="text-[10px] leading-relaxed mt-1 opacity-75">{environment.description}</p>
        </div>
        <div>
          <span className="text-[9px] text-white/30 uppercase font-mono block">Cliente</span>
          <span className="font-semibold block mt-0.5">{environmentSideLabel(environment.client)}</span>
        </div>
        <div>
          <span className="text-[9px] text-white/30 uppercase font-mono block">Servidor</span>
          <span className="font-semibold block mt-0.5">{environmentSideLabel(environment.server)}</span>
        </div>
        {selectedModDetails?.license && (
          <div className="col-span-2">
            <span className="text-[9px] text-white/30 uppercase font-mono block">Licencia</span>
            <span className="font-semibold block mt-0.5">
              {selectedModDetails.license.name || selectedModDetails.license.id}
            </span>
          </div>
        )}
      </div>

      {/* Available Loaders & Content Types */}
      {(availableLoaders.length > 0 || availableContentTypes.length > 0) && (
        <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-3.5 flex flex-col gap-3">
          {availableLoaders.length > 0 && (
            <div>
              <span className="text-[9px] text-white/30 uppercase font-mono block mb-1.5">
                Modloaders disponibles
              </span>
              <div className="flex flex-wrap gap-1.5">
                {availableLoaders.map((loader) => (
                  <span
                    key={loader}
                    className="px-2 py-1 rounded-lg border border-orange-500/20 bg-orange-500/10 text-orange-300 text-[9px] font-bold"
                  >
                    {normalizeLoaderLabel(loader)}
                  </span>
                ))}
              </div>
            </div>
          )}
          {availableContentTypes.length > 0 && (
            <div>
              <span className="text-[9px] text-white/30 uppercase font-mono block mb-1.5">
                Tipos disponibles
              </span>
              <div className="flex flex-wrap gap-1.5">
                {availableContentTypes.map((type) => (
                  <span
                    key={type}
                    className="px-2 py-1 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 text-[9px] font-bold"
                  >
                    {CONTENT_TYPE_LABELS[type] || type}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* External links */}
      <div className="flex flex-wrap gap-2 pt-1">
        {selectedModDetails?.wiki_url && (
          <a
            href={selectedModDetails.wiki_url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white/5 hover:bg-white/10 border border-white/[0.06] px-3 py-1.5 rounded-xl text-[10px] font-semibold text-white/80 flex items-center gap-1.5 transition-all"
          >
            <ExternalLink className="w-3 h-3" /> Wiki
          </a>
        )}
        {selectedModDetails?.source_url && (
          <a
            href={selectedModDetails.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white/5 hover:bg-white/10 border border-white/[0.06] px-3 py-1.5 rounded-xl text-[10px] font-semibold text-white/80 flex items-center gap-1.5 transition-all"
          >
            <ExternalLink className="w-3 h-3" /> Código Fuente
          </a>
        )}
        {selectedModDetails?.issues_url && (
          <a
            href={selectedModDetails.issues_url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white/5 hover:bg-white/10 border border-white/[0.06] px-3 py-1.5 rounded-xl text-[10px] font-semibold text-white/80 flex items-center gap-1.5 transition-all"
          >
            <ExternalLink className="w-3 h-3" /> Reportes
          </a>
        )}
        {selectedModDetails?.discord_url && (
          <a
            href={selectedModDetails.discord_url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white/5 hover:bg-white/10 border border-white/[0.06] px-3 py-1.5 rounded-xl text-[10px] font-semibold text-white/80 flex items-center gap-1.5 transition-all"
          >
            <ExternalLink className="w-3 h-3" /> Discord
          </a>
        )}
        {selectedMod?.url && (
          <a
            href={selectedMod.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`px-3 py-1.5 rounded-xl text-[10px] font-semibold flex items-center gap-1.5 transition-all border ${
              selectedMod._source === "chunk"
                ? "bg-[#00cc44]/10 hover:bg-[#00cc44]/20 border-[#00cc44]/30 text-[#00cc44]"
                : "bg-white/5 hover:bg-white/10 border-white/[0.06] text-white/80"
            }`}
          >
            <ExternalLink className="w-3 h-3" />
            <span>{selectedMod._source === "chunk" ? "Ver en chunk.gg (Marketplace)" : "Página Oficial"}</span>
          </a>
        )}
      </div>

      {/* Gallery horizontal preview */}
      {galleryImages.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-white/[0.04] pt-3">
          <span className="text-[10px] text-white/30 uppercase font-mono tracking-wider block">Galería</span>
          <div
            onWheel={handleGalleryWheel}
            onTouchStart={(e) => {
              e.stopPropagation();
              setDragEnabled(false);
            }}
            onTouchEnd={() => setDragEnabled(true)}
            onTouchCancel={() => setDragEnabled(true)}
            className="flex gap-3 overflow-x-auto pb-1 scrollbar-none snap-x cursor-grab active:cursor-grabbing"
          >
            {galleryImages.map((img: FomoGalleryItem, i: number) => (
              <div
                key={i}
                onClick={() => setActiveImageIndex(i)}
                className="relative aspect-video h-20 rounded-xl overflow-hidden bg-white/5 border border-white/[0.05] flex-shrink-0 snap-center cursor-pointer hover:border-white/20 transition-all hover:scale-[1.02]"
              >
                <img src={img.url} alt={img.title || "Screenshot"} className="object-cover w-full h-full" />
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
