"use client";

import { useState } from "react";
import { Settings, Keyboard, Package, History, Upload, Download, AlertTriangle, CheckCircle } from "lucide-react";
import { useTweakPanel } from "@/hooks/tweak/useTweakPanel";
import { KeybindManager } from "./KeybindManager";
import { ResourcePackManager } from "./ResourcePackManager";
import { SnapshotManager } from "./SnapshotManager";
import { OverviewTab } from "./parts/OverviewTab";

interface TweakPanelProps {
  projectName: string;
  version: string;
  loader: string;
}

/**
 * TweakPanel — Panel de control para el ajuste fino del modpack.
 * Gestiona keybinds, resource packs y snapshots de configuración.
 * Permite sincronizar los ajustes locales con la instalación real de Minecraft.
 */
export function TweakPanel({ projectName, version, loader }: TweakPanelProps) {
  const { data, loading, saving, message, externalChange, setExternalChange, fetchData, handleAction } = useTweakPanel(projectName, version, loader);
  const [activeTab, setActiveTab] = useState<string>("overview");

  const resourcePacksWithDraft = data?.resourcePacks ? {
    ...data.resourcePacks,
    draft: data.draft?.resourcePacks || null
  } : null;

  if (loading && !data) {
    return (
      <div className="p-12 text-center opacity-50">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm">Cargando configuración del pack...</p>
      </div>
    );
  }

  const tabs = [
    { id: "overview", label: "Resumen", icon: Settings },
    { id: "keybinds", label: "Teclado", icon: Keyboard },
    { id: "packs", label: "Packs", icon: Package },
    { id: "snapshots", label: "Snapshots", icon: History },
  ];

  return (
    <div className="space-y-4 font-sans">
      {/* External Change Alert */}
      {externalChange && (
        <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-bold">Cambios externos detectados</p>
              <p className="text-[10px] opacity-70">Has modificado los ajustes dentro del juego. ¿Quieres sincronizarlos con MIM?</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => fetchData()} className="px-3 py-1.5 rounded-lg bg-amber-500 text-black text-[10px] font-bold uppercase hover:bg-amber-400 transition-all">
              Sincronizar ahora
            </button>
            <button onClick={() => setExternalChange(false)} className="px-3 py-1.5 rounded-lg bg-white/5 text-amber-400 text-[10px] font-bold uppercase hover:bg-white/10 transition-all">
              Ignorar
            </button>
          </div>
        </div>
      )}

      {/* Header & Tabs */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/5">
          {tabs.map((tab) => (
            <button
              key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${activeTab === tab.id ? "bg-primary text-white shadow-lg" : "opacity-40 hover:opacity-100"}`}
            >
              <tab.icon className="w-3.5 h-3.5" /> {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {data?.optionsExists ? (
            <button onClick={() => handleAction("push-to-minecraft")} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all">
              <Upload className="w-3.5 h-3.5" /> Aplicar al Juego
            </button>
          ) : (
            <button onClick={() => handleAction("initialize")} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase bg-primary text-white">
              <Download className="w-3.5 h-3.5" /> Importar de Minecraft
            </button>
          )}
          <button onClick={() => fetchData()} className="p-2 rounded-xl hover:bg-white/10 opacity-50"><Settings className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div className={`p-3 rounded-xl text-xs font-bold uppercase flex items-center gap-2 animate-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
          {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {/* Content Area */}
      <div className="min-h-[400px]">
        {activeTab === "overview" && data && <OverviewTab data={data} onAction={fetchData} projectName={projectName} version={version} />}
        {activeTab === "keybinds" && data && <KeybindManager keybinds={data.keybinds} grouped={data.keybindsGrouped} conflicts={data.keybindConflicts} suggestions={data.keybindSuggestions} projectName={projectName} version={version} data={data} onUpdate={fetchData} />}
        {activeTab === "packs" && data && <ResourcePackManager resourcePacks={resourcePacksWithDraft} projectName={projectName} version={version} onUpdate={fetchData} />}
        {activeTab === "snapshots" && data && <SnapshotManager snapshots={data.snapshots} projectName={projectName} version={version} loader={loader} onUpdate={fetchData} />}
      </div>
    </div>
  );
}
