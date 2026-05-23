"use client";

import React, { useState } from "react";
import { Trash2 } from "lucide-react";
import {
  deleteCommunityContent,
  type CommunityContentType,
} from "@/components/fomo/community/communityActions";

interface CommunityDeleteButtonProps {
  type: CommunityContentType;
  id: string;
  onDeleted?: (id: string) => void;
  className?: string;
}

export function CommunityDeleteButton({
  type,
  id,
  onDeleted,
  className = "",
}: CommunityDeleteButtonProps) {
  const [busy, setBusy] = useState(false);

  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    const { ok } = await deleteCommunityContent(type, id);
    if (ok) onDeleted?.(id);
    setBusy(false);
    setShowConfirm(false);
  };

  const label =
    type === "favorite"
      ? "este compartido"
      : type === "video"
        ? "este showcase"
        : "este modpack";

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setShowConfirm(true); }}
        disabled={busy}
        className={`p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all cursor-pointer disabled:opacity-50 ${className}`}
        title="Eliminar de MIM Cloud"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>

      {showConfirm && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={(e) => { e.stopPropagation(); setShowConfirm(false); }}
        >
          <div 
            className="bg-[#0f0f13] border border-white/10 rounded-2xl p-6 max-w-xs w-full mx-4 shadow-2xl flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center shrink-0 border border-red-500/20">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="font-headline font-bold text-white text-base">Eliminar de MIM Cloud</h3>
            </div>
            
            <p className="text-xs text-white/60 leading-relaxed">
              ¿Estás seguro de que querés eliminar {label}? Esta acción no se puede deshacer y desaparecerá de la comunidad.
            </p>
            
            <div className="flex items-center justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowConfirm(false); }}
                disabled={busy}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white/60 hover:bg-white/10 hover:text-white transition-all cursor-pointer bg-transparent border-none"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={busy}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-500 hover:bg-red-600 text-white transition-all cursor-pointer disabled:opacity-50 border-none shadow-lg shadow-red-500/20"
              >
                {busy ? "Eliminando..." : "Sí, Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
