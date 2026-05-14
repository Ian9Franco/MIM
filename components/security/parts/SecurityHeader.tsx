import React from "react";
import { X, ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";

/**
 * @fileoverview Cabecera de Inspección de Seguridad de Mods.
 * ─────────────────────────────────────────────────────────────────────────────
 * Muestra el nivel de riesgo calculado para un archivo, inyectando un diseño
 * temático (colores, gradientes, iconos) basado en el resultado del análisis
 * estático (Clean, Caution, Suspicious, Critical).
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * getSecurityConfig: Retorna la paleta de diseño para un nivel de riesgo.
 */
export const getSecurityConfig = (level: string) => {
  const configs: any = {
    clean: { 
      icon: ShieldCheck, color: "#10b981", label: "Seguro", 
      gradient: "linear-gradient(135deg, #10b981, #059669)", 
      bgColor: "rgba(16, 185, 129, 0.1)", borderColor: "rgba(16, 185, 129, 0.2)" 
    },
    caution: { 
      icon: ShieldAlert, color: "#f59e0b", label: "Precaución", 
      gradient: "linear-gradient(135deg, #f59e0b, #d97706)", 
      bgColor: "rgba(245, 158, 11, 0.1)", borderColor: "rgba(245, 158, 11, 0.2)" 
    },
    suspicious: { 
      icon: ShieldX, color: "#f97316", label: "Sospechoso", 
      gradient: "linear-gradient(135deg, #f97316, #ea580c)", 
      bgColor: "rgba(249, 115, 22, 0.1)", borderColor: "rgba(249, 115, 22, 0.2)" 
    },
    critical: { 
      icon: ShieldX, color: "#ef4444", label: "Crítico", 
      gradient: "linear-gradient(135deg, #ef4444, #dc2626)", 
      bgColor: "rgba(239, 68, 68, 0.1)", borderColor: "rgba(239, 68, 68, 0.2)" 
    }
  };
  return configs[level] || configs.clean;
};

export function SecurityHeader({ modData, onClose }: any) {
  const config = getSecurityConfig(modData.riskLevel);
  const Icon = config.icon;

  return (
    <div className="p-6 border-b border-[var(--color-border)]">
      <div className="flex items-start justify-between gap-4">
        {/* Bloque Izquierdo: Shield Icon & Título del Mod */}
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: config.gradient }}>
            <Icon className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold mb-1">Análisis de Seguridad</h2>
            <p className="text-sm font-medium" style={{ color: config.color }}>{modData.name}</p>
            <p className="text-xs mt-1 text-[var(--color-muted)]">{modData.fileName}</p>
          </div>
        </div>

        {/* Cierre de Modal */}
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-[var(--color-muted)] hover:scale-110 transition-transform">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Bloque Inferior: Puntuación de Riesgo / 100 */}
      <div className="mt-4 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="text-3xl font-bold" style={{ color: config.color }}>{modData.riskScore}</div>
          <div className="text-sm text-[var(--color-muted)]">
            <div>/100</div>
            <div className="font-medium" style={{ color: config.color }}>{config.label}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
