import React from "react";
import { LayoutTemplate, Loader2, Download } from "lucide-react";
import type { PresetEntry } from "./types";

interface FomoPresetsProps {
  presets: PresetEntry[];
  presetsLoading: boolean;
  presetDownloading: string | null;
  handleApplyPreset: (p: PresetEntry) => void;
}

export function FomoPresets({
  presets,
  presetsLoading,
  presetDownloading,
  handleApplyPreset,
}: FomoPresetsProps) {
  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-4">
      {presetsLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-9 h-9 animate-spin" style={{ color: "#BB96E4", opacity: 0.5 }} />
          <p className="font-subhead text-sm animate-pulse" style={{ color: "var(--color-muted)" }}>Cargando modpacks...</p>
        </div>
      ) : presets.length === 0 ? (
        <div className="text-center py-20 opacity-40">
          <LayoutTemplate className="w-12 h-12 mx-auto mb-3" />
          <p className="font-subhead">No hay modpacks disponibles</p>
          <p className="font-caption mt-1">Reintentá más tarde</p>
        </div>
      ) : (
        presets.map((preset) => (
          <div
            key={preset.id}
            className="rounded-2xl p-4 transition-all duration-300 group"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white/5 border border-white/10 shrink-0 flex items-center justify-center">
                <LayoutTemplate className="w-8 h-8 opacity-40" style={{ color: "#BB96E4" }} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-headline text-base truncate" style={{ color: "var(--color-foreground)" }}>{preset.name}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-caption text-xs" style={{ color: "var(--color-muted)" }}>
                    {preset.projectCount} proyectos
                  </span>
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/10" style={{ color: "var(--color-muted)" }}>
                    {preset.recommendedLoader}
                  </span>
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/10" style={{ color: "var(--color-muted)" }}>
                    {preset.recommendedVersion}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleApplyPreset(preset)}
                disabled={!!presetDownloading}
                className="flex flex-col items-center justify-center p-3 rounded-2xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                style={{ 
                  background: presetDownloading === preset.id ? "rgba(187,150,228,0.15)" : "rgba(255,255,255,0.05)",
                  color: "#BB96E4",
                  border: "1px solid rgba(187,150,228,0.3)"
                }}
                title="Aplicar modpack (descarga todos los mods)"
              >
                {presetDownloading === preset.id ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    <span className="text-[0.6rem] font-bold mt-1">Aplicar</span>
                  </>
                )}
              </button>
            </div>
            {preset.description && (
              <p className="font-caption text-xs mt-3 line-clamp-2 leading-relaxed" style={{ color: "var(--color-muted)" }}>
                {preset.description}
              </p>
            )}
            {preset.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {preset.tags.map(tag => (
                  <span
                    key={tag}
                    className="font-label text-[0.58rem] px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(187,150,228,0.12)", color: "#BB96E4" }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
