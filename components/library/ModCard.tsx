/**
 * @fileoverview ModCard – displays a single installed mod with its metadata,
 * status badges, and optional inline update download button.
 *
 * @param name          Display name of the mod
 * @param version       Minecraft game version the mod targets
 * @param modVersion    Mod's own version string
 * @param loader        Mod loader ("forge", "fabric", etc.)
 * @param isSelected    Whether this card is currently selected
 * @param onClick       Click handler (toggles selection)
 * @param activeVersion Project's active game version (for compatibility check)
 * @param activeLoader  Project's active loader (for compatibility check)
 * @param badgeText     Optional status badge text (e.g. "↑ 1.2.3")
 * @param badgeColor    Tailwind classes for badge styling
 * @param onDownload    If provided, shows an inline download button
 * @param isDownloading Whether the download is in progress
 * @param index         List position, used for staggered animation delay
 * @param projectType   Type of project (mod, resourcepack, etc.)
 * @param iconBase64    Base64-encoded mod icon
 */

"use client";

import React, { memo, useCallback } from "react";
import { Folder, AlertTriangle, Download, Loader2, Trash2, ArrowUp, X, Shield } from "lucide-react";
import { LOADER_STYLES } from "@/theme/tokens";
import { COLORS } from "@/theme/tokens";
import type { LoaderKey } from "@/theme/tokens";

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

export const ModCard = memo(function ModCard({
  name, version, modVersion, loader, isSelected, onClick,
  activeVersion, activeLoader, badgeText, badgeColor,
  onDownload, isDownloading, index = 0, projectType, iconBase64,
  isPending, onDelete, isDeleting, riskScore, author,
}: ModCardProps) {
  // Logic: if version is "1.20+", it matches "1.20.1"
  const isCompatibleRange = version.endsWith("+") && activeVersion.startsWith(version.slice(0, -1));
  
  const isVersionError = version !== "unknown" && activeVersion !== "" && version !== activeVersion && !isCompatibleRange;
  const isLoaderError  = loader  !== "unknown" && activeLoader  !== ""  && loader  !== activeLoader;
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
      className={`animate-fade-up ${isError && isSelected ? "animate-shake" : ""}`}
      style={{ animationDelay: `${index * 0.035}s`, opacity: 0 }}
      aria-selected={isSelected}
      aria-label={`${name} – ${version}`}
    >
      <div
        className="group relative flex items-center gap-3.5 px-4 py-3.5 rounded-2xl cursor-pointer overflow-hidden transition-all duration-250"
        style={{ border: `1px solid ${cardBorder}`, background: cardBg, boxShadow: cardShadow }}
      >
        {/* Left accent bar */}
        <div
          aria-hidden="true"
          className="absolute left-0 top-0 w-[3px] h-full rounded-l-[1px] transition-all duration-300"
          style={{
            background: isSelected ? COLORS.accent : isError ? "#ef4444" : COLORS.primary,
            opacity:    isSelected ? 1 : isError ? 0.7 : 0.3,
          }}
        />

        {/* Icon */}
        <div
          aria-hidden="true"
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
          style={{
            background: isError ? "rgba(239,68,68,0.1)" : isSelected ? "var(--color-accent-bg)" : "var(--color-secondary-bg)",
            border: `1px solid ${isError ? "rgba(239,68,68,0.25)" : isSelected ? "var(--color-accent-border)" : "var(--color-border)"}`,
          }}
        >
          {isError    ? <AlertTriangle className="w-5 h-5 text-red-400" />
          : iconBase64 ? <img src={iconBase64} alt="" className="w-full h-full object-cover" style={{ imageRendering: "pixelated" }} />
          : <Folder className="w-5 h-5" style={{ color: isSelected ? COLORS.accent : COLORS.primary }} />}
        </div>

        {/* Metadata */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <p className="font-subhead text-sm truncate leading-tight" style={{ color: isError ? "#fca5a5" : COLORS.foreground }}>
              {name}
            </p>
            {author && author !== "unknown" && (
              <span className="font-caption text-[10px] opacity-40 truncate">
                by {author}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5" role="list" aria-label="Etiquetas">
            <span role="listitem" className="font-label rounded-full px-2 py-0.5" style={{ background: "var(--color-accent-bg)", color: "var(--color-accent)", border: "1px solid var(--color-accent-border)", fontSize: "0.6rem" }}>{version}</span>
            {modVersion && modVersion !== "unknown" && (
              <span role="listitem" className="font-caption rounded-full px-2 py-0.5" style={{ background: "rgba(187,150,228,0.08)", border: "1px solid rgba(187,150,228,0.2)", color: COLORS.primary }}>v{modVersion}</span>
            )}
            <span role="listitem" className="font-label rounded-full px-2 py-0.5" style={{ background: ls.bg, color: ls.color, fontSize: "0.6rem" }}>{ls.label}</span>
            {projectType && projectType !== "mod" && projectType !== "unknown" && (
              <span role="listitem" className="font-label rounded-full px-2 py-0.5" style={{ background: "rgba(228,150,184,0.1)", color: "#E496B8", fontSize: "0.6rem" }}>{getProjectTypeLabel(projectType)}</span>
            )}
            {isVersionError && <span role="listitem" className="font-label rounded-full px-2 py-0.5" style={{ background: COLORS.redBg, color: COLORS.red, fontSize: "0.6rem" }}>⚠ versión</span>}
            {isLoaderError  && <span role="listitem" className="font-label rounded-full px-2 py-0.5" style={{ background: COLORS.redBg, color: COLORS.red, fontSize: "0.6rem" }}>⚠ loader</span>}
            {/* Security Score Badge */}
            {securityInfo && (
              <span
                role="listitem"
                className="font-label rounded-full px-2 py-0.5 flex items-center gap-1"
                style={{ background: securityInfo.bg, color: securityInfo.color, fontSize: "0.6rem" }}
                title={`Risk Score: ${riskScore}/100`}
              >
                <Shield className="w-3 h-3" />
                {securityInfo.label}
              </span>
            )}

            {/* Update Available Badge with Action */}
            {badgeText && (
              <div className="flex items-center gap-1.5 animate-fade-in" role="listitem">
                <span
                  className={`font-label rounded-md px-2 py-0.5 max-w-[130px] truncate ${badgeColor ?? "bg-white/8 text-foreground/60"}`}
                  style={{ fontSize: "0.6rem" }}
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

            {/* Delete Button for Pending Files */}
            {isPending && onDelete && (
              <button
                onClick={stopPropDelete}
                disabled={isDeleting}
                aria-label="Eliminar archivo"
                title="Eliminar archivo permanentemente"
                className="flex items-center justify-center w-6 h-6 rounded-lg transition-all hover:scale-105 ml-auto"
                style={{ background: isDeleting ? "rgba(255,255,255,0.04)" : "rgba(239,68,68,0.15)", border: `1px solid ${isDeleting ? "rgba(255,255,255,0.08)" : "rgba(239,68,68,0.35)"}`, color: isDeleting ? "rgba(255,255,255,0.25)" : "#ef4444" }}
              >
                {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              </button>
            )}
          </div>
        </div>

        {/* Selected indicator */}
        {isSelected && !isError && (
          <div aria-hidden="true" className="shrink-0 flex items-center gap-1.5 animate-fade-in">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: COLORS.accent }} />
            <span className="font-label" style={{ color: COLORS.accent, fontSize: "0.6rem" }}>sel.</span>
          </div>
        )}
      </div>
    </article>
  );
});