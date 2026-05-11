/**
 * @fileoverview FomoSidebar – slide-in panel for discovering, collecting, and
 * applying Minecraft mods from Modrinth and CurseForge.
 *
 * Responsibilities of this file:
 *   - Tab navigation (Discover / Collections)
 *   - Source toggle (Modrinth / CurseForge)
 *   - Composing sub-panels from focused child components
 *   - Managing collection-selector and version-picker overlays
 *
 * Business logic is delegated to:
 *   - useFomoDiscover   (discover tab state + API)
 *   - useStatusBanner   (transient notifications)
 *   - FomoCollections   (collections tab)
 *   - FomoDiscoverFilters, FomoModCard, FomoPagination, FomoVersionOverlay
 */

"use client";

import React, { useState, useCallback } from "react";
import Image from "next/image";
import { X, Search, Library, Download, Layers, Plus, ChevronLeft, Workflow, ChevronRight, Loader2 } from "lucide-react";
import { COLORS } from "@/theme/tokens";
import { useStatusBanner } from "@/hooks/useStatusBanner";
import { useFomoDiscover } from "@/hooks/useFomoDiscover";
import { PillToggleGroup, StatusBanner } from "../ui/primitives";
import { ConfirmModal } from "../ui/ConfirmModal";
import { FomoDiscoverFilters } from "./FomoDiscoverFilters";
import { FomoModCard }         from "./FomoModCard";
import { FomoPagination }      from "./FomoPagination";
import { FomoVersionOverlay }  from "./FomoVersionOverlay";
import { FomoCollections }     from "./FomoCollections";
import { FomoSkeleton }        from "./FomoSkeleton";
import { formatNumber, getProjectTypeLabel } from "@/utils/format";
import { fetchCollections, createCollection, addModToCollection } from "@/services/api";
import type { ModHit, Project } from "@/lib/types";
import "./fomo.css";

type Mode = "discover" | "collections";

interface FomoSidebarProps {
  open:            boolean;
  onClose:         () => void;
  defaultLoader?:  string;
  defaultVersion?: string;
  activeProject?:  Project | null;
}

const TAB_OPTIONS = [
  { value: "discover",    label: "Descubrir",      icon: <Search className="w-4 h-4" />,        activeColor: "#FF6C3E", activeBg: "rgba(255,108,62,0.15)", activeBorder: "rgba(255,108,62,0.3)" },
  { value: "collections", label: "Mis Colecciones", icon: <Library className="w-4 h-4" />,      activeColor: "#66C8A0", activeBg: "rgba(102,200,160,0.15)", activeBorder: "rgba(102,200,160,0.3)" },
];

