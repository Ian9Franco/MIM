"use client";

import React from "react";
import { BookOpen, RefreshCw, Check } from "lucide-react";
import { useGuidesEnabled } from "@/hooks/useGuidesEnabled";
import { resetAllOnboardingProgress } from "@/lib/guides/guidesSettings";

export function GuidesSettingsCard() {
  const { enabled, setEnabled } = useGuidesEnabled();
  const [resetNotice, setResetNotice] = React.useState(false);

  const handleReset = () => {
    resetAllOnboardingProgress();
    setResetNotice(true);
    window.setTimeout(() => setResetNotice(false), 2500);
  };

  return (
    <div className="group">
      <div className="flex items-center justify-between mb-2">
        <label className="font-label text-muted text-[0.65rem] tracking-wider uppercase">
          Guías interactivas
        </label>
        <span className="px-1.5 py-0.5 rounded text-[9px] font-subhead border bg-primary/10 border-primary/20 text-primary">
          Tutorial
        </span>
      </div>

      <div className="w-full rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h4 className="text-sm font-subhead text-foreground flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary shrink-0" />
              Recorridos por sección
            </h4>
            <p className="text-[11px] text-muted mt-1 leading-relaxed">
              Muestra tooltips guiados al abrir FOMO, SAGE, TWEAK, GATE, Ajustes y la pantalla principal.
              También podés activarlo desde el header junto al badge Beta.
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => setEnabled(!enabled)}
            className={`relative shrink-0 w-11 h-6 rounded-full border transition-all ${
              enabled
                ? "bg-primary/30 border-primary/40"
                : "bg-white/5 border-white/15"
            }`}
            title={enabled ? "Desactivar guías" : "Activar guías"}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                enabled ? "translate-x-5 bg-primary" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5">
          <span className={`text-[10px] font-mono ${enabled ? "text-emerald-400" : "text-muted"}`}>
            {enabled ? "Activadas — se muestran al entrar a cada sección" : "Desactivadas — solo la primera visita de cada panel"}
          </span>

          <button
            type="button"
            onClick={handleReset}
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/10 text-[11px] text-muted hover:text-foreground transition-all"
          >
            {resetNotice ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Listo</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                Reiniciar tutoriales
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
