"use client";

import React, { useEffect, useMemo, useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Search, Workflow } from "lucide-react";
import { useFomoDiscover } from "@/hooks/useFomoDiscover";
import { useFomoSidebarManager } from "@/hooks/useFomoSidebarManager";
import { FomoDiscoverFilters } from "./FomoDiscoverFilters";
import { FomoModCard } from "./FomoModCard";
import { FomoPagination } from "./FomoPagination";
import { FomoVersionOverlay } from "./FomoVersionOverlay";
import { FomoSpotlight } from "./FomoSpotlight";
import { FomoCollections } from "./FomoCollections";
import { FomoFollowedAuthors } from "./FomoFollowedAuthors";
import { FomoSkeleton } from "./FomoSkeleton";
import { BulkActionsBar, BulkCollectionModal } from "./FomoSidebarComponents";
import { FomoFollowedShowcases } from "./FomoFollowedShowcases";
import { FomoDiscoverProvider, FomoDiscoverSourceBar } from "./FomoDiscoverContext";
import { consumeFomoDiscoverAction } from "@/lib/fomoDiscoverPending";
import { runPendingDiscoverAction } from "@/lib/fomoDiscoverActions";
import {
  FOMO_DETAILS_PANEL_WIDTH,
  FOMO_DETAILS_VISUAL_GAP,
  fomoDetailsPanelLeft,
} from "@/lib/fomoLayout";
import type { FomoMode } from "./fomoSidebarTypes";
import type { ModHit } from "@/lib/types";

interface FomoSidebarDiscoverBranchProps {
  open: boolean;
  mode: FomoMode;
  setMode: (mode: FomoMode) => void;
  /** True when community tab is active but discover stays mounted for mod details. */
  hidden?: boolean;
  layoutDetailsOpen?: boolean;
  onDetailsOpenChange: (open: boolean) => void;
  onDiscoverKeepAlive: (alive: boolean) => void;
  onRegisterOpenProjectById?: (
    fn: ((id: string, platform?: string) => void) | null
  ) => void;
  onClose: () => void;
  defaultLoader?: string;
  defaultVersion?: string;
  activeProject?: unknown;
  pendingFiles?: unknown[];
  onOpenDownloads?: () => void;
  showStatus: (text: string, type?: "success" | "error" | "info") => void;
  allSharedMods: unknown[];
  allSharedVideos: unknown[];
  currentUser: unknown;
  currentUserColor?: string | null;
  refreshSharing: () => Promise<void>;
  currentTheme: string;
  isForcedHidden: boolean;
}

