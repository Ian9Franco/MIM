/**
 * @fileoverview ModCard – displays a single installed mod with its metadata,
 * status badges, and optional inline update download button.
 */

"use client";

import React, { memo, useCallback, useMemo } from "react";
import { Folder, AlertTriangle, Download, Loader2, Trash2, ArrowUp, X, Shield, Info } from "lucide-react";
import { SecurityBadgeCompact } from "@/components/security/SecurityBadge";
import { LOADER_STYLES } from "@/theme/tokens";
import { COLORS } from "@/theme/tokens";
import type { LoaderKey } from "@/theme/tokens";
import { CATEGORY_TRANSLATIONS } from "@/utils/format";

interface ModCardProps {
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
  riskLevel?:    "clean" | "caution" | "suspicious" | "critical";
  virusTotal?:   {
    maliciousCount: number;
    totalEngineCount: number;
    detailsUrl?: string;
  } | null;
  categories?:   string[];
  onOpenDetails?: () => void;
  onSecurityDetails?: () => void;
  conflict?:     string;
  hasUpdate?:    boolean;
}

function getProjectTypeLabel(type: string): string {
  const map: Record<string, string> = {
    resourcepack: "🖼️ TEXTURAS",
    datapack:     "📦 Datapack",
    shader:       "✨ Shader",
  };
  return map[type] ?? type;
}

