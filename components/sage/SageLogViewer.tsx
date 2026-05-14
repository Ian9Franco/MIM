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
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-foreground/40"> Archivos Detectados ({filteredFiles.length})</h3>
          {loadingFiles && <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />}
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
          {filteredFiles.map((file: any) => (
            <button
              key={file.path}
              onClick={() => onSelect(file)}
              className={`shrink-0 flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all relative group ${
                selectedFile?.path === file.path 
                  ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-300" 
                  : "bg-white/2 border-white/5 text-foreground/40 hover:bg-white/5 hover:text-foreground/60"
              }`}
            >
              {file.type === "crash" ? <FileWarning className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
              <div className="text-left">
                <p className="text-[11px] font-bold leading-none">{file.name}</p>
                <p className="text-[9px] opacity-40 mt-1 uppercase tracking-tighter">{file.date || "Desconocido"}</p>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(file); }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 hover:text-red-400 rounded-md transition-all"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </button>
          ))}
          {filteredFiles.length === 0 && !loadingFiles && (
            <div className="text-[10px] text-foreground/30 italic py-2">No se encontraron archivos de este tipo.</div>
          )}
        </div>
      </div>

      {/* Analysis Result */}
      <div className="min-h-[300px] relative">
        {readingFile ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/5 rounded-2xl border border-dashed border-white/5">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-400/40" />
            <p className="text-xs text-foreground/30 font-bold uppercase tracking-widest">Analizando reporte...</p>
          </div>
        ) : analysis ? (
          <SageAnalysisView analysis={analysis} onAutoFix={onAutoFix} />
        ) : (
          <SageEmptyState 
            icon={mode === "crash" ? <FileWarning className="w-12 h-12" /> : <FileText className="w-12 h-12" />}
            title={mode === "crash" ? "No hay reporte de crash seleccionado" : "No se ha analizado el log"}
            sub="Selecciona un archivo arriba para iniciar el diagnóstico inteligente."
          />
        )}
      </div>
    </div>
  );
}
