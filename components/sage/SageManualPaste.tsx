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
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-foreground/40 flex items-center gap-2">
            <Edit3 className="w-3.5 h-3.5" /> Pegar Reporte Manual
          </h3>
          <button 
            disabled={!text || analyzing}
            onClick={() => onAnalyze(text)}
            className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-30 text-white text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2"
          >
            {analyzing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
            Analizar Reporte
          </button>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Pega aquí el contenido de tu crash-report o log de Minecraft..."
          className="w-full h-48 p-4 rounded-2xl bg-black/30 border border-white/10 text-xs font-mono custom-scrollbar focus:border-indigo-500/50 transition-colors outline-none resize-none"
        />
      </div>

      <div className="min-h-[300px] relative">
        {analyzing ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/5 rounded-2xl border border-dashed border-white/5">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-400/40" />
            <p className="text-xs text-foreground/30 font-bold uppercase tracking-widest">SAGE procesando heurísticas...</p>
          </div>
        ) : analysis ? (
          <SageAnalysisView analysis={analysis} onAutoFix={onAutoFix} />
        ) : (
          <SageEmptyState 
            icon={<Edit3 className="w-12 h-12" />}
            title="Sin resultados de análisis"
            sub="Pega un reporte arriba para que SAGE intente encontrar la causa raíz."
          />
        )}
      </div>
    </div>
  );
}
