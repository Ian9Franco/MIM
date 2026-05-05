/**
 * @fileoverview FomoModCard – a single result card in the FOMO discover view.
 * Shows mod icon, metadata, categories and action buttons (external link,
 * quick download, version picker, add to collection).
 */

"use client";

import React, { memo } from "react";
import {
  Flame, ExternalLink, Download, Loader2, Library, ListTree, Layers3,
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
}

export const FomoModCard = memo(function FomoModCard({
  mod, isDownloading, onDownload, onOpenVersions, onAddToCollection,
}: FomoModCardProps) {
  const isCurseForge = mod._source === "curseforge";
  const typeLabel = mod.projectType === "resourcepack"
    ? "Textura"
    : mod.projectType === "shader"
    ? "Shader"
    : mod.projectType === "datapack"
    ? "Datapack"
    : "Mod";

  return (
    <article
      className="rounded-[1.35rem] p-4 transition-all duration-200 shadow-md glass-hover"
      style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, backdropFilter: "blur(14px)" }}
      aria-label={mod.title}
    >
      <div className="flex items-start gap-4">
        <div
          aria-hidden="true"
          className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center"
          style={{ background: "var(--color-secondary-bg)", border: `1px solid ${COLORS.borderStrong}` }}
        >
          {mod.iconUrl
            ? <img src={mod.iconUrl} alt="" className="w-full h-full object-cover" style={{ imageRendering: "pixelated" }} loading="lazy" />
            : <Flame className="w-7 h-7 opacity-25" aria-hidden="true" />
          }
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-headline text-base leading-tight truncate" style={{ color: COLORS.foreground }}>{mod.title}</p>
              <p className="font-caption mt-1" style={{ color: COLORS.muted }}>por {mod.author || "Autor desconocido"}</p>
            </div>
            <Chip color={isCurseForge ? COLORS.curseforgeOrange : COLORS.primary} bg={isCurseForge ? "rgba(239,108,0,0.14)" : "rgba(187,150,228,0.12)"}>
              {isCurseForge ? "CurseForge" : typeLabel}
            </Chip>
          </div>

          <div className="flex items-center gap-2 flex-wrap mt-3" role="list" aria-label="Metadatos">
            <Chip bg="rgba(255,255,255,0.06)">↓ {formatNumber(mod.downloads)}</Chip>
            {mod.latestVersion && <Chip color={COLORS.emerald} bg="rgba(102,200,160,0.14)">v{mod.latestVersion}</Chip>}
            {mod.categories.slice(0, 2).map((cat) => (
              <Chip key={cat} color={COLORS.primary} bg="rgba(187,150,228,0.12)">{cat}</Chip>
            ))}
          </div>
        </div>
      </div>

      <p className="font-caption mt-4 leading-relaxed line-clamp-3 text-sm" style={{ color: COLORS.muted }}>
        {mod.description}
      </p>

      <div className={`grid gap-2 mt-5 ${isCurseForge ? "grid-cols-2" : "grid-cols-2 md:grid-cols-4"}`}>
        {!isCurseForge && (
          <button
            onClick={() => onOpenVersions(mod)}
            aria-label={`Ver detalles de ${mod.title}`}
            className="flex items-center justify-center gap-2 h-11 px-4 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm"
            style={{ background: "rgba(187,150,228,0.16)", color: COLORS.primary, border: "1px solid rgba(187,150,228,0.25)" }}
          >
            <ListTree className="w-4.5 h-4.5" />
            Detalles
          </button>
        )}

        {!isCurseForge && (
          <button
            onClick={() => onDownload(mod)}
            disabled={isDownloading}
            aria-label={isDownloading ? "Descargando…" : `Descargar ${mod.title}`}
            className="flex items-center justify-center gap-2 h-11 px-4 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 shadow-sm"
            style={{ background: "rgba(102,200,160,0.15)", color: COLORS.emerald, border: "1px solid rgba(102,200,160,0.28)" }}
          >
            {isDownloading ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Download className="w-4.5 h-4.5" />}
            Descargar
          </button>
        )}

        <button
          onClick={() => openExternal(mod.url)}
          aria-label={`Ver ${mod.title} en ${isCurseForge ? "CurseForge" : "Modrinth"}`}
          className="flex items-center justify-center gap-2 h-11 px-4 rounded-xl text-sm font-bold transition-all hover:bg-white/10 hover:scale-[1.02] active:scale-[0.98] shadow-sm"
          style={{ color: isCurseForge ? COLORS.curseforgeOrange : COLORS.foreground, border: `1px solid ${COLORS.borderStrong}`, background: "var(--color-secondary-bg)" }}
        >
          <ExternalLink className="w-4.5 h-4.5" />
          Web
        </button>

        <button
          onClick={() => onAddToCollection(mod)}
          aria-label={`Añadir ${mod.title} a colección`}
          className="flex items-center justify-center gap-2 h-11 px-4 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm"
          style={{ background: "var(--color-accent-bg)", color: COLORS.gold, border: "1px solid var(--color-accent-border)" }}
        >
          <Library className="w-4.5 h-4.5" />
          Colección
        </button>

        {isCurseForge && (
          <div
            className="min-h-[44px] px-3 rounded-xl text-xs font-medium flex items-center justify-center text-center"
            style={{ background: "var(--color-secondary-bg)", color: COLORS.muted, border: `1px solid ${COLORS.border}` }}
          >
            <span className="inline-flex items-center gap-2">
              <Layers3 className="w-4 h-4" />
              Detalles avanzados solo en Modrinth
            </span>
          </div>
        )}
      </div>
    </article>
  );
});
