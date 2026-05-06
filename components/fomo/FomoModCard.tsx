/**
 * @fileoverview FomoModCard – a single result card in the FOMO discover view.
 * Shows mod icon, metadata, categories and action buttons (external link,
 * quick download, version picker, add to collection).
 */

"use client";

import React, { memo } from "react";
import {
  Flame, ExternalLink, Download, Loader2, Library, ListTree, Layers3, CheckCircle2, Circle, Check, Info
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
  
  // Iconos de plataforma para exclusividad
  const ModrinthIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
      <path d="M12 2C6.477 2 2 6.477 2 12C2 17.523 6.477 22 12 22C17.523 22 22 17.523 22 12C22 6.477 17.523 2 12 2ZM15.63 15.63L14.22 17.04L12 14.82L9.78 17.04L8.37 15.63L10.59 13.41L8.37 11.19L9.78 9.78L12 12L14.22 9.78L15.63 11.19L13.41 13.41L15.63 15.63Z" fill="currentColor"/>
    </svg>
  );

  const CurseForgeIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
      <path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z" fill="currentColor"/>
    </svg>
  );

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
          ? "var(--color-cf-bg)" 
          : (isSelected ? "rgba(187,150,228,0.1)" : COLORS.card), 
        borderColor: isCurseForge 
          ? (isSelected ? COLORS.curseforgeOrange : "var(--color-cf-border)")
          : (isSelected ? COLORS.primary : COLORS.border),
      }}
      aria-label={mod.title}
    >
      {/* Selection Toggle - Reubicado para no tapar el chip de tipo */}
      {onToggleSelect && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleSelect?.(mod); }}
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
                <div className="flex items-center gap-1.5 mt-1">
                  <p className="font-caption truncate" style={{ color: COLORS.muted }}>por {mod.author || "Autor desconocido"}</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); openExternal(mod.url); }}
                    className="p-1 rounded-md text-white/40 hover:text-white/80 hover:bg-white/5 transition-all"
                    title="Ver en web"
                    aria-label="Ver en web"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap mt-3" role="list" aria-label="Metadatos">
              <Chip color={isCurseForge ? COLORS.curseforgeOrange : COLORS.primary} bg={isCurseForge ? "rgba(239,108,0,0.14)" : "rgba(187,150,228,0.12)"} className={isCurseForge ? 'rounded-none border border-orange-900/30' : ''}>
                {typeLabel}
              </Chip>
              <Chip bg="rgba(255,255,255,0.06)" className={isCurseForge ? 'rounded-none' : ''}>↓ {formatNumber(mod.downloads)}</Chip>
              {mod.latestVersion && <Chip color={COLORS.emerald} bg="rgba(102,200,160,0.14)" className={isCurseForge ? 'rounded-none' : ''}>v{mod.latestVersion}</Chip>}
              
              {/* Badge de Plataforma y Exclusividad Real */}
              <div className="flex items-center gap-1 ml-auto">
                {mod.availability?.checking ? (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/40 animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span className="text-[0.6rem] font-bold uppercase tracking-tighter">Check...</span>
                  </div>
                ) : (
                  <>
                    {/* Caso 1: Está en AMBAS plataformas */}
                    {mod.availability?.curseforge && mod.availability?.modrinth ? (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-primary/80" title="Disponible en CurseForge y Modrinth">
                        <div className="flex -space-x-1">
                          <CurseForgeIcon />
                          <ModrinthIcon />
                        </div>
                        <span className="text-[0.6rem] font-bold uppercase tracking-tighter">Cross-Platform</span>
                      </div>
                    ) : (
                      /* Caso 2: EXCLUSIVO de una plataforma */
                      isCurseForge ? (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-orange-500/10 border border-orange-500/20 text-orange-500/80" title="Exclusivo de CurseForge">
                          <CurseForgeIcon />
                          <span className="text-[0.6rem] font-bold uppercase tracking-tighter">Only CF</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#1bd672]/10 border border-[#1bd672]/20 text-[#1bd672]/80" title="Exclusivo de Modrinth">
                          <ModrinthIcon />
                          <span className="text-[0.6rem] font-bold uppercase tracking-tighter">Only MR</span>
                        </div>
                      )
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <p className="font-caption mt-4 leading-relaxed line-clamp-3 text-sm" style={{ color: COLORS.muted }}>
          {mod.description}
        </p>

        <div className="grid grid-cols-3 gap-2 mt-5">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleSelect?.(mod); }}
            aria-label={`Seleccionar ${mod.title} para colección`}
            className={`flex items-center justify-center gap-1.5 h-9.5 px-2.5 rounded-xl text-xs font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm ${isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-[#1A1A1A]' : ''}`}
            style={{ 
              background: isSelected ? COLORS.primary : (isCurseForge ? "rgba(239, 108, 0, 0.12)" : "rgba(187,150,228,0.12)"), 
              color: isSelected ? "#FFF" : (isCurseForge ? COLORS.curseforgeOrange : COLORS.primary), 
              border: isSelected ? "none" : `1px solid ${isCurseForge ? "rgba(239, 108, 0, 0.2)" : "rgba(187,150,228,0.2)"}` 
            }}
          >
            {isSelected ? <Check className="w-4 h-4 shrink-0" /> : <ListTree className="w-4 h-4 shrink-0" />}
            <span className="truncate">{isSelected ? "Seleccionado" : "Añadir"}</span>
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); onDownload(mod); }}
            disabled={isDownloading}
            aria-label={isDownloading ? "Descargando…" : (isCurseForge && mod.allowModDistribution === false ? "Abrir página de descarga manual" : `Descargar ${mod.title}`)}
            className="flex items-center justify-center gap-1.5 h-9.5 px-2.5 rounded-xl text-xs font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:grayscale disabled:scale-100 shadow-sm"
            style={{ 
              background: isCurseForge && mod.allowModDistribution === false ? "rgba(239, 108, 0, 0.12)" : "rgba(102,200,160,0.12)", 
              color: isCurseForge && mod.allowModDistribution === false ? COLORS.curseforgeOrange : COLORS.emerald, 
              border: `1px solid ${isCurseForge && mod.allowModDistribution === false ? "rgba(239, 108, 0, 0.22)" : "rgba(102,200,160,0.22)"}` 
            }}
            title={isCurseForge && mod.allowModDistribution === false ? "El autor ha desactivado la descarga automática. Al hacer clic se abrirá la web para descarga manual." : ""}
          >
            {isDownloading ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : (isCurseForge && mod.allowModDistribution === false ? <ExternalLink className="w-4 h-4 shrink-0" /> : <Download className="w-4 h-4 shrink-0" />)}
            <span className="truncate">
              {isCurseForge && mod.allowModDistribution === false ? "Manual" : "Descargar"}
            </span>
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); onOpenVersions(mod); }}
            aria-label={`Ver detalles de ${mod.title}`}
            className={`flex items-center justify-center gap-1.5 h-9.5 px-2.5 text-xs font-semibold transition-all hover:bg-white/10 hover:scale-[1.02] active:scale-[0.98] shadow-sm ${
              isCurseForge ? 'rounded-none border border-orange-500/30' : 'rounded-xl border border-white/10'
            }`}
            style={{ color: isCurseForge ? COLORS.curseforgeOrange : COLORS.foreground, background: "var(--color-secondary-bg)" }}
          >
            <Info className="w-4 h-4 shrink-0" />
            <span className="truncate">Detalles</span>
          </button>
        </div>
      </div>
    </article>
  );
});
