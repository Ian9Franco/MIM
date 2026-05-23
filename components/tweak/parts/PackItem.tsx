/**
 * @fileoverview Fila de Paquete de Recursos (ResourcePack) con Drag & Drop.
 * Rediseñado para ser más compacto y menos "tosco".
 * 
 * ⚠️ UNRESTRICTED: All packs can be freely dragged and reordered.
 * No packs are disabled, filtered, or marked as non-moveable.
 * Warnings are informational only and do not prevent any actions.
 */

import { GripVertical, AlertTriangle, ArrowUp, ArrowDown } from "lucide-react";

export function PackItem({ pack, visualIndex, total, onMove, isDragged, isOver, onDragStart, onDragOver, onDrop, onDragEnd }: any) {
  const cleanName = pack.displayName;
  const isTop = visualIndex === 0;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all group cursor-grab active:cursor-grabbing ${
        isDragged 
          ? "opacity-20 scale-95 border-dashed" 
          : isOver 
          ? "border-primary bg-primary/5 translate-x-1" 
          : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10"
      }`}
    >
      {/* Handle minimal */}
      <GripVertical className="w-3 h-3 text-white/10 shrink-0 group-hover:text-white/40" />
      
      {/* Priority Indicator compact */}
      <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-black shrink-0 font-mono ${
        isTop ? "bg-primary text-white shadow-[0_0_10px_rgba(var(--color-primary-rgb),0.3)]" : "bg-black/40 text-muted/40 border border-white/5"
      }`}>
        {total - visualIndex}
      </div>

      {/* Pack Name refined */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-bold truncate uppercase tracking-tight ${isTop ? "text-primary" : "text-white/70"}`}>
            {cleanName}
          </span>
          {pack.warnings.length > 0 && (
            <AlertTriangle className="w-3 h-3 text-amber-500/50 shrink-0" />
          )}
        </div>
      </div>

      {/* Quick Actions minimal */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={(e) => { e.stopPropagation(); onMove(visualIndex, visualIndex - 1); }} 
          disabled={visualIndex === 0} 
          className="p-1 rounded hover:bg-white/10 disabled:opacity-0 transition-all"
        >
          <ArrowUp className="w-3 h-3" />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onMove(visualIndex, visualIndex + 1); }} 
          disabled={visualIndex === total - 1} 
          className="p-1 rounded hover:bg-white/10 disabled:opacity-0 transition-all"
        >
          <ArrowDown className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
