import React from "react";
import { X, Plus, Download, Library, Loader2, ChevronRight } from "lucide-react";
import { COLORS } from "@/theme/tokens";

// ── BulkActionsBar ──────────────────────────────────────────────────────────

export function BulkActionsBar({ mods, onCancel, onAdd, onDownload }: { mods: any[], onCancel: () => void, onAdd: () => void, onDownload: () => void }) {
  const displayMods = mods.slice(0, 5);
  const remaining = mods.length - 5;

  return (
    <div className="mx-4 mb-4 p-3 rounded-2xl flex items-center justify-between animate-slide-up" style={{ background: "rgba(22, 22, 26, 0.95)", border: "1px solid color-mix(in srgb, var(--color-primary) 30%, transparent)", boxShadow: "0 12px 40px rgba(0,0,0,0.5)", backdropFilter: "blur(20px)" }}>
      <div className="flex items-center gap-4 pl-2">
        <div className="flex -space-x-3 overflow-hidden">
          {displayMods.map((mod, i) => (
            <div key={mod.projectId} className="w-9 h-9 rounded-xl border-2 border-[#16161a] bg-white/5 flex items-center justify-center overflow-hidden transition-transform hover:-translate-y-1 hover:scale-110" style={{ zIndex: displayMods.length - i }}>
              {mod.iconUrl ? (
                <img src={mod.iconUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">MOD</div>
              )}
            </div>
          ))}
          {remaining > 0 && (
            <div className="w-9 h-9 rounded-xl border-2 border-[#16161a] bg-white/10 flex items-center justify-center text-[11px] font-bold text-white z-0 backdrop-blur-md">
              +{remaining}
            </div>
          )}
        </div>
        <div>
          <span className="text-sm font-bold text-white block leading-none">{mods.length}</span>
          <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold mt-1 block">Seleccionados</span>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={onCancel} className="px-4 py-2 rounded-xl text-xs font-bold text-white/40 hover:bg-white/10 transition-colors">Cancelar</button>
        <button onClick={onAdd} className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold border border-white/10 hover:bg-white/5 transition-all"><Plus className="w-3.5 h-3.5" />Añadir a...</button>
        <button onClick={onDownload} className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-primary text-white shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-all"><Download className="w-3.5 h-3.5" />Descargar Todo</button>
      </div>
    </div>
  );
}

// ── BulkCollectionModal ─────────────────────────────────────────────────────

export function BulkCollectionModal({ 
  onClose, isCreating, setIsCreating, collections, loading, addingId, onAdd, onCreate, name, setName, target, setTarget, selectedCount, isCurseSelected 
}: any) {
  // If CurseForge mods are selected, target MUST be local
  React.useEffect(() => {
    if (isCurseSelected && target === "modrinth") {
      setTarget("local");
    }
  }, [isCurseSelected, target, setTarget]);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/65 backdrop-blur-xl animate-fade-in">
      <div className="w-full max-w-sm rounded-2xl border p-5 flex flex-col gap-4 shadow-2xl bg-[#121212] border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-headline text-base font-bold text-white">{isCreating ? "Nueva Colección" : "Añadir a Colección"}</h3>
            <p className="text-[11px] opacity-50 mt-0.5">
              {isCreating ? "Crea una colección para tus mods" : `Selecciona una colección para añadir ${selectedCount || 1} ítems`}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10"><X className="w-4 h-4 text-white/40" /></button>
        </div>

        {isCreating ? (
          <div className="flex flex-col gap-3.5 py-1">
            <div className="flex p-1 bg-black/40 rounded-xl gap-1 border border-white/5 relative">
              <button 
                onClick={() => !isCurseSelected && setTarget("modrinth")} 
                className={`flex-1 py-1 rounded-lg text-[11px] font-bold transition-all ${target === "modrinth" ? "bg-primary text-white" : "opacity-45"} ${isCurseSelected ? "cursor-not-allowed grayscale" : ""}`}
                title={isCurseSelected ? "CurseForge solo permite colecciones locales" : ""}
              >
                Modrinth
              </button>
              <button 
                onClick={() => setTarget("local")} 
                className={`flex-1 py-1 rounded-lg text-[11px] font-bold transition-all ${target === "local" ? "bg-white/10 text-white" : "opacity-45"}`}
              >
                Local
              </button>
            </div>
            {isCurseSelected && <p className="text-[9px] text-amber-500/80 text-center px-2">Mods de CurseForge solo pueden guardarse en colecciones locales.</p>}
            
            <input autoFocus type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Nombre de la colección..." className="w-full bg-black/30 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-primary/50" />
            
            <div className="flex gap-2 pt-1">
              <button onClick={() => setIsCreating(false)} className="flex-1 py-2 rounded-xl text-xs font-bold border border-white/10 text-white/40 hover:bg-white/5 transition-colors">Volver</button>
              <button onClick={onCreate} disabled={!name.trim() || loading} className="flex-2 py-2 rounded-xl text-xs font-bold bg-primary text-white flex items-center justify-center gap-1.5 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Crear y Añadir"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 max-h-72 overflow-y-auto custom-scrollbar">
            <button onClick={() => { setIsCreating(true); setName(""); }} className="w-full p-3 rounded-xl border-2 border-dashed border-white/10 hover:border-primary/40 text-primary flex items-center justify-center gap-2 transition-all"><Plus className="w-3.5 h-3.5" /><span className="font-bold text-xs">Nueva Colección</span></button>
            
            {loading ? (
              <div className="py-10 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-primary/50" /></div>
            ) : collections.map((c: any) => {
              const isDisabled = isCurseSelected && !c.isLocal;
              return (
                <button 
                  key={c.id} 
                  onClick={() => !isDisabled && onAdd(c)} 
                  disabled={addingId != null || isDisabled} 
                  className={`flex items-center gap-3 p-2 rounded-xl bg-white/3 border border-white/5 hover:border-primary/20 transition-all text-left group ${isDisabled ? "opacity-30 cursor-not-allowed" : ""}`}
                >
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden">
                    {c.iconUrl ? <img src={c.iconUrl} className="w-full h-full object-cover" /> : <Library className="w-3.5 h-3.5 text-primary/80" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs text-white truncate">{c.name}</p>
                    <p className="text-[10px] text-white/40">{c.projectCount} proyectos • {c.isLocal ? "Local" : "Modrinth"}</p>
                  </div>
                  <div className="shrink-0">
                    {addingId === c.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                    ) : (
                      <ChevronRight className={`w-3.5 h-3.5 transition-all ${isDisabled ? "hidden" : "opacity-0 group-hover:opacity-100 group-hover:translate-x-1"}`} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
