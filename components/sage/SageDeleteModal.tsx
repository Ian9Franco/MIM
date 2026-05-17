/**
 * @fileoverview SageDeleteModal – Custom aesthetic confirmation modal for SAGE crash report deletion.
 * Built with backdrop-blur, custom glassmorphic panels, and animated alerts.
 */

"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";


interface SageDeleteModalProps {
  file: { name: string; path: string } | null;
  onClose: () => void;
  onConfirm: () => void;
}

export const SageDeleteModal: React.FC<SageDeleteModalProps> = ({
  file,
  onClose,
  onConfirm
}) => {
  if (!file) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-sm rounded-2xl border border-rose-500/20 bg-[#16161a] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)] space-y-4 animate-scale-in">
        <div className="flex items-center gap-3 text-rose-400">
          <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/15">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
          </div>
          <h3 className="text-sm font-bold text-foreground">¿Eliminar reporte de crash?</h3>
        </div>
        
        <p className="text-[11px] text-foreground/60 leading-relaxed">
          Estás a punto de eliminar permanentemente el archivo:
          <span className="block mt-1 font-mono text-[9px] bg-white/3 p-1.5 rounded text-rose-300 border border-white/5 truncate">
            {file.name.replace(" (Instancia del Proyecto)", "").replace(" (Global .minecraft)", "")}
          </span>
          Esta acción es irreversible y ya no podrás diagnosticar este error en SAGE.
        </p>
        
        <div className="flex gap-2.5 pt-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-[10px] font-bold text-foreground/60 hover:text-foreground bg-white/2 hover:bg-white/5 border border-white/5 hover:border-white/10 rounded-xl transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 text-[10px] font-bold text-white bg-rose-500 hover:bg-rose-600 border border-rose-500/20 shadow-lg shadow-rose-500/10 active:scale-95 rounded-xl transition-all"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};
