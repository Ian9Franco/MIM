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
import { Flame, X, Zap, Box, Search, Library, Download, Layers, ArrowUpDown } from "lucide-react";
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
import { formatNumber, getProjectTypeLabel } from "@/utils/format";
import type { ModHit, VersionEntry } from "@/lib/types";
import type { SortOrder } from "@/constants/app";
import "./fomo.css";

type Mode = "discover" | "collections";

interface FomoSidebarProps {
  open:            boolean;
  onClose:         () => void;
  defaultLoader?:  string;
  defaultVersion?: string;
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
  open, onClose, defaultLoader = "forge", defaultVersion = "1.20.1",
}: FomoSidebarProps) {
  const [mode, setMode] = useState<Mode>("discover");
  const [addingToCollectionFor, setAddingToCollectionFor] = useState<ModHit | null>(null);

  const { status, showStatus, clearStatus } = useStatusBanner();
  const discover = useFomoDiscover(defaultLoader, defaultVersion, showStatus);

  React.useEffect(() => {
    const isDetailsOpen = !!discover.selectingVersionFor;
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("fomo-details-toggle", { detail: { open: isDetailsOpen } }));
    }
  }, [discover.selectingVersionFor]);

  React.useEffect(() => {
    if (!open) {
      discover.setSelectingVersionFor(null);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("fomo-details-toggle", { detail: { open: false } }));
      }
    }
  }, [open, discover]);

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
        className={`fixed inset-0 z-30 bg-black/45 backdrop-blur-md transition-opacity duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Panel FOMO"
        className={`fixed inset-y-0 left-0 z-50 flex flex-col shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] border-r fomo-sidebar fomo-sidebar-container ${
          discover.source === "curseforge" ? "fomo-source-curseforge" : "fomo-source-modrinth"
        } ${
          open ? "translate-x-0 opacity-100 pointer-events-auto" : "-translate-x-full opacity-0 pointer-events-none"
        }`}
        style={{ 
          width: sidebarWidth, 
          maxWidth: isDetailsOpen ? "none" : "1400px",
          background: "rgba(10,10,12,0.98)", 
          borderColor: COLORS.border,
          backdropFilter: "blur(30px)",
          borderRadius: "0 2rem 2rem 0" 
        }}
      >
        {/* Unified Premium Header */}
        <div className="relative flex items-center justify-between px-6 py-3.5 border-b shrink-0 bg-black/20" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-4">
            {/* Title & Icon */}
            <div className="flex items-center gap-3">
              <div aria-hidden="true" className="w-8.5 h-8.5 rounded-lg flex items-center justify-center shadow-lg relative group" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <div className="absolute inset-0 rounded-lg bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <Flame className="w-4.5 h-4.5 relative z-10 animate-pulse" style={{ color: COLORS.fomoFlame }} />
              </div>
              <div>
                <h2 className="font-headline text-base leading-none" style={{ color: COLORS.foreground }}>FOMO</h2>
                <p className="font-label text-[8px] opacity-40 mt-1 tracking-[0.1em] uppercase">
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
              className="scale-90 origin-left bg-black/20 border-white/5 p-1" 
              ariaLabel="Secciones de FOMO" 
            />
          </div>
          
          <div className="flex items-center gap-4">

            {/* Source Options (Modrinth | CurseForge) - Only in discover mode */}
            {mode === "discover" && (
              <PillToggleGroup 
                options={SOURCE_OPTIONS} 
                value={discover.source} 
                onChange={(v) => discover.setSource(v as any)} 
                className="scale-90 origin-right bg-black/60 border-white/5 p-1 shadow-inner" 
                ariaLabel="Fuente de mods" 
              />
            )}

            <div className="w-px h-6 bg-white/10" />

            {/* Close Button */}
            <button 
              onClick={onClose} 
              aria-label="Cerrar panel" 
              className="p-2 rounded-xl hover:bg-red-500/10 active:scale-95 transition-all border border-transparent hover:border-red-500/20 group" 
              style={{ color: COLORS.muted }}
            >
              <X className="w-5 h-5 group-hover:text-red-400 transition-colors" />
            </button>
          </div>
          {status && <StatusBanner text={status.text} type={status.type} onClose={clearStatus} />}
        </div>

        {/* Source error banner */}
        {discover.sourceError && (
          <div className="mx-4 mb-2 p-3 rounded-xl text-xs" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <p className="font-subhead text-red-400">⚠️ {discover.sourceError}</p>
            <p className="font-caption mt-1" style={{ color: COLORS.muted }}>Agregá CURSEFORGE_API_KEY en tu .env.local</p>
          </div>
        )}

        {/* Tab content */}
        {mode === "discover" ? (
          <div className="flex-1 flex overflow-hidden">
            {/* Left Sidebar Filters */}
            <div className="p-4 pr-2 flex flex-col h-full shrink-0">
              <aside 
                className="w-[260px] flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-6 p-5 rounded-2xl border"
                style={{ 
                  background: "color-mix(in srgb, var(--color-card) 50%, transparent)", 
                  borderColor: "var(--fomo-border)" 
                }}
              >
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
                <div className="flex-1 flex items-center gap-3 rounded-xl px-4 py-2.5 bg-[var(--fomo-secondary-bg)] border border-[var(--fomo-border)] focus-within:border-primary/50 transition-all">
                  <Search className="w-5 h-5 text-[var(--fomo-text-muted)] opacity-50" />
                  <input
                    type="search"
                    value={discover.query}
                    onChange={(e) => discover.setQuery(e.target.value)}
                    placeholder={`Buscar en ${discover.source === 'modrinth' ? 'Modrinth' : 'CurseForge'}...`}
                    className="flex-1 bg-transparent outline-none text-sm font-medium text-[var(--fomo-text-primary)] placeholder:text-[var(--fomo-text-muted)]/50"
                  />
                  {discover.query && (
                    <button onClick={() => discover.setQuery("")} className="p-1 hover:bg-[var(--fomo-secondary-bg)] rounded-full">
                      <X className="w-4 h-4 text-[var(--fomo-text-muted)]" />
                    </button>
                  )}
                </div>
              </div>

              {/* Counter */}
              <div className="px-6 py-3 shrink-0 flex items-center justify-between">
                <p className="font-caption text-xs uppercase tracking-widest text-[var(--fomo-text-muted)]">
                  {discover.loading ? "Cargando..." : (
                    <>
                      <span className="text-[var(--fomo-text-primary)] font-bold">{formatNumber(discover.total)}</span> {getProjectTypeLabel(discover.projectType)} encontrados
                    </>
                  )}
                </p>
                <p className="font-caption text-xs uppercase tracking-widest text-[var(--fomo-text-muted)]">
                  Página <span className="text-[var(--fomo-text-primary)] font-bold">{discover.page}</span> de {discover.totalPages}
                </p>
              </div>

              {/* Mod list */}
              <div className={`flex-1 overflow-y-auto custom-scrollbar px-6 pb-6 grid grid-cols-1 ${!!discover.selectingVersionFor ? "lg:grid-cols-2" : "lg:grid-cols-2 xl:grid-cols-3"} gap-4 content-start`} role="feed" aria-label="Lista de mods" aria-busy={discover.loading}>
                {discover.mods.map((mod) => (
                  <FomoModCard
                    key={mod.projectId}
                    mod={mod}
                    isDownloading={!!discover.downloading[mod.projectId]}
                    onDownload={discover.handleDownload}
                    onOpenVersions={discover.handleOpenVersionSelector}
                    onAddToCollection={handleAddToCollection}
                    isSelected={discover.selectedMods.some(m => m.projectId === mod.projectId)}
                    onToggleSelect={discover.toggleModSelection}
                  />
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
              onDownloadDependency={discover.handleDownloadDependency}
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
      </aside>
    </>
  );
}
