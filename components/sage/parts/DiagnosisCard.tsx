import React from "react";
import { AlertOctagon, AlertTriangle, CheckSquare, Cpu } from "lucide-react";

/**
 * @fileoverview Tarjeta de Resumen Diagnóstico (SAGE Intelligence).
 * ─────────────────────────────────────────────────────────────────────────────
 * Muestra el nivel de gravedad del incidente (Critical, Warning, Info), 
 * el titular analizado, los metadatos de entorno y una barra de progreso
 * con el nivel de confianza heurística del motor de diagnóstico.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export function DiagnosisCard({ analysis, severityStyle }: any) {
  return (
    <div 
      className="p-5 rounded-2xl border relative overflow-hidden" 
      style={{ 
        background: severityStyle.bg, 
        borderColor: severityStyle.border, 
        boxShadow: `0 10px 30px ${severityStyle.glow}` 
      }}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Cabecera: Icono de Severidad y Titular */}
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0" 
            style={{ background: severityStyle.badgeBg }}
          >
            {analysis.severity === "critical" ? (
              <AlertOctagon className="w-5 h-5 animate-pulse" />
            ) : analysis.severity === "warning" ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <CheckSquare className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="px-2 py-0.5 rounded text-[8px] font-mono font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                SAGE ENGINE
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest bg-white/90 text-black">
                {analysis.category}
              </span>
            </div>
            <h3 className="text-base font-bold mt-1.5" style={{ color: severityStyle.text }}>
              {analysis.title}
            </h3>
          </div>
        </div>

        {/* Badge superior derecho de severidad */}
        <span 
          className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border" 
          style={{ background: "rgba(255,255,255,0.05)", color: severityStyle.text, borderColor: severityStyle.border }}
        >
          {analysis.severity}
        </span>
      </div>

      <div className="mt-4 pt-4 border-t border-white/5 flex flex-col gap-4">
        {/* Fila de Metadatos: Versión de Minecraft y Loader detectado */}
        {(analysis.gameVersion || analysis.loader) && (
          <div className="flex gap-4 text-[10px] opacity-50 font-mono">
            {analysis.gameVersion && <span className="bg-white/5 px-2 py-0.5 rounded-md">Minecraft {analysis.gameVersion}</span>}
            {analysis.loader && <span className="bg-white/5 px-2 py-0.5 rounded-md">Loader: {analysis.loader}</span>}
          </div>
        )}

        {/* Medidor de Confianza (Confidence Meter) */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest opacity-40">
            <span className="flex items-center gap-1.5"><Cpu className="w-3 h-3 text-indigo-400" /> Confianza Heurística</span>
            <span>{analysis.confidence}%</span>
          </div>
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all duration-1000" 
              style={{ width: `${analysis.confidence}%` }} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
