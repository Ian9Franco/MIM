"use client";

import React, { memo, useCallback } from "react";
import { Download, Loader2, ArrowUp, Shield } from "lucide-react";
import { LOADER_STYLES, COLORS } from "@/theme/tokens";
import { CATEGORY_TRANSLATIONS } from "@/utils/format";
import { useModCardLogic } from "@/hooks/library/useModCardLogic";
import { ModCardHeader } from "./parts/ModCardHeader";

/**
 * ModCardFixed - Versión optimizada con layout consistente y altura fija.
 * Refactorizada para mejorar la legibilidad y separar la lógica de compatibilidad.
 */
export const ModCardFixed = memo(function ModCardFixed({
  name, version, modVersion, loader, isSelected, onClick,
  activeVersion, activeLoader, badgeText, badgeColor,
  onDownload, isDownloading, index = 0, projectType, iconBase64,
  isPending, onDelete, isDeleting, riskScore, author, categories,
}: any) {
  
  const { isVersionError, isLoaderError, isError } = useModCardLogic(version, activeVersion, loader, activeLoader);
  const useStaggeredAnimation = index < 50;
  const ls = LOADER_STYLES[loader?.toLowerCase() || "default"] ?? LOADER_STYLES.default;

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
      className={`${useStaggeredAnimation ? "animate-fade-up" : ""} snap-start ${isError && isSelected ? "animate-shake" : ""}`}
      style={{ animationDelay: useStaggeredAnimation ? `${index * 0.035}s` : undefined }}
    >
      <div
        className="group relative flex flex-col rounded-[1.5rem] cursor-pointer overflow-hidden transition-all duration-500 max-w-[500px] px-4 py-3"
        style={{ 
          height: "120px", 
          border: `1px solid ${isSelected ? "var(--color-accent-border)" : isError ? "rgba(239,68,68,0.3)" : "var(--color-border)"}`, 
          background: isSelected ? "var(--color-accent-bg)" : isError ? "rgba(127,29,29,0.12)" : "rgba(255,255,255,0.03)",
          boxShadow: isSelected ? "0 0 28px var(--glow-accent)" : "none"
        }}
      >
        <ModCardHeader name={name} author={author} isError={isError} iconBase64={iconBase64} isSelected={isSelected} isPending={isPending} onDelete={onDelete} isDeleting={isDeleting} />

        {/* Fila Central: Badges de versión y loader */}
        <div className="flex items-center gap-1.5 w-full mt-2 overflow-hidden" style={{ height: "24px" }}>
          <span className="font-label rounded-full px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 text-[10px]">{version}</span>
          {modVersion && modVersion !== "unknown" && <span className="font-label rounded-full px-2 py-0.5 bg-white/5 border border-white/10 opacity-60 text-[10px]">v{modVersion}</span>}
          <span className="font-label rounded-full px-2 py-0.5 text-[10px]" style={{ background: ls.bg, color: ls.color }}>{ls.label}</span>
          {securityInfo && <span className="font-label rounded-full px-2 py-0.5 flex items-center gap-1 ml-auto" style={{ background: securityInfo.bg, color: securityInfo.color, fontSize: "9px" }}><Shield className="w-2.5 h-2.5" /> {securityInfo.label}</span>}
        </div>

        {/* Fila Inferior: Categorías y Acciones */}
        <div className="flex items-center justify-between w-full mt-auto" style={{ height: "32px" }}>
          <div className="flex items-center gap-1 flex-1 min-w-0 overflow-hidden">
            {categories?.slice(0, 2).map((cat: string) => (
              <span key={cat} className="px-2 py-0.5 rounded-full text-[9px] font-bold border border-white/5 bg-white/5 opacity-40">{CATEGORY_TRANSLATIONS[cat] || cat}</span>
            ))}
          </div>
          {badgeText && (
            <div className="flex items-center gap-1.5 ml-2">
              <span className={`font-label rounded-md px-2 py-0.5 text-[10px] ${badgeColor ?? "bg-white/5"}`}><ArrowUp className="w-3 h-3 inline mr-1" /> {badgeText}</span>
              {onDownload && <button onClick={(e) => { e.stopPropagation(); onDownload(); }} disabled={isDownloading} className="w-7 h-7 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">{isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}</button>}
            </div>
          )}
          {isSelected && !isError && <div className="flex items-center gap-1.5 ml-2"><span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /><span className="text-[10px] font-bold text-primary uppercase">SEL.</span></div>}
        </div>
      </div>
    </article>
  );
});
