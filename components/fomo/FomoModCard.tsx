/**
 * @fileoverview FomoModCard – a single result card in the FOMO discover view.
 * Shows mod icon, metadata, categories and action buttons (external link,
 * quick download, version picker, add to collection).
 */

"use client";

import React, { memo } from "react";
import {
  Flame, ExternalLink, Download, Loader2, Library, ListTree, Layers3, CheckCircle2, Circle
} from "lucide-react";
import { formatNumber } from "@/utils/format";
import { openExternal } from "@/utils/format";
import { COLORS } from "@/theme/tokens";
import { Chip } from "../ui/primitives";
import type { ModHit } from "@/lib/types";

interface FomoModCardProps {
  mod:              ModHit;
  isDownloading:    boolean;
  onDownload:       (mod: ModHit) => void;
  onOpenVersions:   (mod: ModHit) => void;
  onAddToCollection:(mod: ModHit) => void;
  isSelected?:      boolean;
  onToggleSelect?:  (mod: ModHit) => void;
}

export const FomoModCard = memo(function FomoModCard({
  mod, isDownloading, onDownload, onOpenVersions, onAddToCollection,
  isSelected, onToggleSelect,
}: FomoModCardProps) {
  const isCurseForge = mod._source === "curseforge";
  
  // Mejorar la detección del tipo basándose en los metadatos de Modrinth si están disponibles
  const rawType = mod.projectType || (mod.url?.includes('/resourcepack/') ? 'resourcepack' : mod.url?.includes('/shader/') ? 'shader' : mod.url?.includes('/datapack/') ? 'datapack' : 'mod');
  
  const typeLabel = rawType === "resourcepack"
    ? "Textura"
    : rawType === "shader"
    ? "Shader"
    : rawType === "datapack"
    ? "Datapack"
    : "Mod";

  return (
    <article
      onClick={() => onToggleSelect?.(mod)}
      className={`transition-all duration-200 shadow-md relative group cursor-pointer ${isSelected ? 'ring-2 ring-primary' : ''} ${
        isCurseForge 
          ? 'rounded-none border-2 border-orange-900/30' 
          : 'rounded-[1.35rem] border glass-hover backdrop-blur-[14px]'
      }`}
      style={{ 
        background: isCurseForge 
          ? "rgba(30, 20, 10, 0.85)" 
          : (isSelected ? "rgba(187,150,228,0.1)" : COLORS.card), 
        borderColor: isCurseForge 
          ? (isSelected ? COLORS.curseforgeOrange : "rgba(239, 108, 0, 0.2)")
          : (isSelected ? COLORS.primary : COLORS.border),
      }}
      aria-label={mod.title}
    >
      {/* Selection Toggle - Reubicado para no tapar el chip de tipo */}
      {onToggleSelect && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleSelect(mod); }}
          className={`absolute top-4 right-4 p-1.5 transition-all z-20 ${
            isCurseForge ? 'rounded-none' : 'rounded-full'
          } ${
            isSelected 
              ? (isCurseForge ? 'bg-orange-600 text-white scale-110 shadow-lg shadow-orange-900/40' : 'bg-primary text-white scale-110 shadow-lg shadow-primary/40') 
              : 'bg-black/40 text-white/60 opacity-0 group-hover:opacity-100 hover:bg-black/60 backdrop-blur-md border border-white/10'
          }`}
          aria-label={isSelected ? "Deseleccionar" : "Seleccionar"}
        >
          {isSelected ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
        </button>
      )}

      <div className="p-4">
        <div className="flex items-start gap-4">
          <div
            aria-hidden="true"
            className={`w-16 h-16 overflow-hidden shrink-0 flex items-center justify-center ${
              isCurseForge ? 'rounded-none border-2 border-orange-900/40' : 'rounded-2xl border'
            }`}
            style={{ background: "var(--color-secondary-bg)", borderColor: COLORS.borderStrong }}
          >
            {mod.iconUrl
              ? <img src={mod.iconUrl} alt="" className="w-full h-full object-cover" style={{ imageRendering: "pixelated" }} loading="lazy" />
              : <Flame className="w-7 h-7 opacity-25" aria-hidden="true" />
            }
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 pr-6"> {/* Espacio para el botón de selección */}
                <p className={`font-headline text-base leading-tight truncate ${isCurseForge ? 'uppercase tracking-tight font-black' : ''}`} style={{ color: COLORS.foreground }}>{mod.title}</p>
                <p className="font-caption mt-1" style={{ color: COLORS.muted }}>por {mod.author || "Autor desconocido"}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap mt-3" role="list" aria-label="Metadatos">
              <Chip color={isCurseForge ? COLORS.curseforgeOrange : COLORS.primary} bg={isCurseForge ? "rgba(239,108,0,0.14)" : "rgba(187,150,228,0.12)"} className={isCurseForge ? 'rounded-none border border-orange-900/30' : ''}>
                {typeLabel}
              </Chip>
              <Chip bg="rgba(255,255,255,0.06)" className={isCurseForge ? 'rounded-none' : ''}>↓ {formatNumber(mod.downloads)}</Chip>
              {mod.latestVersion && <Chip color={COLORS.emerald} bg="rgba(102,200,160,0.14)" className={isCurseForge ? 'rounded-none' : ''}>v{mod.latestVersion}</Chip>}
            </div>
          </div>
        </div>

        <p className="font-caption mt-4 leading-relaxed line-clamp-3 text-sm" style={{ color: COLORS.muted }}>
          {mod.description}
        </p>

        <div className="grid grid-cols-2 gap-2 mt-5">
          {!isCurseForge && (
            <button
              onClick={(e) => { e.stopPropagation(); onOpenVersions(mod); }}
              aria-label={`Ver detalles de ${mod.title}`}
              className="flex items-center justify-center gap-1.5 h-9.5 px-2.5 rounded-xl text-xs font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm"
              style={{ background: "rgba(187,150,228,0.12)", color: COLORS.primary, border: "1px solid rgba(187,150,228,0.2)" }}
            >
              <ListTree className="w-4 h-4 shrink-0" />
              <span className="truncate">Detalles</span>
            </button>
          )}

          {!isCurseForge && (
            <button
              onClick={(e) => { e.stopPropagation(); onDownload(mod); }}
              disabled={isDownloading}
              aria-label={isDownloading ? "Descargando…" : `Descargar ${mod.title}`}
              className="flex items-center justify-center gap-1.5 h-9.5 px-2.5 rounded-xl text-xs font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 shadow-sm"
              style={{ background: "rgba(102,200,160,0.12)", color: COLORS.emerald, border: "1px solid rgba(102,200,160,0.22)" }}
            >
              {isDownloading ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <Download className="w-4 h-4 shrink-0" />}
              <span className="truncate">Descargar</span>
            </button>
          )}

          <button
            onClick={(e) => { e.stopPropagation(); openExternal(mod.url); }}
            aria-label={`Ver ${mod.title} en ${isCurseForge ? "CurseForge" : "Modrinth"}`}
            className={`flex items-center justify-center gap-1.5 h-9.5 px-2.5 text-xs font-semibold transition-all hover:bg-white/10 hover:scale-[1.02] active:scale-[0.98] shadow-sm ${
              isCurseForge ? 'rounded-none border border-orange-500/30' : 'rounded-xl border border-white/10'
            }`}
            style={{ color: isCurseForge ? COLORS.curseforgeOrange : COLORS.foreground, background: "var(--color-secondary-bg)" }}
          >
            <ExternalLink className="w-4 h-4 shrink-0" />
            <span className="truncate">Web</span>
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); onAddToCollection(mod); }}
            aria-label={`Añadir ${mod.title} a colección`}
            className={`flex items-center justify-center gap-1.5 h-9.5 px-2.5 text-xs font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm ${
              isCurseForge ? 'rounded-none border border-orange-500/30' : 'rounded-xl'
            }`}
            style={{ 
              background: isCurseForge ? "rgba(239, 108, 0, 0.08)" : "var(--color-accent-bg)", 
              color: COLORS.gold,
              borderColor: isCurseForge ? "rgba(239, 108, 0, 0.2)" : "var(--color-accent-border)",
              borderWidth: isCurseForge ? "1px" : "1px"
            }}
          >
            <Library className="w-4 h-4 shrink-0" />
            <span className="truncate">Colección</span>
          </button>
        </div>
      </div>
    </article>
  );
});
