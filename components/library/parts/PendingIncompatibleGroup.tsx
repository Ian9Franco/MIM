import React, { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { ModCard } from "../ModCard";

/**
 * @fileoverview Panel Colapsable de Archivos Incompatibles (Quarentena).
 * ─────────────────────────────────────────────────────────────────────────────
 * Actúa como una zona de retención temporal para mods descargados que no
 * coinciden con el Mod Loader o la versión de Minecraft del proyecto activo.
 * Previene la instalación accidental de archivos incompatibles manteniendo
 * la interfaz principal despejada.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export function PendingIncompatibleGroup({ 
  files, activeProject, modrinthStatus, conflicts, 
  onDeleteRequest, deletingFiles, onSelect 
}: any) {
  const [isOpen, setIsOpen] = useState(false);
  
  if (files.length === 0) return null;

  return (
    <div className="mt-4 pt-3 border-t border-dashed border-white/10">
      {/* Botón de Quarentena (Header Colapsable) */}
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="flex items-center justify-between w-full px-3 py-2 rounded-xl bg-white/5 border border-white/5 text-xs font-bold transition-all hover:bg-white/10"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
          <span>Incompatibles / Otros proyectos</span>
          <span className="px-1.5 py-0.5 rounded-full bg-white/10 text-[9px]">
            {files.length}
          </span>
        </div>
        {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {/* Lista de Mods Incompatibles (Oculta por defecto) */}
      {isOpen && (
        <div className="mt-2.5 space-y-2.5 animate-fade-down">
          {files.map((f: any, i: number) => (
            <div key={f.path} className="opacity-70 hover:opacity-100 transition-opacity">
              <ModCard
                index={i} 
                name={f.meta?.modName || f.fileName} 
                version={f.meta?.gameVersion || "unknown"}
                iconBase64={f.meta?.iconBase64 || modrinthStatus[f.path]?.iconUrl}
                loader={f.meta?.loader || "unknown"} 
                isSelected={false}
                onClick={() => onSelect(f)} 
                activeVersion={activeProject?.version} 
                activeLoader={activeProject?.loader}
                isPending={true} 
                onDelete={() => onDeleteRequest(f)} 
                isDeleting={deletingFiles[f.path]}
                conflict={conflicts[f.path]}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
