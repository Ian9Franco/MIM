"use client";

import { Folder, AlertTriangle, Download, Loader2 } from "lucide-react";

interface ModCardProps {
  name: string;
  version: string;
  modVersion?: string;
  loader: string;
  isSelected: boolean;
  onClick: () => void;
  activeVersion: string;
  activeLoader: string;
  badgeText?: string;
  badgeColor?: string;
  onDownload?: () => void;
  isDownloading?: boolean;
  index?: number;
}

const LOADER_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  forge:    { bg: "rgba(255,140,0,0.12)",   color: "#FF8C00", label: "Forge" },
  neoforge: { bg: "rgba(255,120,60,0.12)",  color: "#FF783C", label: "NeoForge" },
  fabric:   { bg: "rgba(102,200,160,0.12)", color: "#66C8A0", label: "Fabric" },
  unknown:  { bg: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.35)", label: "Unknown" },
};

export function ModCard({
  name,
  version,
  modVersion,
  loader,
  isSelected,
  onClick,
  activeVersion,
  activeLoader,
  badgeText,
  badgeColor,
  onDownload,
  isDownloading,
  index = 0,
}: ModCardProps) {
  const isVersionError = version !== "unknown" && activeVersion !== "" && version !== activeVersion;
  const isLoaderError  = loader  !== "unknown" && activeLoader  !== "" && loader  !== activeLoader;
  const isError        = isVersionError || isLoaderError;

  const ls = LOADER_STYLE[loader] ?? LOADER_STYLE.unknown;

  /* ── Border / background based on state ────── */
  let cardBorder = "var(--color-border)";
  let cardBg     = "color-mix(in srgb, var(--color-card) 82%, transparent)";
  let cardShadow = "none";

  if (isSelected && !isError) {
    cardBorder = "rgba(255,208,102,0.55)";
    cardBg     = "rgba(255,208,102,0.05)";
    cardShadow = "0 0 28px rgba(255,208,102,0.12), 0 4px 16px rgba(0,0,0,0.2)";
  } else if (isError) {
    cardBorder = isSelected ? "rgba(239,68,68,0.6)" : "rgba(239,68,68,0.3)";
    cardBg     = "rgba(127,29,29,0.12)";
  }

  return (
    <div
      onClick={onClick}
      className={`animate-fade-up ${isError && isSelected ? "animate-shake" : ""}`}
      style={{ animationDelay: `${index * 0.035}s`, opacity: 0 }}
    >
      <div
        className="group relative flex items-center gap-3.5 px-4 py-3.5 rounded-2xl cursor-pointer overflow-hidden transition-all duration-250"
        style={{
          border: `1px solid ${cardBorder}`,
          background: cardBg,
          boxShadow: cardShadow,
        }}
        onMouseEnter={(e) => {
          if (!isSelected && !isError) {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border-strong)";
            (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px rgba(0,0,0,0.18)";
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected && !isError) {
            (e.currentTarget as HTMLElement).style.borderColor = cardBorder;
            (e.currentTarget as HTMLElement).style.boxShadow = cardShadow;
          }
        }}
      >
        {/* Left accent bar */}
        <div
          className="absolute left-0 top-0 w-[3px] h-full rounded-l-[1px] transition-all duration-300"
          style={{
            background: isSelected
              ? "var(--color-accent)"
              : isError
              ? "#ef4444"
              : "var(--color-primary)",
            opacity: isSelected ? 1 : isError ? 0.7 : 0.3,
          }}
        />

        {/* Icon */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 group-hover:scale-105"
          style={{
            background: isError
              ? "rgba(239,68,68,0.1)"
              : isSelected
              ? "rgba(255,208,102,0.12)"
              : "rgba(187,150,228,0.1)",
            border: `1px solid ${isError ? "rgba(239,68,68,0.25)" : isSelected ? "rgba(255,208,102,0.25)" : "rgba(187,150,228,0.18)"}`,
          }}
        >
          {isError
            ? <AlertTriangle className="w-4 h-4 text-red-400" />
            : <Folder
                className="w-4 h-4 transition-colors"
                style={{ color: isSelected ? "var(--color-accent)" : "var(--color-primary)" }}
              />
          }
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p
            className="font-subhead text-sm truncate leading-tight"
            style={{ color: isError ? "#fca5a5" : "var(--color-foreground)" }}
          >
            {name}
          </p>

          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            {/* Game version */}
            <span className="font-label rounded-full px-2 py-0.5"
              style={{ background: "rgba(255,208,102,0.1)", color: "var(--color-accent)", fontSize: "0.6rem" }}
            >
              {version}
            </span>

            {/* Mod version */}
            {modVersion && modVersion !== "unknown" && (
              <span className="font-caption rounded-full px-2 py-0.5"
                style={{ background: "rgba(187,150,228,0.08)", border: "1px solid rgba(187,150,228,0.2)", color: "var(--color-primary)" }}
              >
                v{modVersion}
              </span>
            )}

            {/* Loader */}
            <span className="font-label rounded-full px-2 py-0.5"
              style={{ background: ls.bg, color: ls.color, fontSize: "0.6rem" }}
            >
              {ls.label}
            </span>

            {/* Error flags */}
            {isVersionError && (
              <span className="font-label rounded-full px-2 py-0.5"
                style={{ background: "rgba(239,68,68,0.12)", color: "#f87171", fontSize: "0.6rem" }}
              >
                ⚠ versión
              </span>
            )}
            {isLoaderError && (
              <span className="font-label rounded-full px-2 py-0.5"
                style={{ background: "rgba(239,68,68,0.12)", color: "#f87171", fontSize: "0.6rem" }}
              >
                ⚠ loader
              </span>
            )}

            {/* Update badge + download btn */}
            {badgeText && (
              <div className="flex items-center gap-1.5 animate-fade-in">
                <span
                  className={`font-label rounded-md px-2 py-0.5 max-w-[130px] truncate ${badgeColor ?? "bg-white/8 text-foreground/60"}`}
                  title={badgeText}
                  style={{ fontSize: "0.6rem" }}
                >
                  {badgeText}
                </span>
                {onDownload && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDownload(); }}
                    disabled={isDownloading}
                    className="flex items-center justify-center w-6 h-6 rounded-lg transition-all"
                    style={{
                      background: isDownloading ? "rgba(255,255,255,0.04)" : "rgba(255,208,102,0.1)",
                      border: `1px solid ${isDownloading ? "rgba(255,255,255,0.08)" : "rgba(255,208,102,0.25)"}`,
                      color: isDownloading ? "rgba(255,255,255,0.25)" : "var(--color-accent)",
                    }}
                    title="Descargar actualización"
                  >
                    {isDownloading
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <Download className="w-3 h-3" />
                    }
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Selected indicator */}
        {isSelected && !isError && (
          <div className="shrink-0 flex items-center gap-1.5 animate-fade-in">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--color-accent)" }} />
            <span className="font-label" style={{ color: "var(--color-accent)", fontSize: "0.6rem" }}>sel.</span>
          </div>
        )}
      </div>
    </div>
  );
}