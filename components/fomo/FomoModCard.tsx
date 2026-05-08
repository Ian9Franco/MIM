/**
 * @fileoverview FomoModCard – a single result card in the FOMO discover view.
 * Shows mod icon, metadata, categories and action buttons (external link,
 * quick download, version picker, add to collection).
 */

"use client";

import React, { memo } from "react";
import {
  Flame, ExternalLink, Download, Loader2, Library, ListTree, Layers3, CheckCircle2, Circle, Check, Info, Droplet
} from "lucide-react";
import { SecurityBadgeCompact } from "@/components/security/SecurityBadge";
import { formatNumber, openExternal, CATEGORY_TRANSLATIONS } from "@/utils/format";
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
  sinytraActive?:   boolean;
  hasUpdateAvailable?: boolean;
  riskScore?:       number;
  riskLevel?:       "clean" | "caution" | "suspicious" | "critical";
  onSecurityDetails?: () => void;
}

interface CompatibilityPrediction {
  percentage: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";
  label: string;
  reason: string;
}

function predictConnectorCompatibility(title: string, categories: string[] = []): CompatibilityPrediction {
  const t = title.toLowerCase();
  const cats = categories.map(c => c.toLowerCase());

  // 1. Sodium/Iris/Lithium ecosystem - EXTREMELY HIGH RISK / INCOMPATIBLE
  if (
    t.includes("sodium") || t.includes("rubidium") || t.includes("iris") || t.includes("oculus") || 
    t.includes("lithium") || t.includes("canary") || t.includes("krypton") || t.includes("indium") || 
    t.includes("modernfix") || t.includes("connector-extras")
  ) {
    return {
      percentage: 15,
      riskLevel: "VERY_HIGH",
      label: "Muy Inestable",
      reason: "Toca el motor de renderizado profundo o la lógica del chunk engine. Se recomienda buscar el equivalente nativo de Forge."
    };
  }

  // 2. Heavy render/optimization/physics categories - HIGH RISK
  const hasHighRiskCat = cats.some(c => 
    c.includes("optimization") || c.includes("rendering") || c.includes("physics") || c.includes("performance") || c.includes("graphics")
  );
  if (hasHighRiskCat || t.includes("physics") || t.includes("render") || t.includes("lighting") || t.includes("embeddium") || t.includes("distant horizons")) {
    return {
      percentage: 45,
      riskLevel: "HIGH",
      label: "Riesgo Alto",
      reason: "Usa hooks de renderizado pesados o inyecciones de bytecode profundas que pueden colisionar en Forge."
    };
  }

  // 3. Gameplay/QoL/UI mods - MEDIUM RISK
  const hasMediumRiskCat = cats.some(c =>
    c.includes("gui") || c.includes("hud") || c.includes("interface") || c.includes("minimap") || c.includes("map") || c.includes("utility") || c.includes("keybind") || c.includes("networking")
  );
  if (hasMediumRiskCat || t.includes("map") || t.includes("tweaks") || t.includes("hud") || t.includes("inventory") || t.includes("menu") || t.includes("jei") || t.includes("rei") || t.includes("emi")) {
    return {
      percentage: 75,
      riskLevel: "MEDIUM",
      label: "Estabilidad Media",
      reason: "Mod de interfaz o QoL simple. Puede depender de métodos de renderizado de UI ligeros o keybinds."
    };
  }

  // 4. Pure content mods / blocks / items / biomes - HIGH STABILITY (LOW RISK)
  return {
    percentage: 92,
    riskLevel: "LOW",
    label: "Alta Estabilidad",
    reason: "Mod de contenido puro (bloques, ítems, biomas). Utiliza APIs estándar con altísima compatibilidad."
  };
}

