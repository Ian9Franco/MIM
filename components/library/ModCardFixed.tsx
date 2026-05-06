/**
 * ModCardFixed - Versión con layout consistente y altura fija
 * 
 * Problemas resueltos:
 * 1. Altura variable según contenido - AHORA ALTURA FIJA
 * 2. Elementos que cambian de posición - AHORA POSICIONES DEFINIDAS
 * 3. UI inconsistente - AHORA ESTRUCTURA ORDENADA
 * 4. Tamaño que se ajusta constantemente - AHORA DIMENSIONES FIJAS
 */

"use client";

import React, { memo, useCallback, useMemo } from "react";
import { Folder, AlertTriangle, Download, Loader2, Trash2, ArrowUp, X, Shield } from "lucide-react";
import { LOADER_STYLES } from "@/theme/tokens";
import { COLORS } from "@/theme/tokens";
import type { LoaderKey } from "@/theme/tokens";
import { CATEGORY_TRANSLATIONS } from "@/utils/format";

interface ModCardFixedProps {
  name:          string;
  version:       string;
  modVersion?:   string;
  projectType?:  string;
  iconBase64?:   string;
  author?:       string;
  loader:        string;
  isSelected:    boolean;
  onClick:       () => void;
  activeVersion: string;
  activeLoader:  string;
  badgeText?:    string;
  badgeColor?:   string;
  onDownload?:   () => void;
  isDownloading?:boolean;
  index?:        number;
  isPending?:    boolean;
  onDelete?:     () => void;
  isDeleting?:   boolean;
  riskScore?:    number;
  categories?:   string[];
}

/** Maps projectType slugs to human-readable emoji labels */
function getProjectTypeLabel(type: string): string {
  const map: Record<string, string> = {
    resourcepack: "🖼️ Textura",
    datapack:     "📦 Datapack",
    shader:       "✨ Shader",
  };
  return map[type] ?? type;
}

