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

  if (m.loading) return <FomoSkeleton message="Cargando colecciones..." />;

  if (m.viewing) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center gap-2 p-4 border-b shrink-0" style={{ borderColor: COLORS.border }}>
          <button onClick={() => m.setViewing(null)} className="p-1.5 rounded-lg hover:bg-white/10"><ArrowLeft className="w-4 h-4" /></button>
          <h3 className="font-headline text-sm truncate flex-1">{m.viewing.name}</h3>
          <button onClick={() => m.handleDownloadColl(m.viewing!)} disabled={!!m.collDl} className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            {m.collDl === m.viewing.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "↓ Descargar todos"}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {m.viewLoading ? <FomoSkeleton count={6} /> : m.viewMods.map(mod => <FomoModCard key={mod.projectId} mod={mod} isDownloading={!!m.collDl} onDownload={onDownloadMod} onOpenVersions={onOpenVersions} isSelected={selectedMods.some((s: any) => s.projectId === mod.projectId)} onToggleSelect={onToggleSelect} sinytraActive={sinytraActive} onAddToCollection={() => {}} />)}
        </div>
      </div>
    );
  }

  const followed = m.collections.find(c => c.id === "followed-projects");
  const mim = m.collections.filter(c => c.id !== "followed-projects");

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b shrink-0 flex items-center justify-between" style={{ borderColor: COLORS.border, background: "rgba(0,0,0,0.1)" }}>
        <div><h3 className="font-headline text-sm text-white">Tus Colecciones</h3><p className="text-[10px] opacity-60">Explora todas las colecciones</p></div>
        <button onClick={() => m.setCreating(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-dashed border-primary/30 text-primary font-bold text-xs"><Plus className="w-4 h-4" />Nueva Colección</button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {m.officialCollections.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4"><h4 className="text-[10px] uppercase tracking-widest opacity-70">Oficiales</h4></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{m.officialCollections.slice(0, 2).map((c: any) => <CollectionCard key={c.id} coll={c} onOpen={m.setViewing} isOfficial />)}</div>
          </section>
        )}
        {mim.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4"><h4 className="text-[10px] uppercase tracking-widest opacity-70">MIM</h4></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{mim.slice(0, 2).map((c: any) => <CollectionCard key={c.id} coll={c} onOpen={m.setViewing} onDelete={() => m.setConfirmDelete(c.id)} confirmDelete={m.confirmDelete === c.id} onConfirmDelete={() => m.handleDelete(c)} onCancelDelete={() => m.setConfirmDelete(null)} deleting={m.deletingColl === c.id} />)}</div>
          </section>
        )}
        {followed && (
          <section>
            <h4 className="text-[10px] uppercase tracking-widest opacity-70 mb-4">Seguidos</h4>
            <CollectionCard coll={followed} onOpen={m.setViewing} isFollowed />
          </section>
        )}
      </div>
    </div>
  );
});