export const FomoModCard = memo(function FomoModCard({
  mod, isDownloading, onDownload, onOpenVersions, onAddToCollection,
  isSelected, onToggleSelect, sinytraActive, hasUpdateAvailable = false,
  riskScore, riskLevel, onSecurityDetails,
}: FomoModCardProps) {
  const isCurseForge = mod._source === "curseforge";
  const isFabricOnly = mod.categories?.includes("fabric") && !mod.categories?.includes("forge");
  
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
      className={`flex flex-col transition-all duration-200 shadow-md relative group cursor-pointer h-full ${
        isSelected ? 'ring-2 ring-primary' : (hasUpdateAvailable ? 'ring-1 ring-amber-500/20' : '')
      } ${
        isCurseForge 
          ? 'rounded-none border-2 border-orange-900/30' 
          : 'rounded-[1.35rem] border glass-hover backdrop-blur-[14px]'
      }`}
      style={{ 
        background: isCurseForge 
          ? "var(--color-cf-bg)" 
          : (isSelected 
              ? "rgba(187,150,228,0.1)" 
              : (hasUpdateAvailable 
                  ? "linear-gradient(135deg, rgba(245,158,11,0.06) 0%, rgba(217,119,6,0.02) 100%)" 
                  : COLORS.card)), 
        borderColor: isCurseForge 
          ? (isSelected ? COLORS.curseforgeOrange : "var(--color-cf-border)")
          : (isSelected 
              ? COLORS.primary 
              : (hasUpdateAvailable 
                  ? "rgba(245,158,11,0.35)" 
                  : COLORS.border)),
      }}
      aria-label={mod.title}
    >
      {/* Insignia elegante de Update Disponible */}
      {hasUpdateAvailable && (
        <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-[8px] shadow-[0_0_12px_rgba(245,158,11,0.15)] uppercase tracking-wider animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          Update Disponible
        </div>
      )}
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

      <div className="p-4 flex flex-col flex-1">
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
              {/* Security Badge */}
              {riskScore !== undefined && riskLevel && (
                <SecurityBadgeCompact
                  riskScore={riskScore}
                  riskLevel={riskLevel}
                  onClick={onSecurityDetails}
                />
              )}
              
              <Chip color={isCurseForge ? COLORS.curseforgeOrange : COLORS.primary} bg={isCurseForge ? "rgba(239,108,0,0.14)" : "rgba(187,150,228,0.12)"} className={isCurseForge ? 'rounded-none border border-orange-900/30' : ''}>
                {typeLabel}
              </Chip>
              <Chip bg="rgba(255,255,255,0.06)" className={isCurseForge ? 'rounded-none' : ''}>↓ {formatNumber(mod.downloads)}</Chip>
              {mod.latestVersion && !/^[a-zA-Z0-9]{7,12}$/.test(mod.latestVersion) && <Chip color={COLORS.emerald} bg="rgba(102,200,160,0.14)" className={isCurseForge ? 'rounded-none' : ''}>v{mod.latestVersion}</Chip>}
              
              {sinytraActive && isFabricOnly && (
                <Chip color="#22d3ee" bg="rgba(34,211,238,0.14)" className={`${isCurseForge ? 'rounded-none' : ''} border border-cyan-500/20 shadow-[0_0_12px_rgba(34,211,238,0.15)]`}>
                  🔌 Sinytra Bridge
                </Chip>
              )}
              
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
                      <div className="flex items-center gap-2 px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-primary/80" title="Disponible en CurseForge y Modrinth">
                        <div className="flex items-center gap-1">
                          <CurseForgeIcon />
                          <ModrinthIcon />
                        </div>
                        <span className="text-[0.6rem] font-bold uppercase tracking-tighter">Multiplataforma</span>
                      </div>
                    ) : (
                      /* Caso 2: EXCLUSIVO de una plataforma */
                      isCurseForge ? (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-orange-500/10 border border-orange-500/20 text-orange-500/80" title="Exclusivo de CurseForge">
                          <CurseForgeIcon />
                          <span className="text-[0.6rem] font-bold uppercase tracking-tighter">Solo CF</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#1bd672]/10 border border-[#1bd672]/20 text-[#1bd672]/80" title="Exclusivo de Modrinth">
                          <ModrinthIcon />
                          <span className="text-[0.6rem] font-bold uppercase tracking-tighter">Solo MR</span>
                        </div>
                      )
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <p className="font-caption mt-4 leading-relaxed line-clamp-2 text-sm" style={{ color: COLORS.muted }}>
          {mod.description}
        </p>

        {/* Connector Compatibility Estimate UI */}
        {sinytraActive && isFabricOnly && (
          (() => {
            const pred = predictConnectorCompatibility(mod.title, mod.categories);
            return (
              <div 
                className={`mt-4 p-3 rounded-xl border flex flex-col gap-1.5 transition-all relative overflow-hidden group/compat ${
                  pred.riskLevel === "VERY_HIGH" ? "bg-red-500/5 border-red-500/20 text-red-200/90" :
                  pred.riskLevel === "HIGH" ? "bg-orange-500/5 border-orange-500/20 text-orange-200/90" :
                  pred.riskLevel === "MEDIUM" ? "bg-amber-500/5 border-amber-500/20 text-amber-200/90" :
                  "bg-emerald-500/5 border-emerald-500/20 text-emerald-200/90"
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span className="flex items-center gap-1 opacity-80 uppercase tracking-wider text-cyan-400">
                    🔌 Compatibilidad Sinytra
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tight border ${
                    pred.riskLevel === "VERY_HIGH" ? "bg-red-500/15 border-red-500/25 text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.1)]" :
                    pred.riskLevel === "HIGH" ? "bg-orange-500/15 border-orange-500/25 text-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.1)]" :
                    pred.riskLevel === "MEDIUM" ? "bg-amber-500/15 border-amber-500/25 text-amber-400" :
                    "bg-emerald-500/15 border-emerald-500/25 text-emerald-400"
                  }`}>
                    {pred.label} ({pred.percentage}%)
                  </span>
                </div>
                <p className="text-[10px] text-foreground/60 leading-relaxed font-medium">
                  {pred.reason}
                </p>
              </div>
            );
          })()
        )}

        {/* Tags Section */}
        {mod.categories && mod.categories.length > 0 && (
          <div className="mt-4">
            <p className="text-[0.62rem] font-black uppercase tracking-widest mb-2 opacity-30" style={{ color: COLORS.foreground }}>Tags</p>
            <div className="flex flex-wrap gap-1.5">
              {mod.categories
                .filter(cat => !["forge", "fabric", "neoforge", "quilt", "iris", "optifine"].includes(cat.toLowerCase()))
                .slice(0, 4)
                .map((cat) => {
                  const label = CATEGORY_TRANSLATIONS[cat] || cat.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                  return (
                    <span 
                      key={cat}
                      className="px-2.5 py-1 rounded-full text-[0.62rem] font-bold border transition-all hover:bg-white/5"
                      style={{ 
                        background: "rgba(255,255,255,0.03)", 
                        borderColor: "rgba(255,255,255,0.06)",
                        color: "var(--color-muted)"
                      }}
                    >
                      {label}
                    </span>
                  );
                })}
              {mod.categories.filter(cat => !["forge", "fabric", "neoforge", "quilt", "iris", "optifine"].includes(cat.toLowerCase())).length > 4 && (
                <span className="text-[0.6rem] font-bold self-center opacity-25 ml-0.5">
                  +{mod.categories.filter(cat => !["forge", "fabric", "neoforge", "quilt", "iris", "optifine"].includes(cat.toLowerCase())).length - 4}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 mt-auto pt-5">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleSelect?.(mod); }}
            aria-label={`Seleccionar ${mod.title} para colección`}
            className={`flex items-center justify-center gap-1.5 h-9 px-2 rounded-xl text-[0.65rem] font-bold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm ${isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-[#1A1A1A]' : ''}`}
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
            className="flex items-center justify-center gap-1.5 h-9 px-2 rounded-xl text-[0.65rem] font-bold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:grayscale disabled:scale-100 shadow-sm"
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
            className={`flex items-center justify-center gap-1.5 h-9 px-2 text-[0.65rem] font-bold transition-all hover:bg-white/10 hover:scale-[1.02] active:scale-[0.98] shadow-sm ${
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