export const ModCardFixed = memo(function ModCardFixed({
  name, version, modVersion, loader, isSelected, onClick,
  activeVersion, activeLoader, badgeText, badgeColor,
  onDownload, isDownloading, index = 0, projectType, iconBase64,
  isPending, onDelete, isDeleting, riskScore, author, categories,
}: ModCardFixedProps) {
  // Para virtual scrolling, omitimos las animaciones escalonadas cuando hay muchos items
  const useStaggeredAnimation = index < 50;
  
  // Logic: if version is "1.20+", it matches "1.20.1"
  const isCompatibleRange = useMemo(() => {
    if (!version || version === "unknown") return true;
    if (version === activeVersion) return true;
    
    // Check 1.21+
    if (version.endsWith("+")) {
      return activeVersion.startsWith(version.slice(0, -1));
    }
    
    // Check prefix: 1.21 matches 1.21.1
    if (activeVersion.startsWith(version + ".")) return true;
    
    // Check range: 1.21 - 1.21.1
    if (version.includes(" - ")) {
      const [start, end] = version.split(" - ");
      return activeVersion.startsWith(start) || activeVersion.startsWith(end);
    }
    
    return false;
  }, [version, activeVersion]);
  
  const isVersionError = version !== "unknown" && activeVersion !== "" && version !== activeVersion && !isCompatibleRange;
  
  const isLoaderError = useMemo(() => {
    if (loader === "unknown" || activeLoader === "" || loader === activeLoader) return false;
    
    // Exception for 1.20.1: Forge and NeoForge are compatible
    if (activeVersion === "1.20.1") {
      const l = loader.toLowerCase();
      const al = activeLoader.toLowerCase();
      if ((l === "forge" && al === "neoforge") || (l === "neoforge" && al === "forge")) {
        return false;
      }
    }
    
    return true;
  }, [loader, activeLoader, activeVersion]);

  const isError        = isVersionError || isLoaderError;
  const ls             = LOADER_STYLES[loader?.toLowerCase() || "default"] ?? LOADER_STYLES.default;

  const cardBorder = isSelected && !isError ? "var(--color-accent-border)"
    : isError     ? (isSelected ? "rgba(239,68,68,0.6)" : "rgba(239,68,68,0.3)")
    : "var(--color-border)";
  const cardBg = isSelected && !isError ? "var(--color-accent-bg)"
    : isError   ? "rgba(127,29,29,0.12)"
    : "color-mix(in srgb, var(--color-card) 82%, transparent)";
  const cardShadow = isSelected && !isError
    ? "0 0 28px var(--glow-accent), 0 4px 16px rgba(0,0,0,0.1)"
    : "none";

  const stopPropDownload = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); onDownload?.();
  }, [onDownload]);

  const stopPropDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); onDelete?.();
  }, [onDelete]);

  // Security score indicator
  const getSecurityColor = (score?: number) => {
    if (score === undefined) return null;
    if (score <= 30) return { color: "#22c55e", bg: "rgba(34,197,94,0.12)", label: "✓ Seguro" };
    if (score <= 60) return { color: "#eab308", bg: "rgba(234,179,8,0.12)", label: "⚠ Precaución" };
    if (score <= 85) return { color: "#f97316", bg: "rgba(249,115,22,0.12)", label: "⚠ Sospechoso" };
    return { color: "#ef4444", bg: "rgba(239,68,68,0.12)", label: "✕ Crítico" };
  };
  const securityInfo = getSecurityColor(riskScore);

  return (
    <article
      onClick={onClick}
      className={`${useStaggeredAnimation ? "animate-fade-up" : ""} snap-start snap-always scroll-mt-2.5 ${isError && isSelected ? "animate-shake" : ""}`}
      style={{ animationDelay: useStaggeredAnimation ? `${index * 0.035}s` : undefined }}
      aria-selected={isSelected}
      aria-label={`${name} – ${version}`}
    >
      {/* CONTENEDOR PRINCIPAL CON ALTURA FIJA */}
      <div
        className="group relative flex flex-col rounded-[1.5rem] cursor-pointer overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] max-w-[500px] px-4 py-3"
        style={{ 
          height: "120px", // ALTURA FIJA - NO CAMBIA
          border: `1px solid ${cardBorder}`, 
          background: cardBg, 
          boxShadow: cardShadow
        }}
      >
        {/* BARRA LATERAL FIJA */}
        <div
          aria-hidden="true"
          className="absolute left-0 top-0 w-[3px] h-full rounded-l-[1px] transition-all duration-300"
          style={{
            background: isSelected ? COLORS.accent : isError ? "#ef4444" : COLORS.primary,
            opacity:    isSelected ? 1 : isError ? 0.7 : 0.3,
          }}
        />

        {/* FILA SUPERIOR - SIEMPRE FIJA */}
        <div className="flex items-center w-full gap-3.5" style={{ height: "40px" }}>
          {/* ICONO - TAMAÑO FIJO */}
          <div
            aria-hidden="true"
            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden transition-transform duration-500"
            style={{
              background: isError ? "rgba(239,68,68,0.1)" : isSelected ? "var(--color-accent-bg)" : "var(--color-secondary-bg)",
              border: `1px solid ${isError ? "rgba(239,68,68,0.25)" : isSelected ? "var(--color-accent-border)" : "var(--color-border)"}`,
            }}
          >
            {isError    ? <AlertTriangle className="w-5 h-5 text-red-400" />
            : iconBase64 ? <img src={iconBase64} alt="" className="w-full h-full object-cover" style={{ imageRendering: "pixelated" }} />
            : <Folder className="w-5 h-5" style={{ color: isSelected ? COLORS.accent : COLORS.primary }} />}
          </div>

          {/* NOMBRE Y AUTOR - ANCHO VARIABLE PERO ALTURA FIJA */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <p 
                className="font-subhead text-sm truncate leading-tight" 
                style={{ 
                  color: isError ? "#fca5a5" : COLORS.foreground,
                  maxHeight: "20px", // ALTURA FIJA PARA 1 LÍNEA
                  overflow: "hidden"
                }}
              >
                {name}
              </p>
              {author && author !== "unknown" && (
                <span 
                  className="font-caption text-[10px] opacity-40 truncate"
                  style={{ maxHeight: "16px" }} // ALTURA FIJA
                >
                  by {author}
                </span>
              )}
            </div>
          </div>

          {/* BOTÓN DELETE - POSICIÓN FIJA */}
          {isPending && onDelete && (
            <button
              onClick={stopPropDelete}
              disabled={isDeleting}
              aria-label="Eliminar archivo"
              title="Eliminar archivo permanentemente"
              className="flex items-center justify-center w-7 h-7 rounded-lg transition-all hover:scale-110 ml-auto group/del active:scale-95"
              style={{ 
                background: isDeleting ? "rgba(255,255,255,0.04)" : "rgba(239,68,68,0.12)", 
                border: `1px solid ${isDeleting ? "rgba(255,255,255,0.08)" : "rgba(239,68,68,0.25)"}`, 
                color: isDeleting ? "rgba(255,255,255,0.25)" : "#ef4444" 
              }}
            >
              {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* FILA CENTRAL - BADGES PRINCIPALES - ALTURA FIJA */}
        <div className="flex items-center gap-1.5 w-full overflow-hidden" style={{ height: "28px" }} role="list" aria-label="Etiquetas">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {/* VERSION DE JUEGO - SIEMPRE VISIBLE */}
            <span 
              role="listitem" 
              className="font-label rounded-full px-2 py-0.5 shrink-0 flex items-center justify-center"
              style={{ 
                background: "var(--color-accent-bg)", 
                color: "var(--color-accent)", 
                border: "1px solid var(--color-accent-border)", 
                fontSize: "0.6rem",
                minWidth: "45px",
                height: "20px"
              }}
            >
              {version}
            </span>
            
            {/* VERSION DEL MOD - SI EXISTE */}
            {modVersion && modVersion !== "unknown" && (
              <span 
                role="listitem" 
                className="font-label rounded-full px-2 py-0.5 truncate flex items-center justify-center"
                style={{ 
                  background: "rgba(187,150,228,0.08)", 
                  border: "1px solid rgba(187,150,228,0.2)", 
                  color: COLORS.primary, 
                  fontSize: "0.6rem",
                  maxWidth: "80px",
                  height: "20px"
                }}
              >
                v{modVersion}
              </span>
            )}
            
            {/* LOADER - SIEMPRE VISIBLE */}
            <span 
              role="listitem" 
              className="font-label rounded-full px-2 py-0.5 shrink-0 flex items-center justify-center"
              style={{ 
                background: ls.bg, 
                color: ls.color, 
                fontSize: "0.6rem",
                minWidth: "50px",
                height: "20px"
              }}
            >
              {ls.label}
            </span>
            
            {/* PROJECT TYPE - SI ES DIFERENTE */}
            {projectType && projectType !== "mod" && projectType !== "unknown" && (
              <span 
                role="listitem" 
                className="font-label rounded-full px-2 py-0.5 shrink-0 flex items-center justify-center"
                style={{ 
                  background: "rgba(228,150,184,0.1)", 
                  color: "#E496B8", 
                  fontSize: "0.6rem",
                  minWidth: "60px",
                  height: "20px"
                }}
              >
                {getProjectTypeLabel(projectType)}
              </span>
            )}
          </div>

          {/* ERRORES - POSICIÓN FIJA */}
          {(isVersionError || isLoaderError) && (
            <div className="flex items-center gap-1 ml-auto shrink-0">
              {isVersionError && (
                <span 
                  className="font-label rounded-full px-2 py-0.5 flex items-center gap-1"
                  style={{ 
                    background: COLORS.redBg, 
                    color: COLORS.red, 
                    fontSize: "0.6rem", 
                    border: "1px solid rgba(239,68,68,0.2)",
                    height: "20px"
                  }}
                >
                  ⚠ ver
                </span>
              )}
              {isLoaderError  && (
                <span 
                  className="font-label rounded-full px-2 py-0.5 flex items-center gap-1"
                  style={{ 
                    background: COLORS.redBg, 
                    color: COLORS.red, 
                    fontSize: "0.6rem", 
                    border: "1px solid rgba(239,68,68,0.2)",
                    height: "20px"
                  }}
                >
                  ⚠ ldr
                </span>
              )}
            </div>
          )}
          
          {/* SECURITY SCORE - POSICIÓN FIJA */}
          {securityInfo && (
            <span
              role="listitem"
              className="font-label rounded-full px-2 py-0.5 flex items-center gap-1 ml-1 shrink-0"
              style={{ 
                background: securityInfo.bg, 
                color: securityInfo.color, 
                fontSize: "0.55rem",
                height: "20px"
              }}
              title={`Risk Score: ${riskScore}/100`}
            >
              <Shield className="w-2.5 h-2.5" />
              {securityInfo.label}
            </span>
          )}
        </div>

        {/* FILA INFERIOR - CATEGORÍAS Y BADGE - ALTURA FIJA */}
        <div className="flex items-center justify-between w-full" style={{ height: "32px" }}>
          {/* CATEGORÍAS - TRUNCADAS */}
          <div className="flex items-center gap-1 flex-1 min-w-0 overflow-hidden">
            {categories && categories.length > 0 && (
              <>
                {categories
                  .filter(cat => !["forge", "fabric", "neoforge", "quilt", "iris", "optifine"].includes(cat.toLowerCase()))
                  .slice(0, 2) // MÁXIMO 2 CATEGORÍAS
                  .map((cat) => {
                    const label = CATEGORY_TRANSLATIONS[cat] || cat.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                    return (
                      <span 
                        key={cat}
                        className="px-2 py-0.5 rounded-full text-[0.55rem] font-bold border shrink-0"
                        style={{ 
                          background: "rgba(255,255,255,0.03)", 
                          borderColor: "rgba(255,255,255,0.06)",
                          color: "rgba(255,255,255,0.4)",
                          height: "18px"
                        }}
                      >
                        {label}
                      </span>
                    );
                  })}
                {categories.filter(cat => !["forge", "fabric", "neoforge", "quilt", "iris", "optifine"].includes(cat.toLowerCase())).length > 2 && (
                  <span className="text-[0.5rem] font-bold opacity-20">
                    +{categories.filter(cat => !["forge", "fabric", "neoforge", "quilt", "iris", "optifine"].includes(cat.toLowerCase())).length - 2}
                  </span>
                )}
              </>
            )}
          </div>

          {/* BADGE DE UPDATE Y BOTÓN DESCARGA - POSICIÓN FIJA */}
          {badgeText && (
            <div className="flex items-center gap-1.5 shrink-0" role="listitem">
              <span
                className={`font-label rounded-md px-2 py-0.5 max-w-[120px] truncate ${badgeColor ?? "bg-white/8 text-foreground/60"}`}
                style={{ fontSize: "0.6rem", height: "22px" }}
                title={badgeText}
              >
                <ArrowUp className="w-3 h-3 inline mr-0.5" />
                {badgeText}
              </span>
              {onDownload && (
                <button
                  onClick={stopPropDownload}
                  disabled={isDownloading}
                  aria-label="Descargar actualización"
                  title="Descargar actualización"
                  className="flex items-center justify-center w-6 h-6 rounded-lg transition-all hover:scale-105"
                  style={{ 
                    background: isDownloading ? "var(--color-secondary-bg)" : "var(--color-accent-bg)", 
                    border: `1px solid ${isDownloading ? "var(--color-border)" : "var(--color-accent-border)"}`, 
                    color: isDownloading ? "var(--color-muted)" : "var(--color-accent)" 
                  }}
                >
                  {isDownloading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                </button>
              )}
            </div>
          )}

          {/* INDICADOR SELECCIONADO - POSICIÓN FIJA */}
          {isSelected && !isError && (
            <div aria-hidden="true" className="flex items-center gap-1.5 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: COLORS.accent }} />
              <span className="font-label" style={{ color: COLORS.accent, fontSize: "0.6rem" }}>sel.</span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
});
