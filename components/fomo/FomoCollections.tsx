/**
 * @fileoverview FomoCollections – displays local and Modrinth mod collections,
 * with collection detail view, mod download, and collection creation.
 *
 * Props are leaner than the original; all API calls delegated to services/.
 */

"use client";

import React, { useState, useEffect, useCallback, memo } from "react";
import { Library, Plus, ChevronRight, X, Loader2, ArrowLeft, Trash2, AlertTriangle, Download } from "lucide-react";
import {
  fetchCollections,
  fetchCollectionMods,
  createCollection,
  addModToCollection,
  downloadCollection,
} from "@/services/api";
import { COLORS } from "@/theme/tokens";
import { LoadingSpinner, EmptyState } from "../ui/primitives";
import { FomoModCard }               from "./FomoModCard";
import type { CollectionEntry, ModHit } from "@/lib/types";
import type { StatusType } from "@/hooks/useStatusBanner";

interface FomoCollectionsProps {
  loader:       string;
  gameVersion:  string;
  onStatus:     (text: string, type?: StatusType) => void;
  addingForMod: ModHit | null;
  onClearAddingFor: () => void;
  downloading:  Record<string, boolean>;
  onDownloadMod:(mod: ModHit) => void;
  onOpenVersions:(mod: ModHit) => void;
  selectedMods?: ModHit[];
  onToggleSelect?: (mod: ModHit) => void;
  onClearSelection?: () => void;
  isDetailsOpen?: boolean;
}

