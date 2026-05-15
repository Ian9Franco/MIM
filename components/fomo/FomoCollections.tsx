/**
 * MIM — FOMO Collections
 * Optimized for v5.9: Modularized into hooks and components.
 */

"use client";

import React, { memo, useCallback } from "react";
import { Library, Plus, ChevronRight, X, Loader2, ArrowLeft, Download, Grid } from "lucide-react";
import { COLORS } from "@/theme/tokens";
import { useFomoCollectionsManager } from "@/hooks/useFomoCollectionsManager";
import { CollectionCard } from "./FomoCollectionsComponents";
import { FomoSkeleton } from "./FomoSkeleton";
import { FomoModCard } from "./FomoModCard";
import type { CollectionEntry, ModHit } from "@/lib/types";

export const FomoCollections = memo(function FomoCollections({
  loader, gameVersion, onStatus, onDownloadMod, onOpenVersions, selectedMods = [], onToggleSelect, isDetailsOpen = false, sinytraActive = false
}: any) {
  const m = useFomoCollectionsManager(loader, gameVersion, onStatus);
  const [showAllOfficial, setShowAllOfficial] = React.useState(false);
  const [showAllLocal, setShowAllLocal] = React.useState(false);
  const [showAllModrinth, setShowAllModrinth] = React.useState(false);

  if (m.loading) return <FomoSkeleton message="Cargando colecciones..." />;

  if (m.viewing) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center gap-2 p-4 border-b shrink-0" style={{ borderColor: COLORS.border }}>
          <button onClick={() => m.setViewing(null)} className="p-1.5 rounded-lg hover:bg-white/10"><ArrowLeft className="w-4 h-4" /></button>
          <div className="flex-1 min-w-0">
            <h3 className="font-headline text-sm truncate">{m.viewing.name}</h3>
            <p className="text-[10px] opacity-60 truncate">{m.viewing.description || "Sin descripción"}</p>
          </div>
          <button onClick={() => m.handleDownloadColl(m.viewing!)} disabled={!!m.collDl} className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shrink-0">
            {m.collDl === m.viewing.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "↓ Descargar todos"}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {m.viewLoading ? <FomoSkeleton count={6} /> : m.viewMods.length > 0 ? m.viewMods.map(mod => <FomoModCard key={mod.projectId} mod={mod} isDownloading={!!m.collDl} onDownload={onDownloadMod} onOpenVersions={onOpenVersions} isSelected={selectedMods.some((s: any) => s.projectId === mod.projectId)} onToggleSelect={onToggleSelect} sinytraActive={sinytraActive} onAddToCollection={() => {}} />) : (
            <div className="col-span-full py-12 flex flex-col items-center justify-center opacity-40">
              <Library className="w-12 h-12 mb-4" />
              <p className="text-sm font-medium">Esta colección está vacía</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const followed = m.collections.find(c => c.id === "followed-projects");
  const localColls = m.collections.filter(c => c.isLocal && c.id !== "followed-projects");
  const modrinthColls = m.collections.filter(c => !c.isLocal && c.id !== "followed-projects");

  const renderSection = (title: string, items: any[], showAll: boolean, setShowAll: (v: boolean) => void, isOfficial = false) => {
    if (items.length === 0) return null;
    const displayed = showAll ? items : items.slice(0, 4);
    
    return (
      <section>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-[10px] uppercase tracking-widest opacity-70 font-bold">{title} ({items.length})</h4>
          {items.length > 4 && (
            <button onClick={() => setShowAll(!showAll)} className="text-[10px] text-primary font-bold hover:underline flex items-center gap-1">
              {showAll ? "Ver menos" : `Ver todas (${items.length})`}
              <ChevronRight className={`w-3 h-3 transition-transform ${showAll ? "rotate-90" : ""}`} />
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {displayed.map((c: any) => (
            <CollectionCard 
              key={c.id} 
              coll={c} 
              onOpen={m.setViewing} 
              isOfficial={isOfficial}
              isLocal={c.isLocal}
              onDelete={!isOfficial ? () => m.setConfirmDelete(c.id) : undefined}
              confirmDelete={m.confirmDelete === c.id}
              onConfirmDelete={() => m.handleDelete(c)}
              onCancelDelete={() => m.setConfirmDelete(null)}
              deleting={m.deletingColl === c.id}
            />
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b shrink-0 flex items-center justify-between" style={{ borderColor: COLORS.border, background: "rgba(0,0,0,0.1)" }}>
        <div>
          <h3 className="font-headline text-sm text-white">Explorar Colecciones</h3>
          <p className="text-[10px] opacity-60">Sincroniza y gestiona tus listas de mods</p>
        </div>
        <button onClick={() => m.setCreating(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-dashed border-primary/30 text-primary font-bold text-xs hover:bg-primary/5 transition-colors">
          <Plus className="w-4 h-4" />Nueva Colección
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-10">
        {renderSection("Colecciones Oficiales", m.officialCollections, showAllOfficial, setShowAllOfficial, true)}
        {renderSection("Tus Colecciones de Modrinth", modrinthColls, showAllModrinth, setShowAllModrinth)}
        {renderSection("Colecciones Locales (MIM)", localColls, showAllLocal, setShowAllLocal)}
        
        {followed && (
          <section>
            <h4 className="text-[10px] uppercase tracking-widest opacity-70 mb-4 font-bold">Seguidos</h4>
            <CollectionCard coll={followed} onOpen={m.setViewing} isFollowed />
          </section>
        )}

        {m.officialCollections.length === 0 && modrinthColls.length === 0 && localColls.length === 0 && !followed && (
          <div className="py-20 flex flex-col items-center justify-center opacity-40 text-center">
            <Library className="w-16 h-16 mb-4" />
            <h4 className="text-lg font-headline">No hay colecciones</h4>
            <p className="text-xs max-w-xs">Crea una colección local o vincula tu cuenta de Modrinth en los ajustes.</p>
          </div>
        )}
      </div>
    </div>
  );
});
