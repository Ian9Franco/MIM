"use client";

import { useState } from "react";
import { Keyboard, Search, X, ChevronDown, ChevronRight, Command, MousePointer2, Ghost } from "lucide-react";
import { useKeybindManager } from "@/hooks/tweak/useKeybindManager";
import { KeybindRow } from "./parts/KeybindRow";
import { KeyboardMap } from "./KeyboardMap";

export function KeybindManager({ keybinds, grouped, conflicts, suggestions, projectName, version, data, onUpdate }: any) {
  const {
    searchQuery, setSearchQuery, pressedKeyFilter, setPressedKeyFilter,
    detecting, filteredGrouped, handleKeyDetect, expandedMods, toggleModExpand, totalCount
  } = useKeybindManager(keybinds);

  const [editingKeybind, setEditingKeybind] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSaveKeybind = async (id: string, key: string) => {
    setSaving(true);
    const res = await fetch("/api/tweak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectName, version, action: "save", keybinds: [{ id, key }] })
    });
    if (res.ok) { setEditingKeybind(null); onUpdate(); }
    setSaving(false);
  };

  const toggleLock = async (id: string) => {
    const currentLocked = data?.draft?.lockedKeys || [];
    const newLocked = currentLocked.includes(id) 
      ? currentLocked.filter((k: string) => k !== id) 
      : [...currentLocked, id];
    
    await fetch("/api/tweak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectName, version, action: "save-draft", lockedKeys: newLocked })
    });
    onUpdate();
  };

  const formatKeyDisplay = (key: string) => key.replace("key.keyboard.", "").replace("key.mouse.", "Mouse ").toUpperCase();

  return (
    <div className="space-y-6 font-sans">
      <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
        <h3 className="text-xs font-black uppercase tracking-widest text-primary mb-1">Mapa de Conflictos (Heatmap)</h3>
        <p className="text-[10px] opacity-60 leading-relaxed font-medium">
          Visualiza la carga de acciones por tecla. Los tonos <span className="text-orange-400 font-bold">Naranjas</span> indican conflictos leves, mientras que el <span className="text-red-500 font-bold">Rojo Pulsante</span> señala teclas con 3 o más acciones simultáneas. Pasa el ratón sobre una tecla para ver qué acciones la ocupan.
        </p>
      </div>
      <KeyboardMap keybinds={keybinds} />
      
      {/* Intelligent Suggestions */}
      {suggestions && suggestions.length > 0 && !searchQuery && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1 text-[10px] font-bold uppercase tracking-widest text-primary opacity-80">
            <Ghost className="w-3 h-3" /> Recomendaciones de Inteligencia
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {suggestions.map((sug: any, idx: number) => (
              <div key={idx} className="p-3 rounded-xl bg-primary/5 border border-primary/20 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-white uppercase tracking-tighter">
                    Tecla {formatKeyDisplay(sug.key)}
                  </span>
                </div>
                <p className="text-[11px] text-white/80 leading-relaxed italic">
                  "{sug.reason}"
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-[9px] font-bold">GANADOR: {sug.winner.name}</div>
                  <div className="px-2 py-1 rounded-lg bg-rose-500/10 text-rose-400 text-[9px] font-bold opacity-50 line-through">REMAPEAR: {sug.loser.name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-muted)]" />
          <input
            type="text" placeholder="Buscar keybinds..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-[var(--color-border)] text-sm"
          />
        </div>
        <button onClick={handleKeyDetect} className={`px-4 py-2 rounded-xl text-sm ${detecting ? "bg-amber-500/20 text-amber-400 animate-pulse" : "bg-white/5"}`}>
          <Keyboard className="w-4 h-4 inline mr-2" /> {detecting ? "Presiona..." : "Detectar"}
        </button>
        {pressedKeyFilter && (
          <button onClick={() => setPressedKeyFilter(null)} className="px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs">
            {formatKeyDisplay(pressedKeyFilter)} <X className="w-3 h-3 inline ml-1" />
          </button>
        )}
      </div>

      <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
        {/* Render sections using sub-hooks and components */}
        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
          <button onClick={() => toggleModExpand("vanilla")} className="w-full flex items-center justify-between p-3 hover:bg-white/5">
            <div className="flex items-center gap-2">
              <Command className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Minecraft Vanilla ({filteredGrouped.vanilla.length})</span>
            </div>
            {expandedMods.has("vanilla") ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          {expandedMods.has("vanilla") && filteredGrouped.vanilla.map((kb: any) => (
            <KeybindRow 
              key={kb.id} keybind={kb} editing={editingKeybind === kb.id}
              isLocked={data?.draft?.lockedKeys?.includes(kb.id)}
              onToggleLock={() => toggleLock(kb.id)}
              onEdit={() => !data?.draft?.lockedKeys?.includes(kb.id) && setEditingKeybind(kb.id)} 
              onSave={(k: any) => handleSaveKeybind(kb.id, k)}
              onCancel={() => setEditingKeybind(null)} formatKeyDisplay={formatKeyDisplay}
            />
          ))}
        </section>

        {Object.entries(filteredGrouped.mods).map(([mod, kbs]: [any, any]) => (
          <section key={mod} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
            <button onClick={() => toggleModExpand(mod)} className="w-full flex items-center justify-between p-3 hover:bg-white/5">
              <div className="flex items-center gap-2">
                <MousePointer2 className="w-4 h-4 text-accent" />
                <span className="text-sm font-medium capitalize">{mod} ({kbs.length})</span>
              </div>
              {expandedMods.has(mod) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            {expandedMods.has(mod) && kbs.map((kb: any) => (
              <KeybindRow 
                key={kb.id} keybind={kb} editing={editingKeybind === kb.id}
                isLocked={data?.draft?.lockedKeys?.includes(kb.id)}
                onToggleLock={() => toggleLock(kb.id)}
                onEdit={() => !data?.draft?.lockedKeys?.includes(kb.id) && setEditingKeybind(kb.id)} 
                onSave={(k: any) => handleSaveKeybind(kb.id, k)}
                onCancel={() => setEditingKeybind(null)} formatKeyDisplay={formatKeyDisplay}
              />
            ))}
          </section>
        ))}

        {filteredGrouped.orphaned.length > 0 && (
          <section className="rounded-xl border border-amber-500/20 bg-amber-500/5 overflow-hidden">
            <button onClick={() => toggleModExpand("orphaned")} className="w-full flex items-center justify-between p-3 hover:bg-amber-500/10">
              <div className="flex items-center gap-2"><Ghost className="w-4 h-4 text-amber-400" /><span className="text-sm font-medium text-amber-400">Huérfanos ({filteredGrouped.orphaned.length})</span></div>
              {expandedMods.has("orphaned") ? <ChevronDown className="w-4 h-4 text-amber-400" /> : <ChevronRight className="w-4 h-4 text-amber-400" />}
            </button>
            {expandedMods.has("orphaned") && filteredGrouped.orphaned.map((kb: any) => (
              <KeybindRow key={kb.id} keybind={kb} isOrphaned formatKeyDisplay={formatKeyDisplay} />
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
