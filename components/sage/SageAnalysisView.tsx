"use client";

import React, { useState } from "react";
import { Copy, Check } from "lucide-react";
import { DiagnosisCard } from "./parts/DiagnosisCard";
import { SageActionableFixes } from "./parts/SageActionableFixes";
import { SageMimbotCopilot } from "./parts/SageMimbotCopilot";

/**
 * SageAnalysisView — Vista detallada de diagnóstico de errores (SAGE).
 * Presenta sospechosos, explicaciones semánticas, copiloto MIM-Bot y acciones rápidas de corrección.
 */
export function SageAnalysisView({ analysis, onAutoFix, rawText }: any) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showMimbot, setShowMimbot] = useState<boolean>(true);

  const severityStyle = analysis.severity === "critical" 
    ? { bg: "rgba(239, 68, 68, 0.08)", border: "rgba(239, 68, 68, 0.2)", text: "#f87171", badgeBg: "#ef4444", glow: "rgba(239, 68, 68, 0.15)" }
    : { bg: "rgba(245, 158, 11, 0.08)", border: "rgba(245, 158, 11, 0.2)", text: "#fbbf24", badgeBg: "#f59e0b", glow: "rgba(245, 158, 11, 0.15)" };

  return (
    <div className="space-y-6 animate-fade-up">
      <DiagnosisCard analysis={analysis} severityStyle={severityStyle} />

      {/* MIM-Bot Copilot Action Banner with Bouncing Slime Icon */}
      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/30 backdrop-blur-md shadow-lg shadow-purple-500/5">
        <div className="flex items-center gap-3">
          <img src="/icon.png" alt="MIM-Bot" className="w-5 h-5 object-contain animate-slime shrink-0" />
          <div>
            <p className="text-xs font-bold text-white flex items-center gap-1.5">
              Copiloto Inteligente MIM-Bot
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono">PRO</span>
            </p>
            <p className="text-[11px] text-white/50">Deducción de dependencias, descarte lógico y soluciones en 1-clic.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowMimbot(!showMimbot)}
          className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-purple-600/20 active:scale-95"
        >
          <img src="/icon.png" alt="" className="w-3.5 h-3.5 object-contain animate-slime shrink-0" />
          {showMimbot ? "Ocultar Copiloto" : "Consultar a MIM-Bot"}
        </button>
      </div>

      {showMimbot && (
        <SageMimbotCopilot
          analysis={analysis}
          rawText={rawText || analysis.technicalSummary || analysis.explanation || ""}
          onAutoFix={onAutoFix}
          onClose={() => setShowMimbot(false)}
        />
      )}

      {/* Sospechosos */}
      {analysis.suspectedMods.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[10px] font-bold uppercase tracking-widest opacity-30">Mods Sospechosos</h4>
          <div className="flex flex-wrap gap-2">
            {analysis.suspectedMods.map((id: string) => (
              <span key={id} className="px-3 py-1.5 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-300 font-mono text-xs font-bold">{id}</span>
            ))}
          </div>
        </div>
      )}

      <SageActionableFixes actionableFix={analysis.actionableFix} actionableFixes={analysis.actionableFixes} onAutoFix={onAutoFix} />

      <div className="space-y-2">
        <h4 className="text-[10px] font-bold uppercase tracking-widest opacity-30">Explicación</h4>
        <div className="p-4 rounded-2xl bg-white/2 border border-white/5 text-sm leading-relaxed opacity-80">{analysis.explanation}</div>
      </div>

      <div className="space-y-3">
        <h4 className="text-[10px] font-bold uppercase tracking-widest opacity-30">Soluciones Recomendadas</h4>
        <div className="space-y-2">
          {analysis.solutions.map((sol: string, i: number) => (
            <div key={i} className="group p-3 rounded-xl bg-black/20 border border-white/5 flex justify-between items-center gap-4 hover:bg-white/5 transition-all">
              <p className="text-xs font-medium leading-relaxed">{sol}</p>
              <button 
                onClick={() => { navigator.clipboard.writeText(sol); setCopiedIndex(i); setTimeout(() => setCopiedIndex(null), 2000); }}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-white/10 text-white/40"
              >
                {copiedIndex === i ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          ))}
        </div>
      </div>

      {analysis.technicalSummary && (
        <pre className="p-4 rounded-xl bg-black/40 border border-white/5 font-mono text-[10px] text-indigo-300/60 overflow-x-auto whitespace-pre-wrap">{analysis.technicalSummary}</pre>
      )}
    </div>
  );
}
