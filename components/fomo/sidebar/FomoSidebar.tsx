/**
 * @fileoverview FomoSidebar – shell + isolated tab branches.
 * Community runs without useFomoDiscover; discover mounts only when needed.
 */

"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import {
  X,
  Search,
  Library,
  Heart,
  Spotlight,
  TvMinimalPlay,
  Cloudy,
} from "lucide-react";
import { useStatusBanner } from "@/hooks/useStatusBanner";
import { PillToggleGroup, StatusBanner } from "@/components/ui/primitives";
import { supabase } from "@/lib/core/supabaseClient";
import { useAuth } from "@/components/security/AuthContext";
import { OnboardingTour } from "@/components/ui/OnboardingTour";
import { FomoSidebarDiscoverBranch } from "@/components/fomo/sidebar/FomoSidebarDiscoverBranch";
import { FomoSidebarCommunityBranch } from "@/components/fomo/sidebar/FomoSidebarCommunityBranch";
import { queueFomoDiscoverAction } from "@/lib/fomo/fomoDiscoverPending";
import {
  FOMO_DETAILS_RESERVE,
  fomoMainWidthWhenDetailsOpen,
} from "@/lib/fomo/fomoLayout";
import {
  checkNewCommunityShares,
  seedCommunityShareSeen,
  type ShareRow,
} from "@/lib/fomo/communitySharingAlerts";
import type { FomoMode } from "@/components/fomo/sidebar/fomoSidebarTypes";
import "@/components/fomo/core/fomo.css";

const TAB_OPTIONS = [
  { value: "spotlight", label: "Spotlight", icon: <Spotlight className="w-4 h-4" /> },
  { value: "showcases", label: "Showcases", icon: <TvMinimalPlay className="w-4 h-4" /> },
  { value: "discover", label: "Explorar", icon: <Search className="w-4 h-4" /> },
  { value: "collections", label: "Colecciones", icon: <Library className="w-4 h-4" /> },
  { value: "followed", label: "Seguidos", icon: <Heart className="w-4 h-4" /> },
  { value: "community", label: "FOMO Cloud", icon: <Cloudy className="w-4 h-4" /> },
];

