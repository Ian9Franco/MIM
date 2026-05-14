/**
 * @fileoverview FomoSidebar – slide-in panel for discovering Minecraft mods.
 * Optimized for v5.9: Modularized into hooks and components.
 */

"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import { X, Search, Library, Download, Plus, ChevronLeft, Workflow, Heart, Spotlight } from "lucide-react";
import { COLORS } from "@/theme/tokens";
import { useStatusBanner } from "@/hooks/useStatusBanner";
import { useFomoDiscover } from "@/hooks/useFomoDiscover";
import { useFomoSidebarManager } from "@/hooks/useFomoSidebarManager";
import { PillToggleGroup, StatusBanner } from "../ui/primitives";
import { ConfirmModal } from "../ui/ConfirmModal";
import { FomoDiscoverFilters } from "./FomoDiscoverFilters";
import { FomoModCard }         from "./FomoModCard";
import { FomoPagination }      from "./FomoPagination";
import { FomoVersionOverlay }  from "./FomoVersionOverlay";
import { FomoSpotlight }       from "./FomoSpotlight";
import { FomoCollections }     from "./FomoCollections";
import { FomoFollowedAuthors } from "./FomoFollowedAuthors";
import { FomoSkeleton }        from "./FomoSkeleton";
import { BulkActionsBar, BulkCollectionModal } from "./FomoSidebarComponents";
import { formatNumber, getProjectTypeLabel } from "@/utils/format";
import type { ModHit, Project } from "@/lib/types";
import "./fomo.css";

const TAB_OPTIONS = [
  { value: "spotlight", label: "Spotlight", icon: <Spotlight className="w-4 h-4" /> },
  { value: "discover", label: "Explorar", icon: <Search className="w-4 h-4" /> },
  { value: "collections", label: "Colecciones", icon: <Library className="w-4 h-4" /> },
  { value: "followed", label: "Seguidos", icon: <Heart className="w-4 h-4" /> },
];

const SOURCE_OPTIONS = [{ value: "modrinth", label: "Modrinth" }, { value: "curseforge", label: "CurseForge" }];

