/**
 * FomoModCardFixed - Versión con layout consistente y altura fija
 * 
 * Problemas resueltos:
 * 1. Altura variable según contenido - AHORA ALTURA FIJA
 * 2. Elementos que cambian de posición - AHORA POSICIONES DEFINIDAS
 * 3. UI inconsistente con descripciones largas - AHORA TRUNCADO
 * 4. Tamaño que se ajusta constantemente - AHORA DIMENSIONES FIJAS
 */

"use client";

import React, { memo } from "react";
import {
  Flame, ExternalLink, Download, Loader2, Library, ListTree, CheckCircle2, Circle
} from "lucide-react";
import { formatNumber, openExternal, CATEGORY_TRANSLATIONS } from "@/utils/format";
import { COLORS } from "@/theme/tokens";
import { Chip } from "@/components/ui/primitives";
import type { ModHit } from "@/lib/core/types";

interface FomoModCardFixedProps {
  mod:              ModHit;
  isDownloading:    boolean;
  onDownload:       (mod: ModHit) => void;
  onOpenVersions:   (mod: ModHit) => void;
  onAddToCollection:(mod: ModHit) => void;
  isSelected?:      boolean;
  onToggleSelect?:  (mod: ModHit) => void;
}

export const FomoModCardFixed = memo(function FomoModCardFixed({
  mod, isDownloading, onDownload, onOpenVersions, onAddToCollection,
  isSelected, onToggleSelect,
}: FomoModCardFixedProps) {
  const isCurseForge = mod._source === "curseforge";
  
  // Iconos de plataforma para exclusividad
  const ModrinthIcon = () => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" height="14" width="14" className="shrink-0" style={{ color: "#1bd672" }}>
      <path d="M12.252 0.004a11.78 11.768 0 0 0 -8.92 3.73 11 10.999 0 0 0 -2.17 3.11 11.37 11.359 0 0 0 -1.16 5.169c0 1.42 0.17 2.5 0.6 3.77 0.24 0.759 0.77 1.899 1.17 2.529a12.3 12.298 0 0 0 8.85 5.639c0.44 0.05 2.54 0.07 2.76 0.02 0.2 -0.04 0.22 0.1 -0.26 -1.7l-0.36 -1.37 -1.01 -0.06a8.5 8.489 0 0 1 -5.18 -1.8 5.34 5.34 0 0 1 -1.3 -1.26c0 -0.05 0.34 -0.28 0.74 -0.5a37.572 37.545 0 0 1 2.88 -1.629c0.03 0 0.5 0.45 1.06 0.98l1 0.97 2.07 -0.43 2.06 -0.43 1.47 -1.47c0.8 -0.8 1.48 -1.5 1.48 -1.52 0 -0.09 -0.42 -1.63 -0.46 -1.7 -0.04 -0.06 -0.2 -0.03 -1.02 0.18 -0.53 0.13 -1.2 0.3 -1.45 0.4l-0.48 0.15 -0.53 0.53 -0.53 0.53 -0.93 0.1 -0.93 0.07 -0.52 -0.5a2.7 2.7 0 0 1 -0.96 -1.7l-0.13 -0.6 0.43 -0.57c0.68 -0.9 0.68 -0.9 1.46 -1.1 0.4 -0.1 0.65 -0.2 0.83 -0.33 0.13 -0.099 0.65 -0.579 1.14 -1.069l0.9 -0.9 -0.7 -0.7 -0.7 -0.7 -1.95 0.54c-1.07 0.3 -1.96 0.53 -1.97 0.53 -0.03 0 -2.23 2.48 -2.63 2.97l-0.29 0.35 0.28 1.03c0.16 0.56 0.3 1.16 0.31 1.34l0.03 0.3 -0.34 0.23c-0.37 0.23 -2.22 1.3 -2.84 1.63 -0.36 0.2 -0.37 0.2 -0.44 0.1 -0.08 -0.1 -0.23 -0.6 -0.32 -1.03 -0.18 -0.86 -0.17 -2.75 0.02 -3.73a8.84 8.839 0 0 1 7.9 -6.93c0.43 -0.03 0.77 -0.08 0.78 -0.1 0.06 -0.17 0.5 -2.999 0.47 -3.039 -0.01 -0.02 -0.1 -0.02 -0.2 -0.03Zm3.68 0.67c-0.2 0 -0.3 0.1 -0.37 0.38 -0.06 0.23 -0.46 2.42 -0.46 2.52 0 0.04 0.1 0.11 0.22 0.16a8.51 8.499 0 0 1 2.99 2 8.38 8.379 0 0 1 2.16 3.449 6.9 6.9 0 0 1 0.4 2.8c0 1.07 0 1.27 -0.1 1.73a9.37 9.369 0 0 1 -1.76 3.769c-0.32 0.4 -0.98 1.06 -1.37 1.38 -0.38 0.32 -1.54 1.1 -1.7 1.14 -0.1 0.03 -0.1 0.06 -0.07 0.26 0.03 0.18 0.64 2.56 0.7 2.78l0.06 0.06a12.07 12.058 0 0 0 7.27 -9.4c0.13 -0.77 0.13 -2.58 0 -3.4a11.96 11.948 0 0 0 -5.73 -8.578c-0.7 -0.42 -2.05 -1.06 -2.25 -1.06Z" fill="currentColor" />
    </svg>
  );

  const CurseForgeIcon = () => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" height="14" width="14" className="shrink-0" style={{ color: COLORS.curseforgeOrange }}>
      <path d="M18.326 9.2145S23.2261 8.4418 24 6.1882h-7.5066V4.4H0l2.0318 2.3576V9.173s5.1267 -0.2665 7.1098 1.2372c2.7146 2.516 -3.053 5.917 -3.053 5.917L5.0995 19.6c1.5465 -1.4726 4.494 -3.3775 9.8983 -3.2857 -2.0565 0.65 -4.1245 1.6651 -5.7344 3.2857h10.9248l-1.0288 -3.2726s-7.918 -4.6688 -0.8336 -7.1127z" fill="currentColor" />
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
      className={`transition-all duration-200 relative group cursor-pointer hover-slime ${isSelected ? 'ring-2 ring-primary' : ''} ${
        isCurseForge 
          ? 'rounded-none border-2 border-orange-900/30' 
          : 'rounded-[1.35rem] border'
      }`}
      style={{ 
        height: "220px", 
        background: isCurseForge 
          ? "var(--color-cf-bg)" 
          : "var(--glass-bg)", 
        borderColor: isCurseForge 
          ? (isSelected ? COLORS.curseforgeOrange : "var(--color-cf-border)")
          : (isSelected ? COLORS.primary : "var(--glass-border)"),
        backdropFilter: isCurseForge ? "none" : "var(--liquid-blur)",
        boxShadow: isCurseForge ? "none" : "var(--shadow-drop)",
      }}
      aria-label={mod.title}
    >
      {/* Selection Toggle - Posición fija */}
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

      <div className="p-4 h-full flex flex-col" style={{ height: "220px" }}>
        {/* SECCIÓN SUPERIOR - Icono y título - Altura fija */}
        <div className="flex items-start gap-4" style={{ height: "64px" }}>
          <div
            aria-hidden="true"
            className={`w-16 h-16 overflow-hidden shrink-0 flex items-center justify-center ${
              isCurseForge ? 'rounded-none border-2 border-orange-900/40' : 'rounded-2xl border'
            }`}
            style={{ background: "var(--color-secondary-bg)", borderColor: COLORS.borderStrong }}
          >
            {mod.iconUrl
              ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={mod.iconUrl} alt="" className="w-full h-full object-cover" style={{ imageRendering: "pixelated" }} loading="lazy" />
              )
              : <Flame className="w-7 h-7 opacity-25" aria-hidden="true" />
            }
          </div>

          <div className="flex-1 min-w-0 pr-6"> {/* Espacio para el botón de selección */}
            <p 
              className={`font-headline text-base leading-tight truncate ${isCurseForge ? 'uppercase tracking-tight font-black' : ''}`} 
              style={{ 
                color: COLORS.foreground,
                maxHeight: "24px", // ALTURA FIJA PARA 1 LÍNEA
                overflow: "hidden"
              }}
            >
              {mod.title}
            </p>
            <div className="flex items-center gap-1.5 mt-1" style={{ height: "20px" }}>
              <p 
                className="font-caption truncate" 
                style={{ 
                  color: COLORS.muted,
                  maxHeight: "16px" // ALTURA FIJA
                }}
              >
                por {mod.author || "Autor desconocido"}
              </p>
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

        {/* SECCIÓN CENTRAL - Metadata badges - Altura fija */}
        <div className="flex items-center gap-2 flex-wrap" style={{ height: "32px" }} role="list" aria-label="Metadatos">
          <Chip 
            color={isCurseForge ? COLORS.curseforgeOrange : COLORS.primary} 
            bg={isCurseForge ? "rgba(239,108,0,0.14)" : "rgba(187,150,228,0.12)"} 
            className={isCurseForge ? 'rounded-none border border-orange-900/30' : ''}
          >
            {typeLabel}
          </Chip>
          <Chip 
            bg="rgba(255,255,255,0.06)" 
            className={isCurseForge ? 'rounded-none' : ''}
          >
            ↓ {formatNumber(mod.downloads)}
          </Chip>
          {mod.latestVersion && !/^[a-zA-Z0-9]{7,12}$/.test(mod.latestVersion) && (
            <Chip 
              color={COLORS.emerald} 
              bg="rgba(102,200,160,0.14)" 
              className={isCurseForge ? 'rounded-none' : ''}
            >
              v{mod.latestVersion}
            </Chip>
          )}
          
          {/* Badge de Plataforma y Exclusividad Real - Posición fija */}
          <div className="flex items-center gap-1 ml-auto">
            {mod.availability?.checking ? (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/40 animate-pulse" style={{ height: "24px" }}>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span className="text-[0.6rem] font-bold uppercase tracking-tighter">Check...</span>
              </div>
            ) : (
              <>
                {/* Caso 1: Está en AMBAS plataformas */}
                {mod.availability?.curseforge && mod.availability?.modrinth ? (
                  <div className="flex items-center gap-2 px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-primary/80" title="Disponible en CurseForge y Modrinth" style={{ height: "24px" }}>
                    <div className="flex items-center gap-1">
                      <CurseForgeIcon />
                      <ModrinthIcon />
                    </div>
                    <span className="text-[0.6rem] font-bold uppercase tracking-tighter">Multiplataforma</span>
                  </div>
                ) : (
                  /* Caso 2: EXCLUSIVO de una plataforma */
                  isCurseForge ? (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-orange-500/10 border border-orange-500/20 text-orange-500/80" title="Exclusivo de CurseForge" style={{ height: "24px" }}>
                      <CurseForgeIcon />
                      <span className="text-[0.6rem] font-bold uppercase tracking-tighter">Solo CF</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#1bd672]/10 border border-[#1bd672]/20 text-[#1bd672]/80" title="Exclusivo de Modrinth" style={{ height: "24px" }}>
                      <ModrinthIcon />
                      <span className="text-[0.6rem] font-bold uppercase tracking-tighter">Solo MR</span>
                    </div>
                  )
                )}
              </>
            )}
          </div>
        </div>

        {/* SECCIÓN DE DESCRIPCIÓN - Altura fija con truncado */}
        <div className="flex-1" style={{ minHeight: "48px", maxHeight: "48px" }}>
          <p 
            className="font-caption leading-relaxed text-sm line-clamp-2 h-12 overflow-hidden" 
            style={{ 
              color: COLORS.muted,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden"
            }}
          >
            {mod.description}
          </p>
        </div>

        {/* SECCIÓN DE TAGS - Altura fija */}
        {mod.categories && mod.categories.length > 0 && (
          <div className="mt-2" style={{ height: "36px" }}>
            <p className="text-[0.62rem] font-black uppercase tracking-widest mb-1 opacity-30" style={{ color: COLORS.foreground, height: "12px" }}>Tags</p>
            <div className="flex flex-wrap gap-1.5" style={{ height: "20px" }}>
              {mod.categories
                .filter(cat => !["forge", "fabric", "neoforge", "quilt", "iris", "optifine"].includes(cat.toLowerCase()))
                .slice(0, 3) // MÁXIMO 3 TAGS
                .map((cat) => {
                  const label = CATEGORY_TRANSLATIONS[cat] || cat.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                  return (
                    <span 
                      key={cat}
                      className="px-2.5 py-1 rounded-full text-[0.62rem] font-bold border transition-all hover:bg-white/5"
                      style={{ 
                        background: "rgba(255,255,255,0.03)", 
                        borderColor: "rgba(255,255,255,0.06)",
                        color: "var(--color-muted)",
                        height: "20px"
                      }}
                    >
                      {label}
                    </span>
                  );
                })}
              {mod.categories.filter(cat => !["forge", "fabric", "neoforge", "quilt", "iris", "optifine"].includes(cat.toLowerCase())).length > 3 && (
                <span className="text-[0.5rem] font-bold self-center opacity-20">
                  +{mod.categories.filter(cat => !["forge", "fabric", "neoforge", "quilt", "iris", "optifine"].includes(cat.toLowerCase())).length - 3}
                </span>
              )}
            </div>
          </div>
        )}

        {/* SECCIÓN DE ACCIONES - Altura fija */}
        <div className="flex items-center gap-2 mt-auto pt-2" style={{ height: "36px" }}>
          <button
            onClick={(e) => { e.stopPropagation(); onDownload(mod); }}
            disabled={isDownloading}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-label text-sm transition-all ${
              isCurseForge 
                ? 'bg-orange-600 hover:bg-orange-700 text-white disabled:bg-orange-800 disabled:text-orange-200' 
                : 'bg-primary hover:bg-primary/90 text-white disabled:bg-primary/50 disabled:text-white/50'
            } ${isDownloading ? 'animate-transfer' : ''}`}
            style={{ height: "36px" }}
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Descargando...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Descargar
              </>
            )}
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); onOpenVersions(mod); }}
            className={`px-3 py-2 rounded-lg font-label text-sm transition-all ${
              isCurseForge 
                ? 'border border-orange-900/40 text-orange-400 hover:bg-orange-900/20' 
                : 'border border-white/10 text-white/60 hover:bg-white/5'
            }`}
            title="Ver versiones"
            style={{ height: "36px" }}
          >
            <ListTree className="w-4 h-4" />
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); onAddToCollection(mod); }}
            className={`px-3 py-2 rounded-lg font-label text-sm transition-all ${
              isCurseForge 
                ? 'border border-orange-900/40 text-orange-400 hover:bg-orange-900/20' 
                : 'border border-white/10 text-white/60 hover:bg-white/5'
            }`}
            title="Añadir a colección"
            style={{ height: "36px" }}
          >
            <Library className="w-4 h-4" />
          </button>
        </div>
      </div>
    </article>
  );
});
