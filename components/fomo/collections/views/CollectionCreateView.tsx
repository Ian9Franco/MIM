import React from "react";
import { X, Plus, ChevronRight } from "lucide-react";
import { COLORS } from "@/theme/tokens";
import { CollectionIcon } from "../components/CollectionIcon";
import type { CollectionEntry, ModHit } from "@/lib/core/types";

interface CollectionCreateViewProps {
  creating: boolean;
  setCreating: (val: boolean) => void;
  addingForMod: ModHit | null;
  selectedMods: ModHit[];
  onClearAddingFor: () => void;
  onClearSelection?: () => void;
  setIsAddingSelection: (val: boolean) => void;
  targetType: "local" | "modrinth";
  setTargetType: (val: "local" | "modrinth") => void;
  newName: string;
  setNewName: (val: string) => void;
  handleCreate: (name: string) => void;
  collections: CollectionEntry[];
  handleAddTo: (coll: CollectionEntry) => void;
}

export function CollectionCreateView({
  creating,
  setCreating,
  addingForMod,
  selectedMods,
  onClearAddingFor,
  onClearSelection,
  setIsAddingSelection,
  targetType,
  setTargetType,
  newName,
  setNewName,
  handleCreate,
  collections,
  handleAddTo
}: CollectionCreateViewProps) {
  return (
    <div className="flex-1 flex flex-col p-4 space-y-3 overflow-y-auto custom-scrollbar">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-headline text-lg">{creating ? "Nueva Colección" : "Añadir a Colección"}</h3>
          <p className="font-caption text-xs mt-1 truncate max-w-85" style={{ color: COLORS.muted }}>
            {creating 
              ? "Crea una nueva colección" 
              : (addingForMod ? `Para: "${addingForMod.title}"` : `Para: ${selectedMods.length} items seleccionados`)}
          </p>
        </div>
        <button 
          onClick={() => { 
            onClearAddingFor(); 
            setCreating(false); 
            onClearSelection?.(); 
            setIsAddingSelection(false); 
          }} 
          aria-label="Cancelar" 
          className="p-2 rounded-xl hover:bg-white/10"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {creating ? (
        <div className="p-5 rounded-2xl bg-white/5 border border-primary/20 space-y-4">
          <div className="flex p-1 bg-black/40 rounded-xl gap-1">
            <button
              onClick={() => setTargetType("modrinth")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${targetType === "modrinth" ? "bg-primary text-white" : "opacity-40 hover:opacity-100"}`}
            >
              Modrinth
            </button>
            <button
              onClick={() => setTargetType("local")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${targetType === "local" ? "bg-white/10 text-white" : "opacity-40 hover:opacity-100"}`}
            >
              Local
            </button>
          </div>

          <input
            autoFocus 
            type="text" 
            value={newName} 
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate(newName)}
            placeholder={targetType === "modrinth" ? "Nombre en Modrinth" : "Nombre local"}
            aria-label="Nombre de la nueva colección"
            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary/50"
            style={{ color: COLORS.foreground }}
          />
          <div className="flex gap-2">
            <button 
              onClick={() => setCreating(false)} 
              className="flex-1 py-2.5 rounded-xl text-sm font-bold border border-white/10 hover:bg-white/5" 
              style={{ color: COLORS.muted }}
            >
              Cancelar
            </button>
            <button 
              onClick={() => handleCreate(newName)} 
              className="flex-2 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/20" 
              style={{ background: COLORS.primary, color: "white" }}
            >
              {targetType === "modrinth" ? "Crear en Modrinth" : "Crear Local"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <button 
            onClick={() => setCreating(true)} 
            className="w-full p-4 rounded-2xl border-2 border-dashed border-white/10 hover:border-primary/30 hover:bg-primary/5 transition-all flex items-center justify-center gap-3"
          >
            <Plus className="w-5 h-5" style={{ color: COLORS.primary }} />
            <span className="font-bold text-sm">Nueva Colección</span>
          </button>
          {collections.filter((c) => c.id !== "followed-projects").map((coll) => (
            <button 
              key={coll.id} 
              onClick={() => handleAddTo(coll)} 
              className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 border border-transparent hover:border-primary/30 hover:bg-white/10 transition-all text-left group"
            >
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
                <CollectionIcon url={coll.iconUrl} fallbackSize="w-5 h-5" fallbackOpacity="opacity-40" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{coll.name}</p>
                <p className="font-caption text-[0.7rem]" style={{ color: COLORS.muted }}>{coll.projectCount} proyectos</p>
              </div>
              <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </>
      )}
    </div>
  );
}