export const ModCard = memo(function ModCard({
  name, version, modVersion, loader, isSelected, onClick,
  activeVersion, activeLoader, badgeText, badgeColor,
  onDownload, isDownloading, index = 0, projectType, iconBase64,
  isPending, onDelete, isDeleting, riskScore, riskLevel, virusTotal, author, categories,
  onOpenDetails, onSecurityDetails, conflict, hasUpdate,
}: ModCardProps) {
  const useStaggeredAnimation = index < 50;
  
  // Normalizar el nombre para visualización
  const cleanName = useMemo(() => {
    // Si el nombre viene con [vX.X.X] o similares, lo limpiamos para la cabecera
    return name.replace(/\[.*?\]/g, '').trim();
  }, [name]);
  
  const isCompatibleRange = useMemo(() => {
    if (!version || version === "unknown") return true;
    if (version === activeVersion) return true;
    if (version.endsWith("+")) return activeVersion.startsWith(version.slice(0, -1));
    if (activeVersion.startsWith(version + ".")) return true;
    if (version.includes(" - ")) {
      const [start, end] = version.split(" - ");
      return activeVersion.startsWith(start) || activeVersion.startsWith(end);
    }
    return false;
  }, [version, activeVersion]);
  
  const isVersionError = version !== "unknown" && activeVersion !== "" && version !== activeVersion && !isCompatibleRange;
  
  const isLoaderError = useMemo(() => {
    if (loader === "unknown" || activeLoader === "" || loader === activeLoader) return false;
    if (activeVersion === "1.20.1") {
      const l = loader.toLowerCase();
      const al = activeLoader.toLowerCase();
      if ((l === "forge" && al === "neoforge") || (l === "neoforge" && al === "forge")) return false;
    }
    return true;
  }, [loader, activeLoader, activeVersion]);

  const isError        = isVersionError || isLoaderError;
  const ls             = LOADER_STYLES[loader?.toLowerCase() || "default"] ?? LOADER_STYLES.default;

  const cardBorder = isPending ? "rgba(255, 255, 255, 0.08)"
    : isSelected && !isError && !conflict && !hasUpdate ? "var(--color-accent-border)"
    : isError     ? (isSelected ? "rgba(239,68,68,0.6)" : "rgba(239,68,68,0.3)")
    : conflict    ? (isSelected ? "rgba(249,115,22,0.6)" : "rgba(249,115,22,0.3)")
    : hasUpdate   ? (isSelected ? "rgba(250,204,21,0.6)" : "rgba(250,204,21,0.3)")
    : "var(--color-border)";
  const cardBg = isPending ? "rgba(255, 255, 255, 0.02)"
    : isSelected && !isError && !conflict && !hasUpdate ? "var(--color-accent-bg)"
    : isError   ? "rgba(127,29,29,0.12)"
    : conflict  ? "rgba(124,45,18,0.12)"
    : hasUpdate ? "rgba(113,101,18,0.12)"
    : "color-mix(in srgb, var(--color-card) 82%, transparent)";
  const cardShadow = isPending ? "none"
    : isSelected && !isError && !conflict && !hasUpdate
    ? "0 0 28px var(--glow-accent), 0 4px 16px rgba(0,0,0,0.1)"
    : conflict && isSelected
    ? "0 0 20px rgba(249,115,22,0.15)"
    : hasUpdate && isSelected
    ? "0 0 20px rgba(250,204,21,0.15)"
    : "none";

  const stopPropDownload = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); onDownload?.();
  }, [onDownload]);

  const stopPropDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); onDelete?.();
  }, [onDelete]);

  const stopPropDetails = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); onOpenDetails?.();
  }, [onOpenDetails]);

  const stopPropSecurityDetails = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); onSecurityDetails?.();
  }, [onSecurityDetails]);

  return (
    <article
      onClick={onClick}
      className={`${useStaggeredAnimation ? "animate-fade-up" : ""} snap-start snap-always scroll-mt-2.5 ${isError && isSelected ? "animate-shake" : ""}`}
      style={{ animationDelay: useStaggeredAnimation ? `${index * 0.035}s` : undefined }}
      aria-selected={isSelected}
      aria-label={`${name} – ${version}`}
    >
      <div
        className={`group relative flex flex-col rounded-[1.8rem] overflow-hidden cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] px-4 py-3 ${isPending ? 'border-dashed opacity-70 grayscale-[0.4]' : 'border-solid opacity-100'}`}
        style={{ 
          minHeight: isPending ? "100px" : "130px", 
          borderWidth: isPending ? "1px" : "0px",
          borderColor: cardBorder, 
          background: isPending ? cardBg : "var(--glass-bg)", 
          backdropFilter: isPending ? "none" : "var(--liquid-blur)",
          boxShadow: isPending ? "none" : "var(--shadow-drop)",
          margin: "8px", // AÑADIDO MARGEN PARA QUE LA SOMBRA NO SE CORTE
          transform: "translateZ(0)",
          WebkitTransform: "translateZ(0)",
        }}
      >
        {/* Liquid Glass Highlight */}
        {!isPending && (
          <div className="absolute inset-0 pointer-events-none opacity-50" 
               style={{ 
                 background: "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%, rgba(0,0,0,0.05) 100%)",
                 boxShadow: "var(--shadow-inner)"
               }} 
          />
        )}
        <div
          aria-hidden="true"
          className="absolute left-2 top-4 bottom-4 w-[4px] rounded-full transition-all duration-300 z-10"
          style={{
            background: isPending ? "rgba(255,255,255,0.2)" : (isSelected ? COLORS.accent : isError ? "#ef4444" : hasUpdate ? "#facc15" : COLORS.primary),
            opacity:    isPending ? 0.3 : (isSelected ? 1 : isError ? 0.9 : hasUpdate ? 0.9 : 0.6),
            boxShadow: isPending ? "none" : `0 0 15px ${isSelected ? COLORS.accent : COLORS.primary}40`,
          }}
        />

        {/* Icon/Metadata Area */}
        <div className="flex gap-3 items-start flex-1 min-h-0">
          <div 
            aria-hidden="true"
            className={`relative shrink-0 rounded-2xl overflow-hidden transition-all duration-300 mt-1 ${isPending ? 'w-10 h-10' : 'w-14 h-14'}`}
            style={{ 
              background: isPending ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${isPending ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.1)"}`
            }}
          >
            {isError    ? <AlertTriangle className="w-5 h-5 text-red-400" />
            : conflict  ? <AlertTriangle className="w-5 h-5 text-orange-400" />
            : iconBase64 ? <img src={iconBase64} alt="" className="w-full h-full object-cover" style={{ imageRendering: "pixelated" }} />
            : <Folder className="w-5 h-5" style={{ color: isSelected ? COLORS.accent : COLORS.primary }} />}
          </div>

          <div className="flex-1 flex flex-col min-w-0 relative z-10">
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-subhead text-sm truncate leading-tight flex-1" style={{ color: isError ? "#fca5a5" : conflict ? "#fdba74" : hasUpdate ? "#fef08a" : "var(--color-foreground)" }}>
                  {cleanName}
                </p>
              
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Security Badge */}
                {!isPending && riskScore !== undefined && riskLevel && (
                  <SecurityBadgeCompact
                    riskScore={riskScore}
                    riskLevel={riskLevel}
                    onClick={() => onSecurityDetails?.()}
                  />
                )}
                
                 {!isPending && onOpenDetails && (
                   <button
                     onClick={stopPropDetails}
                     aria-label="Ver detalles"
                     title="Ver detalles del mod"
                     className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-primary/20 hover:border-primary/40 shadow-sm"
                   >
                     <Info className="w-3 h-3" />
                     <span>Detalles</span>
                   </button>
                 )}
                {isPending && onDelete && (
                  <button
                    onClick={stopPropDelete}
                    disabled={isDeleting}
                    aria-label="Eliminar archivo"
                    className="flex items-center justify-center w-6 h-6 rounded-lg transition-all hover:scale-110 shrink-0"
                    style={{ 
                      background: "rgba(239,68,68,0.12)", 
                      border: "1px solid rgba(239,68,68,0.25)", 
                      color: "#ef4444" 
                    }}
                  >
                    {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  </button>
                )}
              </div>
            </div>

            {!isPending && author && author !== "unknown" && (
              <p className="text-[11px] font-body truncate mt-0.5" style={{ color: "var(--color-muted)" }}>
                por {author}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-1.5 overflow-hidden" role="list">
              <span className="font-label rounded-full px-2 py-0.5 shrink-0" style={{ background: "var(--color-accent-bg)", color: "var(--color-accent)", border: "1px solid var(--color-accent-border)", fontSize: "0.55rem" }}>{version}</span>
              {modVersion && modVersion !== "unknown" && (
                <span className="font-label rounded-full px-2 py-0.5 truncate max-w-[120px]" style={{ background: "rgba(187,150,228,0.12)", border: "1px solid rgba(187,150,228,0.25)", color: "var(--color-primary)", fontSize: "0.55rem" }}>v{modVersion}</span>
              )}
              <span className="font-label rounded-full px-2 py-0.5 shrink-0" style={{ background: ls.bg, color: ls.color, fontSize: "0.55rem" }}>{ls.label}</span>
              
              {(isVersionError || isLoaderError || conflict) && (
                <div className="flex flex-wrap items-center gap-1 shrink-0">
                  {isVersionError && <span className="font-label rounded-full px-2 py-0.5" style={{ background: COLORS.redBg, color: COLORS.red, fontSize: "0.55rem", border: "1px solid rgba(239,68,68,0.2)" }}>⚠ vers</span>}
                  {isLoaderError  && <span className="font-label rounded-full px-2 py-0.5" style={{ background: COLORS.redBg, color: COLORS.red, fontSize: "0.55rem", border: "1px solid rgba(239,68,68,0.2)" }}>⚠ ldr</span>}
                  {conflict && <span className="font-label rounded-full px-2 py-0.5" style={{ background: "rgba(249,115,22,0.15)", color: "#fb923c", fontSize: "0.55rem", border: "1px solid rgba(249,115,22,0.3)" }}>⚠ {conflict}</span>}
                </div>
              )}

              {projectType && projectType !== "mod" && projectType !== "unknown" && (
                <span className="font-label rounded-full px-2 py-0.5 shrink-0" style={{ background: "rgba(102,200,160,0.15)", color: "#66C8A0", border: "1px solid rgba(102,200,160,0.3)", fontSize: "0.55rem" }}>
                  {getProjectTypeLabel(projectType).toUpperCase()}
                </span>
              )}
            </div>

            {/* Separator - Ajustado para no tocar los tags */}
            <div className="h-[1px] w-full bg-white/5 my-2.5" />
          </div>
        </div>

        {/* Footer: Categories + Update */}
        <div className="flex items-center justify-between w-full mt-auto pt-2 border-t border-white/5" style={{ height: "32px" }}>
          <div className="flex items-center gap-1 flex-1 min-w-0 overflow-hidden">
            {categories && categories.slice(0, 2).map((cat) => (
              <span 
                key={cat}
                className="px-2 py-0.5 rounded-full text-[0.55rem] font-bold border shrink-0"
                style={{ 
                  background: "rgba(255,255,255,0.03)", 
                  borderColor: "rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.4)",
                }}
              >
                {CATEGORY_TRANSLATIONS[cat] || cat}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {badgeText && (
              <div className="flex items-center gap-1.5">
                <span className={`font-label rounded-md px-2 py-0.5 max-w-[100px] truncate ${badgeColor ?? "bg-white/8 text-foreground/60"}`} style={{ fontSize: "0.55rem" }}>
                  <ArrowUp className="w-2.5 h-2.5 inline mr-0.5" />
                  {badgeText}
                </span>
                {onDownload && (
                  <button onClick={stopPropDownload} disabled={isDownloading} className="flex items-center justify-center w-6 h-6 rounded-lg transition-all hover:scale-105" style={{ background: "var(--color-accent-bg)", border: "1px solid var(--color-accent-border)", color: "var(--color-accent)" }}>
                    {isDownloading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                  </button>
                )}
              </div>
            )}
            {isSelected && !isError && (
              <div aria-hidden="true" className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: COLORS.accent }} />
                <span className="font-label" style={{ color: COLORS.accent, fontSize: "0.6rem" }}>sel.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
});