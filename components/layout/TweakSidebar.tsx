/**
 * MIM — Tweak Sidebar
 * Optimized for v5.9: Modularized into hooks and components.
 */

"use client";

import React, { useRef, useEffect } from "react";
import { Settings2, Zap, X, ShieldCheck, RefreshCw, Cpu, CheckCircle2, AlertTriangle, Download, Save } from "lucide-react";
import { useTweakManager } from "@/hooks/useTweakManager";
import { TweakTabNav, KeybindItem, ResourcePackItem, HardwareStats } from "./TweakSidebarComponents";
import type { Project } from "@/lib/types";

interface TweakSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeProject: Project | null;
}

export function TweakSidebar({ isOpen, onClose, activeProject }: TweakSidebarProps) {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const { 
    activeTab, setActiveTab, data, setData, loading, saving, message, setMessage, 
    listeningKey, setListeningKey, handleAction, handleUndo, hasPackChanges, 
    setHasPackChanges, draggedPackIdx, setDraggedPackIdx, addToHistory 
  } = useTweakManager(isOpen, activeProject);

  useEffect(() => {
    const handleOut = (e: MouseEvent) => {
      if (isOpen && sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        if (!(e.target as HTMLElement).closest('[data-header-toggle="true"]')) onClose();
      }
    };
    document.addEventListener("mousedown", handleOut);
    return () => document.removeEventListener("mousedown", handleOut);
  }, [isOpen, onClose]);

  // Keybind listening logic (simplified for brevity here, could be moved to hook)
  useEffect(() => {
    if (!listeningKey) return;
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      const mcKey = e.code === "Escape" ? "key.keyboard.none" : `key.keyboard.${e.code.replace("Key", "").toLowerCase()}`;
      if (data) {
        const newKbs = data.keybinds.map(kb => kb.id === listeningKey ? { ...kb, key: mcKey } : kb);
        setData({ ...data, keybinds: newKbs });
        addToHistory(newKbs);
        handleAction("save", { keybinds: newKbs.map(k => ({ id: k.id, key: k.key })) });
      }
      setListeningKey(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [listeningKey, data, setData, addToHistory, handleAction]);

  if (!isOpen) return null;

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-md animate-fade-in" />
      <aside ref={sidebarRef} className="fixed inset-y-0 right-0 z-[70] flex flex-col shadow-2xl border-l transition-all duration-500 ease-out" style={{ width: "935px", maxWidth: "92vw", background: "var(--glass-bg)", borderColor: "var(--glass-border)", backdropFilter: "var(--liquid-blur)", borderRadius: "2rem 0 0 2rem" }}>
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><Settings2 className="w-6 h-6" /></div><div><h2 className="text-xl font-subhead text-white leading-none">TWEAK</h2><p className="text-xs text-muted mt-1 uppercase">Tuning Workspace</p></div></div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-white/5 flex items-center justify-center transition-colors text-muted hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        {loading && !data ? (
          <div className="flex-1 flex flex-col items-center justify-center"><RefreshCw className="w-8 h-8 text-primary animate-spin mb-4" /><p className="text-sm text-muted">Analizando...</p></div>
        ) : !data?.optionsExists ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center"><Zap className="w-16 h-16 text-primary mb-6" /><h3 className="text-lg font-subhead text-white mb-2">Inicializar TWEAK</h3><button onClick={() => handleAction("initialize")} className="w-full py-3 bg-primary text-white rounded-xl shadow-lg mt-4">Inicializar Perfil</button></div>
        ) : (
          <>
            <TweakTabNav activeTab={activeTab} setActiveTab={setActiveTab} />
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
              {message && <div className={`p-4 rounded-xl flex items-start gap-3 ${message.type === "success" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>{message.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}<p className="text-sm">{message.text}</p></div>}
              
              {activeTab === "optimize" && (
                <div className="space-y-6 animate-fade-in">
                  <HardwareStats data={data} ram={8} />
                  {data.recommendations.map((rec, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                      <div className="flex justify-between mb-2"><h5 className="text-sm font-bold text-white">{rec.title}</h5><span className="text-[10px] uppercase text-primary">Impacto {rec.impact}</span></div>
                      <p className="text-xs text-muted mb-4">{rec.desc}</p>
                      {rec.settingKey && <button onClick={() => handleAction("save", { settings: { [rec.settingKey!]: rec.recommendedValue } })} className="w-full py-2 bg-primary/20 text-primary rounded-lg text-[11px] font-bold">Aplicar</button>}
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "keybinds" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex justify-between"><button onClick={handleUndo} className="text-xs text-muted hover:text-white">Undo</button><button onClick={() => handleAction("save", { keybinds: data.keybinds.map(k=>({id:k.id, key:k.key})) })} className="text-xs text-primary font-bold">Guardar</button></div>
                  {data.keybinds.map(kb => <KeybindItem key={kb.id} kb={kb} listeningKey={listeningKey} setListeningKey={setListeningKey} />)}
                </div>
              )}

              {activeTab === "resourcepacks" && (
                <div className="space-y-4 animate-fade-in">
                  <button onClick={() => handleAction("sync-resourcepacks")} className="w-full py-3 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">Sincronizar ↕</button>
                  <div className="space-y-2">
                    {[...data.resourcePacks.active].reverse().map((p, i) => (
                      <ResourcePackItem 
                        key={i} 
                        pack={p} 
                        idx={data.resourcePacks.active.length - 1 - i} 
                        reverseIdx={i} 
                        total={data.resourcePacks.active.length} 
                        draggedIdx={draggedPackIdx} 
                        onDragStart={(_, idx) => setDraggedPackIdx(idx)} 
                        onDragOver={e => e.preventDefault()} 
                        onDrop={(_, idx) => { 
                          if (draggedPackIdx !== null) { 
                            const act = [...data.resourcePacks.active]; 
                            const [m] = act.splice(act.length - 1 - draggedPackIdx, 1); 
                            act.splice(act.length - 1 - idx, 0, m); 
                            setData({ ...data, resourcePacks: { ...data.resourcePacks, active: act } }); 
                            setHasPackChanges(true); 
                          } 
                          setDraggedPackIdx(null); 
                        }} 
                        onDragEnd={() => setDraggedPackIdx(null)} 
                        onMove={(idx, dir) => { 
                          const act = [...data.resourcePacks.active]; 
                          const nIdx = dir === "up" ? idx + 1 : idx - 1; 
                          if (nIdx >= 0 && nIdx < act.length) { 
                            [act[idx], act[nIdx]] = [act[nIdx], act[idx]]; 
                            setData({ ...data, resourcePacks: { ...data.resourcePacks, active: act } }); 
                            setHasPackChanges(true); 
                          } 
                        }} 
                        onToggle={(p, add) => { 
                          let act = [...data.resourcePacks.active]; 
                          if (add) act.push(p); 
                          else act = act.filter(x => x !== p); 
                          setData({ ...data, resourcePacks: { ...data.resourcePacks, active: act } }); 
                          setHasPackChanges(true); 
                        }} 
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
            {(activeTab !== "profiles") && (
              <div className="p-6 border-t border-white/5">
                <button disabled={saving} onClick={() => handleAction("save", { resourcePacks: data.resourcePacks.active, keybinds: data.keybinds })} className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-lg flex items-center justify-center gap-3">
                  {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Guardar Proyecto
                </button>
              </div>
            )}
          </>
        )}
      </aside>
    </>
  );
}
