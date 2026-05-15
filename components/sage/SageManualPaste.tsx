import React, { useState } from "react";
import { Edit3, Activity, RefreshCw } from "lucide-react";
import { SageAnalysisView } from "./SageAnalysisView";
import { SageEmptyState } from "./SageComponents";

export function SageManualPaste({ analyzing, analysis, onAnalyze, onAutoFix }: any) {
  const [text, setText] = useState("");

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white/30 flex items-center gap-2">
            <Edit3 className="w-4 h-4" /> Pegar Reporte Manual
          </h3>
          <button 
            disabled={!text || analyzing}
            onClick={() => onAnalyze(text)}
            className="px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-30 text-white text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95"
          >
            {analyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
            Analizar Reporte
          </button>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Pega aquí el contenido de tu crash-report o log de Minecraft..."
          className="w-full h-48 p-4 rounded-2xl bg-black/30 border border-white/10 text-[13px] font-mono custom-scrollbar focus:border-indigo-500/50 transition-colors outline-none resize-none text-white/80"
        />
      </div>

      <div className="min-h-[340px] relative">
        {analyzing ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white/[0.02] rounded-2xl border border-dashed border-white/10">
            <RefreshCw className="w-10 h-10 animate-spin text-indigo-400/30" />
            <p className="text-sm text-white/30 font-bold uppercase tracking-widest">SAGE procesando heurísticas...</p>
          </div>
        ) : analysis ? (
          <SageAnalysisView analysis={analysis} onAutoFix={onAutoFix} />
        ) : (
          <SageEmptyState 
            icon={<Edit3 className="w-16 h-16" />}
            title="Sin resultados de análisis"
            sub="Pega un reporte arriba para que SAGE intente encontrar la causa raíz."
          />
        )}
      </div>
    </div>
  );
}
