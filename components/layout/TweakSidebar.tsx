"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { 
  Settings2, 
  Zap, 
  Keyboard, 
  Package, 
  Save, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  ShieldCheck, 
  Cpu, 
  MousePointer2, 
  History,
  Trash2,
  Download,
  AlertTriangle,
  ChevronRight,
  GripVertical
} from "lucide-react";
import { COLORS } from "@/theme/tokens";
import type { Project, TweakData, Keybind, TweakSnapshot, TweakRecommendation } from "@/lib/types";

interface TweakSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeProject: Project | null;
}

export function TweakSidebar({ isOpen, onClose, activeProject }: TweakSidebarProps) {
  const [activeTab, setActiveTab] = useState<"optimize" | "keybinds" | "resourcepacks" | "profiles">("optimize");

  // Persistence for activeTab
  useEffect(() => {
    const saved = localStorage.getItem("tweak_active_tab");
    if (saved) setActiveTab(saved as any);
  }, []);

  useEffect(() => {
    localStorage.setItem("tweak_active_tab", activeTab);
  }, [activeTab]);

  const [data, setData] = useState<TweakData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Hardware state for recommendations (could be expanded in settings)
  const [hardware, setHardware] = useState({ ram: 8, gpu: "dedicated" });

  // Keybind editing state
  const [listeningKey, setListeningKey] = useState<string | null>(null);
  
  // Undo/Redo history for keybinds
  const [keybindHistory, setKeybindHistory] = useState<Keybind[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [defaultKeybinds, setDefaultKeybinds] = useState<Keybind[] | null>(null);
  
  // Pack changes tracking
  const [hasPackChanges, setHasPackChanges] = useState(false);
  const [draggedPackIdx, setDraggedPackIdx] = useState<number | null>(null);
  
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (isOpen && sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        if (target.closest('[data-header-toggle="true"]')) return;
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  const fetchData = useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tweak?projectName=${activeProject.name}&version=${activeProject.version}&ram=${hardware.ram}&gpu=${hardware.gpu}&loader=${activeProject.loader || "forge"}`);
      const json = await res.json();
      if (res.ok) {
        setData(json);
        // Save defaults on first load
        if (!defaultKeybinds && json.keybinds?.length > 0) {
          setDefaultKeybinds(JSON.parse(JSON.stringify(json.keybinds)));
        }
        // Initialize history if empty
        if (keybindHistory.length === 0 && json.keybinds?.length > 0) {
          setKeybindHistory([JSON.parse(JSON.stringify(json.keybinds))]);
          setHistoryIndex(0);
        }
      }
    } catch (err) {
      console.error("Error fetching tweak data:", err);
    } finally {
      setLoading(false);
    }
  }, [activeProject, hardware, defaultKeybinds, keybindHistory.length]);

  useEffect(() => {
    if (isOpen && activeProject) {
      fetchData();
    }
  }, [isOpen, activeProject, fetchData]);

  const handleAction = async (action: string, extra: any = {}, options: { skipFetch?: boolean } = {}) => {
    if (!activeProject) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/tweak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: activeProject.name,
          version: activeProject.version,
          action,
          ...extra
        })
      });
      const json = await res.json();
      if (res.ok) {
        setMessage({ text: json.message || "Acción completada con éxito", type: "success" });
        // Only fetch if not skipped (prevents flicker on save actions)
        if (!options.skipFetch) {
          fetchData();
        }
      } else {
        setMessage({ text: json.error || "Error al procesar la acción", type: "error" });
      }
    } catch (err) {
      setMessage({ text: "Error de conexión", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  // Keyboard listener for keybind editing
  useEffect(() => {
    if (!listeningKey) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Convert JS key code to MC format
      let mcKey: string;
      // ESCAPE clears the keybind (no key assigned)
      if (e.code === "Escape") {
        mcKey = "key.keyboard.none";
      } else {
        mcKey = `key.keyboard.${e.code.replace("Key", "").toLowerCase()}`;
        if (e.code.startsWith("Digit")) mcKey = `key.keyboard.${e.code.replace("Digit", "")}`;
        if (e.code === "Space") mcKey = "key.keyboard.space";
        if (e.code === "Tab") mcKey = "key.keyboard.tab";
      }

      // Apply the change locally for instant feedback
      setData(prev => {
        if (!prev) return null;
        const newKeybinds = prev.keybinds.map(kb => kb.id === listeningKey ? { ...kb, key: mcKey } : kb);
        
        // Add to history
        setTimeout(() => addToHistory(newKeybinds), 0);
        
        return {
          ...prev,
          keybinds: newKeybinds
        };
      });

      // Save to backend with all keybinds (backend needs full list)
      const updatedKeybinds = data?.keybinds.map(kb => ({
        id: kb.id,
        key: kb.id === listeningKey ? mcKey : kb.key
      })) || [];
      
      // Call save (skip fetch to prevent flicker, we already updated local state)
      setTimeout(() => {
        handleAction("save", { keybinds: updatedKeybinds }, { skipFetch: true });
      }, 50);
      
      setListeningKey(null);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [listeningKey, activeProject]);

  // Add to history when keybinds change
  const addToHistory = (newKeybinds: Keybind[]) => {
    const newHistory = keybindHistory.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(newKeybinds)));
    // Keep only last 20 states
    if (newHistory.length > 20) newHistory.shift();
    setKeybindHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // Undo function
  const handleUndo = () => {
    if (historyIndex > 0 && data) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const prevKeybinds = keybindHistory[newIndex];
      setData({ ...data, keybinds: JSON.parse(JSON.stringify(prevKeybinds)) });
      setMessage({ text: "Cambio deshecho (Ctrl+Z)", type: "success" });
    }
  };

  // Redo function
  const handleRedo = () => {
    if (historyIndex < keybindHistory.length - 1 && data) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const nextKeybinds = keybindHistory[newIndex];
      setData({ ...data, keybinds: JSON.parse(JSON.stringify(nextKeybinds)) });
      setMessage({ text: "Cambio re-hecho (Ctrl+Y)", type: "success" });
    }
  };

  // Reset to defaults
  const handleResetDefault = async () => {
    if (!data || !defaultKeybinds) return;
    if (!confirm("¿Estás seguro de que querés resetear todos los keybinds a los valores por defecto?")) return;
    
    const resetKeybinds = JSON.parse(JSON.stringify(defaultKeybinds));
    setData({ ...data, keybinds: resetKeybinds });
    addToHistory(resetKeybinds);
    
    // Save to backend
    const keybindsToSave = resetKeybinds.map((kb: Keybind) => ({ id: kb.id, key: kb.key }));
    await handleAction("save", { keybinds: keybindsToSave });
    setMessage({ text: "Keybinds reseteados a default", type: "success" });
  };

  // Manual save all keybinds
  const handleSaveAllKeybinds = async () => {
    if (!data) return;
    const keybindsToSave = data.keybinds.map(kb => ({ id: kb.id, key: kb.key }));
    await handleAction("save", { keybinds: keybindsToSave }, { skipFetch: true });
  };

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTab !== "keybinds") return;
      if (e.ctrlKey && e.key === "z") {
        e.preventDefault();
        handleUndo();
      } else if (e.ctrlKey && (e.key === "y" || (e.shiftKey && e.key === "z"))) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, historyIndex, keybindHistory, data]);

  const movePack = (index: number, direction: "up" | "down") => {
    if (!data) return;
    const newActive = [...data.resourcePacks.active];
    // In visual: "up" = higher priority = later in array (higher index)
    // So "up" in UI means moving toward end of array
    const newIdx = direction === "up" ? index + 1 : index - 1;
    if (newIdx < 0 || newIdx >= newActive.length) return;
    
    [newActive[index], newActive[newIdx]] = [newActive[newIdx], newActive[index]];
    setData({ ...data, resourcePacks: { ...data.resourcePacks, active: newActive } });
    setHasPackChanges(true);
  };

  const togglePack = (pack: string, add: boolean) => {
    if (!data) return;
    let newActive = [...data.resourcePacks.active];
    if (add) {
      if (!newActive.includes(pack)) newActive.push(pack); // Add at the end = highest priority
    } else {
      newActive = newActive.filter(p => p !== pack);
    }
    setData({ ...data, resourcePacks: { ...data.resourcePacks, active: newActive } });
    setHasPackChanges(true);
  };

  const handleSavePacks = async () => {
    if (!data || !activeProject) return;
    setSaving(true);
    try {
      const res = await fetch("/api/tweak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: activeProject.name,
          version: activeProject.version,
          action: "save",
          resourcePacks: data.resourcePacks.active,
        }),
      });
      if (res.ok) {
        setHasPackChanges(false);
        setMessage({ text: "Orden de resource packs guardado", type: "success" });
        // No fetchData() to prevent flicker - state already updated locally
      } else {
        setMessage({ text: "Error al guardar", type: "error" });
      }
    } catch {
      setMessage({ text: "Error de conexión", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleApplyToGame = async () => {
    if (!activeProject) return;
    setSaving(true);
    try {
      const res = await fetch("/api/tweak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: activeProject.name,
          version: activeProject.version,
          action: "push-to-minecraft",
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setMessage({ text: json.message || "Configuración aplicada al juego", type: "success" });
      } else {
        setMessage({ text: json.error || "Error al aplicar", type: "error" });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSyncResourcepacks = async () => {
    if (!activeProject) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/tweak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: activeProject.name,
          version: activeProject.version,
          action: "sync-resourcepacks",
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setMessage({ text: json.message || "Sincronización completada", type: "success" });
        fetchData(); // Refresh to show updated pack list
      } else {
        setMessage({ text: json.error || "Error al sincronizar", type: "error" });
      }
    } catch {
      setMessage({ text: "Error de conexión", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  // Drag and drop handlers for resource packs
  const handleDragStartPack = (e: React.DragEvent, visualIndex: number) => {
    setDraggedPackIdx(visualIndex);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOverPack = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDropPack = (e: React.DragEvent, targetVisualIndex: number) => {
    e.preventDefault();
    if (draggedPackIdx === null || draggedPackIdx === targetVisualIndex || !data) return;

    const active = [...data.resourcePacks.active];
    // Convert visual indices to array indices
    // visual index 0 = last element in array (highest priority)
    const sourceArrayIdx = active.length - 1 - draggedPackIdx;
    const targetArrayIdx = active.length - 1 - targetVisualIndex;

    // Reorder
    const [moved] = active.splice(sourceArrayIdx, 1);
    active.splice(targetArrayIdx, 0, moved);

    setData({ ...data, resourcePacks: { ...data.resourcePacks, active } });
    setHasPackChanges(true);
    setDraggedPackIdx(null);
  };

  const handleDragEndPack = () => {
    setDraggedPackIdx(null);
  };

  return (
    <aside 
      ref={sidebarRef}
      className={`fixed inset-y-0 right-0 w-100 z-100 flex flex-col shadow-2xl border-l transition-all duration-800 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
        isOpen ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      }`}
      style={{ 
        background: "var(--glass-bg)",
        borderColor: "var(--glass-border)",
        backdropFilter: "var(--liquid-blur)",
        boxShadow: "var(--shadow-drop)",
      }}
    >
      {/* Header */}
      <div className="p-6 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Settings2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-subhead text-white leading-none">TWEAK</h2>
            <p className="text-xs text-muted mt-1 uppercase tracking-wider font-label">Tuning Workspace</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {data?.optionsExists && (
            <button
              onClick={handleApplyToGame}
              disabled={saving}
              className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white rounded-lg text-xs font-label transition-all duration-300 ease-out flex items-center gap-1.5 border border-emerald-500/30 hover:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
              title="Copiar options.txt al juego de Minecraft"
            >
              <Download className={`w-3.5 h-3.5 ${saving ? 'animate-pulse' : 'group-hover:animate-bounce'}`} />
              {saving ? "Aplicando..." : "Aplicar al Juego"}
            </button>
          )}
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-white/5 flex items-center justify-center transition-colors text-muted hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {!activeProject ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
          <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center mb-6 opacity-20">
            <AlertCircle className="w-10 h-10" />
          </div>
          <h3 className="text-lg font-subhead text-white mb-2">No hay proyecto activo</h3>
          <p className="text-sm text-muted">Seleccioná un proyecto para poder ajustar sus configuraciones y optimizarlo.</p>
        </div>
      ) : loading && !data ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <RefreshCw className="w-8 h-8 text-primary animate-spin mb-4" />
          <p className="text-sm text-muted font-label">Analizando opciones...</p>
        </div>
      ) : !data?.optionsExists ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
          <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center mb-6 text-primary">
            <Zap className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-subhead text-white mb-2">Inicializar TWEAK</h3>
          <p className="text-sm text-muted mb-8">No detectamos un archivo <code className="text-primary/80">options.txt</code> en este proyecto. Podemos crearlo ahora o importar el tuyo de Minecraft Vanilla.</p>
          <button 
            disabled={saving}
            onClick={() => handleAction("initialize")}
            className="w-full py-3 bg-primary text-white rounded-xl font-subhead hover:bg-primary/80 transition-all duration-300 ease-out flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 group shadow-lg shadow-primary/20 hover:shadow-primary/40"
          >
            {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5 group-hover:animate-pulse" />}
            Inicializar Perfil
          </button>
        </div>
      ) : (
        <>
          {/* Navigation Tabs */}
          <div className="flex px-4 pt-2 border-b border-white/5 gap-1">
            {[
              { id: "optimize", icon: Zap, label: "Optimizar" },
              { id: "keybinds", icon: Keyboard, label: "Teclas" },
              { id: "resourcepacks", icon: Package, label: "Packs" },
              { id: "profiles", icon: History, label: "Perfiles" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex flex-col items-center py-3 px-1 rounded-t-xl transition-all duration-300 ease-out relative hover:scale-105 active:scale-95 ${
                  activeTab === tab.id ? "text-primary bg-white/5" : "text-muted hover:text-white hover:bg-white/5"
                }`}
              >
                <tab.icon className={`w-5 h-5 mb-1 transition-all duration-300 ${activeTab === tab.id ? "animate-pulse scale-110" : "group-hover:scale-110"}`} />
                <span className="text-[10px] font-label uppercase tracking-tighter transition-all duration-300">{tab.label}</span>
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full animate-in slide-in-from-left-2 duration-300" />
                )}
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
            {message && (
              <div className={`p-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-4 ${
                message.type === "success" ? "bg-green-500/10 border border-green-500/20 text-green-400" : "bg-red-500/10 border border-red-500/20 text-red-400"
              }`}>
                {message.type === "success" ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
                <p className="text-sm">{message.text}</p>
              </div>
            )}

            {/* Tab 1: Optimize */}
            {activeTab === "optimize" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <section>
                  <h4 className="text-xs font-label text-muted uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Cpu className="w-3.5 h-3.5" /> Hardware Analysis
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                      <p className="text-[10px] text-muted font-label uppercase">RAM Asignada</p>
                      <p className="text-lg font-subhead text-white">{hardware.ram} GB</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                      <p className="text-[10px] text-muted font-label uppercase">GPU Detectada</p>
                      <p className="text-xs font-subhead text-white truncate">{hardware.gpu === "integrated" ? "Integrada" : "Dedicada"}</p>
                    </div>
                  </div>
                </section>

                <section>
                  <h4 className="text-xs font-label text-muted uppercase tracking-widest mb-4 flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5" /> Recomendaciones Smart
                  </h4>
                  <div className="space-y-3">
                    {data.recommendations.length > 0 ? data.recommendations.map((rec, i) => (
                      <div key={i} className="p-4 rounded-2xl bg-primary/5 border border-primary/10 group hover:border-primary/30 transition-all">
                        <div className="flex justify-between items-start mb-2">
                          <h5 className="text-sm font-subhead text-white">{rec.title}</h5>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-label uppercase ${
                            rec.impact === "high" ? "bg-red-500/20 text-red-400" : rec.impact === "medium" ? "bg-orange-500/20 text-orange-400" : "bg-blue-500/20 text-blue-400"
                          }`}>
                            Impacto {rec.impact}
                          </span>
                        </div>
                        <p className="text-xs text-muted mb-4 leading-relaxed">{rec.desc}</p>
                        <button 
                          onClick={() => handleAction("save", { settings: { [rec.settingKey]: rec.recommendedValue } })}
                          className="w-full py-2 bg-primary/20 hover:bg-primary text-primary hover:text-white text-[11px] font-subhead rounded-lg transition-all"
                        >
                          Aplicar Mejora
                        </button>
                      </div>
                    )) : (
                      <div className="p-8 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">
                        <CheckCircle2 className="w-8 h-8 text-green-500/50 mx-auto mb-3" />
                        <p className="text-sm text-muted">Tu perfil parece estar bien optimizado.</p>
                      </div>
                    )}
                  </div>
                </section>

                <section>
                  <h4 className="text-xs font-label text-muted uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5" /> Quick Presets
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: "increase-fps", label: "Máximos FPS", desc: "Reduce visuales" },
                      { id: "reduce-stuttering", label: "Más Fluidez", desc: "Estabiliza frames" },
                      { id: "shaders-opt", label: "Shader Opt", desc: "Calidad Ultra" },
                      { id: "vram-low", label: "VRAM Baja", desc: "Para graficas 2GB" },
                    ].map((p) => (
                      <button 
                        key={p.id}
                        onClick={() => handleAction("apply-preset", { presetName: p.id })}
                        className="p-3 text-left rounded-2xl bg-white/5 border border-white/5 hover:border-primary/40 hover:bg-primary/5 transition-all group"
                      >
                        <p className="text-sm font-subhead text-white group-hover:text-primary transition-colors">{p.label}</p>
                        <p className="text-[10px] text-muted mt-1">{p.desc}</p>
                      </button>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {/* Tab 2: Keybinds */}
            {activeTab === "keybinds" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* Undo/Redo/Reset Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleUndo}
                      disabled={historyIndex <= 0}
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-muted hover:text-white text-xs font-label transition-all duration-200 ease-out disabled:opacity-30 hover:scale-105 active:scale-95 disabled:hover:scale-100 group"
                      title="Deshacer (Ctrl+Z)"
                    >
                      <span className={`${historyIndex > 0 ? 'group-hover:-translate-x-0.5' : ''} transition-transform duration-200`}>↩</span> Undo
                    </button>
                    <button
                      onClick={handleRedo}
                      disabled={historyIndex >= keybindHistory.length - 1}
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-muted hover:text-white text-xs font-label transition-all duration-200 ease-out disabled:opacity-30 hover:scale-105 active:scale-95 disabled:hover:scale-100 group"
                      title="Rehacer (Ctrl+Y)"
                    >
                      Redo <span className={`${historyIndex < keybindHistory.length - 1 ? 'group-hover:translate-x-0.5' : ''} transition-transform duration-200`}>↪</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveAllKeybinds}
                      disabled={saving}
                      className="px-3 py-1.5 bg-primary/20 hover:bg-primary text-primary hover:text-white rounded-xl text-xs font-subhead transition-all duration-300 ease-out flex items-center justify-center gap-2 border border-primary/30 hover:border-primary disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 group"
                      title="Guardar todos los keybinds ahora"
                    >
                      <span className={`${saving ? 'animate-pulse' : 'group-hover:animate-pulse'}`}>
                        {saving ? "⏳" : "💾"}
                      </span>
                      {saving ? "Guardando..." : "Guardar"}
                    </button>
                    <button
                      onClick={handleResetDefault}
                      disabled={saving}
                      className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded-xl text-xs font-subhead transition-all duration-300 ease-out border border-rose-500/20 hover:border-rose-500 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 group"
                      title="Resetear a valores por defecto"
                    >
                      <span className={`${saving ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform duration-300`}>↺</span>
                      Reset Default
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-label text-muted uppercase tracking-widest flex items-center gap-2">
                    <Keyboard className="w-3.5 h-3.5" /> Smart Keybind Manager
                  </h4>
                  <div className="flex gap-2">
                    {/* Conflict Badge */}
                    {(() => {
                      const keyMap: Record<string, string[]> = {};
                      data.keybinds.forEach(kb => {
                        if (kb.key && kb.key !== "key.keyboard.none") {
                          keyMap[kb.key] = keyMap[kb.key] || [];
                          keyMap[kb.key].push(kb.name);
                        }
                      });
                      const conflicts = Object.values(keyMap).filter(names => names.length > 1).length;
                      return conflicts > 0 ? (
                        <div className="px-2 py-0.5 bg-red-500/20 border border-red-500/40 rounded-full flex items-center gap-1.5 animate-pulse">
                          <AlertTriangle className="w-3 h-3 text-red-400" />
                          <span className="text-[9px] font-bold text-red-400 uppercase tracking-tighter">{conflicts} Conflictos</span>
                        </div>
                      ) : (
                        <div className="px-2 py-0.5 bg-green-500/10 border border-green-500/30 rounded-full flex items-center gap-1.5">
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                          <span className="text-[9px] font-bold text-green-500 uppercase tracking-tighter">Sin Conflictos</span>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Buscar tecla o mod..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-muted focus:outline-none focus:border-primary/50 transition-all"
                  />
                  <div className="absolute right-4 top-3.5 text-muted opacity-50">
                    <Keyboard className="w-4 h-4" />
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Highlight Conflicts Section */}
                  {(() => {
                    const keyMap: Record<string, Keybind[]> = {};
                    data.keybinds.forEach(kb => {
                      if (kb.key && kb.key !== "key.keyboard.none") {
                        keyMap[kb.key] = keyMap[kb.key] || [];
                        keyMap[kb.key].push(kb);
                      }
                    });
                    const conflicts = Object.entries(keyMap).filter(([_, kbs]) => kbs.length > 1);
                    
                    if (conflicts.length > 0) {
                      return (
                        <div className="space-y-2">
                          <h5 className="text-[10px] font-label text-red-400 uppercase ml-2 tracking-widest flex items-center gap-2">
                            <AlertTriangle className="w-3 h-3" /> Conflictos Detectados
                          </h5>
                          <div className="space-y-2">
                            {conflicts.map(([key, kbs], idx) => (
                              <div key={idx} className="p-3 bg-red-500/5 border border-red-500/20 rounded-2xl">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-[10px] font-bold rounded-lg uppercase border border-red-500/30">
                                    Tecla: {key.replace("key.keyboard.", "").toUpperCase()}
                                  </span>
                                  <span className="text-[9px] text-red-400/60 font-label italic">{kbs.length} acciones asignadas</span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {kbs.map((kb, kidx) => (
                                    <span key={kidx} className="text-[11px] text-white/80 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">{kb.name}</span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Categorize keybinds */}
                  {Object.entries(
                    data.keybinds.reduce((acc, kb) => {
                      acc[kb.category] = acc[kb.category] || [];
                      acc[kb.category].push(kb);
                      return acc;
                    }, {} as Record<string, Keybind[]>)
                  ).map(([category, items]) => (
                    <div key={category} className="space-y-2">
                      <h5 className="text-[10px] font-label text-muted/60 uppercase ml-2 tracking-widest">{category}</h5>
                      <div className="bg-white/5 rounded-2xl border border-white/5 divide-y divide-white/5 overflow-hidden">
                        {items.map((kb) => (
                          <div key={kb.id} className="p-3 flex items-center justify-between group hover:bg-white/5 transition-all">
                            <span className="text-sm text-white/90 font-body">{kb.name}</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setListeningKey(kb.id)}
                                className={`px-2 py-1 rounded-lg border text-[10px] font-label uppercase min-w-15 text-center transition-all duration-200 ease-out hover:scale-105 active:scale-95 ${
                                  listeningKey === kb.id 
                                    ? "bg-primary border-primary text-white animate-pulse scale-110" 
                                    : "bg-white/10 border-white/10 text-white group-hover:border-primary/30 group-hover:bg-white/20"
                                }`}
                              >
                                {listeningKey === kb.id ? "???" : kb.key.replace("key.keyboard.", "").replace("key.mouse.", "M").toUpperCase()}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 3: Resource Packs */}
            {activeTab === "resourcepacks" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <section className="p-4 rounded-3xl bg-indigo-500/5 border border-indigo-500/20">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                      <RefreshCw className="w-5 h-5" />
                    </div>
                    <div>
                      <h5 className="text-sm font-subhead text-white">Sincronizar Resource Packs</h5>
                      <p className="text-[10px] text-muted">
                        Envía los packs del proyecto al juego · Recupera los del juego al proyecto.
                      </p>
                    </div>
                  </div>
                  <button 
                    disabled={saving}
                    onClick={handleSyncResourcepacks}
                    className="w-full py-3 bg-indigo-500/20 hover:bg-indigo-500 text-indigo-400 hover:text-white rounded-xl text-xs font-subhead transition-all duration-300 flex items-center justify-center gap-2 border border-indigo-500/30 hover:border-indigo-500 disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99]"
                  >
                    {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
                    {saving ? "Sincronizando..." : "Sincronizar con el Juego ↕"}
                  </button>
                  <p className="text-[9px] text-muted/50 mt-3 text-center px-4 leading-tight italic">
                    Push: copia los packs del proyecto a .minecraft · Pull: recupera los del juego al proyecto.
                  </p>
                </section>

                {/* Shader Viewer — read-only listing of .minecraft/shaderpacks */}
                {data.shadersInGame && (
                  <section className="p-4 rounded-3xl bg-purple-500/5 border border-purple-500/20 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                        <Cpu className="w-5 h-5" />
                      </div>
                      <div>
                        <h5 className="text-sm font-subhead text-white">Shaders en el Juego</h5>
                        <p className="text-[10px] text-muted">
                          Shaders instalados en .minecraft/shaderpacks (solo lectura).
                        </p>
                      </div>
                    </div>
                    {data.shadersInGame.length === 0 ? (
                      <p className="text-[10px] text-muted/50 text-center italic py-2">
                        No hay shaders instalados en el juego.
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {data.shadersInGame.map((shader, idx) => (
                          <div key={idx} className="flex items-center justify-between px-3 py-2 rounded-xl bg-purple-500/8 border border-purple-500/15">
                            <span className="text-[11px] font-mono text-purple-200/80 truncate flex-1 mr-2">{shader.name}</span>
                            <span className="text-[9px] text-purple-400/60 shrink-0 font-label">
                              {(shader.size / 1024 / 1024).toFixed(1)} MB
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                )}


                {/* Save Changes & Apply Buttons */}
                {hasPackChanges && (
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={handleSavePacks}
                      disabled={saving}
                      className="flex-1 py-2.5 bg-amber-500/20 hover:bg-amber-500 text-amber-400 hover:text-white rounded-xl text-xs font-subhead transition-all duration-300 ease-out flex items-center justify-center gap-2 border border-amber-500/30 hover:border-amber-500 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 group"
                    >
                      <Save className={`w-4 h-4 ${saving ? 'animate-pulse' : 'group-hover:animate-bounce'}`} />
                      {saving ? "Guardando..." : "Guardar Cambios"}
                    </button>
                    <button
                      onClick={handleApplyToGame}
                      disabled={saving}
                      className="flex-1 py-2.5 bg-primary/20 hover:bg-primary text-primary hover:text-white rounded-xl text-xs font-subhead transition-all duration-300 ease-out flex items-center justify-center gap-2 border border-primary/30 hover:border-primary disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 group"
                    >
                      <Download className={`w-4 h-4 ${saving ? 'animate-pulse' : 'group-hover:animate-bounce'}`} />
                      Aplicar al Juego
                    </button>
                  </div>
                )}

                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xs font-label text-muted uppercase tracking-widest flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Visual Priority Stack
                    </h4>
                    <span className="text-[9px] font-bold text-primary/50 uppercase tracking-tighter">↑ Más Prioridad</span>
                  </div>
                  
                  {/* Priority Legend */}
                  <div className="flex items-center gap-2 mb-3 text-[10px] text-muted/60">
                    <span className="text-emerald-400">●</span>
                    <span>Baja prioridad (abajo)</span>
                    <span className="mx-1">→</span>
                    <span className="text-primary">●</span>
                    <span>Alta prioridad (arriba, gana)</span>
                  </div>
                  
                  <div className="space-y-2">
                    {data.resourcePacks.active.length > 0 ? (
                      // We show the array in reverse order because the LAST item has HIGHEST priority
                      [...data.resourcePacks.active].reverse().map((pack, reverseIdx) => {
                        const originalIdx = data.resourcePacks.active.length - 1 - reverseIdx;
                        const lowerPacks = data.resourcePacks.active.slice(0, originalIdx);
                        
                        // Rule detection
                        let warning = null;
                        if (pack.toLowerCase().includes("moves") && lowerPacks.some(p => p.toLowerCase().includes("animations"))) {
                          warning = "Fresh Animations debería estar ARRIBA de Fresh Moves";
                        }

                        return (
                          <div key={originalIdx} className="space-y-1">
                            <div 
                              draggable
                              onDragStart={(e) => handleDragStartPack(e, reverseIdx)}
                              onDragOver={handleDragOverPack}
                              onDrop={(e) => handleDropPack(e, reverseIdx)}
                              onDragEnd={handleDragEndPack}
                              className={`flex items-center gap-3 p-3 bg-primary/10 border border-primary/20 rounded-2xl group animate-in slide-in-from-right-4 cursor-move transition-all ${
                                draggedPackIdx === reverseIdx ? "opacity-50" : ""
                              }`}
                            >
                              {/* Drag Handle */}
                              <div className="text-muted/50 group-hover:text-primary transition-colors">
                                <GripVertical className="w-4 h-4" />
                              </div>

                              {/* Arrow Controls */}
                              <div className="flex flex-col gap-1">
                                <button 
                                  onClick={() => movePack(originalIdx, "up")}
                                  disabled={originalIdx === data.resourcePacks.active.length - 1}
                                  className="p-0.5 text-muted hover:text-primary disabled:opacity-0 transition-all"
                                  title="Aumentar prioridad"
                                >
                                  <ChevronRight className="w-3 h-3 -rotate-90" />
                                </button>
                                <button 
                                  onClick={() => movePack(originalIdx, "down")}
                                  disabled={originalIdx === 0}
                                  className="p-0.5 text-muted hover:text-primary disabled:opacity-0 transition-all"
                                  title="Disminuir prioridad"
                                >
                                  <ChevronRight className="w-3 h-3 rotate-90" />
                                </button>
                              </div>

                              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                                <span className="text-xs font-bold text-primary/70">{data.resourcePacks.active.length - reverseIdx}</span>
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-white truncate">{pack.replace("file/", "").replace(/\.zip$/, "")}</p>
                                {reverseIdx === 0 && <span className="text-[9px] text-primary font-bold uppercase tracking-widest opacity-60">Prioridad Máxima</span>}
                              </div>

                              <button 
                                onClick={() => togglePack(pack, false)}
                                className="p-2 text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            {warning && (
                              <div className="mx-4 p-2 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 animate-pulse">
                                <AlertTriangle className="w-3 h-3 text-red-400" />
                                <span className="text-[10px] text-red-400 font-medium">{warning}</span>
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-muted italic p-4 text-center">No hay packs activos. Minecraft usará los recursos base.</p>
                    )}
                  </div>
                  {data.resourcePacks.active.length > 0 && (
                    <p className="text-[9px] text-muted/40 mt-3 text-right italic">↓ Menos Prioridad</p>
                  )}
                </section>

                <section>
                  <h4 className="text-xs font-label text-muted uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Download className="w-3.5 h-3.5" /> Disponibles en Proyecto
                  </h4>
                  <div className="space-y-2">
                    {data.resourcePacks.available.filter(p => !data.resourcePacks.active.includes(`file/${p}`) && p !== "vanilla" && p !== "mod_resources").map((pack, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-2xl group hover:border-primary/30 transition-all">
                        <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                          <Package className="w-5 h-5 text-muted" />
                        </div>
                        <span className="text-sm text-white/70 flex-1 truncate">{pack}</span>
                        <button 
                          onClick={() => togglePack(`file/${pack}`, true)}
                          className="p-2 text-primary hover:scale-110 transition-all"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {/* Tab 4: Profiles */}
            {activeTab === "profiles" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="p-6 rounded-3xl bg-primary/10 border border-primary/20 text-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-1 bg-primary text-white text-[8px] font-label uppercase px-2 rounded-bl-lg">Snapshot System</div>
                  <h4 className="text-lg font-subhead text-white mb-2">Congelar Estado</h4>
                  <p className="text-xs text-muted mb-6">Guardá tus binds y optimizaciones actuales en un snapshot para recuperarlos después.</p>
                  
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      id="snapName"
                      placeholder="Nombre (ej. PvP, Survival...)"
                      className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-primary/50"
                    />
                    <button 
                      onClick={() => {
                        const input = document.getElementById("snapName") as HTMLInputElement;
                        if (input.value) handleAction("save-snapshot", { snapshotName: input.value });
                      }}
                      className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-subhead hover:bg-primary/90 transition-all"
                    >
                      Guardar
                    </button>
                  </div>
                </div>

                {/* Restore Original Minecraft Options */}
                <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-sm font-subhead text-white">Restaurar Original</h5>
                      <p className="text-[10px] text-muted mt-1">Volver al options.txt original del juego (backup)</p>
                    </div>
                    <button
                      onClick={async () => {
                        if (!confirm("¿Restaurar el options.txt original del juego? Se perderán los cambios actuales del proyecto.")) return;
                        setSaving(true);
                        try {
                          const res = await fetch("/api/tweak", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              projectName: activeProject.name,
                              version: activeProject.version,
                              action: "restore-original-backup",
                            }),
                          });
                          const json = await res.json();
                          if (res.ok) {
                            setMessage({ text: "Original restaurado al proyecto", type: "success" });
                            fetchData();
                          } else {
                            setMessage({ text: json.error || "Error al restaurar", type: "error" });
                          }
                        } catch {
                          setMessage({ text: "Error de conexión", type: "error" });
                        } finally {
                          setSaving(false);
                        }
                      }}
                      disabled={saving}
                      className="px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded-lg text-xs font-label transition-all border border-indigo-500/30"
                    >
                      {saving ? "Restaurando..." : "↺ Restaurar Original"}
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-label text-muted uppercase tracking-widest ml-2">Historial de Snapshots</h4>
                  {data.snapshots.length > 0 ? data.snapshots.map((snap, i) => {
                    // Fix date parsing - handle both string dates and invalid dates
                    const dateValue = snap.createdAt;
                    const dateObj = dateValue ? new Date(dateValue) : null;
                    const isValidDate = dateObj && !isNaN(dateObj.getTime());
                    
                    return (
                      <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/5 group hover:border-primary/30 transition-all">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h5 className="text-sm font-subhead text-white group-hover:text-primary transition-colors">{snap.name}</h5>
                            <p className="text-[10px] text-muted mt-1 font-label">
                              {isValidDate 
                                ? `${dateObj.toLocaleDateString()} - ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                : "Fecha desconocida"
                              }
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleAction("load-snapshot", { snapshotName: snap.name })}
                              className="p-2 rounded-lg bg-white/10 text-white hover:bg-amber-500 hover:text-white transition-colors"
                              title="Cargar al proyecto (para editar)"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleAction("restore-snapshot", { snapshotName: snap.name })}
                              className="p-2 rounded-lg bg-white/10 text-white hover:bg-primary transition-colors"
                              title="Restaurar al proyecto"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleAction("delete-snapshot", { snapshotName: snap.name })}
                              className="p-2 rounded-lg bg-white/10 text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleAction("load-snapshot", { snapshotName: snap.name })}
                            className="flex-1 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg text-[10px] font-label transition-all border border-amber-500/20"
                          >
                            Cargar para Editar
                          </button>
                          <button
                            onClick={() => handleAction("push-snapshot-to-game", { snapshotName: snap.name })}
                            disabled={saving}
                            className="flex-1 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-[10px] font-label transition-all border border-emerald-500/20"
                          >
                            Cargar y Enviar al Juego
                          </button>
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="p-12 text-center text-muted font-label border border-dashed border-white/10 rounded-2xl">
                      No hay snapshots guardados.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer Save Button (Only for relevant tabs) */}
          {(activeTab === "optimize" || activeTab === "keybinds" || activeTab === "resourcepacks") && (
            <div className="p-6 border-t border-white/5">
              <button 
                disabled={saving}
                onClick={() => handleAction("save", { 
                  resourcePacks: data.resourcePacks.active,
                  keybinds: data.keybinds
                })}
                className="w-full py-4 bg-primary text-white rounded-2xl font-subhead hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-3 active:scale-[0.98]"
              >
                {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Guardar Cambios del Proyecto
              </button>
            </div>
          )}
        </>
      )}
    </aside>
  );
}
