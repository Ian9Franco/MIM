"use client";

import React, { useMemo, useState } from "react";
import { ChevronDown, Layout } from "lucide-react";
import { List } from "react-window";
import { ModCard } from "@/components/library/ModCard";
import { useLibraryUI } from "@/hooks/library/useLibraryUI";
import { useLibraryConflictsInternal } from "@/hooks/library/useLibraryConflictsInternal";
import { ModItem } from "./parts/ModItem";
import type { LibraryFile, Project } from "@/lib/types";

interface VirtualizedLibraryProps {
  library: LibraryFile[];
  selectedLibFiles: LibraryFile[];
  setSelectedLibFiles: React.Dispatch<React.SetStateAction<LibraryFile[]>>;
  activeProject: Project | null;
  downloadingMods: Record<string, boolean>;
  modrinthStatus: Record<string, any>;
  ignoredUpdates: Set<string>;
  handleDownloadUpdate: (path: string, url: string, filename: string) => void;
}

/**
 * VirtualizedLibrary — Componente de Gestión Masiva de Mods.
 * ─────────────────────────────────────────────────────────────────────────────
 * Este componente es el núcleo visual de la librería. Implementa dos modos:
 * 1. Modo Plano: Para colecciones pequeñas (<50 mods), permitiendo scroll nativo.
 * 2. Modo Virtualizado: Para colecciones grandes, utilizando 'react-window' para
 *    renderizar solo los elementos en el viewport, manteniendo 60fps constantes.
 * 
 * Responsabilidades:
 * - Agrupar mods por Categoría (.local, .essential, .server) y Subcategoría.
 * - Gestionar la navegación rápida mediante un menú desplegable.
 * - Orquestar la visualización de conflictos y estados de descarga.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function VirtualizedLibrary({
  library, selectedLibFiles, setSelectedLibFiles, activeProject,
  downloadingMods, modrinthStatus, ignoredUpdates, handleDownloadUpdate
}: VirtualizedLibraryProps) {
  
  // Hooks de lógica delegada para mantener el componente visual limpio
  const { getBadge, onOpenDetails } = useLibraryUI(modrinthStatus, ignoredUpdates, handleDownloadUpdate);
  const conflicts = useLibraryConflictsInternal(library);
  const [isNavOpen, setIsNavOpen] = useState(false);

  /**
   * GroupedLibrary: Transforma el array plano de mods en un árbol jerárquico.
   * Esto permite la navegación por secciones (ej: .essential -> librerías).
   */
  const groupedLibrary = useMemo(() => {
    return library.reduce((acc, mod) => {
      const cat = mod.category || "Otros";
      if (!acc[cat]) acc[cat] = {};
      const sub = mod.sub || "general";
      if (!acc[cat][sub]) acc[cat][sub] = [];
      acc[cat][sub].push(mod);
      return acc;
    }, {} as Record<string, Record<string, LibraryFile[]>>);
  }, [library]);

  /**
   * ItemData: Contexto compartido para las filas de la lista virtualizada.
   * Evita la creación de funciones inline durante el scroll, optimizando el rendimiento.
   */
  const itemData = useMemo(() => ({
    mods: library, selectedLibFiles, setSelectedLibFiles, activeProject,
    downloadingMods, modrinthStatus, ignoredUpdates, getBadge, conflicts, onOpenDetails
  }), [library, selectedLibFiles, activeProject, downloadingMods, modrinthStatus, ignoredUpdates, getBadge, conflicts, onOpenDetails]);

  // RENDERIZADO MODO PLANO: Optimizado para UX en colecciones pequeñas
  if (library.length < 50) {
    return (
      <div className="flex flex-col h-full gap-4">
        <div className="flex justify-end shrink-0">
          <div className="relative">
            <button 
              onClick={() => setIsNavOpen(!isNavOpen)} 
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-xs font-medium"
            >
              <Layout className="w-3.5 h-3.5 text-primary" /> Categorías 
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isNavOpen ? 'rotate-180' : ''}`} />
            </button>
            {isNavOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 p-2 rounded-2xl glass z-50 animate-in fade-in zoom-in-95">
                {Object.keys(groupedLibrary).map(cat => (
                  <button 
                    key={cat} 
                    onClick={() => { document.getElementById(`cat-${cat}`)?.scrollIntoView({ behavior: 'smooth' }); setIsNavOpen(false); }} 
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-primary/10 transition-colors text-[10px] font-bold uppercase"
                  >
                    {cat} ({Object.values(groupedLibrary[cat]).flat().length})
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-8 max-h-[680px] overflow-y-auto pr-2 custom-scrollbar">
          {Object.entries(groupedLibrary).map(([category, subGroups]) => (
            <div key={category} id={`cat-${category}`} className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest border-b border-white/5 pb-2 text-primary">{category}</h3>
              <div className="space-y-6">
                {Object.entries(subGroups).map(([sub, mods]) => (
                  <div key={sub}>
                    <h4 className="text-[10px] font-bold opacity-40 uppercase mb-2 ml-2">{sub} ({mods.length})</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {mods.map((f, i) => (
                        <ModCard
                          key={f.path} index={i} name={(f.meta?.modName && f.meta.modName !== "unknown") ? f.meta.modName : f.fileName}
                          version={f.meta?.gameVersion ?? f.meta?.version ?? "unknown"} modVersion={f.meta?.modVersion}
                          projectType={f.meta?.projectType} iconBase64={f.meta?.iconBase64 || modrinthStatus[f.path]?.iconUrl}
                          author={f.meta?.author} loader={f.meta?.loader ?? "unknown"} isSelected={selectedLibFiles.some(s => s.path === f.path)}
                          onClick={() => setSelectedLibFiles(prev => prev.find(s => s.path === f.path) ? prev.filter(s => s.path !== f.path) : [...prev, f])}
                          activeVersion={activeProject?.version ?? ""} activeLoader={activeProject?.loader ?? ""}
                          badgeText={getBadge(f).badgeText} badgeColor={getBadge(f).badgeColor} onDownload={getBadge(f).onDownload}
                          isDownloading={downloadingMods[f.path]} conflict={conflicts[f.path]} onOpenDetails={() => onOpenDetails(f)}
                          environment={f.meta?.environment}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // RENDERIZADO MODO VIRTUALIZADO: Optimizado para escalabilidad masiva (>1000 mods)
  return (
    <div className="space-y-8">
      {Object.entries(groupedLibrary).map(([category, subGroups]) => (
        <div key={category} className="mb-8">
          <h3 className="text-xs font-bold uppercase opacity-50 mb-4 border-l-2 border-primary pl-4">{category}</h3>
          {Object.entries(subGroups).map(([sub, mods]) => (
            <div key={sub} className="mb-6">
              <h4 className="text-[10px] opacity-40 uppercase mb-2 ml-2">{sub} ({mods.length})</h4>
              <div className="border border-dashed border-white/10 rounded-xl p-2 bg-black/5">
                <List
                  rowCount={mods.length}
                  rowHeight={140}
                  rowProps={{ ...itemData, mods }}
                  rowComponent={ModItem as any}
                  style={{ height: Math.min(mods.length * 140, 600), width: '100%' }}
                />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
