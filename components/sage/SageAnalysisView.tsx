/**
 * @fileoverview SageAnalysisView – Heuristic diagnosis report view for SAGE.
 * Renders suspects, explanations, confidence gauge, actionable fixes,
 * copyable recommended solutions, and technical stack traces.
 */

"use client";

import React, { useState } from "react";
import { 
  AlertTriangle, Cpu, ArrowRight, Check, Copy, AlertOctagon, CheckSquare 
} from "lucide-react";
import type { SageAnalysisResult } from "@/utils/sageAnalyzer";

interface SageAnalysisViewProps {
  analysis: SageAnalysisResult;
  onAutoFix: (fix: any) => void;
}

const getSeverityStyle = (severity: string) => {
  switch (severity) {
    case "critical":
      return {
        bg: "rgba(239, 68, 68, 0.08)",
        border: "rgba(239, 68, 68, 0.2)",
        text: "#f87171",
        badgeBg: "#ef4444",
        badgeText: "#ffffff",
        glow: "rgba(239, 68, 68, 0.15)",
      };
    case "warning":
      return {
        bg: "rgba(245, 158, 11, 0.08)",
        border: "rgba(245, 158, 11, 0.2)",
        text: "#fbbf24",
        badgeBg: "#f59e0b",
        badgeText: "#1e1b4b",
        glow: "rgba(245, 158, 11, 0.15)",
      };
    default:
      return {
        bg: "rgba(59, 130, 246, 0.08)",
        border: "rgba(59, 130, 246, 0.2)",
        text: "#60a5fa",
        badgeBg: "#3b82f6",
        badgeText: "#ffffff",
        glow: "rgba(59, 130, 246, 0.15)",
      };
  }
};

