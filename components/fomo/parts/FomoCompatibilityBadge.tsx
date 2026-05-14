import React from "react";
import { predictConnectorCompatibility } from "@/lib/sinytraUtils";

/**
 * @fileoverview Indicador Visual de Compatibilidad Asistida (Sinytra Connector).
 * ─────────────────────────────────────────────────────────────────────────────
 * Evalúa en tiempo real si un mod exclusivo de Fabric puede ejecutarse en
 * un entorno Forge gracias a la capa de traducción Sinytra Connector.
 * ─────────────────────────────────────────────────────────────────────────────
 */

interface FomoCompatibilityBadgeProps {
  /** Nombre del mod a evaluar */
  title: string;
  /** Categorías o etiquetas declaradas por la plataforma */
  categories?: string[];
}

/**
 * FomoCompatibilityBadge
 * Renderiza un badge dinámico con el nivel de riesgo y la probabilidad de éxito.
 */
export function FomoCompatibilityBadge({ title, categories }: FomoCompatibilityBadgeProps) {
  const pred = predictConnectorCompatibility(title, categories);
  
  // Diccionario de estilos por nivel de riesgo (VERY_HIGH, HIGH, MEDIUM, LOW)
  const riskStyles: Record<string, string> = {
    VERY_HIGH: "bg-red-500/5 border-red-500/20 text-red-200/90",
    HIGH: "bg-orange-500/5 border-orange-500/20 text-orange-200/90",
    MEDIUM: "bg-amber-500/5 border-amber-500/20 text-amber-200/90",
    LOW: "bg-emerald-500/5 border-emerald-500/20 text-emerald-200/90"
  };

  const labelStyles: Record<string, string> = {
    VERY_HIGH: "bg-red-500/15 border-red-500/25 text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.1)]",
    HIGH: "bg-orange-500/15 border-orange-500/25 text-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.1)]",
    MEDIUM: "bg-amber-500/15 border-amber-500/25 text-amber-400",
    LOW: "bg-emerald-500/15 border-emerald-500/25 text-emerald-400"
  };

  return (
    <div className={`mt-4 p-3 rounded-xl border flex flex-col gap-1.5 transition-all relative overflow-hidden group/compat ${riskStyles[pred.riskLevel] || riskStyles.LOW}`}>
      <div className="flex items-center justify-between text-[10px] font-bold">
        <span className="flex items-center gap-1 opacity-80 uppercase tracking-wider text-cyan-400">
          🔌 Compatibilidad Sinytra
        </span>
        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tight border ${labelStyles[pred.riskLevel] || labelStyles.LOW}`}>
          {pred.label} ({pred.percentage}%)
        </span>
      </div>
      <p className="text-[10px] text-foreground/60 leading-relaxed font-medium">
        {pred.reason}
      </p>
    </div>
  );
}