export function FomoSidebar({ open, onClose, defaultLoader = "forge", defaultVersion = "1.20.1", activeProject }: any) {
  const { status, showStatus, clearStatus } = useStatusBanner();
  const discover = useFomoDiscover(defaultLoader, defaultVersion, showStatus);
  const m = useFomoSidebarManager(open, discover, showStatus);

  useEffect(() => {
    if (activeProject) {
      discover.setLoader(activeProject.loader);
      discover.setGameVersions([activeProject.version]);
    }
  }, [activeProject]);

  // Escuchamos eventos globales para abrir detalles de un mod o buscar desde otras secciones
  useEffect(() => {
    const handleOpenDetails = (e: Event) => {
      const modHit = (e as CustomEvent).detail;
      if (modHit) discover.handleOpenVersionSelector(modHit);
    };

    const handleSearchAndOpen = (e: Event) => {
      const { query } = (e as CustomEvent).detail || {};
      if (query) {
        m.setMode("discover");
        discover.setQuery(query);
      }
    };

    window.addEventListener("fomo-open-details", handleOpenDetails);
    window.addEventListener("fomo-search-and-open", handleSearchAndOpen);

    return () => {
      window.removeEventListener("fomo-open-details", handleOpenDetails);
      window.removeEventListener("fomo-search-and-open", handleSearchAndOpen);
    };
  }, [discover, m]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("fomo-details-toggle", { detail: { open: !!discover.selectingVersionFor } }));
    }
  }, [discover.selectingVersionFor]);

  return (
    <>
      <div className={`fixed inset-0 z-30 bg-black/45 backdrop-blur-md transition-opacity duration-700 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`} onClick={onClose} />
      <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col shadow-2xl transition-all duration-700 border-r fomo-sidebar ${open ? "translate-x-0" : "-translate-x-full"}`} style={{ width: m.isDetailsOpen ? "calc(100vw - 600px - 40px)" : "75vw", background: "var(--fomo-bg)", borderColor: "var(--fomo-border)", borderRadius: "0 2rem 2.5rem 2rem" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b shrink-0" style={{ background: "var(--fomo-secondary-bg)", borderColor: "var(--fomo-border)" }}>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Image src="/fomoico.png" alt="" width={28} height={28} className="w-7 h-7" />
              <div><h2 className="font-headline text-base text-white">FOMO</h2><p className="text-[8px] opacity-40 uppercase">{m.mode}</p></div>
            </div>
            <PillToggleGroup options={TAB_OPTIONS} value={m.mode} onChange={(v: any) => m.setMode(v)} className="p-1.5" ariaLabel="Seleccionar pestaña" />
          </div>
          <div className="flex items-center gap-4">
            {m.mode === "discover" && <PillToggleGroup options={SOURCE_OPTIONS} value={discover.source} onChange={(v: any) => discover.setSource(v)} className="p-1.5" ariaLabel="Seleccionar fuente" />}
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-red-500/10 text-white/40 hover:text-red-400"><X className="w-5 h-5" /></button>
          </div>
          {status && <StatusBanner text={status.text} type={status.type} onClose={clearStatus} />}
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {m.mode === "spotlight" && <FomoSpotlight onOpenVersions={discover.handleOpenVersionSelector} onDownloadMod={discover.handleDownload} downloading={discover.downloading} loader={discover.loader} gameVersion={discover.gameVersions[0]} />}
          {m.mode === "discover" && (
            <div className="flex-1 flex overflow-hidden">
              <div className="w-65 p-4 border-r border-white/5 overflow-y-auto"><FomoDiscoverFilters {...discover} onLoader={discover.setLoader} onVersions={discover.setGameVersions} onProjectType={discover.setProjectType} onSort={discover.setSortOrder} onCategories={discover.setCategories} onEnvironments={discover.setEnvironments} onOnlyExclusives={discover.setOnlyExclusives} onQuery={discover.setQuery} onRefresh={discover.refetch} /></div>
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="px-6 py-4 flex items-center gap-4 border-b border-white/5"><Search className="w-5 h-5 opacity-40" /><input type="search" value={discover.query} onChange={e => discover.setQuery(e.target.value)} placeholder="Buscar mods..." className="flex-1 bg-transparent border-none outline-none text-sm text-white" /></div>
                <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {discover.loading ? <FomoSkeleton count={9} /> : discover.mods.map(mod => <FomoModCard key={mod.projectId} mod={mod} isDownloading={!!discover.downloading[mod.projectId]} onDownload={discover.handleDownload} onOpenVersions={discover.handleOpenVersionSelector} isSelected={discover.selectedMods.some(s => s.projectId === mod.projectId)} onToggleSelect={discover.toggleModSelection} onAddToCollection={() => { m.setAddingToCollectionFor(mod); m.loadCollections(); }} />)}
                </div>
                {discover.selectedMods.length > 0 && <BulkActionsBar count={discover.selectedMods.length} onCancel={discover.clearSelection} onAdd={() => { m.setBulkAdding(true); m.loadCollections(); }} onDownload={() => discover.selectedMods.forEach(m => discover.handleDownload(m))} />}
                <FomoPagination page={discover.page} totalPages={discover.totalPages} onPage={discover.setPage} loading={discover.loading} />
              </div>
            </div>
          )}
          {m.mode === "collections" && <FomoCollections {...discover} onStatus={showStatus} onDownloadMod={discover.handleDownload} onOpenVersions={discover.handleOpenVersionSelector} />}
          {m.mode === "followed" && <FomoFollowedAuthors onSearchAuthor={a => { m.setMode("discover"); discover.setQuery(`author:${a}`); }} onSearchProject={p => { m.setMode("discover"); discover.setQuery(p); }} onOpenVersions={discover.handleOpenVersionSelector} onDownloadMod={discover.handleDownload} downloading={discover.downloading} />}
        </div>

        {/* Overlays */}
        {discover.selectingVersionFor && <FomoVersionOverlay mod={discover.selectingVersionFor} versions={discover.projectVersions} loading={discover.versLoading} downloading={!!discover.downloading[discover.selectingVersionFor.projectId]} loader={discover.loader} gameVersions={discover.gameVersions} projectType={discover.projectType} onClose={() => discover.setSelectingVersionFor(null)} onDownload={discover.handleDownload} />}
        {m.bulkAdding && <BulkCollectionModal onClose={() => m.setBulkAdding(false)} isCreating={m.isCreatingColl} setIsCreating={m.setIsCreatingColl} collections={m.collectionsList} loading={m.loadingColls} addingId={m.addingToCollId} onAdd={m.handleBulkAddToCollection} onCreate={m.handleBulkCreateCollection} name={m.newCollName} setName={m.setNewCollName} target={m.newCollTarget} setTarget={m.setNewCollTarget} selectedCount={discover.selectedMods.length} />}
        {discover.dependencyPrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <div className="w-full max-w-md p-6 rounded-3xl border shadow-2xl flex flex-col gap-6" style={{ background: "var(--fomo-secondary-bg)", borderColor: "var(--fomo-border)" }}>
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400">
                  <Workflow className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-headline text-lg text-white">Dependencias Requeridas</h3>
                  <p className="text-xs text-white/60">{discover.dependencyPrompt.mod.title} necesita otros mods para funcionar correctamente.</p>
                </div>
              </div>

              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                {discover.dependencyPrompt.dependencies.map((dep: any) => (
                  <div key={dep.projectId} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/5">
                    {dep.iconUrl ? (
                      <img src={dep.iconUrl} alt="" className="w-6 h-6 rounded-lg object-cover" />
                    ) : (
                      <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-[10px] font-bold text-white/60">MOD</div>
                    )}
                    <span className="text-sm font-medium text-white">{dep.title || dep.projectId}</span>
                    <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 font-semibold uppercase">Requerido</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/5">
                <button
                  onClick={() => discover.setDependencyPrompt(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-white/60 hover:text-white hover:bg-white/5 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => discover.confirmDownloadWithDeps(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-white/10 text-white hover:bg-white/20 transition"
                >
                  Solo el mod
                </button>
                <button
                  onClick={() => discover.confirmDownloadWithDeps(true)}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-amber-500 text-black hover:bg-amber-400 transition shadow-lg shadow-amber-500/20 font-semibold"
                >
                  Descargar todo ({discover.dependencyPrompt.dependencies.length + 1})
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