function FomoSidebarInner({
  open,
  onClose,
  defaultLoader = "forge",
  defaultVersion = "1.20.1",
  activeProject,
  pendingFiles = [],
  onOpenDownloads,
}: {
  open: boolean;
  onClose: () => void;
  defaultLoader?: string;
  defaultVersion?: string;
  activeProject?: unknown;
  pendingFiles?: unknown[];
  onOpenDownloads?: () => void;
}) {
  const [mode, setMode] = useState<FomoMode>("spotlight");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [discoverKeepAlive, setDiscoverKeepAlive] = useState(false);
  const { status, showStatus, clearStatus } = useStatusBanner();
  const { user: currentUser, profile: currentUserProfile } = useAuth();
  const currentUserColor = currentUserProfile?.color ?? null;
  const [currentTheme, setCurrentTheme] = useState("official");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [allSharedMods, setAllSharedMods] = useState<unknown[]>([]);
  const [allSharedVideos, setAllSharedVideos] = useState<unknown[]>([]);
  const [isForcedHidden, setIsForcedHidden] = useState(false);

  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const discoverMounted =
    mode !== "community" || discoverKeepAlive || detailsOpen;

  const fetchingRef = useRef(false);
  const sharedFetchedRef = useRef(false);
  const fetchSharedMods = useCallback(async (opts?: { force?: boolean }) => {
    if (fetchingRef.current) return;
    if (!opts?.force && sharedFetchedRef.current) return;
    fetchingRef.current = true;
    try {
      const { data: modsData } = await supabase
        .from("favorite_mods")
        .select("id, mod_id, platform, profile_id, profiles ( username, avatar_url, color )");
      if (modsData) setAllSharedMods(modsData);

      const { data: vidsData } = await supabase
        .from("showcase_videos")
        .select("id, profile_id, youtube_video_id, title, profiles ( username, avatar_url, color )");
      if (vidsData) setAllSharedVideos(vidsData);

      const { data: packsData } = await supabase
        .from("modpack_builds")
        .select("id, profile_id, profiles ( username )")
        .order("created_at", { ascending: false })
        .limit(100);

      const uid = currentUser?.id;
      if (opts?.force) {
        checkNewCommunityShares(
          (modsData as ShareRow[]) || [],
          (vidsData as ShareRow[]) || [],
          (packsData as ShareRow[]) || [],
          uid
        );
      } else if (!sharedFetchedRef.current) {
        seedCommunityShareSeen(
          (modsData as { id: string }[]) || [],
          (vidsData as { id: string }[]) || [],
          (packsData as { id: string }[]) || []
        );
      }

      sharedFetchedRef.current = true;
    } catch (err) {
      console.error("Error fetching shared mods in sidebar:", err);
    } finally {
      fetchingRef.current = false;
    }
  }, [currentUser?.id]);

  const refreshSharing = useCallback(
    () => fetchSharedMods({ force: true }),
    [fetchSharedMods]
  );

  useEffect(() => {
    const handleRefreshSharing = () => {
      void fetchSharedMods({ force: true });
    };
    const handleSwitchTab = (e: Event) => {
      const tab = (e as CustomEvent).detail?.tab as FomoMode | undefined;
      if (tab) setMode(tab);
    };
    window.addEventListener("fomo-refresh-sharing", handleRefreshSharing);
    window.addEventListener("fomo-switch-tab", handleSwitchTab);
    return () => {
      window.removeEventListener("fomo-refresh-sharing", handleRefreshSharing);
      window.removeEventListener("fomo-switch-tab", handleSwitchTab);
    };
  }, [fetchSharedMods]);

  useEffect(() => {
    if (!open) {
      sharedFetchedRef.current = false;
      return;
    }
    void fetchSharedMods();
  }, [open, fetchSharedMods]);

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
      target: "#onboarding-fomo-spotlight",
      title: "Spotlight",
      content:
        "Acá ves los mods destacados del momento, selecciones de la comunidad y carruseles temáticos.",
    },
    {
      target: "#onboarding-fomo-showcases",
      title: "Showcases",
      content:
        "Explorá los mejores videos y showcases compartidos por la comunidad.",
    },
    {
      target: "#onboarding-fomo-discover",
      title: "Explorar Mods",
      content: "Acá podés buscar mods filtrando por versión, loader, categoría y más.",
    },
    {
      target: "#onboarding-fomo-collections",
      title: "Colecciones",
      content: "Acá podés crear y organizar tus propias listas de mods.",
    },
    {
      target: "#onboarding-fomo-followed",
      title: "Seguidos",
      content: "Acá ves las novedades de los autores y mods que decidiste seguir.",
    },
    {
      target: "#onboarding-fomo-community",
      title: "FOMO Cloud",
      content:
        "Por último llegás a FOMO Cloud: pool, showcases y clubs de la comunidad.",
    },
  ];

  useEffect(() => {
    const update = () =>
      setCurrentTheme(document.documentElement.getAttribute("data-theme") || "official");
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [open]);

  // Discover events when the discover branch is unmounted (pure community tab).
  useEffect(() => {
    if (discoverMounted) return;

    const handleOpenDetails = (e: Event) => {
      const modHit = (e as CustomEvent).detail;
      if (modHit) {
        queueFomoDiscoverAction({ type: "openMod", mod: modHit });
        setDiscoverKeepAlive(true);
        requestAnimationFrame(() => {
          window.dispatchEvent(new CustomEvent("fomo-apply-pending-discover"));
        });
      }
    };
    const handleSearchAndOpen = (e: Event) => {
      const { query } = (e as CustomEvent).detail || {};
      if (query) {
        queueFomoDiscoverAction({ type: "search", query });
        setMode("discover");
      }
    };
    const handleSearchAuthor = (e: Event) => {
      const { author } = (e as CustomEvent).detail || {};
      if (author) {
        queueFomoDiscoverAction({ type: "author", author });
        setMode("discover");
      }
    };
    const handleOpenProjectDetails = (e: Event) => {
      const { id, platform, title, projectType } = (e as CustomEvent).detail || {};
      if (id) {
        queueFomoDiscoverAction({ type: "projectId", id, platform, title, projectType });
        setDiscoverKeepAlive(true);
        requestAnimationFrame(() => {
          window.dispatchEvent(new CustomEvent("fomo-apply-pending-discover"));
        });
      }
    };
    const handleSearchProject = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      if (detail?.query) {
        queueFomoDiscoverAction({ type: "searchProject", ...detail });
        setDiscoverKeepAlive(true);
        requestAnimationFrame(() => {
          window.dispatchEvent(new CustomEvent("fomo-apply-pending-discover"));
        });
      }
    };

    window.addEventListener("fomo-open-details", handleOpenDetails);
    window.addEventListener("fomo-search-and-open", handleSearchAndOpen);
    window.addEventListener("fomo-search-author", handleSearchAuthor);
    window.addEventListener("fomo-open-project-details", handleOpenProjectDetails);
    window.addEventListener("fomo-search-project", handleSearchProject);
    return () => {
      window.removeEventListener("fomo-open-details", handleOpenDetails);
      window.removeEventListener("fomo-search-and-open", handleSearchAndOpen);
      window.removeEventListener("fomo-search-author", handleSearchAuthor);
      window.removeEventListener("fomo-open-project-details", handleOpenProjectDetails);
      window.removeEventListener("fomo-search-project", handleSearchProject);
    };
  }, [discoverMounted]);

  useEffect(() => {
    const handleShowStatus = (e: Event) => {
      const { text, type } = (e as CustomEvent).detail || {};
      if (text) showStatus(text, type || "info");
    };
    const handleOpenCommunityUser = (e: Event) => {
      const { username, type } = (e as CustomEvent).detail || {};
      setMode("community");
      setDiscoverKeepAlive(false);
      localStorage.setItem(
        "fomo_community_user_filter",
        JSON.stringify({ username, type })
      );
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("fomo-community-apply-filter", { detail: { username, type } })
        );
      }, 100);
    };

    window.addEventListener("fomo-show-status", handleShowStatus);
    window.addEventListener("fomo-open-community-user", handleOpenCommunityUser);
    return () => {
      window.removeEventListener("fomo-show-status", handleShowStatus);
      window.removeEventListener("fomo-open-community-user", handleOpenCommunityUser);
    };
  }, [showStatus]);

  useEffect(() => {
    const handleToggle = (e: CustomEvent<{ open?: boolean }>) => {
      if (e.detail?.open === false) {
        setIsForcedHidden(true);
      } else {
        setIsForcedHidden(false);
      }
    };
    window.addEventListener("fomo-details-toggle", handleToggle as EventListener);
    return () =>
      window.removeEventListener("fomo-details-toggle", handleToggle as EventListener);
  }, []);

  const handleCloseAll = useCallback(() => {
    setDiscoverKeepAlive(false);
    onClose();
  }, [onClose]);

  const handleDetailsOpenChange = useCallback((openDetails: boolean) => {
    setDetailsOpen(openDetails);
  }, []);

  const handleDiscoverKeepAlive = useCallback((alive: boolean) => {
    if (modeRef.current === "community") {
      setDiscoverKeepAlive(alive);
    }
  }, []);

  const openProjectByIdRef = useRef<
    ((id: string, platform?: string) => void) | null
  >(null);

  const handleOpenProjectFromCloud = useCallback(
    (id: string, platform?: string) => {
      if (!id) return;
      setDiscoverKeepAlive(true);
      if (openProjectByIdRef.current) {
        void openProjectByIdRef.current(id, platform);
        return;
      }
      queueFomoDiscoverAction({ type: "projectId", id, platform });
      requestAnimationFrame(() => {
        window.dispatchEvent(new CustomEvent("fomo-apply-pending-discover"));
      });
    },
    []
  );

  useEffect(() => {
    if (mode === "community" && !discoverKeepAlive && !detailsOpen) {
      setDetailsOpen(false);
    }
  }, [mode, discoverKeepAlive, detailsOpen]);

  const layoutDetailsOpen = open && detailsOpen && !isForcedHidden;

  return (
    <>
      <div
        className={`fixed inset-0 z-[60] bg-black/50 transition-opacity duration-500 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={handleCloseAll}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-[70] flex flex-col shadow-2xl transition-all duration-500 ease-in-out border border-l-0 fomo-sidebar overflow-hidden ${
          open ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0 pointer-events-none"
        }`}
        style={{
          width: layoutDetailsOpen ? fomoMainWidthWhenDetailsOpen() : "min(80vw, 1400px)",
          maxWidth: layoutDetailsOpen
            ? `calc(100vw - ${FOMO_DETAILS_RESERVE}px)`
            : "1400px",
          background: "var(--fomo-bg)",
          borderColor: "var(--color-border)",
          borderRightColor: layoutDetailsOpen
            ? "transparent"
            : "color-mix(in srgb, var(--color-primary) 15%, transparent)",
          borderRadius: "0 2.5rem 2.5rem 0",
          boxShadow: "24px 0 60px rgba(0,0,0,0.4)",
          backdropFilter: "blur(40px)",
        }}
      >
        <div
          className="absolute top-0 inset-x-0 h-[2px] opacity-60 z-10 animate-led-flicker"
          style={{
            background: `linear-gradient(90deg, transparent, var(--color-primary), transparent)`,
          }}
        />

        <div
          className="flex items-center justify-between px-6 py-3 border-b shrink-0 relative z-10"
          style={{
            background: "var(--fomo-secondary-bg)",
            borderColor: "var(--fomo-border)",
          }}
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Image
                src="/fomoico.png"
                alt=""
                width={28}
                height={28}
                className="w-7 h-7 animate-fomo-blink"
              />
              <div>
                <h2 className="font-headline text-base text-white">FOMO</h2>
                <p className="text-[8px] opacity-40 uppercase">{mode}</p>
              </div>
            </div>
            <div
              id="onboarding-fomo-tabs"
              className="min-w-0 flex-1 overflow-x-auto pb-0.5 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/15"
            >
              <PillToggleGroup
                options={TAB_OPTIONS}
                value={mode}
                onChange={(v: string) => setMode(v as FomoMode)}
                className="p-1.5 min-w-max"
                ariaLabel="Seleccionar pestaña"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleCloseAll}
              className="p-2 rounded-xl hover:bg-red-500/10 text-white/40 hover:text-red-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {status && (
            <StatusBanner text={status.text} type={status.type} onClose={clearStatus} />
          )}
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          {mode === "community" && (
            <FomoSidebarCommunityBranch
              activeProject={activeProject}
              onClose={handleCloseAll}
              onStatus={showStatus}
              onOpenProjectDetails={handleOpenProjectFromCloud}
            />
          )}
          {discoverMounted && (
            <FomoSidebarDiscoverBranch
              open={open}
              mode={mode}
              setMode={setMode}
              hidden={mode === "community"}
              layoutDetailsOpen={layoutDetailsOpen}
              onDetailsOpenChange={handleDetailsOpenChange}
              onDiscoverKeepAlive={handleDiscoverKeepAlive}
              onRegisterOpenProjectById={(fn) => {
                openProjectByIdRef.current = fn;
              }}
              onClose={handleCloseAll}
              defaultLoader={defaultLoader}
              defaultVersion={defaultVersion}
              activeProject={activeProject}
              pendingFiles={pendingFiles}
              onOpenDownloads={onOpenDownloads}
              showStatus={showStatus}
              allSharedMods={allSharedMods}
              allSharedVideos={allSharedVideos}
              currentUser={currentUser}
              currentUserColor={currentUserColor}
              refreshSharing={refreshSharing}
              currentTheme={currentTheme}
              isForcedHidden={isForcedHidden}
            />
          )}
        </div>

        {showOnboarding && open && (
          <OnboardingTour
            steps={onboardingSteps}
            onComplete={() => {
              setShowOnboarding(false);
              localStorage.setItem("onboarding_fomo", "true");
            }}
            onStepChange={(step) => {
              if (step === 0) setMode("spotlight");
              if (step === 1) setMode("showcases");
              if (step === 2) setMode("discover");
              if (step === 3) setMode("collections");
              if (step === 4) setMode("followed");
              if (step === 5) setMode("community");
            }}
          />
        )}
      </aside>
    </>
  );
}

export const FomoSidebar = React.memo(FomoSidebarInner);