function FomoSidebarDiscoverBranchInner({
  open,
  mode,
  setMode,
  hidden = false,
  layoutDetailsOpen = false,
  onDetailsOpenChange,
  onDiscoverKeepAlive,
  onRegisterOpenProjectById,
  onClose,
  defaultLoader = "forge",
  defaultVersion = "1.20.1",
  activeProject,
  pendingFiles = [],
  onOpenDownloads,
  showStatus,
  allSharedMods,
  allSharedVideos,
  currentUser,
  currentUserColor,
  refreshSharing,
  currentTheme,
  isForcedHidden,
}: FomoSidebarDiscoverBranchProps) {
  const discover = useFomoDiscover(
    defaultLoader,
    defaultVersion,
    showStatus as (text: string, type?: string) => void
  );
  const m = useFomoSidebarManager(
    discover,
    showStatus as (text: string, type?: string) => void,
    setMode
  );
  const isModern = currentTheme === "modern";

 const handleSearchProject = (e: Event) => {
    const detail = (e as CustomEvent).detail || {};
    if (detail?.query) {
      setMode("discover");
      // Type cast discover here as well
      runPendingDiscoverAction(
        { type: "searchProject", ...detail },
        discover as any,
        setMode
      );
    }
  };

  // --- RESTORED MEMOIZED CALLBACK ---
  const applyPendingAction = useCallback(() => {
    const action = consumeFomoDiscoverAction();
    if (!action) return;
    runPendingDiscoverAction(action, discover as any, setMode);
  }, [discover, setMode]);

  useEffect(() => {
    applyPendingAction();
  }, [applyPendingAction]);

  useEffect(() => {
    if (!onRegisterOpenProjectById) return;
    onRegisterOpenProjectById((id, platform) => {
      void discover.handleOpenProjectById(id, platform);
    });
    return () => onRegisterOpenProjectById(null);
  }, [discover.handleOpenProjectById, onRegisterOpenProjectById]);

  useEffect(() => {
    const onApply = () => applyPendingAction();
    window.addEventListener("fomo-apply-pending-discover", onApply);
    return () => window.removeEventListener("fomo-apply-pending-discover", onApply);
  }, [applyPendingAction]);

  const syncedProjectKeyRef = useRef<string | null>(null);
  const projectLoader =
    activeProject && typeof activeProject === "object"
      ? (activeProject as { loader?: string }).loader
      : undefined;
  const projectVersion =
    activeProject && typeof activeProject === "object"
      ? (activeProject as { version?: string }).version
      : undefined;

  useEffect(() => {
    if (!projectLoader && !projectVersion) return;
    const key = `${projectLoader ?? ""}|${projectVersion ?? ""}`;
    if (syncedProjectKeyRef.current === key) return;
    syncedProjectKeyRef.current = key;
    if (projectLoader) discover.setLoader(projectLoader);
    if (projectVersion) discover.setGameVersions([projectVersion]);
  }, [projectLoader, projectVersion, discover.setLoader, discover.setGameVersions]);

  useEffect(() => {
    const handleOpenDetails = (e: Event) => {
      const modHit = (e as CustomEvent).detail;
      if (modHit) discover.handleOpenLiveProject(modHit);
    };
    const handleSearchAndOpen = (e: Event) => {
      const { query } = (e as CustomEvent).detail || {};
      if (query) {
        setMode("discover");
        discover.setQuery(query);
      }
    };
    const handleSearchAuthor = (e: Event) => {
      const { author } = (e as CustomEvent).detail || {};
      if (author) {
        setMode("discover");
        discover.setSource("all");
        discover.setQuery(`author:${author}`);
      }
    };
    const handleOpenProjectDetails = (e: Event) => {
      const { id, platform } = (e as CustomEvent).detail || {};
      if (id) void discover.handleOpenProjectById(id, platform);
    };
    const handleSearchProjectEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      if (detail?.query) {
        setMode("discover");
        // Fixed: Type-casted discover to avoid type mismatch
        runPendingDiscoverAction(
          { type: "searchProject", ...detail },
          discover as any,
          setMode
        );
      }
    };

    const handleOnboardingOpenDetails = () => {
      if (!discover.selectingVersionFor && discover.mods.length > 0) {
        discover.handleOpenLiveProject(discover.mods[0]);
      }
    };

    window.addEventListener("fomo-open-details", handleOpenDetails);
    window.addEventListener("fomo-search-and-open", handleSearchAndOpen);
    window.addEventListener("fomo-search-author", handleSearchAuthor);
    window.addEventListener("fomo-open-project-details", handleOpenProjectDetails);
    window.addEventListener("fomo-search-project", handleSearchProjectEvent);
    window.addEventListener("fomo-onboarding-open-details", handleOnboardingOpenDetails);
    return () => {
      window.removeEventListener("fomo-open-details", handleOpenDetails);
      window.removeEventListener("fomo-search-and-open", handleSearchAndOpen);
      window.removeEventListener("fomo-search-author", handleSearchAuthor);
      window.removeEventListener("fomo-open-project-details", handleOpenProjectDetails);
      window.removeEventListener("fomo-search-project", handleSearchProjectEvent);
      window.removeEventListener("fomo-onboarding-open-details", handleOnboardingOpenDetails);
    };
  }, [discover, setMode]);

  const [detailsPortalReady, setDetailsPortalReady] = useState(false);
  useEffect(() => setDetailsPortalReady(true), []);

  const detailsOpen =
    open &&
    !isForcedHidden &&
    (!!discover.selectingVersionFor || discover.versLoading);

  useEffect(() => {
    onDetailsOpenChange(detailsOpen);
  }, [detailsOpen, isForcedHidden, onDetailsOpenChange]);

  useEffect(() => {
    const keepAlive =
      !!discover.selectingVersionFor ||
      discover.versLoading ||
      !!discover.dependencyPrompt ||
      m.bulkAdding;
    onDiscoverKeepAlive(keepAlive);
  }, [
    discover.selectingVersionFor,
    discover.versLoading,
    discover.dependencyPrompt,
    m.bulkAdding,
    onDiscoverKeepAlive,
  ]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("fomo-details-toggle", { detail: { open: !!discover.selectingVersionFor } })
      );
    }
  }, [discover.selectingVersionFor]);

  const handleCloseAll = useCallback(() => {
    discover.setSelectingVersionFor(null);
    onClose();
  }, [discover, onClose]);

  const detailsSharing = useMemo(() => {
    const dm = discover.selectingVersionFor;
    if (!dm) {
      return {
        sharers: [] as { username: string; color?: string | null; avatar_url?: string | null }[],
        sharedByMe: false,
      };
    }
    const pf = dm._source === "curseforge" ? "curseforge" : "modrinth";
    const byProfile = new Map<
      string,
      { username: string; color?: string | null; avatar_url?: string | null }
    >();
    for (const s of allSharedMods as {
      mod_id: string;
      platform: string;
      profile_id?: string;
      profiles?: { username?: string; color?: string | null; avatar_url?: string | null };
    }[]) {
      if (String(s.mod_id) !== String(dm.projectId)) continue;
      if (s.platform !== pf) continue;
      const pid = s.profile_id;
      const username = s.profiles?.username;
      if (!pid || !username) continue;
      byProfile.set(pid, {
        username,
        color: s.profiles?.color,
        avatar_url: s.profiles?.avatar_url,
      });
    }
    const userId = (currentUser as { id?: string } | null)?.id;
    const sharedByMe = !!(
      userId &&
      (allSharedMods as { mod_id: string; profile_id?: string; platform: string }[]).some(
        (s) =>
          String(s.mod_id) === String(dm.projectId) &&
          s.profile_id === userId &&
          s.platform === pf
      )
    );
    return { sharers: [...byProfile.values()], sharedByMe };
  }, [discover.selectingVersionFor, allSharedMods, currentUser]);

  const sharersByMod = useMemo(() => {
    const map = new Map<
      string,
      { username: string; color?: string | null; avatar_url?: string | null }[]
    >();
    for (const s of allSharedMods as {
      mod_id: string;
      platform: string;
      profile_id?: string;
      profiles?: { username?: string; color?: string | null; avatar_url?: string | null };
    }[]) {
      const pid = s.profile_id;
      const username = s.profiles?.username;
      if (!pid || !username) continue;
      const key = `${s.platform}:${s.mod_id}`;
      if (!map.has(key)) map.set(key, []);
      const list = map.get(key)!;
      if (!list.some((x) => x.username === username)) {
        list.push({
          username,
          color: s.profiles?.color,
          avatar_url: s.profiles?.avatar_url,
        });
      }
    }
    return map;
  }, [allSharedMods]);

  return (
    <FomoDiscoverProvider discover={discover as import("./FomoDiscoverContext").FomoDiscoverApi}>
      {!hidden && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {mode === "spotlight" && (
            <div id="onboarding-fomo-spotlight" className="flex-1 flex flex-col overflow-hidden">
              <FomoSpotlight
                onOpenVersions={discover.handleOpenVersionSelector}
                onOpenCollection={async (coll) => {
                  const sourceKey = (coll.source === "curseforge" ? "curseforge" : "modrinth") as
                    | "modrinth"
                    | "curseforge";
                  discover.setSource(sourceKey);
                  discover.setCollectionId(coll.id);
                  discover.setPage(1);
                  setMode("discover");
                  showStatus(`Mostrando mods de "${coll.name}"`, "success");
                }}
                onDownloadMod={discover.handleDownload}
                downloading={discover.downloading}
                loader={discover.loader}
                gameVersion={discover.gameVersions[0]}
              />
            </div>
          )}
          {mode === "discover" && (
            <div id="onboarding-fomo-discover" className="flex-1 flex overflow-hidden">
              <div className="w-65 p-4 border-r border-white/5 overflow-y-auto">
                <FomoDiscoverFilters
                  {...discover}
                  onLoader={discover.setLoader}
                  onVersions={discover.setGameVersions}
                  onProjectType={discover.setProjectType}
                  onSort={discover.setSortOrder}
                  onCategories={discover.setCategories}
                  onEnvironments={discover.setEnvironments}
                  onOnlyExclusives={discover.setOnlyExclusives}
                  onQuery={discover.setQuery}
                  onRefresh={discover.refetch}
                />
              </div>
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="px-6 py-4 flex items-center gap-4 border-b border-white/5 flex-wrap">
                  <FomoDiscoverSourceBar
                    discover={discover as import("./FomoDiscoverContext").FomoDiscoverApi}
                  />
                  <Search className="w-5 h-5 opacity-40 shrink-0" />
                  {discover.collectionId && (
                    <div className="flex items-center gap-1.5 bg-primary/20 text-primary text-[11px] font-bold px-2 py-1 rounded-lg border border-primary/30 animate-fade-in shrink-0">
                      <span>Colección</span>
                      <button
                        onClick={() => discover.setCollectionId(null)}
                        className="hover:text-white transition-colors"
                        title="Quitar filtro de colección"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  {discover.query.startsWith("author:") && (
                    <div className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-500 text-[11px] font-bold px-2 py-1 rounded-lg border border-emerald-500/30 animate-fade-in shrink-0">
                      <span>Autor: {discover.query.replace("author:", "")}</span>
                      <button
                        onClick={() => discover.setQuery("")}
                        className="hover:text-white transition-colors"
                        title="Quitar filtro de autor"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  <input
                    type="search"
                    value={discover.query.startsWith("author:") ? "" : discover.query}
                    onChange={(e) => {
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
                    <FomoSkeleton
                      count={9}
                      variant="card"
                      isCurseForge={discover.source === "curseforge"}
                    />
                  ) : (
                    discover.mods.map((mod) => {
                      const platformKey =
                        mod._source === "curseforge" ? "curseforge" : "modrinth";
                      const communitySharers =
                        sharersByMod.get(`${platformKey}:${mod.projectId}`) || [];
                      return (
                        <FomoModCard
                          key={`${platformKey}:${mod.projectId}`}
                          mod={mod}
                          isDownloading={!!discover.downloading[mod.projectId]}
                          onDownload={discover.handleDownload}
                          onOpenVersions={discover.handleOpenLiveProject}
                          isSelected={discover.selectedMods.some(
                            (s) => s.projectId === mod.projectId
                          )}
                          onToggleSelect={discover.toggleModSelection}
                          sinytraActive={discover.sinytraActive}
                          onAddToCollection={() => {
                            m.setAddingToCollectionFor(mod);
                            m.loadCollections();
                          }}
                          followedByUsers={communitySharers}
                        />
                      );
                    })
                  )}
                </div>
                {discover.selectedMods.length > 0 && (
                  <BulkActionsBar
                    mods={discover.selectedMods}
                    isModern={isModern}
                    onCancel={discover.clearSelection}
                    onAdd={() => {
                      m.setBulkAdding(true);
                      m.loadCollections();
                    }}
                    onDownload={() =>
                      discover.selectedMods.forEach((mod) => discover.handleDownload(mod))
                    }
                  />
                )}
                <FomoPagination
                  page={discover.page}
                  totalPages={discover.totalPages}
                  onPage={discover.setPage}
                  loading={discover.loading}
                />
              </div>
            </div>
          )}
          {mode === "collections" && (
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
          {mode === "showcases" && (
            <div id="onboarding-fomo-showcases" className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6">
                <FomoFollowedShowcases
                  currentUser={currentUser}
                  allSharedVideos={allSharedVideos}
                  fetchCommunitySharingInfo={refreshSharing}
                  animationClass="animate-fade-in"
                  currentUserColor={currentUserColor}
                />
              </div>
            </div>
          )}
          {mode === "followed" && (
            <div id="onboarding-fomo-followed" className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto">
                <FomoFollowedAuthors
                  onSearchAuthor={(a) => {
                    setMode("discover");
                    discover.setSource("all");
                    discover.setQuery(`author:${a}`);
                    discover.setLoader("all");
                    discover.setGameVersions([]);
                  }}
                  onSearchProject={(p, type, source, loader, version) => {
                    setMode("discover");
                    discover.setSource((source as "modrinth" | "curseforge" | "all") || "all");
                    discover.setProjectType(type || "mod");
                    discover.setLoader(loader || "all");
                    discover.setGameVersions(version ? [version] : []);
                    discover.setQuery(p);
                  }}
                  onOpenVersions={discover.handleOpenLiveProject}
                  onDownloadMod={discover.handleDownload}
                  downloading={discover.downloading}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {m.bulkAdding && (
        <BulkCollectionModal
          onClose={() => {
            m.setBulkAdding(false);
            m.setAddingToCollectionFor(null);
          }}
          isCreating={m.isCreatingColl}
          setIsCreating={m.setIsCreatingColl}
          collections={m.collectionsList}
          loading={m.loadingColls}
          addingId={m.addingToCollId}
          onAdd={m.handleBulkAddToCollection}
          onCreate={m.handleBulkCreateCollection}
          name={m.newCollName}
          setName={m.setNewName}
          target={m.newCollTarget}
          setTarget={m.setNewCollTarget}
          selectedCount={m.addingToCollectionFor ? 1 : discover.selectedMods.length}
          isCurseSelected={m.isCurseSelected}
          theme={currentTheme}
        />
      )}

      {detailsPortalReady &&
        open &&
        createPortal(
          <aside
            id="onboarding-fomo-details"
            className="fomo-sidebar fomo-details-panel fixed flex flex-col transition-all duration-500 ease-in-out overflow-hidden"
            style={{
              zIndex: 85,
              top: `${FOMO_DETAILS_VISUAL_GAP}px`,
              bottom: `${FOMO_DETAILS_VISUAL_GAP}px`,
              width: `${FOMO_DETAILS_PANEL_WIDTH}px`,
              maxWidth: `min(${FOMO_DETAILS_PANEL_WIDTH}px, calc(100vw - 300px))`,
              left: layoutDetailsOpen ? fomoDetailsPanelLeft() : "100vw",
              opacity: detailsOpen ? 1 : 0,
              pointerEvents: detailsOpen ? "auto" : "none",
              visibility: detailsOpen ? "visible" : "hidden",
              transform: detailsOpen ? "translateX(0)" : "translateX(48px)",
              background: "var(--fomo-bg)",
              border: "1px solid var(--fomo-border)",
              borderRadius: "1.25rem",
              boxShadow: "0 12px 48px rgba(0,0,0,0.45)",
              backdropFilter: "blur(40px)",
            }}
          >
            {discover.selectingVersionFor ? (
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
                  setMode("discover");
                  discover.setSource("all");
                  discover.setQuery(`author:${a}`);
                }}
                onSearchMod={(title: string) => {
                  setMode("discover");
                  discover.setSource("all");
                  discover.setQuery(title);
                }}
                pendingFilesCount={(pendingFiles as unknown[]).length}
                onOpenDownloads={onOpenDownloads}
                communitySharers={detailsSharing.sharers}
                communitySharedByMe={detailsSharing.sharedByMe}
                currentUserCommunityColor={currentUserColor}
              />
            ) : discover.versLoading ? (
              <div className="flex-1 flex items-center justify-center text-white/40 text-sm">
                Cargando detalles del proyecto...
              </div>
            ) : null}
          </aside>,
          document.body
        )}

      {discover.dependencyPrompt &&
        (() => {
          const t =
            discover.dependencyPrompt.mod.projectType ||
            (discover.dependencyPrompt.mod as { project_type?: string }).project_type ||
            "mod";
          const typeLabel =
            t === "resourcepack"
              ? "la textura"
              : t === "shader"
                ? "el shader"
                : "el mod";

          return (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
              <div
                className="w-full max-w-md p-7 rounded-[2.5rem] border shadow-2xl flex flex-col gap-6 animate-scale-in"
                style={{
                  background: isModern ? "#f0ede3" : "var(--fomo-secondary-bg)",
                  borderColor: isModern ? "#d4cfc0" : "var(--fomo-border)",
                }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`p-3 rounded-2xl ${isModern ? "bg-amber-500/20 text-amber-600" : "bg-amber-500/10 text-amber-400"}`}
                  >
                    <Workflow className="w-6 h-6" />
                  </div>
                  <div>
                    <h3
                      className={`font-headline text-xl ${isModern ? "text-[#1e1b4b]" : "text-white"}`}
                    >
                      Dependencias Requeridas
                    </h3>
                    <p
                      className={`text-xs ${isModern ? "text-slate-600" : "text-white/60"}`}
                    >
                      {discover.dependencyPrompt.mod.title} necesita otros mods para funcionar.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                  {discover.dependencyPrompt.dependencies.map((dep) => (
                    <div
                      key={dep.projectId}
                      className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                        isModern ? "bg-white border-slate-200 shadow-sm" : "bg-white/5 border-white/5"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg overflow-hidden bg-black/5">
                        {dep.iconUrl ? (
                          <img src={dep.iconUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-white/40">
                            MOD
                          </div>
                        )}
                      </div>
                      <span
                        className={`text-sm font-bold truncate ${isModern ? "text-[#1e1b4b]" : "text-white"}`}
                      >
                        {dep.title || dep.projectId}
                      </span>
                      <span
                        className={`ml-auto text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${
                          isModern
                            ? "bg-red-100 text-red-600 border border-red-200"
                            : "bg-red-500/20 text-red-300"
                        }`}
                      >
                        Requerido
                      </span>
                    </div>
                  ))}
                </div>
                <div
                  className={`flex items-center justify-end gap-3 pt-4 border-t ${isModern ? "border-slate-200" : "border-white/5"}`}
                >
                  <button
                    onClick={() => discover.setDependencyPrompt(null)}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                      isModern ? "text-slate-500 hover:text-[#1e1b4b]" : "text-white/60 hover:text-white"
                    }`}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => discover.confirmDownloadWithDeps(false)}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                      isModern
                        ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                        : "bg-white/10 text-white hover:bg-white/20"
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
    </FomoDiscoverProvider>
  );
}

export const FomoSidebarDiscoverBranch = React.memo(FomoSidebarDiscoverBranchInner);
