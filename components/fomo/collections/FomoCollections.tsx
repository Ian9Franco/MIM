/**
 * @fileoverview FomoCollections – displays local and Modrinth mod collections,
 * with collection detail view, mod download, and collection creation.
 *
 * Props are leaner than the original; all API calls delegated to services/.
 */

"use client";

import React, { useState, useEffect, useCallback, memo, useRef } from "react";
import { Library, Plus, ChevronRight, X, Loader2, ArrowLeft, Trash2, Download, Layers, Glasses, Database, Archive, Puzzle, LayoutGrid } from "lucide-react";
import {
  fetchCollections,
  fetchCollectionMods,
  createCollection,
  addModToCollection,
  downloadCollection,
  fetchOfficialCollections,
  fetchCurseForgePicks,
  fetchCurseForgePickMods,
} from "@/services/api";
import { COLORS } from "@/theme/tokens";
import { EmptyState, PillToggleGroup } from "@/components/ui/primitives";
import { FomoSkeleton }               from "@/components/fomo/core/FomoSkeleton";
import { BulkActionsBar }            from "@/components/fomo/sidebar/FomoSidebarComponents";
import type { CollectionEntry, ModHit } from "@/lib/core/types";
import { mimDB } from "@/lib/storage/indexeddb";
import type { StatusType } from "@/hooks/useStatusBanner";
import { CollectionCreateView } from "./views/CollectionCreateView";
import { CollectionDetailView } from "./views/CollectionDetailView";
import { CollectionListView } from "./views/CollectionListView";

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
  sinytraActive?: boolean;
}

interface LibraryUpdateInfo {
  projectId: string;
  status:    string;
  [key: string]: unknown;
}

function CollectionIcon({ url, fallbackSize = "w-6 h-6", fallbackOpacity = "opacity-30" }: { url?: string | null, fallbackSize?: string, fallbackOpacity?: string }) {
  const [failed, setFailed] = useState(false);
  
  if (url && !failed) {
    return (
      <img 
        src={url} 
        alt="" 
        className="w-full h-full object-cover" 
        onError={() => setFailed(true)}
      />
    );
  }
  
  return <Library className={`${fallbackSize} ${fallbackOpacity}`} style={{ color: COLORS.primary }} />;
}

