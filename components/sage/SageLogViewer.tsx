import React from "react";
import { Trash2, RefreshCw, Loader2, FileText, FileWarning } from "lucide-react";
import { SageAnalysisView } from "./SageAnalysisView";
import { SageEmptyState } from "./SageComponents";

export function SageLogViewer({ 
  mode, localFiles, loadingFiles, readingFile, analysis, selectedFile, onSelect, onDelete, onAutoFix 
}: any) {
  const filteredFiles = localFiles.filter((f: any) => mode === "crash" ? f.type === "crash" : f.type === "log");
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* File Selector */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white/30">Archivos Detectados ({filteredFiles.length})</h3>
          {loadingFiles && <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />}
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
          {filteredFiles.map((file: any) => (
            <div
              key={file.path}
              onClick={() => onSelect(file)}
              className={`shrink-0 flex items-center gap-3 px-5 py-3 rounded-xl border transition-all relative group cursor-pointer ${
                selectedFile?.path === file.path 
                  ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-300 shadow-lg shadow-indigo-500/10" 
                  : "bg-white/2 border-white/5 text-foreground/40 hover:bg-white/5 hover:text-foreground/60"
              }`}
            >
              {file.type === "crash" ? <FileWarning className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
              <div className="text-left">
                <p className="text-[13px] font-bold leading-tight">{file.name}</p>
                <p className="text-[11px] opacity-40 mt-1 uppercase tracking-tight">{file.date || "Desconocido"}</p>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(file); }}
                className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded-md transition-all ml-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {filteredFiles.length === 0 && !loadingFiles && (
            <div className="text-xs text-white/20 italic py-4">No se encontraron archivos de este tipo.</div>
          )}
        </div>
      </div>

      {/* Analysis Result */}
      <div className="min-h-[340px] relative">
        {readingFile ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white/[0.02] rounded-2xl border border-dashed border-white/10">
            <RefreshCw className="w-10 h-10 animate-spin text-indigo-400/30" />
            <p className="text-sm text-white/30 font-bold uppercase tracking-widest">Analizando reporte...</p>
          </div>
        ) : analysis ? (
          <SageAnalysisView analysis={analysis} onAutoFix={onAutoFix} />
        ) : (
          <SageEmptyState 
            icon={mode === "crash" ? <FileWarning className="w-16 h-16" /> : <FileText className="w-16 h-16" />}
            title={mode === "crash" ? "Sin reporte de crash" : "Sin análisis de log"}
            sub="Selecciona un archivo arriba para iniciar el diagnóstico inteligente."
          />
        )}
      </div>
    </div>
  );
}
