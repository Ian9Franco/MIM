/**
 * @fileoverview FomoCollections – displays local and Modrinth mod collections,
 * with collection detail view, mod download, and collection creation.
 *
 * Props are leaner than the original; all API calls delegated to services/.
 */

"use client";

import React, { useState, useEffect, useCallback, memo, useRef } from "react";
import { Library, Plus, ChevronRight, X, Loader2, ArrowLeft, Trash2, Download, Grid } from "lucide-react";
import {
  fetchCollections,
  fetchCollectionMods,
  createCollection,
  addModToCollection,
  downloadCollection,
  fetchOfficialCollections,
} from "@/services/api";
import { COLORS } from "@/theme/tokens";
import { EmptyState } from "../ui/primitives";
import { FomoSkeleton }               from "./FomoSkeleton";
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
  sinytraActive?: boolean;
}

interface LibraryUpdateInfo {
  projectId: string;
  status:    string;
  [key: string]: unknown;
}

interface CollectionWithMods extends CollectionEntry {
  mods?: ModHit[];
  modsLoading?: boolean;
}

export const FomoCollections = memo(function FomoCollections({
  loader, gameVersion, onStatus, addingForMod, onClearAddingFor,
  downloading, onDownloadMod, onOpenVersions,
  selectedMods = [], onToggleSelect, onClearSelection, isDetailsOpen = false,
  sinytraActive = false,
}: FomoCollectionsProps) {
  const [collections,    setCollections]    = useState<CollectionWithMods[]>([]);
  const [officialCollections, setOfficialCollections] = useState<CollectionWithMods[]>([]);
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
  const [showAllOfficial, setShowAllOfficial] = useState(false);
  const [showAllMIM, setShowAllMIM] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "mod" | "resourcepack" | "modpack" | "shader">("all");

  const [isTransitioningColumns, setIsTransitioningColumns] = useState(false);
  
  // Cache for collection mods
  const collectionModsCache = useRef<Record<string, ModHit[]>>({});
  const [transitionTarget, setTransitionTarget] = useState<"two" | "three">("three");
  const lastDetailsState = useRef(isDetailsOpen);

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

  const [libraryUpdates, setLibraryUpdates] = useState<Record<string, LibraryUpdateInfo>>({});

  const getDisplayedOfficialCollections = useCallback((official: CollectionWithMods[]) => {
    if (official.length === 0) return [];
    
    // Find the specific "Featured projects" collection by ID or name
    const featuredProjects = official.find(c => c.id === "YV97U1kk" || c.name === "Featured projects");
    
    // Find the latest weekly collection (which is official[0] since they are sorted by date,
    // but excluding the main "Featured projects" collection)
    const latestWeekly = official.find(c => c.id !== "YV97U1kk" && c.name !== "Featured projects");
    
    const displayed: CollectionWithMods[] = [];
    if (latestWeekly) displayed.push(latestWeekly);
    if (featuredProjects) displayed.push(featuredProjects);
    
    // Fallbacks just in case
    if (displayed.length === 0 && official.length > 0) {
      displayed.push(official[0]);
    }
    if (displayed.length === 1 && official.length > 1) {
      const remaining = official.find(c => !displayed.some(d => d.id === c.id));
      if (remaining) displayed.push(remaining);
    }
    
    return displayed;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const { collections: colls, error: err } = await fetchCollections();
    
    const { collections: official, error: offErr } = await fetchOfficialCollections();
    
    setError(err || offErr);
    
    // Initialize collections with empty mods or from cache if available
    setCollections(colls.map(c => {
      const cachedMods = collectionModsCache.current[c.id];
      return { 
        ...c, 
        mods: c.isLocal ? c.projects : cachedMods ? cachedMods.slice(0, 3) : undefined, 
        modsLoading: !c.isLocal && !cachedMods 
      };
    }));
    
    setOfficialCollections(official.map(c => {
      const cachedMods = collectionModsCache.current[c.id];
      return { 
        ...c, 
        mods: cachedMods ? cachedMods.slice(0, 3) : undefined, 
        modsLoading: !cachedMods 
      };
    }));
    
    setLoading(false);
  }, []);

  // ── Fetch mods on-demand only for visible collections ───────────────────────────
  useEffect(() => {
    if (loading) return;

    let active = true;

    // Get the subset of collections currently visible on screen
    const visibleIds = [
      ...(showAllMIM 
        ? collections.filter(c => !c.isLocal && c.id !== "followed-projects") 
        : collections.filter(c => !c.isLocal && c.id !== "followed-projects").slice(0, 2)
      ).map(c => c.id),
      ...(showAllOfficial 
        ? officialCollections 
        : getDisplayedOfficialCollections(officialCollections)
      ).map(c => c.id)
    ];

    const fetchVisibleMods = async () => {
      // Find all visible collections that are remote and don't have mods in cache/state yet
      const collectionsToFetch = [
        ...collections.filter(c => !c.isLocal && c.id !== "followed-projects"),
        ...officialCollections
      ].filter(c => visibleIds.includes(c.id) && !collectionModsCache.current[c.id]);

      for (const coll of collectionsToFetch) {
        if (!active) break;
        try {
          const { mods } = await fetchCollectionMods(coll.id);
          if (!active) break;

          collectionModsCache.current[coll.id] = mods;

          setCollections(prev => prev.map(c => c.id === coll.id ? { ...c, mods: mods.slice(0, 3), modsLoading: false } : c));
          setOfficialCollections(prev => prev.map(c => c.id === coll.id ? { ...c, mods: mods.slice(0, 3), modsLoading: false } : c));
        } catch (e) {
          if (!active) break;
          setCollections(prev => prev.map(c => c.id === coll.id ? { ...c, mods: [], modsLoading: false } : c));
          setOfficialCollections(prev => prev.map(c => c.id === coll.id ? { ...c, mods: [], modsLoading: false } : c));
        }
      }
    };

    fetchVisibleMods();

    return () => {
      active = false;
    };
  }, [collections.length, officialCollections.length, showAllOfficial, showAllMIM, loading, getDisplayedOfficialCollections]);

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
    setActiveTab("all");
    setViewLoading(true);
    if (coll.isLocal) {
      setViewMods(coll.projects ?? []);
    } else {
      // Check cache first
      if (collectionModsCache.current[coll.id]) {
        setViewMods(collectionModsCache.current[coll.id]);
      } else {
        const { mods } = await fetchCollectionMods(coll.id);
        collectionModsCache.current[coll.id] = mods;
        setViewMods(mods);
      }
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
      console.error("Error deleting collection:", err);
      onStatus("Error de red al eliminar colección", "error");
    } finally {
      setDeletingColl(null);
      setConfirmDelete(null);
    }
  }, [onStatus, load]);

  if (addingForMod || creating || (selectedMods.length > 0 && !viewing)) {
    return (
      <div className="flex-1 flex flex-col p-4 space-y-3 overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-headline text-lg">{creating ? "Nueva Colección" : "Añadir a Colección"}</h3>
            <p className="font-caption text-xs mt-1 truncate max-w-85" style={{ color: COLORS.muted }}>
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
              <button onClick={() => handleCreate(newName)} className="flex-2 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/20" style={{ background: COLORS.primary, color: "white" }}>
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
                  {/* eslint-disable-next-line @next/next/no-img-element */}
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
    const displayedMods = viewMods.filter((mod) => {
      if (activeTab === "all") return true;
      return mod.projectType === activeTab;
    });

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

        {/* Tab Selector Segmented Division */}
        {!viewLoading && viewMods.length > 0 && (
          <div className="px-6 py-2 border-b shrink-0 flex items-center gap-1.5 overflow-x-auto no-scrollbar" style={{ borderColor: COLORS.border, background: "rgba(0,0,0,0.1)" }}>
            {[
              { id: "all", label: "All", count: viewMods.length },
              { id: "mod", label: "Mods", count: viewMods.filter(m => m.projectType === "mod").length },
              { id: "resourcepack", label: "Resource Packs", count: viewMods.filter(m => m.projectType === "resourcepack").length },
              { id: "modpack", label: "Modpacks", count: viewMods.filter(m => m.projectType === "modpack").length },
              { id: "shader", label: "Shaders", count: viewMods.filter(m => m.projectType === "shader").length },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all relative shrink-0 ${
                    isActive 
                      ? "text-white shadow-lg shadow-primary/20" 
                      : "text-white/40 hover:text-white/80 hover:bg-white/5"
                  }`}
                  style={isActive ? { background: COLORS.primary } : {}}
                >
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? "bg-white/20 text-white" : "bg-white/5 text-white/40"}`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className={`flex-1 overflow-y-auto custom-scrollbar px-6 pb-6 pt-2 grid grid-cols-1 ${isDetailsOpen ? "lg:grid-cols-2" : "lg:grid-cols-2 xl:grid-cols-3"} gap-2 content-start transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]`}>
          {viewLoading ? (
            <div className="col-span-full">
              <FomoSkeleton variant="card" message="Cargando mods..." count={6} />
            </div>
          ) : displayedMods.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 opacity-40">
              <Library className="w-12 h-12 mb-3" />
              <p className="font-subhead text-sm">No hay proyectos en esta categoría</p>
            </div>
          ) : (
            <>
              {isTransitioningColumns ? (
                <div className="col-span-full animate-fade-in">
                  <FomoSkeleton 
                    variant="card"
                    message={transitionTarget === "two" ? "Adaptando columnas..." : "Expandiendo catálogo..."} 
                    count={transitionTarget === "two" ? 6 : 9} 
                  />
                </div>
              ) : displayedMods.map((mod) => (
                <div key={mod.projectId} className="p-2 bg-transparent overflow-visible">
                  <FomoModCard 
                    mod={mod} 
                    isDownloading={!!downloading[mod.projectId]} 
                    onDownload={onDownloadMod} 
                    onOpenVersions={onOpenVersions} 
                    onAddToCollection={() => {}} 
                    isSelected={selectedMods.some(m => m.projectId === mod.projectId)}
                    onToggleSelect={onToggleSelect}
                    sinytraActive={sinytraActive}
                    hasUpdateAvailable={Object.values(libraryUpdates).some(
                      (s: LibraryUpdateInfo) => s.projectId === mod.projectId && s.status === "update_available"
                    )}
                  />
                </div>
              ))}
            </>
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

  // Collection list view - unified layout
  if (loading) return <FomoSkeleton message="Cargando colecciones..." />;
  if (error && collections.length === 0 && officialCollections.length === 0) return <EmptyState icon={<Library className="w-12 h-12" />} title="Error al cargar" subtitle={error} />;

  const followedCollection = collections.find(c => c.id === "followed-projects");
  const mimCollections = collections.filter(c => c.id !== "followed-projects");

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header with new collection button */}
      <div className="px-6 py-4 border-b shrink-0 flex items-center justify-between" style={{ borderColor: COLORS.border, background: "rgba(0,0,0,0.2)" }}>
        <div>
          <h3 className="font-headline text-sm" style={{ color: COLORS.foreground }}>Tus Colecciones</h3>
          <p className="font-caption text-xs mt-0.5 opacity-60">Explora todas las colecciones en un solo lugar</p>
        </div>
        <button onClick={() => setCreating(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-dashed border-primary/30 hover:border-primary/50 hover:bg-primary/10 transition-all group">
          <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" style={{ color: COLORS.primary }} />
          <span className="font-bold text-xs" style={{ color: COLORS.primary }}>Nueva Colección</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-6 space-y-8" role="list" aria-label="Tus colecciones">
        
        {/* Modrinth Official Collections - Show only latest + Featured */}
        {officialCollections.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: "#1ED760" }} />
                <h4 className="font-headline text-xs uppercase tracking-widest opacity-70">Modrinth Official</h4>
              </div>
              {officialCollections.length > 2 && (
                <button 
                  onClick={() => setShowAllOfficial(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-xs font-bold opacity-60 hover:opacity-100"
                >
                  <Grid className="w-3 h-3" />
                  Ver todas
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {getDisplayedOfficialCollections(officialCollections).map((coll) => (
                <CollectionCard 
                  key={coll.id} 
                  coll={coll} 
                  onOpen={openCollection}
                  isOfficial={true}
                />
              ))}
            </div>
          </section>
        )}

        {/* Modal to view all Modrinth Official collections */}
        {showAllOfficial && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-xl animate-fade-in">
            <div 
              className="w-full max-w-4xl max-h-[80vh] rounded-2xl border overflow-hidden flex flex-col"
              style={{ 
                background: COLORS.card, 
                borderColor: COLORS.border,
                boxShadow: "0 24px 64px rgba(0,0,0,0.6)"
              }}
            >
              <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: COLORS.border }}>
                <div>
                  <h3 className="font-headline text-lg">Todas las Colecciones Oficiales de Modrinth</h3>
                  <p className="font-caption text-xs mt-1 opacity-60">{officialCollections.length} colecciones disponibles</p>
                </div>
                <button onClick={() => setShowAllOfficial(false)} className="p-2 rounded-xl hover:bg-white/10">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
                {officialCollections.map((coll) => (
                  <CollectionCard 
                    key={coll.id} 
                    coll={coll} 
                    onOpen={(c) => { setShowAllOfficial(false); openCollection(c); }}
                    isOfficial={true}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Colecciones MIM */}
        {mimCollections.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: "#FF6C3E" }} />
                <h4 className="font-headline text-xs uppercase tracking-widest opacity-70">Colecciones MIM</h4>
              </div>
              {mimCollections.length > 2 && (
                <button 
                  onClick={() => setShowAllMIM(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-xs font-bold opacity-60 hover:opacity-100"
                >
                  <Grid className="w-3 h-3" />
                  Ver todas
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {mimCollections.slice(0, 2).map((coll) => (
                <CollectionCard 
                  key={coll.id} 
                  coll={coll} 
                  onOpen={openCollection}
                  onDelete={() => setConfirmDelete(coll.id)}
                  confirmDelete={confirmDelete === coll.id}
                  onConfirmDelete={() => handleDeleteCollection(coll)}
                  onCancelDelete={() => setConfirmDelete(null)}
                  deleting={deletingColl === coll.id}
                  isLocal={coll.isLocal}
                />
              ))}
            </div>
          </section>
        )}

        {/* Modal to view all MIM collections */}
        {showAllMIM && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-xl animate-fade-in">
            <div 
              className="w-full max-w-4xl max-h-[80vh] rounded-2xl border overflow-hidden flex flex-col"
              style={{ 
                background: COLORS.card, 
                borderColor: COLORS.border,
                boxShadow: "0 24px 64px rgba(0,0,0,0.6)"
              }}
            >
              <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: COLORS.border }}>
                <div>
                  <h3 className="font-headline text-lg">Todas tus Colecciones MIM</h3>
                  <p className="font-caption text-xs mt-1 opacity-60">{mimCollections.length} colecciones disponibles</p>
                </div>
                <button onClick={() => setShowAllMIM(false)} className="p-2 rounded-xl hover:bg-white/10">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
                {mimCollections.map((coll) => (
                  <CollectionCard 
                    key={coll.id} 
                    coll={coll} 
                    onOpen={(c) => { setShowAllMIM(false); openCollection(c); }}
                    onDelete={() => setConfirmDelete(coll.id)}
                    confirmDelete={confirmDelete === coll.id}
                    onConfirmDelete={() => handleDeleteCollection(coll)}
                    onCancelDelete={() => setConfirmDelete(null)}
                    deleting={deletingColl === coll.id}
                    isLocal={coll.isLocal}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Proyectos Seguidos */}
        {followedCollection && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full" style={{ background: "#66C8A0" }} />
              <h4 className="font-headline text-xs uppercase tracking-widest opacity-70">Proyectos Seguidos</h4>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <CollectionCard 
                key={followedCollection.id} 
                coll={followedCollection} 
                onOpen={openCollection}
                isFollowed={true}
              />
            </div>
          </section>
        )}

        {/* Empty state if no collections */}
        {officialCollections.length === 0 && mimCollections.length === 0 && !followedCollection && (
          <div className="flex flex-col items-center justify-center h-full opacity-50">
            <Library className="w-16 h-16 mb-4" />
            <p className="font-subhead text-sm">No hay colecciones disponibles</p>
          </div>
        )}
      </div>
    </div>
  );
});

// Helper component for individual collection card
function CollectionCard({ 
  coll, 
  onOpen, 
  onDelete, 
  confirmDelete, 
  onConfirmDelete, 
  onCancelDelete,
  deleting, 
  isOfficial = false, 
  isLocal = false,
  isFollowed = false
}: { 
  coll: CollectionWithMods; 
  onOpen: (c: CollectionEntry) => void;
  onDelete?: () => void;
  confirmDelete?: boolean;
  onConfirmDelete?: () => void;
  onCancelDelete?: () => void;
  deleting?: boolean;
  isOfficial?: boolean;
  isLocal?: boolean;
  isFollowed?: boolean;
}) {
  return (
    <div 
      role="button" 
      tabIndex={0}
      onClick={() => onOpen(coll)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(coll);
        }
      }}
      className="w-full p-4 rounded-2xl transition-all group hover:scale-[1.01] active:scale-[0.99] cursor-pointer hover:bg-white/5 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      style={{ 
        background: "rgba(255,255,255,0.03)", 
        border: `1px solid ${COLORS.border}`,
      }}
    >
      <div className="flex items-start gap-4 mb-4">
        <div className="flex-1 flex items-center gap-4 min-w-0">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 shrink-0 flex items-center justify-center overflow-hidden shadow-lg">
            {coll.iconUrl ? (
              <img src={coll.iconUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <Library className="w-6 h-6 opacity-30" style={{ color: COLORS.primary }} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-headline text-base truncate flex items-center gap-2" style={{ color: COLORS.foreground }}>
              {coll.name}
              {isOfficial && (
                <span className="font-label text-[0.55rem] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(30,215,96,0.12)", color: "#1ED760", border: "1px solid rgba(30,215,96,0.3)" }}>✓ Oficial</span>
              )}
              {isLocal && (
                <span className="font-label text-[0.55rem] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(255,208,102,0.1)", color: COLORS.gold }}>Local</span>
              )}
              {isFollowed && (
                <span className="font-label text-[0.55rem] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(102,200,160,0.12)", color: "#66C8A0" }}>Seguidos</span>
              )}
            </p>
            <p className="font-caption text-xs mt-1 opacity-60">{coll.projectCount} proyectos</p>
          </div>
        </div>

        {/* Delete Button / Confirmation */}
        {onDelete && (
          confirmDelete ? (
            <div className="flex items-center gap-1.5 animate-fade-in" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={(e) => { e.stopPropagation(); onConfirmDelete?.(); }}
                disabled={deleting}
                className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-all"
                title="Confirmar eliminación"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onCancelDelete?.(); }}
                disabled={deleting}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/60 transition-all"
                title="Cancelar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/10 text-red-400/50 hover:text-red-400"
              title="Eliminar colección"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )
        )}
      </div>

      {/* Preview of first 3 mods */}
      <div className="flex gap-2">
        {coll.modsLoading ? (
          // Loading skeletons for mods
          [...Array(3)].map((_, i) => (
            <div key={i} className="w-12 h-12 rounded-xl bg-white/5 animate-pulse shrink-0" />
          ))
        ) : coll.mods && coll.mods.length > 0 ? (
          coll.mods.slice(0, 3).map((mod, i) => (
            <div key={mod.projectId} className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 shrink-0 overflow-hidden shadow-md">
              {mod.iconUrl ? (
                <img src={mod.iconUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs opacity-30">
                  {mod.title.substring(0, 2)}
                </div>
              )}
            </div>
          ))
        ) : (
          // Empty slots
          [...Array(3)].map((_, i) => (
            <div key={i} className="w-12 h-12 rounded-xl bg-white/2 border border-white/5 shrink-0 flex items-center justify-center text-white/20">
              <span className="text-xs">—</span>
            </div>
          ))
        )}
        {coll.projectCount > 3 && (
          <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 shrink-0 flex items-center justify-center">
            <span className="font-bold text-xs opacity-60">+{coll.projectCount - 3}</span>
          </div>
        )}
      </div>
    </div>
  );
}