export const FomoCollections = memo(function FomoCollections({
  loader, gameVersion, onStatus, addingForMod, onClearAddingFor,
  downloading, onDownloadMod, onOpenVersions,
  selectedMods = [], onToggleSelect, onClearSelection, isDetailsOpen = false,
}: FomoCollectionsProps) {
  const [collections,    setCollections]    = useState<CollectionEntry[]>([]);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [viewing,        setViewing]        = useState<CollectionEntry | null>(null);
  const [viewMods,       setViewMods]       = useState<ModHit[]>([]);
  const [viewLoading,    setViewLoading]    = useState(false);
  const [collDl,         setCollDl]         = useState<string | null>(null);
  const [creating,       setCreating]       = useState(false);
  const [targetType,     setTargetType]     = useState<"local" | "modrinth">("modrinth");
  const [newName,        setNewName]        = useState("MIM");
  const [deletingColl,   setDeletingColl]   = useState<string | null>(null);
  const [confirmDelete,  setConfirmDelete]  = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { collections: colls, error: err } = await fetchCollections();
    setCollections(colls);
    setError(err);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCollection = useCallback(async (coll: CollectionEntry) => {
    setViewing(coll);
    setViewLoading(true);
    if (coll.isLocal) {
      setViewMods(coll.projects ?? []);
    } else {
      const { mods } = await fetchCollectionMods(coll.id);
      setViewMods(mods);
    }
    setViewLoading(false);
  }, []);

  const handleCreate = useCallback(async (name: string) => {
    const modsToAdd = addingForMod ? [addingForMod] : selectedMods;
    if (modsToAdd.length === 0) return;

    let successCount = 0;
    let lastError = null;

    // Crear la colección primero con el primer mod (o ninguno)
    const { collection, error } = await createCollection(name, modsToAdd[0], targetType);
    
    if (error) { onStatus(error, "error"); return; }
    
    successCount++;

    // Añadir el resto de los mods
    if (modsToAdd.length > 1) {
      for (let i = 1; i < modsToAdd.length; i++) {
        const { error: addErr } = await addModToCollection(collection!.id, modsToAdd[i], targetType);
        if (!addErr) successCount++;
        else lastError = addErr;
      }
    }

    if (lastError && successCount < modsToAdd.length) {
      onStatus(`Colección creada, pero solo se añadieron ${successCount}/${modsToAdd.length} items.`, "info");
    } else {
      onStatus(modsToAdd.length > 1 
        ? `${modsToAdd.length} items añadidos a la nueva colección "${name}"` 
        : `"${modsToAdd[0].title}" añadido a ${name}`, "success");
    }

    setCreating(false);
    onClearAddingFor();
    onClearSelection?.();
    load();
  }, [addingForMod, selectedMods, targetType, onClearAddingFor, onClearSelection, onStatus, load]);

  const handleAddTo = useCallback(async (coll: CollectionEntry) => {
    const modsToAdd = addingForMod ? [addingForMod] : selectedMods;
    if (modsToAdd.length === 0) return;

    const target: "local" | "modrinth" = coll.isLocal ? "local" : "modrinth";
    let successCount = 0;
    let lastError = null;

    for (const mod of modsToAdd) {
      const { error } = await addModToCollection(coll.id, mod, target);
      if (!error) successCount++;
      else lastError = error;
    }

    if (lastError && successCount < modsToAdd.length) {
      onStatus(`Se añadieron ${successCount}/${modsToAdd.length} items a ${coll.name}. Algunos fallaron.`, "info");
    } else {
      onStatus(modsToAdd.length > 1 
        ? `${modsToAdd.length} items añadidos a "${coll.name}"` 
        : `"${modsToAdd[0].title}" añadido a ${coll.name}`, "success");
    }

    onClearAddingFor();
    onClearSelection?.();
    load();
  }, [addingForMod, selectedMods, onClearAddingFor, onClearSelection, onStatus, load]);

  const handleDownloadCollection = useCallback(async (coll: CollectionEntry) => {
    setCollDl(coll.id);
    const { count, error } = await downloadCollection(coll.id, loader, gameVersion);
    if (error) onStatus(error, "error");
    else       onStatus(`${count} mods descargados de "${coll.name}"`, "success");
    setCollDl(null);
  }, [loader, gameVersion, onStatus]);

  const handleDeleteCollection = useCallback(async (coll: CollectionEntry) => {
    if (coll.id === "followed-projects") {
      onStatus("No se puede eliminar la colección de proyectos seguidos", "error");
      return;
    }

    setDeletingColl(coll.id);
    try {
      const endpoint = coll.isLocal ? "/api/local-collections" : "/api/modrinth/collections";
      const res = await fetch(endpoint, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionId: coll.id }),
      });

      if (res.ok) {
        onStatus(`Colección "${coll.name}" eliminada`, "success");
        load();
      } else {
        const data = await res.json().catch(() => ({}));
        onStatus(data.error || "Error al eliminar colección", "error");
      }
    } catch (err) {
      onStatus("Error de red al eliminar colección", "error");
    } finally {
      setDeletingColl(null);
      setConfirmDelete(null);
    }
  }, [onStatus, load]);

  // Collection-selector overlay (when adding a mod to a collection)
  if (addingForMod || creating || (selectedMods.length > 0 && !viewing)) {
    const isBulk = selectedMods.length > 1 && !addingForMod;
    return (
      <div className="flex-1 flex flex-col p-4 space-y-3 overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-headline text-lg">{creating ? "Nueva Colección" : "Añadir a Colección"}</h3>
            <p className="font-caption text-xs mt-1 truncate max-w-[340px]" style={{ color: COLORS.muted }}>
              {creating 
                ? "Crea una nueva colección" 
                : (addingForMod ? `Para: "${addingForMod.title}"` : `Para: ${selectedMods.length} items seleccionados`)}
            </p>
          </div>
          <button onClick={() => { onClearAddingFor(); setCreating(false); onClearSelection?.(); }} aria-label="Cancelar" className="p-2 rounded-xl hover:bg-white/10">
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
              autoFocus type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate(newName)}
              placeholder={targetType === "modrinth" ? "Nombre en Modrinth" : "Nombre local"}
              aria-label="Nombre de la nueva colección"
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary/50"
              style={{ color: COLORS.foreground }}
            />
            <div className="flex gap-2">
              <button onClick={() => setCreating(false)} className="flex-1 py-2.5 rounded-xl text-sm font-bold border border-white/10 hover:bg-white/5" style={{ color: COLORS.muted }}>Cancelar</button>
              <button onClick={() => handleCreate(newName)} className="flex-[2] py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/20" style={{ background: COLORS.primary, color: "white" }}>
                {targetType === "modrinth" ? "Crear en Modrinth" : "Crear Local"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <button onClick={() => setCreating(true)} className="w-full p-4 rounded-2xl border-2 border-dashed border-white/10 hover:border-primary/30 hover:bg-primary/5 transition-all flex items-center justify-center gap-3">
              <Plus className="w-5 h-5" style={{ color: COLORS.primary }} />
              <span className="font-bold text-sm">Nueva Colección</span>
            </button>
            {collections.filter((c) => c.id !== "followed-projects").map((coll) => (
              <button key={coll.id} onClick={() => handleAddTo(coll)} className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 border border-transparent hover:border-primary/30 hover:bg-white/10 transition-all text-left group">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
                  {coll.iconUrl ? <img src={coll.iconUrl} alt="" className="w-full h-full object-cover" /> : <Library className="w-5 h-5 opacity-40" style={{ color: COLORS.primary }} />}
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

  // Collection detail view
  if (viewing) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center gap-2 p-4 border-b shrink-0" style={{ borderColor: COLORS.border }}>
          <button onClick={() => setViewing(null)} aria-label="Volver a colecciones" className="p-1.5 rounded-lg hover:bg-white/10">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h3 className="font-headline text-sm truncate flex-1">{viewing.name}</h3>
          <button
            onClick={() => handleDownloadCollection(viewing)}
            disabled={!!collDl}
            aria-label="Descargar todos los mods"
            className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
            style={{ background: "rgba(102,200,160,0.15)", color: COLORS.emerald, border: "1px solid rgba(102,200,160,0.3)" }}
          >
            {collDl === viewing.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "↓ Descargar todos"}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {viewLoading ? (
            <div className="p-12"><LoadingSpinner label="Cargando mods..." /></div>
          ) : (
            <div className={`grid grid-cols-1 ${isDetailsOpen ? "lg:grid-cols-2" : "lg:grid-cols-2 xl:grid-cols-3"} gap-4 content-start p-6`}>
              {viewMods.map((mod) => (
                <FomoModCard 
                  key={mod.projectId} 
                  mod={mod} 
                  isDownloading={!!downloading[mod.projectId]} 
                  onDownload={onDownloadMod} 
                  onOpenVersions={onOpenVersions} 
                  onAddToCollection={() => {}} 
                  isSelected={selectedMods.some(m => m.projectId === mod.projectId)}
                  onToggleSelect={onToggleSelect}
                />
              ))}
            </div>
          )}
        </div>

        {/* Bulk Actions Bar for Collections */}
        {selectedMods.length > 0 && (
          <div className="mx-6 mb-4 p-3 rounded-2xl flex items-center justify-between animate-slide-up relative z-10" style={{ background: COLORS.card, border: `1px solid ${COLORS.primary}`, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
            <div className="flex items-center gap-3 pl-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/20 text-primary font-bold">
                {selectedMods.length}
              </div>
              <span className="text-sm font-bold" style={{ color: COLORS.foreground }}>Seleccionados</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onClearSelection?.()}
                className="px-4 py-2 rounded-xl text-xs font-bold transition-all hover:bg-white/10"
                style={{ color: COLORS.muted }}
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  onStatus(`Iniciando descarga de ${selectedMods.length} items...`, "info");
                  for (const mod of selectedMods) {
                    await onDownloadMod(mod);
                    await new Promise(r => setTimeout(r, 500));
                  }
                  onClearSelection?.();
                }}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-primary text-white shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                Descargar Todo
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Collection list view
  if (loading) return <LoadingSpinner label="Cargando colecciones..." />;
  if (error && collections.length === 0) return <EmptyState icon={<Library className="w-12 h-12" />} title="Error al cargar" subtitle={error} />;

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-3" role="list" aria-label="Tus colecciones">
      <button onClick={() => setCreating(true)} className="w-full p-4 rounded-2xl border-2 border-dashed border-white/10 hover:border-primary/30 hover:bg-primary/5 transition-all flex items-center justify-center gap-3 mb-2">
        <Plus className="w-5 h-5" style={{ color: COLORS.primary }} />
        <span className="font-bold text-sm">Nueva Colección</span>
      </button>
      {collections.length === 0
        ? <EmptyState icon={<Library className="w-12 h-12" />} title="Sin colecciones" subtitle="Crea una para empezar" />
        : collections.map((coll) => (
          <div key={coll.id} role="listitem" className="w-full flex items-center gap-3 p-3 rounded-2xl transition-all group" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${COLORS.border}` }}>
            <button onClick={() => openCollection(coll)} className="flex-1 flex items-center gap-3 text-left min-w-0">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 shrink-0 flex items-center justify-center overflow-hidden">
                {coll.iconUrl ? <img src={coll.iconUrl} alt="" className="w-full h-full object-cover" /> : <Library className="w-6 h-6 opacity-30" style={{ color: COLORS.primary }} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-headline text-sm truncate" style={{ color: COLORS.foreground }}>{coll.name}</p>
                <p className="font-caption text-xs mt-0.5" style={{ color: COLORS.muted }}>{coll.projectCount} proyectos</p>
                <div className="flex items-center gap-1.5 mt-1">
                  {coll.isLocal && <span className="font-label text-[0.55rem] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(255,208,102,0.1)", color: COLORS.gold }}>Local</span>}
                  {coll.id === "followed-projects" && <span className="font-label text-[0.55rem] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(187,150,228,0.12)", color: COLORS.primary }}>Modrinth</span>}
                </div>
              </div>
            </button>

            {/* Delete Button / Confirmation */}
            {confirmDelete === coll.id ? (
              <div className="flex items-center gap-1.5 animate-fade-in">
                <button
                  onClick={() => handleDeleteCollection(coll)}
                  disabled={deletingColl === coll.id}
                  className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-all"
                  title="Confirmar eliminación"
                >
                  {deletingColl === coll.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setConfirmDelete(null)}
                  disabled={deletingColl === coll.id}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/60 transition-all"
                  title="Cancelar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(coll.id)}
                className={`p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${coll.id === "followed-projects" ? "pointer-events-none invisible" : "hover:bg-red-500/20 text-white/40 hover:text-red-400"}`}
                title={coll.id === "followed-projects" ? "No se puede eliminar" : "Eliminar colección"}
                disabled={coll.id === "followed-projects"}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))
      }
    </div>
  );
});
