/**
 * @fileoverview FomoPresets – lists available modpacks/presets and allows
 * the user to apply them (downloading all included mods).
 */

"use client";

import React, { memo } from "react";
import { LayoutTemplate, Loader2, Download } from "lucide-react";
import { COLORS } from "@/theme/tokens";
import { LoadingSpinner, EmptyState } from "../ui/primitives";
import type { PresetEntry } from "@/lib/types";

interface FomoPresetsProps {
  presets:          PresetEntry[];
  presetsLoading:   boolean;
  presetDownloading:string | null;
  onApplyPreset:    (p: PresetEntry) => void;
}

export const FomoPresets = memo(function FomoPresets({
  presets, presetsLoading, presetDownloading, onApplyPreset,
}: FomoPresetsProps) {
  if (presetsLoading) return <LoadingSpinner label="Cargando modpacks..." />;
  if (presets.length === 0) return (
    <EmptyState
      icon={<LayoutTemplate className="w-12 h-12" />}
      title="No hay modpacks disponibles"
      subtitle="Reintentá más tarde"
    />
  );

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-4" role="list" aria-label="Modpacks disponibles">
      {presets.map((preset) => (
        <article
          key={preset.id}
          role="listitem"
          className="rounded-2xl p-4 transition-all duration-300"
          style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${COLORS.border}` }}
          aria-label={preset.name}
        >
          <div className="flex items-center gap-4">
            {/* Icon */}
            <div
              aria-hidden="true"
              className="w-16 h-16 rounded-2xl overflow-hidden bg-white/5 border border-white/10 shrink-0 flex items-center justify-center"
            >
              <LayoutTemplate className="w-8 h-8 opacity-40" style={{ color: COLORS.wisteria }} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-headline text-base truncate" style={{ color: COLORS.foreground }}>{preset.name}</h3>
              <div className="flex items-center gap-2 mt-0.5" role="list" aria-label="Detalles">
                <span role="listitem" className="font-caption text-xs" style={{ color: COLORS.muted }}>{preset.projectCount} proyectos</span>
                <span role="listitem" className="text-xs px-1.5 py-0.5 rounded-full bg-white/10" style={{ color: COLORS.muted }}>{preset.recommendedLoader}</span>
                <span role="listitem" className="text-xs px-1.5 py-0.5 rounded-full bg-white/10" style={{ color: COLORS.muted }}>{preset.recommendedVersion}</span>
              </div>
            </div>

            {/* Apply button */}
            <button
              onClick={() => onApplyPreset(preset)}
              disabled={!!presetDownloading}
              aria-label={`Aplicar modpack ${preset.name}`}
              aria-busy={presetDownloading === preset.id}
              className="flex flex-col items-center justify-center p-3 rounded-2xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
              style={{
                background: presetDownloading === preset.id ? "rgba(187,150,228,0.15)" : "rgba(255,255,255,0.05)",
                color:  COLORS.wisteria,
                border: "1px solid rgba(187,150,228,0.3)",
              }}
            >
              {presetDownloading === preset.id
                ? <Loader2 className="w-5 h-5 animate-spin" />
                : <>
                    <Download className="w-5 h-5" aria-hidden="true" />
                    <span className="text-[0.6rem] font-bold mt-1">Aplicar</span>
                  </>
              }
            </button>
          </div>

          {preset.description && (
            <p className="font-caption text-xs mt-3 line-clamp-2 leading-relaxed" style={{ color: COLORS.muted }}>
              {preset.description}
            </p>
          )}

          {preset.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3" role="list" aria-label="Etiquetas">
              {preset.tags.map((tag) => (
                <span
                  key={tag}
                  role="listitem"
                  className="font-label text-[0.58rem] px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(187,150,228,0.12)", color: COLORS.wisteria }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </article>
      ))}
    </div>
  );
});