const SOURCE_OPTIONS = [
  { 
    value: "modrinth",   
    label: "Modrinth",   
    icon: (
      <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" height="14" width="14">
        <path d="M12.252 0.004a11.78 11.768 0 0 0 -8.92 3.73 11 10.999 0 0 0 -2.17 3.11 11.37 11.359 0 0 0 -1.16 5.169c0 1.42 0.17 2.5 0.6 3.77 0.24 0.759 0.77 1.899 1.17 2.529a12.3 12.298 0 0 0 8.85 5.639c0.44 0.05 2.54 0.07 2.76 0.02 0.2 -0.04 0.22 0.1 -0.26 -1.7l-0.36 -1.37 -1.01 -0.06a8.5 8.489 0 0 1 -5.18 -1.8 5.34 5.34 0 0 1 -1.3 -1.26c0 -0.05 0.34 -0.28 0.74 -0.5a37.572 37.545 0 0 1 2.88 -1.629c0.03 0 0.5 0.45 1.06 0.98l1 0.97 2.07 -0.43 2.06 -0.43 1.47 -1.47c0.8 -0.8 1.48 -1.5 1.48 -1.52 0 -0.09 -0.42 -1.63 -0.46 -1.7 -0.04 -0.06 -0.2 -0.03 -1.02 0.18 -0.53 0.13 -1.2 0.3 -1.45 0.4l-0.48 0.15 -0.53 0.53 -0.53 0.53 -0.93 0.1 -0.93 0.07 -0.52 -0.5a2.7 2.7 0 0 1 -0.96 -1.7l-0.13 -0.6 0.43 -0.57c0.68 -0.9 0.68 -0.9 1.46 -1.1 0.4 -0.1 0.65 -0.2 0.83 -0.33 0.13 -0.099 0.65 -0.579 1.14 -1.069l0.9 -0.9 -0.7 -0.7 -0.7 -0.7 -1.95 0.54c-1.07 0.3 -1.96 0.53 -1.97 0.53 -0.03 0 -2.23 2.48 -2.63 2.97l-0.29 0.35 0.28 1.03c0.16 0.56 0.3 1.16 0.31 1.34l0.03 0.3 -0.34 0.23c-0.37 0.23 -2.22 1.3 -2.84 1.63 -0.36 0.2 -0.37 0.2 -0.44 0.1 -0.08 -0.1 -0.23 -0.6 -0.32 -1.03 -0.18 -0.86 -0.17 -2.75 0.02 -3.73a8.84 8.839 0 0 1 7.9 -6.93c0.43 -0.03 0.77 -0.08 0.78 -0.1 0.06 -0.17 0.5 -2.999 0.47 -3.039 -0.01 -0.02 -0.1 -0.02 -0.2 -0.03Zm3.68 0.67c-0.2 0 -0.3 0.1 -0.37 0.38 -0.06 0.23 -0.46 2.42 -0.46 2.52 0 0.04 0.1 0.11 0.22 0.16a8.51 8.499 0 0 1 2.99 2 8.38 8.379 0 0 1 2.16 3.449 6.9 6.9 0 0 1 0.4 2.8c0 1.07 0 1.27 -0.1 1.73a9.37 9.369 0 0 1 -1.76 3.769c-0.32 0.4 -0.98 1.06 -1.37 1.38 -0.38 0.32 -1.54 1.1 -1.7 1.14 -0.1 0.03 -0.1 0.06 -0.07 0.26 0.03 0.18 0.64 2.56 0.7 2.78l0.06 0.06a12.07 12.058 0 0 0 7.27 -9.4c0.13 -0.77 0.13 -2.58 0 -3.4a11.96 11.948 0 0 0 -5.73 -8.578c-0.7 -0.42 -2.05 -1.06 -2.25 -1.06Z" fill="currentColor" />
      </svg>
    ), 
    activeColor: "#1ED760", 
    activeBg: "rgba(30,215,96,0.15)", 
    activeBorder: "rgba(30,215,96,0.3)" 
  },
  { 
    value: "curseforge", 
    label: "CurseForge", 
    icon: (
      <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" height="14" width="14">
        <path d="M18.326 9.2145S23.2261 8.4418 24 6.1882h-7.5066V4.4H0l2.0318 2.3576V9.173s5.1267 -0.2665 7.1098 1.2372c2.7146 2.516 -3.053 5.917 -3.053 5.917L5.0995 19.6c1.5465 -1.4726 4.494 -3.3775 9.8983 -3.2857 -2.0565 0.65 -4.1245 1.6651 -5.7344 3.2857h10.9248l-1.0288 -3.2726s-7.918 -4.6688 -0.8336 -7.1127z" fill="currentColor" />
      </svg>
    ), 
    activeColor: "#EF6C00", 
    activeBg: "rgba(239,108,0,0.15)",  
    activeBorder: "rgba(239,108,0,0.3)" 
  },
];

const SIDEBAR_TITLE: Record<Mode, (source: string) => string> = {
  discover:    (src) => src === "modrinth" ? "Novedades de Modrinth" : "Catálogo CurseForge",
  collections: ()    => "Mis Colecciones de Modrinth",
};

