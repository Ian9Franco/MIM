import React from "react";
import { Cpu, ArrowRight } from "lucide-react";

/**
 * @fileoverview Panel de Acciones Inteligentes de Autocorrección (SAGE Auto-Fix).
 * ─────────────────────────────────────────────────────────────────────────────
 * Analiza el reporte de error y ofrece botones de acción de un solo clic para
 * resolver dependencias faltantes o conflictos de duplicidad.
 * Si existen múltiples acciones, genera un flujo consecutivo.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export function SageActionableFixes({ actionableFix, actionableFixes, onAutoFix }: any) {
  // ESCENARIO 1: Múltiples dependencias faltantes
  if (actionableFixes && actionableFixes.length > 1) {
    return (
      <div className="p-4.5 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 space-y-4 shadow-lg shadow-indigo-500/5">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-indigo-400 animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-200">
            Acciones Múltiples SAGE ({actionableFixes.length})
          </span>
        </div>
        <p className="text-xs text-foreground/70 leading-relaxed">
          Se detectaron {actionableFixes.length} dependencias requeridas. Instálalas consecutivamente:
        </p>
        <div className="space-y-2">
          {actionableFixes.map((fix: any, idx: number) => (
            <div key={idx} className="p-3 rounded-xl bg-white/5 flex items-center justify-between gap-3 text-xs border border-white/5 hover:bg-white/10 transition-colors">
              <span className="font-mono font-bold text-indigo-300">{fix.dependencyId}</span>
              <button 
                onClick={() => onAutoFix(fix)} 
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[9px] uppercase shadow hover:scale-105 transition-transform"
              >
                Instalar
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ESCENARIO 2: Acción única (Falta una dependencia o hay un duplicado exacto)
  if (actionableFix) {
    return (
      <div className="p-4.5 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 space-y-3 shadow-lg shadow-indigo-500/5">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-indigo-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-200">
            Acción Rápida Inteligente
          </span>
        </div>
        <p className="text-xs text-foreground/70 leading-relaxed">
          SAGE ha identificado una solución automatizada para este incidente.
        </p>
        <button 
          onClick={() => onAutoFix(actionableFix)} 
          className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 hover:scale-[1.01] transition-transform"
        >
          <ArrowRight className="w-4 h-4 animate-pulse" /> {actionableFix.suggestionLabel}
        </button>
      </div>
    );
  }

  return null;
}
