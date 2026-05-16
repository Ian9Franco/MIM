import React from "react";
import { X, Plus, Download, Library, Loader2, ChevronRight } from "lucide-react";
import { COLORS } from "@/theme/tokens";

// ── BulkActionsBar ──────────────────────────────────────────────────────────

export function BulkActionsBar({ mods, onCancel, onAdd, onDownload, isModern }: { mods: any[], onCancel: () => void, onAdd: () => void, onDownload: () => void, isModern?: boolean }) {
  const displayMods = mods.slice(0, 5);
  const remaining = mods.length - 5;

  return (
    <div className="mx-4 mb-4 p-3 rounded-2xl flex items-center justify-between animate-slide-up" style={{ 
      background: isModern ? "#FFFFFF" : "rgba(22, 22, 26, 0.95)", 
      border: `1px solid ${isModern ? 'rgba(0, 0, 0, 0.08)' : 'color-mix(in srgb, var(--color-primary) 30%, transparent)'}`, 
      boxShadow: isModern ? "0 12px 40px rgba(0,0,0,0.15)" : "0 12px 40px rgba(0,0,0,0.5)", 
      backdropFilter: "blur(20px)" 
    }}>
      <div className="flex items-center gap-4 pl-2">
        <div className="flex -space-x-3 overflow-hidden">
          {displayMods.map((mod, i) => (
            <div key={mod.projectId} className="w-9 h-9 rounded-xl border-2 bg-white/5 flex items-center justify-center overflow-hidden transition-transform hover:-translate-y-1 hover:scale-110" style={{ zIndex: displayMods.length - i, borderColor: isModern ? "#FFFFFF" : "#16161a" }}>
              {mod.iconUrl ? (
                <img src={mod.iconUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">MOD</div>
              )}
            </div>
          ))}
          {remaining > 0 && (
            <div className="w-9 h-9 rounded-xl border-2 bg-white/10 flex items-center justify-center text-[11px] font-bold z-0 backdrop-blur-md" style={{ borderColor: isModern ? "#FFFFFF" : "#16161a", color: isModern ? "#000" : "#fff" }}>
              +{remaining}
            </div>
          )}
        </div>
        <div>
          <span className="text-sm font-black block leading-none" style={{ color: isModern ? '#1e1b4b' : '#FFFFFF' }}>{mods.length}</span>
          <span className="text-[10px] uppercase tracking-wider font-bold mt-1 block" style={{ color: isModern ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.6)' }}>Seleccionados</span>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={onCancel} className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${isModern ? 'text-black/40 hover:bg-black/5' : 'text-white/40 hover:bg-white/10'}`}>Cancelar</button>
        <button onClick={onAdd} className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold border transition-all ${isModern ? 'border-black/10 text-black/80 hover:bg-black/5' : 'border-white/10 text-white/80 hover:bg-white/20'}`}><Plus className="w-3.5 h-3.5" />Añadir a...</button>
        <button onClick={onDownload} className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-primary text-white shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-all"><Download className="w-3.5 h-3.5" />Descargar Todo</button>
      </div>
    </div>
  );
}

// ── BulkCollectionModal ─────────────────────────────────────────────────────

export function BulkCollectionModal({ 
  onClose, isCreating, setIsCreating, collections, loading, addingId, onAdd, onCreate, name, setName, target, setTarget, selectedCount, isCurseSelected, theme 
}: any) {
  const isModern = theme === "modern";

  // If CurseForge mods are selected, target MUST be local
  React.useEffect(() => {
    if (isCurseSelected && target === "modrinth") {
      setTarget("local");
    }
  }, [isCurseSelected, target, setTarget]);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/65 backdrop-blur-xl animate-fade-in">
      <div className={`w-full max-w-sm rounded-2xl border p-5 flex flex-col gap-4 shadow-2xl ${isModern ? 'bg-[#F0F2F4] border-black/5' : 'bg-[#121212] border-white/10'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`font-headline text-base font-bold ${isModern ? 'text-[#1e1b4b]' : 'text-white'}`}>{isCreating ? "Nueva Colección" : "Añadir a Colección"}</h3>
            <p className={`text-[11px] mt-0.5 ${isModern ? 'text-black/40' : 'opacity-50'}`}>
              {isCreating ? "Crea una colección para tus mods" : `Selecciona una colección para añadir ${selectedCount || 1} ítems`}
            </p>
          </div>
          <button onClick={onClose} className={`p-1.5 rounded-lg ${isModern ? 'hover:bg-black/5' : 'hover:bg-white/10'}`}><X className={`w-4 h-4 ${isModern ? 'text-black/40' : 'text-white/40'}`} /></button>
        </div>

        {isCreating ? (
          <div className="flex flex-col gap-3.5 py-1">
            <div className={`flex p-1 rounded-xl gap-1 border relative ${isModern ? 'bg-black/5 border-black/5' : 'bg-black/40 border-white/5'}`}>
              <button 
                onClick={() => !isCurseSelected && setTarget("modrinth")} 
                className={`flex-1 py-1 rounded-lg text-[11px] font-bold transition-all ${target === "modrinth" ? "bg-primary text-white" : "opacity-45"} ${isCurseSelected ? "cursor-not-allowed grayscale" : ""}`}
                title={isCurseSelected ? "CurseForge solo permite colecciones locales" : ""}
              >
                Modrinth
              </button>
              <button 
                onClick={() => setTarget("local")} 
                className={`flex-1 py-1 rounded-lg text-[11px] font-bold transition-all ${target === "local" ? (isModern ? "bg-black/10 text-black/80" : "bg-white/10 text-white") : "opacity-45"}`}
              >
                Local
              </button>
            </div>
            {isCurseSelected && <p className="text-[9px] text-amber-500/80 text-center px-2">Mods de CurseForge solo pueden guardarse en colecciones locales.</p>}
            
            <input 
              autoFocus 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="Nombre de la colección..." 
              className={`w-full rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-primary/50 border ${isModern ? 'bg-white/60 border-black/10 text-black' : 'bg-black/30 border-white/10 text-white'}`} 
            />
            
            <div className="flex gap-2 pt-1">
              <button onClick={() => setIsCreating(false)} className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors ${isModern ? 'border-black/10 text-black/40 hover:bg-black/5' : 'border-white/10 text-white/40 hover:bg-white/5'}`}>Volver</button>
              <button onClick={onCreate} disabled={!name.trim() || loading} className="flex-2 py-2 rounded-xl text-xs font-bold bg-primary text-white flex items-center justify-center gap-1.5 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Crear y Añadir"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 max-h-72 overflow-y-auto custom-scrollbar">
            <button onClick={() => { setIsCreating(true); setName(""); }} className={`w-full p-3 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 transition-all ${isModern ? 'border-black/10 hover:border-primary/40 text-primary' : 'border-white/10 hover:border-primary/40 text-primary'}`}><Plus className="w-3.5 h-3.5" /><span className="font-bold text-xs">Nueva Colección</span></button>
            
            {loading ? (
              <div className="py-10 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-primary/50" /></div>
            ) : collections.map((c: any) => {
              const isDisabled = isCurseSelected && !c.isLocal;
              return (
                <button 
                  key={c.id} 
                  onClick={() => !isDisabled && onAdd(c)} 
                  disabled={addingId != null || isDisabled} 
                  className={`flex items-center gap-3 p-2 rounded-xl border transition-all text-left group ${isModern ? 'bg-black/5 border-black/5 hover:border-primary/20' : 'bg-white/3 border-white/5 hover:border-primary/20'} ${isDisabled ? "opacity-30 cursor-not-allowed" : ""}`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden ${isModern ? 'bg-black/5' : 'bg-white/5'}`}>
                    {c.iconUrl ? <img src={c.iconUrl} className="w-full h-full object-cover" /> : <Library className="w-3.5 h-3.5 text-primary/80" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-xs truncate ${isModern ? 'text-[#1e1b4b]' : 'text-white'}`}>{c.name}</p>
                    <p className={`text-[10px] ${isModern ? 'text-black/40' : 'text-white/40'}`}>{c.projectCount} proyectos • {c.isLocal ? "Local" : "Modrinth"}</p>
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
