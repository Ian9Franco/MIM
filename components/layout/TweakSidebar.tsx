/**
 * MIM — Tweak Sidebar
 * Premium Game-Connected Tuning Workspace.
 */

"use client";

import React, { useRef, useEffect } from "react";
import { 
  Settings2, Zap, X, RefreshCw, CheckCircle2, AlertTriangle, Save, 
  History as HistoryIcon, Layers, Search, Sparkles, Keyboard, Package 
} from "lucide-react";
import { useTweakManager } from "@/hooks/useTweakManager";
import { 
  TweakTabNav, KeybindItem, HardwareStats, JvmArgBox, ResourcePackItem, AvailablePackItem, DetectedInstallations 
} from "./TweakSidebarComponents";
import { FolderOpen } from "lucide-react";
import type { Project } from "@/lib/types";

interface TweakSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeProject: Project | null;
}

export function TweakSidebar({ isOpen, onClose, activeProject }: TweakSidebarProps) {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const {
    activeTab, setActiveTab, data, setData, loading, saving, message,
    listeningKey, setListeningKey, handleAction, handleUndo, hasPackChanges,
    setHasPackChanges, draggedPackIdx, setDraggedPackIdx, addToHistory
  } = useTweakManager(isOpen, activeProject);
  const [selectedSnapshot, setSelectedSnapshot] = React.useState<string>("");
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  // Click-outside logic
  useEffect(() => {
    const handleOut = (e: MouseEvent) => {
      if (isOpen && sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        if (!(e.target as HTMLElement).closest('[data-header-toggle="true"]')) onClose();
      }
    };
    document.addEventListener("mousedown", handleOut);
    return () => document.removeEventListener("mousedown", handleOut);
  }, [isOpen, onClose]);

  // Keybind Capture
  useEffect(() => {
    if (!listeningKey) return;
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      const mcKey = e.code === "Escape" ? "key.keyboard.none" : `key.keyboard.${e.code.replace("Key", "").toLowerCase()}`;
      if (data) {
        const newKbs = data.keybinds.map((kb: any) => kb.id === listeningKey ? { ...kb, key: mcKey } : kb);
        setData({ ...data, keybinds: newKbs });
        addToHistory(newKbs);
        handleAction("save", { keybinds: newKbs.map((k: any) => ({ id: k.id, key: k.key })) });
      }
      setListeningKey(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [listeningKey, data, setData, addToHistory, handleAction]);

  if (!isOpen) return null;

  // ── Pack Helpers ──
  const uiPacks = data ? [...data.resourcePacks.active].reverse() : [];

  const handlePackDrop = async (dropUiIdx: number) => {
    if (draggedPackIdx === null || draggedPackIdx === dropUiIdx || !data) { setDraggedPackIdx(null); return; }
    const arr = [...data.resourcePacks.active];
    const fromActual = arr.length - 1 - draggedPackIdx;
    const toActual   = arr.length - 1 - dropUiIdx;
    const [moved] = arr.splice(fromActual, 1);
    arr.splice(toActual, 0, moved);
    
    setData({ ...data, resourcePacks: { ...data.resourcePacks, active: arr } });
    setHasPackChanges(true);
    setDraggedPackIdx(null);

    // Fetch new analysis from backend
    try {
      const res = await fetch("/api/tweak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "analyze-packs",
          activePacks: arr 
        })
      });
      if (res.ok) {
        const newAnalysis = await res.json();
        setData((prev: any) => ({
          ...prev,
          resourcePacks: {
            ...prev.resourcePacks,
            visualStack: newAnalysis.visualStack,
            issues: newAnalysis.issues,
            autoFixable: newAnalysis.autoFixable
          }
        }));
      }
    } catch (error) {
      console.error("Failed to re-analyze packs:", error);
    }
  };

  const handleTogglePack = (p: string) => {
    if (!data) return;
    const isActive = data.resourcePacks.active.includes(p);
    if (isActive) {
      setData({ 
        ...data, 
        resourcePacks: { 
          ...data.resourcePacks, 
          active: data.resourcePacks.active.filter((x: string) => x !== p), 
          available: [...(data.resourcePacks.available || []), p] 
        } 
      });
    } else {
      setData({ 
        ...data, 
        resourcePacks: { 
          ...data.resourcePacks, 
          active: [p, ...data.resourcePacks.active], 
          available: (data.resourcePacks.available || []).filter((x: string) => x !== p) 
        } 
      });
    }
    setHasPackChanges(true);
  };

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-md animate-fade-in duration-500" />
      <aside
        ref={sidebarRef}
        className="fixed inset-y-0 right-0 z-[70] flex flex-col shadow-2xl border-l animate-in slide-in-from-right-10 duration-500 ease-out overflow-x-hidden"
        style={{
          width: "780px",
          maxWidth: "98vw",
          background: "linear-gradient(165deg, rgba(10,10,12,0.98) 0%, rgba(5,5,7,1) 100%)",
          borderColor: "rgba(255,255,255,0.08)",
          backdropFilter: "blur(64px)",
          borderRadius: "3rem 0 0 3rem",
          boxShadow: "-40px 0 100px rgba(0,0,0,0.9), inset 1px 0 0 rgba(255,255,255,0.05)",
        }}
      >
        {/* Decorative Top Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 blur-[120px] rounded-full -mr-48 -mt-48 pointer-events-none" />

        {/* Header Section */}
        <div className="px-8 py-6 border-b border-white/[0.04] flex items-center justify-between shrink-0 relative">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary shadow-inner">
              <Settings2 className="w-6 h-6 drop-shadow-[0_0_8px_rgba(var(--color-primary-rgb),0.5)]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">Tweak</h2>
                <span className="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[8px] font-black uppercase tracking-widest border border-primary/20">v2.0 Premium</span>
              </div>
              <p className="text-[10px] text-muted/40 font-bold uppercase tracking-[0.2em] mt-0.5">Control de Configuración Profunda</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 rounded-full bg-white/[0.02] hover:bg-white/[0.08] flex items-center justify-center transition-all text-muted/40 hover:text-white group active:scale-90"
          >
            <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>

        {loading && !data ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 animate-pulse">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
              <RefreshCw className="w-10 h-10 text-primary animate-spin relative" />
            </div>
            <p className="text-[10px] text-muted/40 font-black uppercase tracking-[0.3em]">Sincronizando con el juego...</p>
          </div>
        ) : !data?.optionsExists ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center animate-fade-in">
            <div className="w-24 h-24 rounded-full bg-primary/5 border border-primary/10 flex items-center justify-center mb-8 relative">
              <Zap className="w-12 h-12 text-primary opacity-20" />
              <div className="absolute inset-0 bg-primary/5 animate-ping rounded-full scale-150 opacity-20" />
            </div>
            <h3 className="text-2xl font-black text-white mb-3 tracking-tighter uppercase italic">Inicialización Requerida</h3>
            <p className="text-sm text-muted/50 mb-10 max-w-xs mx-auto font-medium leading-relaxed uppercase tracking-wide">TWEAK necesita vincularse a tu instalación global para gestionar los ajustes.</p>
            <button 
              onClick={() => handleAction("initialize")} 
              className="px-10 py-4 bg-primary text-white rounded-2xl text-xs font-black uppercase tracking-[0.3em] shadow-[0_15px_30px_rgba(var(--color-primary-rgb),0.3)] hover:scale-105 active:scale-95 transition-all"
            >
              Vincular Ahora
            </button>
          </div>
        ) : (
          <>
            <TweakTabNav activeTab={activeTab} setActiveTab={setActiveTab} />

            <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/[0.05]">
              {message && (
                <div className={`mx-8 mt-6 p-4 rounded-2xl flex items-center gap-4 animate-in slide-in-from-top-4 duration-500 border-2 ${
                  message.type === "success" 
                    ? "bg-emerald-500/[0.03] text-emerald-400 border-emerald-500/10 shadow-[0_10px_30px_rgba(16,185,129,0.05)]" 
                    : "bg-red-500/[0.03] text-red-400 border-red-500/10"
                }`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${message.type === "success" ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                    {message.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                  </div>
                  <p className="text-[11px] font-black uppercase tracking-wider">{message.text}</p>
                </div>
              )}

              {/* ─── OPTIMIZAR ─── */}
              {activeTab === "optimize" && (
                <div className="p-8 space-y-8 animate-fade-in">
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-3">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted/60">Hardware & Rendimiento</p>
                    </div>
                    <button 
                      onClick={() => {
                        const p = (data as any).minecraftPathUsed;
                        if (p) fetch("/api/open-folder", { method: "POST", body: JSON.stringify({ folderPath: p }) });
                      }}
                      className="flex items-center gap-1.5 text-[9px] text-muted/30 hover:text-primary font-black uppercase tracking-widest transition-colors group"
                    >
                      <FolderOpen className="w-3 h-3 group-hover:scale-110 transition-transform" /> Carpeta Base
                    </button>
                  </div>

                  <HardwareStats data={data} />
                  <JvmArgBox jvmArgs={(data as any).jvmArgs} modCount={(data as any).globalModCount} />
                  <DetectedInstallations installations={(data as any).installations} />
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 px-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted/60">Recomendaciones Inteligentes</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {data.recommendations.map((rec: any, i: number) => (
                        <div key={i} className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-primary/20 hover:bg-white/[0.04] transition-all group relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-4 bg-primary/5 rounded-full -mr-2 -mt-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <h5 className="text-[12px] font-black text-white/90 group-hover:text-primary transition-colors tracking-tight leading-tight uppercase italic">{rec.title}</h5>
                            <span className={`text-[7px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest shrink-0 ${rec.impact?.toLowerCase() === "high" ? "bg-red-500/10 text-red-400" : "bg-primary/10 text-primary"}`}>
                              {rec.impact}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted/40 font-medium leading-relaxed mb-4 group-hover:text-muted/60 transition-colors uppercase tracking-tight">{rec.desc}</p>
                          {rec.settingKey && (
                            <button
                              onClick={() => handleAction("save", { settings: { [rec.settingKey]: rec.recommendedValue } })}
                              className="w-full py-2 bg-primary/5 text-primary border border-primary/20 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] hover:bg-primary hover:text-white transition-all active:scale-95 shadow-lg shadow-black/20"
                            >
                              Aplicar Ajuste
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ─── TECLAS ─── */}
              {activeTab === "keybinds" && (
                <div className="animate-fade-in">
                  <div className="px-8 py-6 flex items-center justify-between border-b border-white/[0.02] bg-white/[0.01]">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center text-muted/40 border border-white/5">
                        <Keyboard className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-white italic uppercase tracking-tight">Esquema de Teclas</p>
                        <p className="text-[9px] text-muted/30 font-bold uppercase tracking-widest mt-0.5">Sincronizado con options.txt · {data.keybinds.length} Entradas</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => {
                          const p = (data as any).minecraftPathUsed;
                          if (p) fetch("/api/open-folder", { method: "POST", body: JSON.stringify({ folderPath: p }) });
                        }}
                        className="p-2.5 bg-white/[0.03] border border-white/5 text-muted/40 hover:text-white hover:border-white/10 rounded-xl transition-all active:scale-95 group"
                        title="Abrir Carpeta de Configuración"
                      >
                        <FolderOpen className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      </button>
                      <button 
                        onClick={handleUndo} 
                        className="px-4 py-2 bg-white/[0.03] border border-white/5 text-muted/40 hover:text-white hover:border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2"
                      >
                        <RefreshCw className="w-3 h-3" /> Revertir Cambios
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <div className="rounded-3xl border border-white/[0.03] bg-white/[0.01] overflow-hidden divide-y divide-white/[0.03]">
                      {data.keybinds.map((kb: any) => (
                        <KeybindItem key={kb.id} kb={kb} listeningKey={listeningKey} setListeningKey={setListeningKey} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ─── TEXTURAS (RESOURCE PACKS) ─── */}
              {activeTab === "resourcepacks" && (
                <div className="p-8 space-y-6 animate-fade-in">
                  {/* Status Banner */}
                  <div className="p-5 rounded-3xl bg-gradient-to-r from-primary/10 to-transparent border border-primary/20 flex items-center justify-between group overflow-hidden relative shadow-2xl shadow-primary/5">
                    <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-700">
                      <Layers className="w-32 h-32" />
                    </div>
                    <div className="relative z-10">
                      <h4 className="text-sm font-black text-white uppercase tracking-tighter italic">Gestión de Capas</h4>
                      <p className="text-[10px] text-muted/50 font-black uppercase tracking-widest mt-0.5">El orden visual define la prioridad de renderizado</p>
                    </div>
                    <div className="flex items-center gap-2 relative z-10">
                      <button 
                        onClick={() => {
                          const p = (data as any).minecraftPathUsed;
                          if (p) fetch("/api/open-folder", { method: "POST", body: JSON.stringify({ folderPath: `${p}/resourcepacks` }) });
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-white/[0.03] hover:bg-white/[0.08] text-white/60 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 border border-white/5"
                      >
                        <FolderOpen className="w-3 h-3" /> Abrir Carpeta
                      </button>
                      <button 
                        onClick={() => handleAction("sync-resourcepacks")}
                        className="flex items-center gap-2 px-4 py-2 bg-white/[0.03] hover:bg-white/[0.08] text-white/60 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 border border-white/5"
                      >
                        <RefreshCw className="w-3 h-3" /> Refrescar
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-[1.1fr_0.9fr] gap-8 min-w-0">
                    {/* Active Section */}
                    <div className="space-y-5 min-w-0">
                      <div className="flex items-center justify-between px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-emerald-400">Pila Activa ({uiPacks.length})</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2 min-h-[400px] p-2 bg-white/[0.01] rounded-[2rem] border border-white/[0.03] min-w-0">
                        {uiPacks.map((p, uiIdx) => {
                          const packAnalysis = (data as any)?.resourcePacks?.visualStack?.find((v: any) => v.packName === p);
                          return (
                            <ResourcePackItem 
                              key={p} 
                              pack={p} 
                              uiIdx={uiIdx} 
                              isPriority={packAnalysis?.needsPriority} 
                              warnings={packAnalysis?.warnings}
                              isDragged={draggedPackIdx === uiIdx}
                              onDragStart={() => setDraggedPackIdx(uiIdx)}
                              onDrop={() => handlePackDrop(uiIdx)}
                              onToggle={() => handleTogglePack(p)}
                            />
                          );
                        })}
                        {uiPacks.length === 0 && (
                          <div className="h-[300px] flex flex-col items-center justify-center text-center opacity-10">
                            <Layers className="w-16 h-16 mb-4" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Sin packs activos</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Available Section */}
                    <div className="space-y-5 min-w-0">
                      <div className="flex items-center justify-between px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-muted/30" />
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted/50">Librería Global ({(data.resourcePacks.available || []).length})</p>
                        </div>
                        <Search className="w-3 h-3 text-muted/20" />
                      </div>

                      <div className="space-y-1.5 max-h-[600px] overflow-y-auto custom-scrollbar p-2 bg-black/10 rounded-[2rem] border border-white/[0.02] min-w-0">
                        {Array.from(new Set(data.resourcePacks.available || []))
                          .filter((p: string) => !uiPacks.includes(p))
                          .map((p: string) => (
                          <AvailablePackItem 
                            key={p} 
                            pack={p} 
                            onToggle={() => handleTogglePack(p)} 
                          />
                        ))}
                        {(data.resourcePacks.available || []).length === 0 && (
                          <div className="py-24 text-center opacity-10">
                            <Package className="w-12 h-12 mx-auto mb-4" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Librería vacía</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── PERFILES ─── */}
              {activeTab === "profiles" && data && (
                <div className="p-8 space-y-6 animate-fade-in">
                  {/* Centralized Save Card */}
                  <div className="p-6 rounded-[2.5rem] bg-emerald-500/[0.05] border-2 border-emerald-500/10 flex items-center gap-5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-12 bg-emerald-500/10 rounded-full -mr-12 -mt-12 blur-3xl" />
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 relative z-10">
                      <Save className="w-6 h-6" />
                    </div>
                    <div className="flex-1 relative z-10">
                      <h4 className="text-base font-black text-white uppercase tracking-tighter italic leading-none">Aplicar Cambios</h4>
                      <p className="text-[11px] text-emerald-300/40 font-bold uppercase tracking-widest mt-1.5">Sobreescribe el options.txt del juego</p>
                    </div>
                    <button
                      disabled={saving}
                      onClick={() => handleAction("save", { 
                        resourcePacks: data?.resourcePacks.active,
                        keybinds: data?.keybinds.map((k: any) => ({ id: k.id, key: k.key }))
                      })}
                      className="shrink-0 px-6 py-4 bg-emerald-500 text-white rounded-[1.25rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all relative z-10 flex items-center gap-2"
                    >
                      {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Guardar en el Juego
                    </button>
                  </div>

                  {/* Cápsulas de Tiempo Card */}
                  <div className="p-6 rounded-[2.5rem] bg-indigo-500/[0.05] border-2 border-indigo-500/10 flex items-center gap-5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-12 bg-indigo-500/10 rounded-full -mr-12 -mt-12 blur-3xl" />
                    <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 relative z-10">
                      <HistoryIcon className="w-8 h-8" />
                    </div>
                    <div className="flex-1 relative z-10">
                      <div className="flex items-center justify-between">
                        <h4 className="text-base font-black text-white uppercase tracking-tighter italic leading-none">Cápsulas de Tiempo</h4>
                        <button 
                          onClick={() => {
                            fetch("/api/open-folder", { method: "POST", body: JSON.stringify({ folderPath: "D:/.mine/source/.mim-index/tweak/snapshots" }) });
                          }}
                          className="flex items-center gap-1.5 text-[9px] text-indigo-400/40 hover:text-indigo-400 font-black uppercase tracking-widest transition-colors group"
                        >
                          <FolderOpen className="w-3 h-3 group-hover:scale-110 transition-transform" /> Ver Archivos
                        </button>
                      </div>
                      <p className="text-[11px] text-indigo-300/40 font-bold uppercase tracking-widest mt-1.5">Instantáneas de tu configuración maestra</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {data.snapshots.length === 0 ? (
                      <div className="py-24 text-center border-2 border-dashed border-white/5 rounded-[2.5rem] bg-white/[0.01]">
                        <HistoryIcon className="w-12 h-12 text-muted/10 mx-auto mb-4" />
                        <p className="text-[10px] text-muted/30 font-black uppercase tracking-[0.3em]">No se han detectado cápsulas</p>
                      </div>
                    ) : (
                      <>
                        <div className="relative">
                          {/* Trigger Button */}
                          <div 
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            className="w-full p-5 bg-white/[0.02] border border-white/5 rounded-2xl text-xs font-black text-white uppercase italic tracking-tight hover:border-white/10 hover:bg-white/[0.04] transition-all cursor-pointer flex items-center justify-between group"
                          >
                            <span className={selectedSnapshot ? "text-white" : "text-muted/40"}>
                              {selectedSnapshot ? 
                                data.snapshots.find((s: any) => s.id === selectedSnapshot)?.profileName : 
                                "Seleccionar Cápsula..."}
                            </span>
                            <Layers className={`w-4 h-4 transition-colors ${dropdownOpen ? "text-indigo-400" : "text-muted/20 group-hover:text-muted/40"}`} />
                          </div>

                          {/* Dropdown Menu */}
                          {dropdownOpen && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                              <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-[#0a0a0c] border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-[250px] overflow-y-auto custom-scrollbar animate-fade-in">
                                {data.snapshots.map((snap: any) => (
                                  <div 
                                    key={snap.id}
                                    onClick={() => {
                                      setSelectedSnapshot(snap.id);
                                      setDropdownOpen(false);
                                    }}
                                    className={`p-4 hover:bg-white/[0.05] cursor-pointer transition-colors border-b border-white/[0.02] last:border-0 flex flex-col gap-1 ${selectedSnapshot === snap.id ? "bg-white/[0.03]" : ""}`}
                                  >
                                    <span className={`text-xs font-black uppercase italic tracking-tight ${selectedSnapshot === snap.id ? "text-indigo-400" : "text-white"}`}>
                                      {snap.profileName}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[9px] font-bold text-muted/30 uppercase">{new Date(snap.timestamp).toLocaleDateString()}</span>
                                      <span className="text-[9px] font-bold text-muted/10 uppercase">•</span>
                                      <span className="text-[9px] font-bold text-muted/30 uppercase">{new Date(snap.timestamp).toLocaleTimeString()}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>

                        <button
                          disabled={!selectedSnapshot || saving}
                          onClick={() => handleAction("apply-snapshot", { snapshotId: selectedSnapshot })}
                          className="w-full py-4 bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-indigo-500/30 hover:scale-[1.02] active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 italic"
                        >
                          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <HistoryIcon className="w-4 h-4" />}
                          Restaurar Cápsula Seleccionada
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

          </>
        )}
      </aside>
    </>
  );
}
