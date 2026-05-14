import React from "react";
import { X, Plus, Download, Library, Loader2, ChevronRight } from "lucide-react";
import { COLORS } from "@/theme/tokens";

// ── BulkActionsBar ──────────────────────────────────────────────────────────

export function BulkActionsBar({ count, onCancel, onAdd, onDownload }: { count: number, onCancel: () => void, onAdd: () => void, onDownload: () => void }) {
  return (
    <div className="mx-4 mb-4 p-3 rounded-2xl flex items-center justify-between animate-slide-up" style={{ background: COLORS.card, border: `1px solid ${COLORS.primary}`, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
      <div className="flex items-center gap-3 pl-2"><div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/20 text-primary font-bold">{count}</div><span className="text-sm font-bold text-white">Seleccionados</span></div>
      <div className="flex gap-2">
        <button onClick={onCancel} className="px-4 py-2 rounded-xl text-xs font-bold text-white/40 hover:bg-white/10">Cancelar</button>
        <button onClick={onAdd} className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold border border-white/10 hover:bg-white/5"><Plus className="w-3.5 h-3.5" />Añadir a...</button>
        <button onClick={onDownload} className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-primary text-white shadow-lg shadow-primary/20 hover:scale-105 transition-all"><Download className="w-3.5 h-3.5" />Descargar Todo</button>
      </div>
    </div>
  );
}

// ── BulkCollectionModal ─────────────────────────────────────────────────────

export function BulkCollectionModal({ 
  onClose, isCreating, setIsCreating, collections, loading, addingId, onAdd, onCreate, name, setName, target, setTarget, selectedCount 
}: any) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/65 backdrop-blur-xl animate-fade-in">
      <div className="w-full max-w-sm rounded-2xl border p-5 flex flex-col gap-4 shadow-2xl bg-[#121212] border-white/10">
        <div className="flex items-center justify-between">
          <div><h3 className="font-headline text-base font-bold text-white">{isCreating ? "Nueva Colección" : "Añadir a Colección"}</h3><p className="text-[11px] opacity-50 mt-0.5">{isCreating ? "Crea una colección para tus mods" : `Selecciona una colección para añadir ${selectedCount} ítems`}</p></div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10"><X className="w-4 h-4 text-white/40" /></button>
        </div>
        {isCreating ? (
          <div className="flex flex-col gap-3.5 py-1">
            <div className="flex p-1 bg-black/40 rounded-xl gap-1 border border-white/5">
              <button onClick={() => setTarget("modrinth")} className={`flex-1 py-1 rounded-lg text-[11px] font-bold ${target === "modrinth" ? "bg-primary text-white" : "opacity-45"}`}>Modrinth</button>
              <button onClick={() => setTarget("local")} className={`flex-1 py-1 rounded-lg text-[11px] font-bold ${target === "local" ? "bg-white/10 text-white" : "opacity-45"}`}>Local</button>
            </div>
            <input autoFocus type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Nombre..." className="w-full bg-black/30 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white" />
            <div className="flex gap-2 pt-1">
              <button onClick={() => setIsCreating(false)} className="flex-1 py-2 rounded-xl text-xs font-bold border border-white/10 text-white/40">Volver</button>
              <button onClick={onCreate} disabled={!name.trim() || loading} className="flex-2 py-2 rounded-xl text-xs font-bold bg-primary text-white flex items-center justify-center gap-1.5">{loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Crear y Añadir"}</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 max-h-72 overflow-y-auto custom-scrollbar">
            <button onClick={() => { setIsCreating(true); setName(""); }} className="w-full p-3 rounded-xl border-2 border-dashed border-white/10 hover:border-primary/40 text-primary flex items-center justify-center gap-2"><Plus className="w-3.5 h-3.5" /><span className="font-bold text-xs">Nueva Colección</span></button>
            {loading ? <div className="py-10 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div> : collections.map((c: any) => (
              <button key={c.id} onClick={() => onAdd(c)} disabled={addingId != null} className="flex items-center gap-3 p-2 rounded-xl bg-white/3 border border-white/5 hover:border-primary/20 transition-all text-left group">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden">{c.iconUrl ? <img src={c.iconUrl} className="w-full h-full object-cover" /> : <Library className="w-3.5 h-3.5 text-primary/80" />}</div>
                <div className="flex-1 min-w-0"><p className="font-bold text-xs text-white truncate">{c.name}</p><p className="text-[10px] text-white/40">{c.projectCount} proyectos</p></div>
                <div className="shrink-0">{addingId === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /> : <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100" />}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
