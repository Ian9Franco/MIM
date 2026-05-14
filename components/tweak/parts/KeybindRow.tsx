import { useState } from "react";
import { Save, X, AlertTriangle, Ghost } from "lucide-react";

/**
 * @fileoverview Fila de Edición y Asignación de Atajos de Teclado (Keybinds).
 * ─────────────────────────────────────────────────────────────────────────────
 * Muestra el nombre de un atajo y su combinación asignada. Admite un modo de
 * edición in-place para reasignar la tecla. Destaca visualmente colisiones
 * (conflictos) y atajos "huérfanos" (mods eliminados que dejaron rastros en options.txt).
 * ─────────────────────────────────────────────────────────────────────────────
 */

export function KeybindRow({ keybind, editing, onEdit, onSave, onCancel, formatKeyDisplay, isOrphaned }: any) {
  const [tempKey, setTempKey] = useState(keybind.key);

  // MODO EDICIÓN: Input de captura
  if (editing) {
    return (
      <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-primary/20">
        <span className="flex-1 text-sm font-medium">{keybind.name}</span>
        <input
          type="text"
          value={tempKey}
          onChange={(e) => setTempKey(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-white/10 border border-[var(--color-border)] text-sm font-mono w-40 focus:ring-2 focus:ring-primary focus:outline-none"
          autoFocus
        />
        <button 
          onClick={() => onSave(tempKey)} 
          className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:scale-105 transition-transform"
        >
          <Save className="w-4 h-4" />
        </button>
        <button 
          onClick={onCancel} 
          className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 hover:scale-105 transition-transform"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // MODO VISUALIZACIÓN
  return (
    <div 
      onClick={onEdit} 
      className={`flex items-center justify-between p-3 rounded-xl border transition-all hover:bg-white/5 cursor-pointer group ${
        isOrphaned ? "text-amber-400/70 border-amber-500/20 bg-amber-500/5" : "bg-white/5 border-[var(--color-border)]"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-sm font-medium truncate">{keybind.name}</span>
        
        {/* Indicador de Colisión (Tecla asignada a múltiples acciones) */}
        {keybind.conflicts?.length > 0 && (
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 animate-pulse" />
        )}
        
        {/* Indicador de Orfandad (El mod que originó el keybind ya no existe) */}
        {isOrphaned && <Ghost className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
      </div>
      
      {/* Botón visual de la tecla (Estilo Keycap) */}
      <span 
        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-transform group-hover:scale-105 ${
          keybind.conflicts?.length > 0 
            ? "bg-rose-500/20 text-rose-400 border-rose-500/30 ring-1 ring-rose-500/20 shadow-lg" 
            : "bg-white/10 text-foreground border-white/20 shadow"
        }`}
      >
        {formatKeyDisplay(keybind.key)}
      </span>
    </div>
  );
}
