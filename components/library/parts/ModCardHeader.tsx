import React from "react";
import { Folder, AlertTriangle, Trash2, Loader2 } from "lucide-react";
import { COLORS } from "@/theme/tokens";

/**
 * @fileoverview Encabezado Visual de la Tarjeta de Mod.
 * ─────────────────────────────────────────────────────────────────────────────
 * Renderiza el icono representativo del mod (o un placeholder), el título
 * formateado y un botón contextual de eliminación si el archivo se encuentra
 * en un estado pendiente o no clasificado.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export function ModCardHeader({ name, author, isError, iconBase64, isSelected, isPending, onDelete, isDeleting }: any) {
  return (
    <div className="flex items-center w-full gap-3.5" style={{ height: "40px" }}>
      {/* Contenedor del Icono (Pixelated para pixel-art de MC) */}
      <div
        className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden"
        style={{
          background: isError ? "rgba(239,68,68,0.1)" : isSelected ? "var(--color-accent-bg)" : "var(--color-secondary-bg)",
          border: `1px solid ${isError ? "rgba(239,68,68,0.25)" : isSelected ? "var(--color-accent-border)" : "var(--color-border)"}`,
        }}
      >
        {isError ? (
          <AlertTriangle className="w-5 h-5 text-red-400" />
        ) : iconBase64 ? (
          <img src={iconBase64} alt="" className="w-full h-full object-cover" style={{ imageRendering: "pixelated" }} />
        ) : (
          <Folder className="w-5 h-5" style={{ color: isSelected ? COLORS.accent : COLORS.primary }} />
        )}
      </div>

      {/* Titular y Autor */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <p className="font-subhead text-sm truncate" style={{ color: isError ? "#fca5a5" : COLORS.foreground }}>
            {name}
          </p>
          {author && author !== "unknown" && (
            <span className="font-caption text-[10px] opacity-40 truncate">by {author}</span>
          )}
        </div>
      </div>

      {/* Botón de Eliminación Rápida (Solo visible en PendingFilesSection) */}
      {isPending && onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          disabled={isDeleting}
          className="flex items-center justify-center w-7 h-7 rounded-lg transition-all hover:scale-110 ml-auto"
          style={{ 
            background: isDeleting ? "rgba(255,255,255,0.04)" : "rgba(239,68,68,0.12)", 
            border: `1px solid ${isDeleting ? "rgba(255,255,255,0.08)" : "rgba(239,68,68,0.25)"}`, 
            color: isDeleting ? "rgba(255,255,255,0.25)" : "#ef4444" 
          }}
        >
          {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
        </button>
      )}
    </div>
  );
}