export function FomoSidebar({
  open, onClose, defaultLoader = "forge", defaultVersion = "1.20.1", activeProject,
}: FomoSidebarProps) {
  const [mode, setMode] = useState<Mode>("discover");
  const [addingToCollectionFor, setAddingToCollectionFor] = useState<ModHit | null>(null);

  // Bulk collection adding states
  const [bulkAdding, setBulkAdding] = useState(false);
  const [collectionsList, setCollectionsList] = useState<any[]>([]);
  const [loadingColls, setLoadingColls] = useState(false);
  const [isCreatingColl, setIsCreatingColl] = useState(false);
  const [newCollName, setNewCollName] = useState("");
  const [newCollTarget, setNewCollTarget] = useState<"local" | "modrinth">("local");
  const [addingToCollId, setAddingToCollId] = useState<string | null>(null);

  const loadCollectionsForBulk = async () => {
    setLoadingColls(true);
    try {
      const { collections: colls } = await fetchCollections();
      setCollectionsList(colls || []);
    } catch (e) {
      console.error(e);
    }
    setLoadingColls(false);
  };

  const handleOpenBulkAddToCollection = () => {
    setBulkAdding(true);
    setIsCreatingColl(false);
    setNewCollName("");
    loadCollectionsForBulk();
  };

  const handleBulkAddToCollection = async (coll: any) => {
    setAddingToCollId(coll.id);
    const modsToAdd = discover.selectedMods;
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
      showStatus(`Se añadieron ${successCount}/${modsToAdd.length} ítems a ${coll.name}. Algunos fallaron.`, "info");
    } else {
      showStatus(`${modsToAdd.length} ítems añadidos con éxito a la colección "${coll.name}"`, "success");
    }

    setBulkAdding(false);
    setAddingToCollId(null);
    discover.clearSelection();
  };

  const handleBulkCreateCollection = async () => {
    const name = newCollName.trim() || "Nueva Colección";
    const modsToAdd = discover.selectedMods;
    if (modsToAdd.length === 0) return;

    setLoadingColls(true);
    let successCount = 0;
    let lastError = null;

    // Crear la colección primero con el primer mod
    const { collection, error } = await createCollection(name, modsToAdd[0], newCollTarget);
    
    if (error) { 
      showStatus(error, "error"); 
      setLoadingColls(false);
      return; 
    }
    
    successCount++;

    // Añadir el resto de los mods
    if (modsToAdd.length > 1) {
      for (let i = 1; i < modsToAdd.length; i++) {
        const { error: addErr } = await addModToCollection(collection!.id, modsToAdd[i], newCollTarget);
        if (!addErr) successCount++;
        else lastError = addErr;
      }
    }

    if (lastError && successCount < modsToAdd.length) {
      showStatus(`Colección creada, pero solo se añadieron ${successCount}/${modsToAdd.length} ítems.`, "info");
    } else {
      showStatus(`Nueva colección "${name}" creada y ${modsToAdd.length} ítems añadidos.`, "success");
    }

    setBulkAdding(false);
    setLoadingColls(false);
    discover.clearSelection();
  };

  const { status, showStatus, clearStatus } = useStatusBanner();
  const discover = useFomoDiscover(defaultLoader, defaultVersion, showStatus);
  const {
    setLoader,
    setGameVersions,
    setSinytraActive,
    setSelectingVersionFor,
    setQuery,
    handleOpenVersionSelector,
  } = discover;

  const [isTransitioningColumns, setIsTransitioningColumns] = useState(false);
  const [transitionTarget, setTransitionTarget] = useState<"two" | "three">("three");
  const lastDetailsState = React.useRef(!!discover.selectingVersionFor);

  React.useEffect(() => {
    const nextState = !!discover.selectingVersionFor;
    if (nextState !== lastDetailsState.current) {
      setIsTransitioningColumns(true);
      setTransitionTarget(nextState ? "two" : "three");
      
      const timer = setTimeout(() => {
        setIsTransitioningColumns(false);
      }, 450); // 450ms makes it completely instant and fluid without any heavy GPU burden
      
      lastDetailsState.current = nextState;
      return () => clearTimeout(timer);
    }
  }, [discover.selectingVersionFor]);

  React.useEffect(() => {
    if (activeProject) {
      setLoader(activeProject.loader);
      setGameVersions([activeProject.version]);
      
      // Auto-detect Sinytra Connector
      fetch(`/api/library?version=${activeProject.version}&loader=${activeProject.loader}&project=${activeProject.name}`)
        .then(r => r.json())
        .then(data => {
          const hasConnector = data.library?.some((m: { meta?: { modId?: string }; fileName: string }) => 
            m.meta?.modId === "connector" || 
            m.fileName.toLowerCase().includes("connector") || 
            m.fileName.toLowerCase().includes("sinytra")
          );
          setSinytraActive(!!hasConnector);
        })
        .catch(err => console.warn("[FomoSidebar] Error detecting Sinytra Connector:", err));
    }
  }, [activeProject, setLoader, setGameVersions, setSinytraActive]);

  React.useEffect(() => {
    const isDetailsOpen = !!discover.selectingVersionFor;
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("fomo-details-toggle", { detail: { open: isDetailsOpen } }));
    }
  }, [discover.selectingVersionFor]);

  React.useEffect(() => {
    const handleExternalDetails = (e: Event) => {
      const customEvent = e as CustomEvent<ModHit>;
      if (customEvent.detail) {
        setMode("discover");
        handleOpenVersionSelector(customEvent.detail);
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("fomo-open-details", handleExternalDetails);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("fomo-open-details", handleExternalDetails);
      }
    };
  }, [handleOpenVersionSelector]);

  React.useEffect(() => {
    const handleSearchAndOpen = (e: Event) => {
      const customEvent = e as CustomEvent<{ query: string }>;
      if (customEvent.detail && customEvent.detail.query) {
        setMode("discover");
        setSelectingVersionFor(null);
        setQuery(customEvent.detail.query);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("fomo-toggle", { detail: true }));
        }
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("fomo-search-and-open", handleSearchAndOpen);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("fomo-search-and-open", handleSearchAndOpen);
      }
    };
  }, [setSelectingVersionFor, setQuery]);

  React.useEffect(() => {
    if (!open) {
      setSelectingVersionFor(null);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("fomo-details-toggle", { detail: { open: false } }));
      }
    }
  }, [open, setSelectingVersionFor]);

  const handleAddToCollection = useCallback((mod: ModHit) => {
    setAddingToCollectionFor(mod);
  }, []);

  const isDetailsOpen = !!discover.selectingVersionFor;
  const sidebarWidth = isDetailsOpen ? "calc(100vw - 600px - 40px)" : "75vw";

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 z-30 bg-black/45 backdrop-blur-md transition-opacity duration-1000 ease-[cubic-bezier(0.6,0.01,-0.05,0.95)] ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Panel FOMO"
        className={`fixed inset-y-0 left-0 z-50 flex flex-col shadow-2xl transition-all duration-800 ease-[cubic-bezier(0.34,1.56,0.64,1)] border-r fomo-sidebar fomo-sidebar-container overflow-hidden ${
          discover.source === "curseforge" ? "fomo-source-curseforge" : "fomo-source-modrinth"
        } ${
          open ? "translate-x-0 opacity-100 pointer-events-auto" : "-translate-x-full opacity-0 pointer-events-none"
        }`}
        style={{ 
          width: sidebarWidth, 
          maxWidth: isDetailsOpen ? "none" : "1400px",
          background: "var(--fomo-bg)", 
          borderColor: "var(--fomo-border)",
          backdropFilter: "blur(30px)",
          borderRadius: "0 2rem 2.5rem 2rem" 
        }}
      >
        {/* Unified Premium Header */}
        <div className="relative flex items-center justify-between px-6 py-3.5 border-b shrink-0" style={{ background: "var(--fomo-secondary-bg)", borderColor: "var(--fomo-border)" }}>
          <div className="flex items-center gap-4">
            {/* Title & Icon */}
            <div className="flex items-center gap-3">
              <div aria-hidden="true" className="w-8.5 h-8.5 rounded-lg flex items-center justify-center shadow-lg relative group" style={{ background: "var(--fomo-secondary-bg)", border: "1px solid var(--fomo-border)" }}>
                <div className="absolute inset-0 rounded-lg bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <Image src="/fomoico.png" alt="" width={28} height={28} className="w-7 h-7 relative z-10 animate-pulse object-contain" />
              </div>
              <div>
                <h2 className="font-headline text-base leading-none" style={{ color: COLORS.foreground }}>FOMO</h2>
                <p className="font-label text-[8px] opacity-40 mt-1 tracking-widest uppercase">
                  {SIDEBAR_TITLE[mode](discover.source)}
                </p>
              </div>
            </div>

            <div className="w-px h-6 bg-white/10" />

            {/* Section Tabs (Descubrir | Colecciones) */}
            <PillToggleGroup 
              options={TAB_OPTIONS} 
              value={mode} 
              onChange={(v) => setMode(v as Mode)} 
              className="p-1.5 min-w-70" 
              style={{ background: "var(--fomo-secondary-bg)", borderColor: "var(--fomo-border)" }}
              ariaLabel="Secciones de FOMO" 
            />
          </div>
          
          <div className="flex items-center gap-4">

            {/* Source Options (Modrinth | CurseForge) - Only in discover mode */}
            {mode === "discover" && (
              <PillToggleGroup 
                options={SOURCE_OPTIONS} 
                value={discover.source} 
                onChange={(v) => discover.setSource(v as "modrinth" | "curseforge")} 
                className="p-1.5 shadow-inner min-w-60" 
                style={{ background: "var(--fomo-secondary-bg)", borderColor: "var(--fomo-border)" }}
                ariaLabel="Fuente de mods" 
              />
            )}

            <div className="w-px h-6 bg-white/10" />

            {/* Close Button */}
            <button 
              onClick={onClose} 
              aria-label="Cerrar panel" 
              className="relative w-10 h-10 rounded-xl hover:bg-red-500/10 active:scale-95 transition-all border border-transparent hover:border-red-500/20 group flex items-center justify-center overflow-hidden" 
              style={{ color: COLORS.muted }}
            >
              <X className="w-5 h-5 absolute transition-all duration-300 group-hover:opacity-0 group-hover:scale-50 group-hover:rotate-90" />
              <ChevronLeft className="w-5 h-5 absolute transition-all duration-300 opacity-0 scale-50 -rotate-90 group-hover:opacity-100 group-hover:scale-100 group-hover:rotate-0 text-red-400" />
            </button>
          </div>
          {status && <StatusBanner text={status.text} type={status.type} onClose={clearStatus} />}
        </div>

        {/* Source error banner */}
        {discover.sourceError && (
          <div className="mx-4 mb-2 p-3 rounded-xl text-xs" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <p className="font-subhead text-red-400">⚠️ {discover.sourceError}</p>
            <p className="font-caption mt-1" style={{ color: COLORS.muted }}>Configurá la API key en los Ajustes del Sistema (Configuración).</p>
          </div>
        )}

        {/* Tab content */}
        {mode === "discover" ? (
          <div className="flex-1 flex overflow-hidden">
            {/* Left Sidebar Filters */}
            <div className="p-4 pr-2 flex flex-col h-full shrink-0">
              <aside 
                className="w-65 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-6 p-5 rounded-2xl border"
                style={{ 
                  background: "color-mix(in srgb, var(--color-card) 50%, transparent)", 
                  borderColor: "var(--fomo-border)" 
                }}
              >
                {(discover.loader === "forge" || discover.loader === "neoforge") && discover.projectType === "mod" && (
                  <div className={`fomo-sinytra-card ${discover.sinytraActive ? "active" : ""}`}>
                    {/* Glowing effect inside the card */}
                    {discover.sinytraActive && (
                      <div className="fomo-sinytra-glow" />
                    )}
                    
                    <div className="flex items-center justify-between gap-2.5 relative z-10">
                      <div className="flex items-center gap-2">
                        <div className={`fomo-sinytra-icon-container ${discover.sinytraActive ? "animate-pulse" : ""}`}>
                          <Workflow className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black tracking-wider uppercase">Híbrido Sinytra</span>
                          <span className="text-[8px] opacity-60 font-bold">Forge + Fabric</span>
                        </div>
                      </div>
                      <button
                        role="switch"
                        aria-checked={discover.sinytraActive}
                        onClick={() => {
                          const nextVal = !discover.sinytraActive;
                          discover.setSinytraActive(nextVal);
                          showStatus(nextVal ? "Modo híbrido Sinytra activado: mostrando mods de Forge y Fabric" : "Modo híbrido desactivado: mostrando solo Forge", "info");
                        }}
                        className={`fomo-sinytra-switch ${discover.sinytraActive ? "active" : ""}`}
                      >
                        <div className="fomo-sinytra-switch-knob" />
                      </button>
                    </div>
                    <p className="text-[9px] leading-relaxed relative z-10 opacity-75">
                      Busca e instala mods de <strong>Fabric</strong> en tu entorno de Forge.
                    </p>
                  </div>
                )}

                <FomoDiscoverFilters
                  loader={discover.loader} gameVersions={discover.gameVersions}
                  projectType={discover.projectType} sortOrder={discover.sortOrder}
                  categories={discover.categories} environments={discover.environments}
                  query={discover.query} loading={discover.loading}
                  source={discover.source}
                  onLoader={discover.setLoader} onVersions={discover.setGameVersions}
                  onProjectType={discover.setProjectType} onSort={discover.setSortOrder}
                  onCategories={discover.setCategories} onEnvironments={discover.setEnvironments}
                  onQuery={discover.setQuery} onRefresh={discover.refetch}
                />
              </aside>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Toolbar: Search */}
              <div className="px-6 py-4 flex items-center gap-4 border-b shrink-0 fomo-header-border" style={{ borderColor: "var(--color-border)" }}>
                <div className="flex-1 flex items-center gap-3 rounded-xl px-4 py-2.5 bg-(--fomo-secondary-bg) border border-(--fomo-border) focus-within:border-primary/50 transition-all">
                  <Search className="w-5 h-5 text-(--fomo-text-muted) opacity-50" />
                  <input
                    type="search"
                    value={discover.query}
                    onChange={(e) => discover.setQuery(e.target.value)}
                    placeholder={`Buscar en ${discover.source === 'modrinth' ? 'Modrinth' : 'CurseForge'}...`}
                    className="flex-1 bg-transparent border-none outline-none! focus:outline-none! focus-visible:outline-none! ring-0! text-sm font-medium text-(--fomo-text-primary) placeholder:text-(--fomo-text-muted)/50"
                    style={{ outline: "none", boxShadow: "none" }}
                  />
                  {discover.query && (
                    <button onClick={() => setQuery("")} className="p-1 hover:bg-(--fomo-secondary-bg) rounded-full">
                      <X className="w-4 h-4 text-(--fomo-text-muted)" />
                    </button>
                  )}
                </div>
              </div>

              <div className="px-6 py-3 shrink-0 flex items-center justify-between">
                <p className="font-caption text-xs uppercase tracking-widest" style={{ color: "var(--fomo-text-muted)" }}>
                  {discover.loading ? "Cargando..." : (
                    <>
                      <span className="font-bold" style={{ color: "var(--fomo-text-primary)" }}>{formatNumber(discover.total)}</span> {getProjectTypeLabel(discover.projectType)} encontrados
                    </>
                  )}
                </p>
                <p className="font-caption text-xs uppercase tracking-widest" style={{ color: "var(--fomo-text-muted)" }}>
                  Página <span className="font-bold" style={{ color: "var(--fomo-text-primary)" }}>{discover.page}</span> de {discover.totalPages}
                </p>
              </div>

                {/* Mod list */}
              <div 
                className={`flex-1 overflow-y-auto custom-scrollbar px-6 pb-6 pt-2 grid grid-cols-1 ${!!discover.selectingVersionFor ? "lg:grid-cols-2" : "lg:grid-cols-2 xl:grid-cols-3"} gap-2 content-start transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${discover.loading && discover.mods.length > 0 ? 'opacity-40' : 'opacity-100'}`} 
                role="feed" 
                aria-label="Lista de mods" 
                aria-busy={discover.loading}
              >
                {isTransitioningColumns ? (
                  <div className="col-span-full animate-fade-in">
                    <FomoSkeleton 
                      variant="card"
                      isCurseForge={discover.source === "curseforge"}
                      message={transitionTarget === "two" ? "Adaptando columnas..." : "Expandiendo catálogo..."} 
                      count={transitionTarget === "two" ? 6 : 9} 
                    />
                  </div>
                ) : discover.loading && (discover.mods.length === 0 || discover.page === 1) ? (
                  <div className="col-span-full">
                    <FomoSkeleton 
                      variant="card"
                      isCurseForge={discover.source === "curseforge"}
                      message={discover.source === "modrinth" ? "Consultando Modrinth..." : "Consultando CurseForge..."} 
                      count={9} 
                    />
                  </div>
                ) : discover.mods.length === 0 && !discover.loading ? (
                   <div className="col-span-full py-20 text-center opacity-40">
                     <p className="font-subhead">No se encontraron resultados</p>
                   </div>
                ) : discover.mods.map((mod) => (
                  <div key={mod.projectId} className="p-2 bg-transparent overflow-visible">
                    <FomoModCard
                      mod={mod}
                      isDownloading={!!discover.downloading[mod.projectId]}
                      onDownload={discover.handleDownload}
                      onOpenVersions={(m) => {
                        discover.handleOpenVersionSelector(m);
                        if (!discover.selectedMods.some(sel => sel.projectId === m.projectId)) {
                          discover.toggleModSelection(m);
                        }
                      }}
                      onAddToCollection={handleAddToCollection}
                      isSelected={discover.selectedMods.some(m => m.projectId === mod.projectId)}
                      onToggleSelect={(m) => {
                        discover.toggleModSelection(m);
                        // Proactivamente abrir detalles al seleccionar
                        if (!discover.selectedMods.some(sel => sel.projectId === m.projectId)) {
                          discover.handleOpenVersionSelector(m);
                        }
                      }}
                      sinytraActive={discover.sinytraActive}
                    />
                  </div>
                ))}
              </div>

              {/* Bulk Actions Bar */}
              {discover.selectedMods.length > 0 && (
                <div className="mx-4 mb-4 p-3 rounded-2xl flex items-center justify-between animate-slide-up" style={{ background: COLORS.card, border: `1px solid ${COLORS.primary}`, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
                  <div className="flex items-center gap-3 pl-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/20 text-primary font-bold">
                      {discover.selectedMods.length}
                    </div>
                    <span className="text-sm font-bold" style={{ color: COLORS.foreground }}>Seleccionados</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => discover.clearSelection()}
                      className="px-4 py-2 rounded-xl text-xs font-bold transition-all hover:bg-white/10"
                      style={{ color: COLORS.muted }}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleOpenBulkAddToCollection}
                      className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all border border-white/10 hover:bg-white/5 active:scale-95"
                      style={{ color: COLORS.foreground }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Añadir a...
                    </button>
                    <button
                      onClick={async () => {
                        showStatus(`Iniciando descarga de ${discover.selectedMods.length} items...`, "info");
                        for (const mod of discover.selectedMods) {
                          await discover.handleDownload(mod);
                          // Pequeño delay para no saturar
                          await new Promise(r => setTimeout(r, 500));
                        }
                        discover.clearSelection();
                      }}
                      className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-primary text-white shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Descargar Todo
                    </button>
                  </div>
                </div>
              )}

              <FomoPagination page={discover.page} totalPages={discover.totalPages} loading={discover.loading} onPage={discover.setPage} />
            </div>
          </div>
        ) : (
          <FomoCollections
            loader={discover.loader}
            gameVersion={discover.gameVersions[0] || "1.20.1"}
            onStatus={showStatus}
            addingForMod={addingToCollectionFor}
            onClearAddingFor={() => setAddingToCollectionFor(null)}
            downloading={discover.downloading}
            onDownloadMod={discover.handleDownload}
            onOpenVersions={discover.handleOpenVersionSelector}
            selectedMods={discover.selectedMods}
            onToggleSelect={discover.toggleModSelection}
            onClearSelection={discover.clearSelection}
            isDetailsOpen={!!discover.selectingVersionFor}
            sinytraActive={discover.sinytraActive}
          />
        )}

        {/* Version overlay */}
        {(() => {
          const selMod = discover.selectingVersionFor;
          if (!selMod) return null;
          return (
            <FomoVersionOverlay
              mod={selMod}
              versions={discover.projectVersions}
              loading={discover.versLoading}
              downloading={!!discover.downloading[selMod.projectId]}
              loader={discover.loader}
              gameVersions={discover.gameVersions}
              projectType={discover.projectType}
              onClose={() => discover.setSelectingVersionFor(null)}
              onDownload={discover.handleDownload}
            />
          );
        })()}

        {/* Dependency Prompt Modal */}
        {discover.dependencyPrompt && (
          <ConfirmModal
            isOpen={!!discover.dependencyPrompt}
            onClose={() => {
              discover.setDependencyPrompt(null);
              discover.confirmDownloadWithDeps(false);
            }}
            onConfirm={() => discover.confirmDownloadWithDeps(true)}
            title={`${discover.dependencyPrompt.mod.title} requiere dependencias`}
            message={`Este mod necesita ${discover.dependencyPrompt.dependencies.length} dependencia${discover.dependencyPrompt.dependencies.length === 1 ? "" : "s"} para funcionar correctamente.`}
            confirmLabel="Descargar con dependencias"
            cancelLabel="Solo el mod"
            type="info"
          >
            <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
              <p className="text-xs font-medium mb-2" style={{ color: COLORS.muted }}>Dependencias requeridas:</p>
              {discover.dependencyPrompt.dependencies.map((dep) => (
                <div 
                  key={dep.projectId}
                  className="flex items-center gap-2 p-2 rounded-lg"
                  style={{ background: "var(--color-secondary-bg)" }}
                >
                  {dep.iconUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={dep.iconUrl} alt="" className="w-6 h-6 rounded" />
                  ) : (
                    <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: "var(--color-hover)" }}>
                      <Layers className="w-3 h-3" style={{ color: COLORS.muted }} />
                    </div>
                  )}
                  <span className="text-sm font-medium" style={{ color: COLORS.foreground }}>{dep.title}</span>
                </div>
              ))}
            </div>
          </ConfirmModal>
        )}

        {/* Bulk Add to Collection In-Place Modal Overlay */}
        {bulkAdding && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/65 backdrop-blur-xl animate-fade-in">
            <div 
              className="w-full max-w-sm rounded-2xl border p-5 flex flex-col gap-4 shadow-2xl animate-scale-in"
              style={{ 
                background: "var(--color-card)", 
                borderColor: "rgba(255, 255, 255, 0.08)",
                boxShadow: "0 24px 64px rgba(0,0,0,0.6)"
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-headline text-base font-bold" style={{ color: COLORS.foreground }}>
                    {isCreatingColl ? "Nueva Colección" : "Añadir a Colección"}
                  </h3>
                  <p className="text-[11px] opacity-50 mt-0.5">
                    {isCreatingColl 
                      ? "Crea una colección para tus mods" 
                      : `Selecciona una colección para añadir ${discover.selectedMods.length} ítems`}
                  </p>
                </div>
                <button 
                  type="button"
                  onClick={() => setBulkAdding(false)} 
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                  style={{ color: COLORS.muted }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              {isCreatingColl ? (
                <div className="flex flex-col gap-3.5 py-1">
                  {/* Platform toggle */}
                  <div className="flex p-1 bg-black/40 rounded-xl gap-1 border border-white/5">
                    <button
                      type="button"
                      onClick={() => setNewCollTarget("modrinth")}
                      className={`flex-1 py-1 rounded-lg text-[11px] font-bold transition-all ${
                        newCollTarget === "modrinth" ? "bg-primary text-white shadow-sm" : "opacity-45 hover:opacity-100"
                      }`}
                    >
                      Modrinth
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewCollTarget("local")}
                      className={`flex-1 py-1 rounded-lg text-[11px] font-bold transition-all ${
                        newCollTarget === "local" ? "bg-white/10 text-white shadow-sm" : "opacity-45 hover:opacity-100"
                      }`}
                    >
                      Local
                    </button>
                  </div>

                  {/* Name Input */}
                  <div className="flex flex-col gap-1">
                    <label htmlFor="new-collection-name" className="text-[9px] uppercase tracking-wider opacity-40 font-bold">Nombre</label>
                    <input
                      id="new-collection-name"
                      autoFocus
                      type="text"
                      value={newCollName}
                      onChange={(e) => setNewCollName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleBulkCreateCollection()}
                      placeholder={newCollTarget === "modrinth" ? "Ej: Mis Optimizaciones" : "Ej: Local Pack"}
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-3.5 py-2.5 outline-none focus:border-primary/50 text-xs font-medium transition-all"
                      style={{ color: COLORS.foreground }}
                    />
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-2 pt-1">
                    <button 
                      type="button"
                      onClick={() => setIsCreatingColl(false)} 
                      className="flex-1 py-2 rounded-xl text-xs font-bold border border-white/10 hover:bg-white/5 transition-all active:scale-95" 
                      style={{ color: COLORS.muted }}
                    >
                      Volver
                    </button>
                    <button 
                      type="button"
                      onClick={handleBulkCreateCollection} 
                      disabled={!newCollName.trim() || loadingColls}
                      className="flex-2 py-2 rounded-xl text-xs font-bold bg-primary text-white shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:scale-100 transition-all flex items-center justify-center gap-1.5"
                    >
                      {loadingColls ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Crear y Añadir"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5 max-h-72 overflow-y-auto custom-scrollbar pr-0.5 py-0.5">
                  {/* Create New Collection Option */}
                  <button 
                    type="button"
                    onClick={() => { setIsCreatingColl(true); setNewCollName(""); }} 
                    className="w-full p-3 rounded-xl border-2 border-dashed border-white/10 hover:border-primary/40 hover:bg-primary/5 transition-all flex items-center justify-center gap-2 group active:scale-98"
                  >
                    <Plus className="w-3.5 h-3.5 text-primary group-hover:scale-110 transition-transform" />
                    <span className="font-bold text-xs" style={{ color: COLORS.foreground }}>Nueva Colección</span>
                  </button>

                  {/* Collections List */}
                  {loadingColls ? (
                    <div className="py-10 flex flex-col items-center gap-2 text-foreground/40">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      <p className="text-[11px]">Cargando colecciones...</p>
                    </div>
                  ) : collectionsList.length === 0 ? (
                    <p className="text-xs text-center py-6 opacity-40">No tienes colecciones creadas todavía.</p>
                  ) : (
                    collectionsList
                      .filter(c => c.id !== "followed-projects")
                      .map((coll) => (
                        <button 
                          key={coll.id} 
                          type="button"
                          onClick={() => handleBulkAddToCollection(coll)} 
                          disabled={addingToCollId != null}
                          className="flex items-center gap-3 p-2 rounded-xl bg-white/3 hover:bg-white/8 border border-white/5 hover:border-primary/20 transition-all text-left group disabled:opacity-40"
                        >
                          <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 shrink-0 flex items-center justify-center overflow-hidden">
                            {coll.iconUrl ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={coll.iconUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Library className="w-3.5 h-3.5 text-primary/80" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-xs truncate" style={{ color: COLORS.foreground }}>{coll.name}</p>
                            <p className="text-[10px]" style={{ color: COLORS.muted }}>{coll.projectCount} proyectos</p>
                          </div>
                          <div className="shrink-0">
                            {addingToCollId === coll.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            )}
                          </div>
                        </button>
                      ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
