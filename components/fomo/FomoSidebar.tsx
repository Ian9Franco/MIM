/**
 * @fileoverview FomoSidebar – slide-in panel for discovering Minecraft mods.
 * Optimized for v5.9: Modularized into hooks and components.
 */

"use client";

import React, { useEffect, useState } from "react";
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
import { OnboardingTour }      from "@/components/ui/OnboardingTour";
import { fetchCurseForgePickMods, fetchCollectionMods } from "@/services/api";
import { ModrinthIcon, CurseForgeIcon } from "./parts/FomoPlatformIcons";
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

const SOURCE_OPTIONS = [
  { value: "all", label: "Ambos" },
  { value: "modrinth", label: "Modrinth", icon: <ModrinthIcon /> }, 
  { value: "curseforge", label: "CurseForge", icon: <CurseForgeIcon /> }
];

export function FomoSidebar({ open, onClose, defaultLoader = "forge", defaultVersion = "1.20.1", activeProject, pendingFiles = [], onOpenDownloads }: any) {
  const { status, showStatus, clearStatus } = useStatusBanner();
  const discover = useFomoDiscover(defaultLoader, defaultVersion, showStatus);
  const m = useFomoSidebarManager(open, discover, showStatus);
  const [currentTheme, setCurrentTheme] = useState("official");
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem("onboarding_fomo");
    const guidesEnabled = localStorage.getItem("guides_enabled") === "true";
    if (open && (!seen || guidesEnabled)) {
      setShowOnboarding(true);
    } else if (!open) {
      setShowOnboarding(false);
    }
  }, [open]);

  const onboardingSteps = [
    {
      target: '#onboarding-fomo-tabs',
      title: 'Navegación FOMO',
      content: 'Desde acá podés moverte entre Spotlight, Explorar, Colecciones y Autores Seguidos.'
    },
    {
      target: '#onboarding-fomo-spotlight',
      title: 'Spotlight',
      content: 'Acá ves los mods destacados del momento, selecciones de la comunidad y carruseles temáticos.'
    },
    {
      target: '#onboarding-fomo-discover',
      title: 'Explorar Mods',
      content: 'Acá podés buscar mods filtrando por versión, loader, categoría y más.'
    },
    {
      target: '#onboarding-fomo-collections',
      title: 'Mis Colecciones',
      content: 'Acá podés crear y gestionar tus propias listas de mods para instalarlos todos juntos.'
    },
    {
      target: '#onboarding-fomo-followed',
      title: 'Seguidos',
      content: 'Acá ves las novedades de los autores y mods que decidiste seguir.'
    },
    {
      target: '#onboarding-fomo-details',
      title: 'Detalles del Mod',
      content: 'Cuando hacés clic en un mod, se abre este panel lateral con las versiones disponibles y dependencias.'
    }
  ];

  useEffect(() => {
    const update = () => setCurrentTheme(document.documentElement.getAttribute("data-theme") || "official");
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  const isModern = currentTheme === "modern";

  useEffect(() => {
    if (activeProject) {
      discover.setLoader(activeProject.loader);
      discover.setGameVersions([activeProject.version]);
    }
  }, [activeProject]);

  // Escuchamos eventos globales para abrir detalles de un mod o buscar desde otras secciones
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [open]);

  useEffect(() => {
    const handleOpenDetails = (e: Event) => {
      const modHit = (e as CustomEvent).detail;
      if (modHit) discover.handleOpenLiveProject(modHit);
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

  const [isForcedHidden, setIsForcedHidden] = useState(false);

  useEffect(() => {
    const handleToggle = (e: any) => {
      // Si recibimos una orden de cerrar detalles desde fuera (ej: durante una descarga)
      // activamos el modo oculto temporal
      if (e.detail.open === false) {
        setIsForcedHidden(true);
      } else {
        setIsForcedHidden(false);
      }
    };
    window.addEventListener("fomo-details-toggle", handleToggle);
    return () => window.removeEventListener("fomo-details-toggle", handleToggle);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("fomo-details-toggle", { detail: { open: !!discover.selectingVersionFor } }));
    }
  }, [discover.selectingVersionFor]);

  const handleCloseAll = () => {
    discover.setSelectingVersionFor(null);
    onClose();
  };

  // Los detalles se muestran si hay un mod seleccionado Y no han sido ocultados forzosamente
  const detailsOpen = open && !!discover.selectingVersionFor && !isForcedHidden;

  return (
    <>
      {/* Shared Backdrop */}
      <div 
        className={`fixed inset-0 z-[60] bg-black/50 transition-opacity duration-500 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`} 
        onClick={handleCloseAll} 
      />

      {/* FOMO Sidebar — left, contracts when details open */}
      <aside 
        className={`fixed inset-y-0 left-0 z-[70] flex flex-col shadow-2xl transition-all duration-500 ease-in-out border border-l-0 fomo-sidebar ${
          open ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0 pointer-events-none"
        }`} 
        style={{ 
          width: detailsOpen ? "72vw" : "80vw",
          maxWidth: detailsOpen ? "1200px" : "1400px",
          background: "var(--fomo-bg)", 
          borderColor: "var(--color-border)",
          borderRightColor: detailsOpen ? "transparent" : "color-mix(in srgb, var(--color-primary) 15%, transparent)",
          borderRadius: "0 2.5rem 2.5rem 0",
          boxShadow: "24px 0 60px rgba(0,0,0,0.4)",
          backdropFilter: "blur(40px)"
        }}
      >
        {/* Accent Top Line */}
        <div className="absolute top-0 inset-x-0 h-[2px] opacity-60 z-10" style={{ background: `linear-gradient(90deg, transparent, var(--color-primary), transparent)` }} />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b shrink-0 relative z-10" style={{ background: "var(--fomo-secondary-bg)", borderColor: "var(--fomo-border)" }}>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Image src="/fomoico.png" alt="" width={28} height={28} className="w-7 h-7 animate-fomo-blink" />
              <div><h2 className="font-headline text-base text-white">FOMO</h2><p className="text-[8px] opacity-40 uppercase">{m.mode}</p></div>
            </div>
            <div id="onboarding-fomo-tabs">
              <PillToggleGroup options={TAB_OPTIONS} value={m.mode} onChange={(v: any) => m.setMode(v)} className="p-1.5" ariaLabel="Seleccionar pestaña" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            {m.mode === "discover" && (
              <PillToggleGroup 
                options={SOURCE_OPTIONS.filter(s => s.value !== "all" || (discover.query.length > 0 && (discover.source === "all" || discover.query.startsWith("author:"))))} 
                value={discover.source} 
                onChange={(v: any) => discover.setSource(v)} 
                className="p-1.5" 
                ariaLabel="Seleccionar fuente" 
              />
            )}
            <button onClick={handleCloseAll} className="p-2 rounded-xl hover:bg-red-500/10 text-white/40 hover:text-red-400"><X className="w-5 h-5" /></button>
          </div>
          {status && <StatusBanner text={status.text} type={status.type} onClose={clearStatus} />}
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {m.mode === "spotlight" && (
            <div id="onboarding-fomo-spotlight" className="flex-1 flex flex-col overflow-hidden">
              <FomoSpotlight 
                onOpenVersions={discover.handleOpenVersionSelector} 
                onOpenCollection={async (coll) => {
                  const sourceKey = (coll.source === "curseforge" ? "curseforge" : "modrinth") as "modrinth" | "curseforge";
                  discover.setSource(sourceKey);
                  discover.setCollectionId(coll.id);
                  discover.setPage(1); // Resetear a la primera página
                  m.setMode("discover");
                  showStatus(`Mostrando mods de "${coll.name}"`, "success");
                }}
                onDownloadMod={discover.handleDownload} 
                downloading={discover.downloading} 
                loader={discover.loader} 
                gameVersion={discover.gameVersions[0]} 
              />
            </div>
          )}
          {m.mode === "discover" && (
            <div id="onboarding-fomo-discover" className="flex-1 flex overflow-hidden">
              <div className="w-65 p-4 border-r border-white/5 overflow-y-auto"><FomoDiscoverFilters {...discover} onLoader={discover.setLoader} onVersions={discover.setGameVersions} onProjectType={discover.setProjectType} onSort={discover.setSortOrder} onCategories={discover.setCategories} onEnvironments={discover.setEnvironments} onOnlyExclusives={discover.setOnlyExclusives} onQuery={discover.setQuery} onRefresh={discover.refetch} /></div>
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="px-6 py-4 flex items-center gap-4 border-b border-white/5">
                  <Search className="w-5 h-5 opacity-40" />
                  
                  {/* Chips para filtros activos */}
                  {discover.collectionId && (
                    <div className="flex items-center gap-1.5 bg-primary/20 text-primary text-[11px] font-bold px-2 py-1 rounded-lg border border-primary/30 animate-fade-in shrink-0">
                      <span>Colección</span>
                      <button onClick={() => discover.setCollectionId(null)} className="hover:text-white transition-colors" title="Quitar filtro de colección">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  
                  {discover.query.startsWith("author:") && (
                    <div className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-500 text-[11px] font-bold px-2 py-1 rounded-lg border border-emerald-500/30 animate-fade-in shrink-0">
                      <span>Autor: {discover.query.replace("author:", "")}</span>
                      <button onClick={() => discover.setQuery("")} className="hover:text-white transition-colors" title="Quitar filtro de autor">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <input 
                    type="search" 
                    value={discover.query.startsWith("author:") ? "" : discover.query} 
                    onChange={e => {
                      const val = e.target.value;
                      discover.setQuery(val);
                      if (val === "" && discover.source === "all") {
                        discover.setSource("modrinth");
                      }
                    }} 
                    onFocus={() => {
                      if (discover.query !== "") {
                        discover.setQuery("");
                        if (discover.source === "all") {
                          discover.setSource("modrinth");
                        }
                      }
                    }}
                    placeholder="Buscar mods..." 
                    className="flex-1 bg-transparent border-none outline-none text-sm text-white" 
                  />
                </div>
                <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {discover.loading ? (
                    <FomoSkeleton count={9} variant="card" isCurseForge={discover.source === "curseforge"} />
                  ) : (
                    discover.mods.map(mod => (
                      <FomoModCard 
                        key={mod.projectId} 
                        mod={mod} 
                        isDownloading={!!discover.downloading[mod.projectId]} 
                        onDownload={discover.handleDownload} 
                        onOpenVersions={discover.handleOpenLiveProject} 
                        isSelected={discover.selectedMods.some(s => s.projectId === mod.projectId)} 
                        onToggleSelect={discover.toggleModSelection} 
                        sinytraActive={discover.sinytraActive}
                        onAddToCollection={() => { m.setAddingToCollectionFor(mod); m.loadCollections(); }} 
                      />
                    ))
                  )}
                </div>
                {discover.selectedMods.length > 0 && <BulkActionsBar mods={discover.selectedMods} isModern={isModern} onCancel={discover.clearSelection} onAdd={() => { m.setBulkAdding(true); m.loadCollections(); }} onDownload={() => discover.selectedMods.forEach(m => discover.handleDownload(m))} />}
                <FomoPagination page={discover.page} totalPages={discover.totalPages} onPage={discover.setPage} loading={discover.loading} />
              </div>
            </div>
          )}
          {m.mode === "collections" && (
            <div id="onboarding-fomo-collections" className="flex-1 flex flex-col overflow-hidden">
              <FomoCollections 
                {...discover} 
                onStatus={showStatus} 
                gameVersion={discover.gameVersions[0]}
                addingForMod={m.addingToCollectionFor}
                onClearAddingFor={() => m.setAddingToCollectionFor(null)}
                onDownloadMod={discover.handleDownload} 
                onOpenVersions={discover.handleOpenLiveProject} 
                onClearSelection={discover.clearSelection}
              />
            </div>
          )}
          {m.mode === "followed" && (
            <div id="onboarding-fomo-followed" className="flex-1 flex flex-col overflow-hidden">
              <FomoFollowedAuthors onSearchAuthor={a => { m.setMode("discover"); discover.setSource("all"); discover.setQuery(`author:${a}`); }} onSearchProject={p => { m.setMode("discover"); discover.setQuery(p); }} onOpenVersions={discover.handleOpenLiveProject} onDownloadMod={discover.handleDownload} downloading={discover.downloading} />
            </div>
          )}
        </div>
        {m.bulkAdding && <BulkCollectionModal onClose={() => { m.setBulkAdding(false); m.setAddingToCollectionFor(null); }} isCreating={m.isCreatingColl} setIsCreating={m.setIsCreatingColl} collections={m.collectionsList} loading={m.loadingColls} addingId={m.addingToCollId} onAdd={m.handleBulkAddToCollection} onCreate={m.handleBulkCreateCollection} name={m.newCollName} setName={m.setNewName} target={m.newCollTarget} setTarget={m.setNewCollTarget} selectedCount={m.addingToCollectionFor ? 1 : discover.selectedMods.length} isCurseSelected={m.isCurseSelected} theme={currentTheme} />}

        {showOnboarding && (
          <OnboardingTour 
            steps={onboardingSteps} 
            onComplete={() => {
              setShowOnboarding(false);
              localStorage.setItem("onboarding_fomo", "true");
            }} 
            onStepChange={(step) => {
              if (step === 1) m.setMode("spotlight");
              if (step === 2) m.setMode("discover");
              if (step === 3) m.setMode("collections");
              if (step === 4) m.setMode("followed");
              if (step === 5) {
                if (!discover.selectingVersionFor && discover.mods.length > 0) {
                  discover.handleOpenLiveProject(discover.mods[0]);
                }
              }
            }}
          />
        )}
      </aside>

      {/* Details Sidebar — only rendered when FOMO is open to prevent ghost blocks */}
      {open && (
        <aside
          id="onboarding-fomo-details"
          className={`fomo-sidebar fixed inset-y-0 right-0 z-[70] flex flex-col transition-all duration-500 ease-in-out ${
            detailsOpen ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 pointer-events-none"
          }`}
          style={{
            width: "600px",
            background: "var(--fomo-bg)",
            borderLeft: "1px solid var(--fomo-border)",
            borderRadius: "2rem 0 0 2rem",
            boxShadow: "-24px 0 60px rgba(0,0,0,0.5)",
            backdropFilter: "blur(40px)"
          }}
        >
          {discover.selectingVersionFor && (
            <FomoVersionOverlay 
              mod={discover.selectingVersionFor} 
              versions={discover.projectVersions} 
              loading={discover.versLoading} 
              downloading={!!discover.downloading[discover.selectingVersionFor.projectId]} 
              loader={discover.loader} 
              gameVersions={discover.gameVersions} 
              projectType={discover.projectType} 
              disablePortal={true}
              onClose={() => discover.setSelectingVersionFor(null)} 
              onDownload={discover.handleDownload} 
              onSearchAuthor={(a: string) => {
                m.setMode("discover");
                discover.setSource("all");
                discover.setQuery(`author:${a}`);
              }}
              onSearchMod={(title: string) => {
                m.setMode("discover");
                discover.setSource("all");
                discover.setQuery(title);
              }}
              pendingFilesCount={pendingFiles.length}
              onOpenDownloads={onOpenDownloads}
            />
          )}
        </aside>
      )}

      {discover.dependencyPrompt && (() => {
        const t = discover.dependencyPrompt.mod.projectType || (discover.dependencyPrompt.mod as any).project_type || "mod";
        const typeLabel = t === "resourcepack" ? "la textura" : t === "shader" ? "el shader" : "el mod";
        
        return (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <div 
              className="w-full max-w-md p-7 rounded-[2.5rem] border shadow-2xl flex flex-col gap-6 animate-scale-in" 
              style={{ 
                background: isModern ? "#f0ede3" : "var(--fomo-secondary-bg)", 
                borderColor: isModern ? "#d4cfc0" : "var(--fomo-border)" 
              }}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${isModern ? 'bg-amber-500/20 text-amber-600' : 'bg-amber-500/10 text-amber-400'}`}>
                  <Workflow className="w-6 h-6" />
                </div>
                <div>
                  <h3 className={`font-headline text-xl ${isModern ? 'text-[#1e1b4b]' : 'text-white'}`}>Dependencias Requeridas</h3>
                  <p className={`text-xs ${isModern ? 'text-slate-600' : 'text-white/60'}`}>{discover.dependencyPrompt.mod.title} necesita otros mods para funcionar.</p>
                </div>
              </div>

              <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                {discover.dependencyPrompt.dependencies.map((dep: any) => (
                  <div 
                    key={dep.projectId} 
                    className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                      isModern ? 'bg-white border-slate-200 shadow-sm' : 'bg-white/5 border-white/5'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-black/5">
                      {dep.iconUrl ? (
                        <img src={dep.iconUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-white/40">MOD</div>
                      )}
                    </div>
                    <span className={`text-sm font-bold truncate ${isModern ? 'text-[#1e1b4b]' : 'text-white'}`}>{dep.title || dep.projectId}</span>
                    <span className={`ml-auto text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${
                      isModern ? 'bg-red-100 text-red-600 border border-red-200' : 'bg-red-500/20 text-red-300'
                    }`}>Requerido</span>
                  </div>
                ))}
              </div>

              <div className={`flex items-center justify-end gap-3 pt-4 border-t ${isModern ? 'border-slate-200' : 'border-white/5'}`}>
                <button
                  onClick={() => discover.setDependencyPrompt(null)}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                    isModern ? 'text-slate-500 hover:text-[#1e1b4b]' : 'text-white/60 hover:text-white'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => discover.confirmDownloadWithDeps(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                    isModern ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  Solo {typeLabel}
                </button>
                <button
                  onClick={() => discover.confirmDownloadWithDeps(true)}
                  className="px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-500/30 transition-all active:scale-95"
                >
                  Descargar todo ({discover.dependencyPrompt.dependencies.length + 1})
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
