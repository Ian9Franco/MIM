import { GripVertical, AlertTriangle, ArrowUp, ArrowDown } from "lucide-react";

/**
 * @fileoverview Fila de Paquete de Recursos (ResourcePack) con Drag & Drop.
 * ─────────────────────────────────────────────────────────────────────────────
 * Permite reordenar la prioridad de carga de texturas en Minecraft.
 * El índice visual refleja la prioridad en el juego (los índices más altos
 * sobreescriben a los inferiores).
 * Admite reordenación tanto por arrastre (Drag & Drop nativo HTML5) como por
 * flechas de acción directa.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export function PackItem({ pack, visualIndex, total, onMove, isDragged, isOver, onDragStart, onDragOver, onDrop, onDragEnd }: any) {
  const cleanName = pack.displayName;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`flex items-center gap-3 p-3 rounded-xl border transition-all group cursor-grab active:cursor-grabbing ${
        isDragged ? "opacity-40 scale-95 shadow-none" : isOver ? "border-primary bg-primary/10 shadow-lg scale-[1.01]" : "bg-white/5 border-[var(--color-border)] hover:bg-white/10"
      }`}
    >
      {/* Icono de Agarre (Handle) */}
      <GripVertical className="w-4 h-4 text-[var(--color-muted)] shrink-0 transition-colors group-hover:text-foreground" />
      
      {/* Nivel de Prioridad de Carga (Calculado Inverso) */}
      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold bg-white/10 border border-white/5 shrink-0 shadow-inner font-mono">
        {total - visualIndex}
      </div>

      {/* Nombre del Paquete */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{cleanName}</span>
          {pack.warnings.length > 0 && (
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
          )}
        </div>
      </div>

      {/* Acciones Rápidas de Subir / Bajar (Ocultas por defecto) */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={() => onMove(visualIndex, visualIndex - 1)} 
          disabled={visualIndex === 0} 
          className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-20 transition-all hover:scale-110"
        >
          <ArrowUp className="w-3.5 h-3.5 text-foreground/80" />
        </button>
        <button 
          onClick={() => onMove(visualIndex, visualIndex + 1)} 
          disabled={visualIndex === total - 1} 
          className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-20 transition-all hover:scale-110"
        >
          <ArrowDown className="w-3.5 h-3.5 text-foreground/80" />
        </button>
      </div>
    </div>
  );
}