export const FomoCollections = memo(function FomoCollections({
  loader, gameVersion, onStatus, addingForMod, onClearAddingFor,
  downloading, onDownloadMod, onOpenVersions,
  selectedMods = [], onToggleSelect, onClearSelection, isDetailsOpen = false,
  sinytraActive = false,
}: FomoCollectionsProps) {
  const [collections,    setCollections]    = useState<CollectionEntry[]>([]);
  const [officialCollections, setOfficialCollections] = useState<CollectionEntry[]>([]);
  const [cfCollections, setCfCollections] = useState<CollectionEntry[]>([]);
  const [activeTab,      setActiveTab]      = useState<"official" | "curseforge" | "mim" | "followed">("official");
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
  const [isAddingSelection, setIsAddingSelection] = useState(false);

  const [isTransitioningColumns, setIsTransitioningColumns] = useState(false);
  const [transitionTarget, setTransitionTarget] = useState<"two" | "three">("three");
  const [activeCategory, setActiveCategory] = useState("all");
  const lastDetailsState = useRef(isDetailsOpen);

  // Sistema de dirección para la animación de pestañas
  const tabsOrder = ["official", "curseforge", "mim", "followed"];
  const [direction, setDirection] = useState("forward");
  const prevTabRef = useRef(activeTab);

  useEffect(() => {
    if (activeTab !== prevTabRef.current) {
      const idx = tabsOrder.indexOf(activeTab);
      const prevIdx = tabsOrder.indexOf(prevTabRef.current);
      setDirection(idx >= prevIdx ? "forward" : "backward");
      prevTabRef.current = activeTab;
    }
  }, [activeTab]);

  const animationClass = direction === "forward" ? "animate-slide-in-right" : "animate-slide-in-left";

  useEffect(() => {
    if (isDetailsOpen !== lastDetailsState.current) {
      setIsTransitioningColumns(true);
      setTransitionTarget(isDetailsOpen ? "two" : "three");
      
      const timer = setTimeout(() => {
        setIsTransitioningColumns(false);
      }, 450); // 450ms makes it completely instant and fluid without any heavy GPU burden
      
      lastDetailsState.current = isDetailsOpen;
      return () => clearTimeout(timer);
    }
  }, [isDetailsOpen]);

  useEffect(() => {
    const loadCache = async () => {
      try {
        await mimDB.init();
        
        let cachedMim = null;
        let cachedOfficial = null;
        let cachedCf = null;
        
        const cacheMimEntry = await mimDB.getCache("fomo_mim_collections");
        const cacheOfficialEntry = await mimDB.getCache("fomo_official_collections");
        const cacheCfEntry = await mimDB.getCache("fomo_cf_collections");
        
        if (cacheMimEntry?.data) cachedMim = cacheMimEntry.data;
        if (cacheOfficialEntry?.data) cachedOfficial = cacheOfficialEntry.data;
        if (cacheCfEntry?.data) cachedCf = cacheCfEntry.data;
        
        const lsMim = localStorage.getItem("fomo_mim_collections");
        const lsOfficial = localStorage.getItem("fomo_official_collections");
        const lsCf = localStorage.getItem("fomo_cf_collections");
        
        if (!cachedMim && lsMim) {
          try {
            cachedMim = JSON.parse(lsMim);
            await mimDB.setCache("fomo_mim_collections", cachedMim, 12 * 60 * 60 * 1000);
            localStorage.removeItem("fomo_mim_collections");
          } catch (e) {}
        }
        if (!cachedOfficial && lsOfficial) {
          try {
            cachedOfficial = JSON.parse(lsOfficial);
            await mimDB.setCache("fomo_official_collections", cachedOfficial, 12 * 60 * 60 * 1000);
            localStorage.removeItem("fomo_official_collections");
          } catch (e) {}
        }
        if (!cachedCf && lsCf) {
          try {
            cachedCf = JSON.parse(lsCf);
            await mimDB.setCache("fomo_cf_collections", cachedCf, 12 * 60 * 60 * 1000);
            localStorage.removeItem("fomo_cf_collections");
          } catch (e) {}
        }
        
        if (cachedMim) setCollections(cachedMim);
        if (cachedOfficial) setOfficialCollections(cachedOfficial);
        if (cachedCf) setCfCollections(cachedCf);
        
        if (cachedMim || cachedOfficial || cachedCf) setLoading(false);
      } catch (err) {
        console.error("Error loading collections cache from IndexedDB", err);
      }
    };
    loadCache();
  }, []);

  const [libraryUpdates, setLibraryUpdates] = useState<Record<string, LibraryUpdateInfo>>({});

  const load = useCallback(async () => {
    try {
      const cacheMimEntry = await mimDB.getCache("fomo_mim_collections");
      const cacheOfficialEntry = await mimDB.getCache("fomo_official_collections");
      const cacheCfEntry = await mimDB.getCache("fomo_cf_collections");
      
      if (!cacheMimEntry?.data && !cacheOfficialEntry?.data && !cacheCfEntry?.data) {
        setLoading(true);
      }
      
      // Cargar en paralelo para evitar bloqueo secuencial
      const [collsRes, officialRes, cfRes] = await Promise.all([
        fetchCollections(),
        fetchOfficialCollections(),
        fetchCurseForgePicks()
      ]);
      
      const colls = collsRes.collections || [];
      const official = officialRes.collections || [];
      const cfPicks = cfRes.picks || [];
      
      setCollections(colls);
      setOfficialCollections(official);
      setCfCollections(cfPicks);
      
      await mimDB.setCache("fomo_mim_collections", colls, 12 * 60 * 60 * 1000);
      await mimDB.setCache("fomo_official_collections", official, 12 * 60 * 60 * 1000);
      await mimDB.setCache("fomo_cf_collections", cfPicks, 12 * 60 * 60 * 1000);
      
      setError(collsRes.error || officialRes.error || cfRes.error);
    } catch (e: any) {
      console.error("Error loading collections", e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const handleUpdates = (e: Event) => {
      const customEvent = e as CustomEvent<Record<string, LibraryUpdateInfo>>;
      if (customEvent.detail) {
        setLibraryUpdates(customEvent.detail);
      }
    };
    window.addEventListener("library-updates-changed", handleUpdates);
    
    // Solicitar actualizaciones al montar
    window.dispatchEvent(new CustomEvent("request-library-updates"));

    return () => {
      window.removeEventListener("library-updates-changed", handleUpdates);
    };
  }, []);

  const openCollection = useCallback(async (coll: CollectionEntry) => {
    setViewing(coll);
    setViewLoading(true);
    if (coll.isLocal) {
      setViewMods(coll.projects ?? []);
    } else if (coll.source === "curseforge") {
      const { mods } = await fetchCurseForgePickMods(coll.id);
      setViewMods(mods);
    } else {
      const { mods } = await fetchCollectionMods(coll.id);
      setViewMods(mods);
    }
    setViewLoading(false);
  }, []);

  const handleCreate = useCallback(async (name: string) => {
    const modsToAdd = addingForMod ? [addingForMod] : selectedMods;
    if (modsToAdd.length === 0) {
      const { error } = await createCollection(name, null, targetType);
      if (error) { onStatus(error, "error"); return; }
      onStatus(`Colección "${name}" creada con éxito`, "success");
      setCreating(false);
      load();
      return;
    }

    let successCount = 0;
    let lastError = null;

    // Crear la colección primero con el primer mod
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
    setIsAddingSelection(false);
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
    setIsAddingSelection(false);
    load();
  }, [addingForMod, selectedMods, onClearAddingFor, onClearSelection, onStatus, load]);

  const handleDownloadCollection = useCallback(async (coll: CollectionEntry) => {
    setCollDl(coll.id);
    const { count, skipped, error } = await downloadCollection(coll.id, loader, gameVersion);
    if (error) onStatus(error, "error");
    else {
      let msg = `${count} mods descargados de "${coll.name}".`;
      if (skipped > 0) msg += ` ${skipped} omitidos por incompatibilidad.`;
      onStatus(msg, "success");
    }
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
      console.error("Error deleting collection:", err);
      onStatus("Error de red al eliminar colección", "error");
    } finally {
      setDeletingColl(null);
      setConfirmDelete(null);
    }
  }, [onStatus, load]);

  const handleRemoveModFromCollection = useCallback(async (collId: string, mod: any) => {
    try {
      const endpoint = viewing?.isLocal ? "/api/local-collections" : "/api/modrinth/collections";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove_project", collectionId: collId, projectId: mod.projectId }),
      });

      if (res.ok) {
        onStatus(`"${mod.title}" eliminado de la colección`, "success");
        setViewMods(prev => prev.filter(m => m.projectId !== mod.projectId));
      } else {
        const data = await res.json().catch(() => ({}));
        onStatus(data.error || "No se pudo eliminar el proyecto", "error");
      }
    } catch (err) {
      console.error("Error removing project:", err);
      onStatus("Error de red", "error");
    }
  }, [viewing, onStatus]);

  return (
    <div className="flex-1 flex flex-col h-full relative overflow-hidden">
      {addingForMod || creating || isAddingSelection ? (
        <CollectionCreateView
          creating={creating}
          setCreating={setCreating}
          addingForMod={addingForMod}
          selectedMods={selectedMods}
          onClearAddingFor={onClearAddingFor}
          onClearSelection={onClearSelection}
          setIsAddingSelection={setIsAddingSelection}
          targetType={targetType}
          setTargetType={setTargetType}
          newName={newName}
          setNewName={setNewName}
          handleCreate={handleCreate}
          collections={collections}
          handleAddTo={handleAddTo}
        />
      ) : viewing ? (
        <CollectionDetailView
          viewing={viewing}
          setViewing={setViewing}
          handleDownloadCollection={handleDownloadCollection}
          collDl={collDl}
          viewLoading={viewLoading}
          viewMods={viewMods}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          isDetailsOpen={isDetailsOpen}
          isTransitioningColumns={isTransitioningColumns}
          transitionTarget={transitionTarget}
          downloading={downloading}
          onDownloadMod={onDownloadMod}
          onOpenVersions={onOpenVersions}
          selectedMods={selectedMods}
          onToggleSelect={onToggleSelect}
          sinytraActive={sinytraActive}
          libraryUpdates={libraryUpdates}
          handleRemoveModFromCollection={handleRemoveModFromCollection}
        />
      ) : (
        <CollectionListView
          loading={loading}
          error={error}
          collections={collections}
          officialCollections={officialCollections}
          cfCollections={cfCollections}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          animationClass={animationClass}
          setCreating={setCreating}
          openCollection={openCollection}
          confirmDelete={confirmDelete}
          setConfirmDelete={setConfirmDelete}
          handleDeleteCollection={handleDeleteCollection}
          deletingColl={deletingColl}
        />
      )}

      {/* Bulk Actions Bar for Collections */}
      {selectedMods.length > 0 && !isAddingSelection && !creating && !addingForMod && (
        <BulkActionsBar 
          mods={selectedMods} 
          onCancel={() => onClearSelection?.()} 
          onDownload={async () => {
            if (viewing) {
              onStatus(`Iniciando descarga de ${selectedMods.length} items...`, "info");
              for (const mod of selectedMods) {
                await onDownloadMod(mod);
                await new Promise(r => setTimeout(r, 500));
              }
              onClearSelection?.();
            } else {
              setIsAddingSelection(true);
            }
          }}
          hideAdd={true}
          actionLabel={viewing ? "Descargar Todo" : "Añadir a Colección"}
          actionIcon={viewing ? <Download className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
        />
      )}
    </div>
  );
});
