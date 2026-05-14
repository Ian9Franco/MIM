"use client";

import React, { memo } from "react";
import { ListTree, Download, Loader2, Info, ExternalLink, CheckCircle2, Circle, Flame } from "lucide-react";
import { SecurityBadgeCompact } from "@/components/security/SecurityBadge";
import { formatNumber, openExternal } from "@/utils/format";
import { COLORS } from "@/theme/tokens";
import { Chip } from "../ui/primitives";
import { ModrinthIcon, CurseForgeIcon } from "./parts/FomoPlatformIcons";
import { FomoCompatibilityBadge } from "./parts/FomoCompatibilityBadge";

/**
 * @fileoverview Tarjeta Visual de Búsqueda y Descubrimiento (FOMO).
 * ─────────────────────────────────────────────────────────────────────────────
 * Componente atómico diseñado para presentar los metadatos de mods, texturas
 * o shaders provenientes de Modrinth y CurseForge de manera unificada.
 * Implementa acciones rápidas para descargar, seleccionar o ver detalles.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const FomoModCard = memo(function FomoModCard({
  mod, isDownloading, onDownload, onOpenVersions,
  isSelected, onToggleSelect, sinytraActive,
  riskScore, riskLevel, onSecurityDetails,
}: any) {
  // Identificación del proveedor y exclusividad de loader
  const isCF = mod._source === "curseforge";
  const isFabricOnly = mod.categories?.includes("fabric") && !mod.categories?.includes("forge");
  
  // Normalización del tipo de proyecto para la etiqueta superior
  const typeLabel = mod.projectType === "resourcepack" ? "Textura" : mod.projectType === "shader" ? "Shader" : "Mod";

  return (
    <article 
      onClick={() => onToggleSelect?.(mod)}
      className={`flex flex-col transition-all relative group cursor-pointer h-full border border-white/5 ${
        isSelected ? 'ring-2 ring-primary' : ''
      } ${isCF ? 'rounded-none' : 'rounded-3xl'}`}
      style={{ 
        background: isCF ? "var(--color-cf-bg)" : "var(--glass-bg)", 
        backdropFilter: "blur(12px)" 
      }}
    >
      {/* Botón de Selección Rápida (Esquina Superior) */}
      <button 
        onClick={(e) => { e.stopPropagation(); onToggleSelect?.(mod); }} 
        className={`absolute top-4 right-4 p-1.5 z-20 rounded-full ${
          isSelected ? 'bg-primary' : 'bg-black/40 opacity-0 group-hover:opacity-100'
        }`}
      >
        {isSelected ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Circle className="w-4 h-4 text-white/40" />}
      </button>

      <div className="p-4 flex flex-col flex-1">
        {/* Cabecera: Icono + Título + Metadatos */}
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white/5 shrink-0">
            {mod.iconUrl ? (
              <img src={mod.iconUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <Flame className="w-8 h-8 m-4 opacity-20" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold truncate text-sm">{mod.title}</h3>
            <div className="flex items-center gap-1.5 mt-1 opacity-50 text-[10px]">
              <span>por {mod.author}</span>
              <ExternalLink 
                className="w-3 h-3 cursor-pointer hover:text-primary" 
                onClick={(e) => { e.stopPropagation(); openExternal(mod.url); }} 
              />
            </div>
            
            {/* Fila de Chips y Badges */}
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {riskScore !== undefined && riskLevel && (
                <SecurityBadgeCompact riskScore={riskScore} riskLevel={riskLevel} onClick={onSecurityDetails} />
              )}
              <Chip color={isCF ? COLORS.curseforgeOrange : COLORS.primary}>{typeLabel}</Chip>
              <Chip>↓ {formatNumber(mod.downloads)}</Chip>
              <div className="ml-auto flex items-center gap-1">
                {isCF ? <CurseForgeIcon /> : <ModrinthIcon />}
              </div>
            </div>
          </div>
        </div>

        {/* Descripción corta */}
        <p className="text-xs opacity-60 mt-4 line-clamp-2 h-8">{mod.description}</p>
        
        {/* Predicción de Compatibilidad Asistida (Sinytra) */}
        {sinytraActive && isFabricOnly && (
          <FomoCompatibilityBadge title={mod.title} categories={mod.categories} />
        )}

        {/* Acciones de Tarjeta (Grid Inferior) */}
        <div className="grid grid-cols-3 gap-2 mt-auto pt-6">
          <button 
            onClick={(e) => { e.stopPropagation(); onToggleSelect?.(mod); }} 
            className={`flex items-center justify-center gap-1.5 h-9 rounded-xl text-[10px] font-bold border border-white/10 ${
              isSelected ? 'bg-primary text-white' : 'bg-white/5'
            }`}
          >
            <ListTree className="w-3.5 h-3.5" /> {isSelected ? "Listo" : "Añadir"}
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onDownload(mod); }} 
            disabled={isDownloading} 
            className="flex items-center justify-center gap-1.5 h-9 rounded-xl text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
          >
            {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Descargar
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onOpenVersions(mod); }} 
            className="flex items-center justify-center gap-1.5 h-9 rounded-xl text-[10px] font-bold bg-white/5 border border-white/10"
          >
            <Info className="w-3.5 h-3.5" /> Detalles
          </button>
        </div>
      </div>
    </article>
  );
});