export const SageAnalysisView: React.FC<SageAnalysisViewProps> = ({ 
  analysis, 
  onAutoFix 
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopySolution = (solution: string, index: number) => {
    navigator.clipboard.writeText(solution);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const severityStyle = getSeverityStyle(analysis.severity);

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Diagnosis Card */}
      <div 
        className="p-5 rounded-2xl border relative overflow-hidden"
        style={{
          background: severityStyle.bg,
          borderColor: severityStyle.border,
          boxShadow: `0 10px 30px ${severityStyle.glow}`,
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
              style={{ background: severityStyle.badgeBg }}
            >
              {analysis.severity === "critical" ? (
                <AlertOctagon className="w-5 h-5" />
              ) : analysis.severity === "warning" ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <CheckSquare className="w-5 h-5" />
              )}
            </div>
            <div>
              <span 
                className="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest text-indigo-900"
                style={{ background: "rgba(255,255,255,0.9)", color: "var(--color-card)" }}
              >
                {analysis.category}
              </span>
              <h3 className="text-base font-headline font-bold mt-1.5" style={{ color: severityStyle.text }}>
                {analysis.title}
              </h3>
            </div>
          </div>

          <span 
            className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg"
            style={{
              background: `color-mix(in srgb, ${severityStyle.badgeBg} 15%, transparent)`,
              color: severityStyle.text,
              border: `1px solid ${severityStyle.border}`,
            }}
          >
            {analysis.severity}
          </span>
        </div>

        {/* Metadata summary (minecraft and loader) */}
        {(analysis.gameVersion || analysis.loader) && (
          <div className="mt-4 pt-4 border-t border-white/5 flex gap-4 text-[10px] text-foreground/50">
            {analysis.gameVersion && (
              <span className="bg-white/5 px-2 py-0.5 rounded-md border border-white/5 font-mono">
                Minecraft {analysis.gameVersion}
              </span>
            )}
            {analysis.loader && (
              <span className="bg-white/5 px-2 py-0.5 rounded-md border border-white/5 font-mono">
                Loader: {analysis.loader}
              </span>
            )}
          </div>
        )}

        {/* Confidence Meter */}
        <div className="mt-4 pt-4 border-t border-white/5 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-foreground/40 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              Confianza Heurística
            </span>
            <span className="font-mono font-bold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
              {analysis.confidence}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all duration-1000"
              style={{ width: `${analysis.confidence}%` }}
            />
          </div>
        </div>

        {/* Hybrid Stability Risk Indicator (Connector Compatibility Engine) */}
        {analysis.isHybrid && (
          <div className="mt-4 pt-4 border-t border-white/5 flex flex-col gap-2">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-cyan-400/80 font-bold uppercase tracking-wider flex items-center gap-1.5">
                🔌 Riesgo de Inestabilidad Híbrida
              </span>
              <span className={`font-mono font-black text-[9px] uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                analysis.hybridStabilityRisk === "VERY_HIGH" ? "bg-red-500/10 border-red-500/30 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.2)]" :
                analysis.hybridStabilityRisk === "HIGH" ? "bg-orange-500/10 border-orange-500/30 text-orange-400 shadow-[0_0_12px_rgba(249,115,22,0.2)]" :
                analysis.hybridStabilityRisk === "MEDIUM" ? "bg-amber-500/10 border-amber-500/30 text-amber-400" :
                "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              }`}>
                {analysis.hybridStabilityRisk === "VERY_HIGH" ? "MUY ALTO" :
                 analysis.hybridStabilityRisk === "HIGH" ? "ALTO" :
                 analysis.hybridStabilityRisk === "MEDIUM" ? "MEDIO" : "BAJO"} ({analysis.hybridRiskScore}%)
              </span>
            </div>
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${
                  analysis.hybridStabilityRisk === "VERY_HIGH" ? "bg-gradient-to-r from-red-600 to-red-400" :
                  analysis.hybridStabilityRisk === "HIGH" ? "bg-gradient-to-r from-orange-500 to-orange-400" :
                  analysis.hybridStabilityRisk === "MEDIUM" ? "bg-gradient-to-r from-amber-500 to-amber-400" :
                  "bg-gradient-to-r from-emerald-500 to-emerald-400"
                }`}
                style={{ width: `${analysis.hybridRiskScore}%` }}
              />
            </div>
            {analysis.detectedFabricModulesCount !== undefined && analysis.detectedFabricModulesCount > 0 && (
              <p className="text-[9px] text-foreground/45 mt-1 leading-normal">
                Detectamos <strong className="text-cyan-300 font-bold">{analysis.detectedFabricModulesCount} módulos/APIs de Fabric</strong> inyectados en este perfil de Forge.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Suspected Mods */}
      {analysis.suspectedMods.length > 0 && (
        <div className="space-y-2.5">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">Mods Bajo Sospecha</h4>
          <div className="flex flex-wrap gap-2">
            {analysis.suspectedMods.map((modId) => (
              <span 
                key={modId}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-mono text-xs font-bold bg-rose-500/5 border-rose-500/20 text-rose-300"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_#ef4444]" />
                {modId}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actionable Fixes List (Auto-Fix Multiple Suggestions) */}
      {analysis.actionableFixes && analysis.actionableFixes.length > 1 ? (
        <div className="p-4.5 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 space-y-4.5 shadow-[0_0_15px_rgba(99,102,241,0.05)]">
          <div className="flex items-center gap-2">
            <Cpu className="w-4.5 h-4.5 text-indigo-400 animate-pulse" />
            <span className="text-xs font-bold text-indigo-200 uppercase tracking-wider">Acciones Rápidas Múltiples SAGE ({analysis.actionableFixes.length})</span>
          </div>
          <p className="text-xs text-foreground/70 leading-relaxed">
            SAGE detectó que faltan <strong className="text-indigo-300 font-semibold">{analysis.actionableFixes.length} dependencias</strong> en tu juego. Haz clic en cada botón para buscar e instalarlas de forma consecutiva en el panel FOMO:
          </p>
          <div className="flex flex-col gap-2.5">
            {analysis.actionableFixes.map((fix, idx) => (
              <div 
                key={idx} 
                className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-white/10 transition-colors"
              >
                <div className="space-y-0.5">
                  <span className="text-[11px] font-mono font-bold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                    {fix.dependencyId}
                  </span>
                  <div className="text-[10px] text-foreground/40 leading-none mt-1">
                    Requerido por: <strong className="text-foreground/60">{fix.modId}</strong> ({fix.requiredVersion})
                  </div>
                </div>
                <button
                  onClick={() => onAutoFix(fix)}
                  className="px-3.5 py-2 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 text-white font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm hover:scale-[1.02] shrink-0"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  Buscar en FOMO
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        analysis.actionableFix && (
          <div className="p-4.5 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 space-y-3 shadow-[0_0_15px_rgba(99,102,241,0.05)]">
            <div className="flex items-center gap-2">
              <Cpu className="w-4.5 h-4.5 text-indigo-400" />
              <span className="text-xs font-bold text-indigo-200">Acción Rápida Inteligente SAGE</span>
            </div>
            <p className="text-xs text-foreground/70 leading-relaxed">
              SAGE detectó que puedes solucionar este error {analysis.actionableFix.type === "duplicate_mod" ? "resolviendo el conflicto" : "instalando la dependencia"} <strong className="text-indigo-300 font-semibold">{analysis.actionableFix.dependencyId || analysis.actionableFix.modId}</strong>. Haz clic abajo para buscarlo con un solo clic.
            </p>
            <button
              onClick={() => onAutoFix(analysis.actionableFix!)}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/25 hover:shadow-indigo-600/45 hover:scale-[1.01]"
            >
              <ArrowRight className="w-4 h-4 animate-pulse" />
              {analysis.actionableFix.suggestionLabel}
            </button>
          </div>
        )
      )}

      {/* Detailed Spanish Translation Explanation */}
      <div className="space-y-2.5">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">Explicación en Español</h4>
        <div 
          className="p-4.5 rounded-2xl border leading-relaxed text-sm"
          style={{
            background: "rgba(255,255,255,0.01)",
            borderColor: "var(--color-border)",
            color: "color-mix(in srgb, var(--color-foreground) 85%, transparent)",
          }}
        >
          {analysis.explanation}
        </div>
      </div>

      {/* Recommended Solutions List */}
      <div className="space-y-3">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">Soluciones Recomendadas</h4>
        <div className="space-y-2">
          {analysis.solutions.map((sol, idx) => (
            <div 
              key={idx}
              className="p-3.5 rounded-xl border flex gap-3 items-start hover:bg-white/2 transition-colors relative group"
              style={{ background: "rgba(0,0,0,0.15)", borderColor: "var(--color-border)" }}
            >
              <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold font-mono text-xs flex items-center justify-center shrink-0">
                {idx + 1}
              </div>
              <p className="text-xs font-medium leading-relaxed flex-1 pt-0.5 text-foreground">
                {sol}
              </p>
              <button
                onClick={() => handleCopySolution(sol, idx)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-white/5 text-foreground/40 hover:text-foreground/80"
                title="Copiar solución"
              >
                {copiedIndex === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Technical Information collapsible card */}
      {analysis.technicalSummary && (
        <div className="space-y-2.5">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">Detalles Técnicos (Java)</h4>
          <pre 
            className="p-4 rounded-xl border font-mono text-[11px] overflow-x-auto custom-scrollbar leading-relaxed"
            style={{
              background: "rgba(0,0,0,0.35)",
              borderColor: "var(--color-border)",
              color: "#a5b4fc",
            }}
          >
            {analysis.exceptionType}: {analysis.technicalSummary}
          </pre>
        </div>
      )}
    </div>
  );
};
