"use client";

import React, { useState, useEffect, useRef } from "react";
import { RefreshCw, ArrowLeft } from "lucide-react";
import { useAuth } from "@/components/security/AuthContext";
import { LoginPortal } from "@/components/fomo/core/LoginPortal";
import { supabase } from "@/lib/core/supabaseClient";

// Subcomponents
import { CommunityEditProfileModal } from "@/components/fomo/community/CommunityEditProfileModal";
import { CommunityModPool, type SharedFavorite } from "@/components/fomo/community/CommunityModPool";
import { CommunityVideos, type ShowcaseVideo } from "@/components/fomo/community/CommunityVideos";

import { CommunityDrafts } from "@/components/fomo/community/CommunityDrafts";
import { CommunityUserProfile } from "@/components/fomo/community/CommunityUserProfile";
import { DraftDownloadProgress } from "@/components/fomo/community/DraftDownloadProgress";
import { CommunityHeader, type CommunityTab } from "@/components/fomo/community/CommunityShell";
import { CommunityRankings } from "@/components/fomo/community/CommunityRankings";
import { CommunityMembers } from "@/components/fomo/community/CommunityMembers";
import { CommunityProfileTab } from "@/components/fomo/community/CommunityProfileTab";
import type { ModHit } from "@/lib/core/types";

function CommunityPanelInner({
  activeProject,
  onClose,
  onStatus,
  onOpenProjectDetails,
}: {
  activeProject?: unknown;
  onClose?: () => void;
  onStatus?: (text: string, type?: "success" | "error" | "info") => void;
  onOpenProjectDetails?: (id: string, platform?: string) => void;
}) {
  const { user, profile, loading, signOut, refreshProfile } = useAuth();
  
  // Navigation Tabs: 'modpacks' (pool) | 'drafts' | 'videos' | 'profile'
  const [activeSubTab, setActiveSubTab] = useState<CommunityTab>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("fomo_community_subtab");
      if (
        saved === "modpacks" ||
        saved === "drafts" ||
        saved === "videos" ||
        saved === "rankings" ||
        saved === "members"
      ) {
        return saved;
      }
      if (saved === "profile") return "members";
    }
    return "modpacks";
  });

  useEffect(() => {
    localStorage.setItem("fomo_community_subtab", activeSubTab);
  }, [activeSubTab]);
  
  // States for Videos
  const [videos, setVideos] = useState<ShowcaseVideo[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  
  // Profile view
  const [selectedUserProfile, setSelectedUserProfile] = useState<string | null>(null);
  
  // Edit Profile States
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState<string | null>(null);
  const [editBannerUrl, setEditBannerUrl] = useState<string | null>(null);
  const [editBannerMeta, setEditBannerMeta] = useState<{ zoom: number; x: number; y: number; blur: number } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // States for Favorites
  const [cloudFavorites, setCloudFavorites] = useState<SharedFavorite[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [favoritesError, setFavoritesError] = useState("");

  // Auto-fetch data trigger (only used after publish/profile update)
  const [reloadTrigger, setReloadTrigger] = useState(0);
  // Track which tabs have already loaded data (lazy fetch)
  const loadedTabs = React.useRef<Set<string>>(new Set());

  const [currentTheme, setCurrentTheme] = useState("official");
  const [insideDraft, setInsideDraft] = useState(false);
  const [membersView, setMembersView] = useState<"list" | "mine">("list");
  const [memberCount, setMemberCount] = useState(0);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .then(({ count }) => setMemberCount(count || 0));
  }, [reloadTrigger]);

  useEffect(() => {
    const handler = (e: Event) => setInsideDraft(Boolean((e as CustomEvent<boolean>).detail));
    window.addEventListener("fomo-draft-selected", handler);
    return () => window.removeEventListener("fomo-draft-selected", handler);
  }, []);

  useEffect(() => {
    const update = () => setCurrentTheme(document.documentElement.getAttribute("data-theme") || "official");
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const handleApplyFilter = (e: Event) => {
      const { username } = (e as CustomEvent).detail || {};
      if (username) {
        setActiveSubTab("members");
        setSelectedUserProfile(username);
      }
    };
    
    // Check localStorage in case filter was set before panel mounted
    const savedFilter = localStorage.getItem("fomo_community_user_filter");
    if (savedFilter) {
      try {
        const { username } = JSON.parse(savedFilter);
        if (username) {
          setActiveSubTab("members");
          setSelectedUserProfile(username);
        }
      } catch (err) {
        console.warn("[CommunityPanel] Error parsing fomo_community_user_filter:", err);
      }
      localStorage.removeItem("fomo_community_user_filter");
    }

    const handleOpenUser = (e: Event) => {
      const { username } = (e as CustomEvent).detail || {};
      if (username) {
        setMembersView("list");
        setActiveSubTab("members");
        setSelectedUserProfile(username);
      }
    };
    
    const handleTab = (e: Event) => {
      const tab = (e as CustomEvent).detail;
      if (tab === "modpacks" || tab === "drafts" || tab === "videos" || tab === "rankings" || tab === "members") {
        setMembersView("list");
        setActiveSubTab(tab);
      }
    };

    window.addEventListener("fomo-community-apply-filter", handleApplyFilter);
    window.addEventListener("fomo-open-community-user", handleOpenUser);
    window.addEventListener("fomo-community-tab", handleTab);
    return () => {
      window.removeEventListener("fomo-community-apply-filter", handleApplyFilter);
      window.removeEventListener("fomo-open-community-user", handleOpenUser);
      window.removeEventListener("fomo-community-tab", handleTab);
    };
  }, []);

  const handleOpenEditProfile = () => {
    setEditUsername(profile?.username || "");
    setEditColor(profile?.color || "#F05A28");
    setEditAvatarUrl(profile?.avatar_url || null);
    setEditBannerUrl(profile?.banner_url || null);
    setEditBannerMeta(profile?.banner_meta
      ? {
          zoom: profile.banner_meta.zoom ?? 1,
          x: profile.banner_meta.x ?? 0,
          y: profile.banner_meta.y ?? 0,
          blur: profile.banner_meta.blur ?? 0,
        }
      : { zoom: 1, x: 0, y: 0, blur: 0 }
    );
    setShowEditProfileModal(true);
  };

  const handleSaveProfile = async (
    e: React.FormEvent,
    finalAvatar?: string | null,
    finalBanner?: string | null,
    finalBannerMeta?: { zoom: number; x: number; y: number; blur: number } | null
  ) => {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    try {
      const updates: Record<string, unknown> = {
        username: editUsername.trim(),
        avatar_url: finalAvatar !== undefined ? finalAvatar : editAvatarUrl,
        banner_url: finalBanner !== undefined ? finalBanner : editBannerUrl,
        color: editColor,
        updated_at: new Date().toISOString(),
      };
      if (finalBannerMeta !== undefined) {
        updates.banner_meta = finalBannerMeta;
      }
      
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);
        
      if (error) throw error;
      
      await refreshProfile();
      setEditBannerMeta(finalBannerMeta ?? editBannerMeta);
      
      // Dispatch event to refresh followed authors/projects sharing
      window.dispatchEvent(new CustomEvent("fomo-refresh-sharing"));

      if (onStatus) onStatus("¡Perfil actualizado con éxito!", "success");
      setShowEditProfileModal(false);
      setReloadTrigger(prev => prev + 1);
    } catch (err: unknown) {
      console.error(err);
      if (onStatus) {
        onStatus("Error al actualizar perfil.", "error");
      }
    } finally {
      setSavingProfile(false);
    }
  };

  // Lazy-fetch: only load a tab's data when the user opens it for the first time.
  // On reloadTrigger bump (after profile save), clear the cache so data refreshes.
  useEffect(() => {
    loadedTabs.current.clear();
  }, [reloadTrigger]);

  const fetchVideos = React.useCallback(async (retries = 2): Promise<void> => {
    setLoadingVideos(true);
    try {
      const { data, error } = await supabase
        .from("showcase_videos")
        .select("id, profile_id, youtube_video_id, title, description, created_at, profiles ( username, avatar_url, color )")
        .order("created_at", { ascending: false });
      if (error) {
        if (retries > 0) { await new Promise(res => setTimeout(res, 500)); return fetchVideos(retries - 1); }
        console.error("Error fetching videos:", error.message);
        return;
      }
      setVideos((data as unknown as ShowcaseVideo[]) || []);
    } catch (err: unknown) {
      if (retries > 0) { await new Promise(res => setTimeout(res, 500)); return fetchVideos(retries - 1); }
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Error fetching videos:", msg);
    } finally {
      setLoadingVideos(false);
    }
  }, []);

  const fetchFavorites = React.useCallback(async (retries = 2): Promise<void> => {
    setLoadingFavorites(true);
    setFavoritesError("");
    try {
      const { data, error } = await supabase
        .from("favorite_mods")
        .select("id, profile_id, mod_id, platform, name, icon_url, summary, created_at, profiles ( username, avatar_url, color )")
        .order("created_at", { ascending: false });
      if (error) {
        if (retries > 0) { await new Promise(res => setTimeout(res, 500)); return fetchFavorites(retries - 1); }
        console.error("Error fetching favorites:", error.message);
        setFavoritesError(error.message || "No se pudo cargar el pool de la comunidad.");
        return;
      }
      setCloudFavorites((data as unknown as SharedFavorite[]) || []);
    } catch (err: unknown) {
      if (retries > 0) { await new Promise(res => setTimeout(res, 500)); return fetchFavorites(retries - 1); }
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Error fetching favorites:", msg);
      setFavoritesError(msg || "No se pudo cargar el pool de la comunidad.");
    } finally {
      setLoadingFavorites(false);
    }
  }, []);

  // Fire fetch when tab becomes active for the first time (lazy)
  useEffect(() => {
    if (!user) return;
    if (activeSubTab === 'videos' && !loadedTabs.current.has('videos')) {
      loadedTabs.current.add('videos');
      fetchVideos();
    }
    if (activeSubTab === "modpacks" && !loadedTabs.current.has("modpacks")) {
      loadedTabs.current.add("modpacks");
      fetchFavorites();
    }
  }, [user?.id, activeSubTab, fetchVideos, fetchFavorites]);

  useEffect(() => {
    const refreshShares = () => {
      if (!user) return;
      loadedTabs.current.delete("modpacks");
      if (activeSubTab === "modpacks" || activeSubTab === "members") {
        loadedTabs.current.add("modpacks");
        fetchFavorites();
      }
    };
    window.addEventListener("fomo-refresh-sharing", refreshShares);
    return () => window.removeEventListener("fomo-refresh-sharing", refreshShares);
  }, [user, activeSubTab, fetchFavorites]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-white/50 animate-fade-in">
        <RefreshCw className="w-8 h-8 animate-spin text-primary mb-3" />
        <span className="text-sm">Iniciando conexión con MIM Cloud...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex-1 overflow-y-auto p-6 flex flex-col justify-center animate-fade-in">
        <LoginPortal onSuccess={refreshProfile} />
      </div>
    );
  }

  const isModern = currentTheme === "modern";
  const ownShares = cloudFavorites.filter((f) => f.profile_id === user.id);

  const switchTab = (tab: CommunityTab) => {
    setMembersView("list");
    setSelectedUserProfile(null);
    setActiveSubTab(tab);
  };

  const headerTab = activeSubTab;

  return (
    <div className={`fomo-community flex-1 flex flex-col overflow-hidden animate-fade-in ${isModern ? 'bg-background text-foreground' : 'bg-[#09090b] text-white/90'}`}>
      {!selectedUserProfile && !insideDraft && (
        <CommunityHeader
          active={headerTab}
          onChange={switchTab}
          onOpenMineProfile={() => {
            setSelectedUserProfile(null);
            setMembersView("mine");
            setActiveSubTab("members");
          }}
          isModern={isModern}
          metrics={{
            members: memberCount,
            recommendations: cloudFavorites.length,
            featured: Math.min(cloudFavorites.length, 12),
          }}
        />
      )}

      <div className="flex-1 overflow-y-auto p-0 scrollbar-thin flex flex-col relative z-10">
        {selectedUserProfile && (
          <CommunityUserProfile
            username={selectedUserProfile}
            onOpenProjectDetails={onOpenProjectDetails}
            onBack={() => {
              setSelectedUserProfile(null);
              setActiveSubTab("members");
            }}
          />
        )}

        {!selectedUserProfile && activeSubTab === "members" && membersView === "list" && (
          <CommunityMembers
            onOpenProfile={(username) => {
              setSelectedUserProfile(username);
            }}
          />
        )}

        {!selectedUserProfile && activeSubTab === "members" && membersView === "mine" && (
          <div className="px-6 pb-8 space-y-4">
            <button
              type="button"
              onClick={() => setMembersView("list")}
              className="inline-flex items-center gap-2 text-xs font-bold text-white/60 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver a miembros
            </button>
            <CommunityProfileTab
              userId={user.id}
              profile={profile}
              email={user.email}
              isModern={isModern}
              ownShares={ownShares}
              onEditProfile={handleOpenEditProfile}
              onSignOut={signOut}
              onOpenProjectDetails={onOpenProjectDetails}
              onGoToDrafts={() => switchTab("drafts")}
              onGoToPool={() => switchTab("modpacks")}
            />
          </div>
        )}

        {!selectedUserProfile && activeSubTab !== "members" && (
          <div className={`flex-1 animate-fade-in ${insideDraft ? "px-2 pt-0 pb-2" : "p-6 pt-2"}`} id={activeSubTab === "modpacks" ? "onboarding-community-pool" : undefined}>
            {activeSubTab === "modpacks" && (
              <CommunityModPool
                cloudFavorites={cloudFavorites}
                loadingFavorites={loadingFavorites}
                loadError={favoritesError}
                onRetry={() => {
                  loadedTabs.current.delete("modpacks");
                  loadedTabs.current.add("modpacks");
                  fetchFavorites();
                }}
                currentUserId={user.id}
                onOpenProjectDetails={onOpenProjectDetails}
                onFavoriteDeleted={(id) =>
                  setCloudFavorites((prev) => prev.filter((f) => f.id !== id))
                }
                onOpenProfile={(username) => {
                  setSelectedUserProfile(username);
                }}
                onContentDeleted={() => setReloadTrigger((p) => p + 1)}
              />
            )}

            {activeSubTab === "drafts" && (
              <div id="onboarding-community-drafts" className="flex-1 flex flex-col min-h-0 relative">
                <div id="onboarding-community-drafts-detail" className="absolute inset-x-0 bottom-0 top-1/2 pointer-events-none" />
                <CommunityDrafts />
              </div>
            )}

            {activeSubTab === "videos" && (
              <div id="onboarding-community-videos" className="flex-1 flex flex-col min-h-0">
                <CommunityVideos
                  videos={videos}
                  loadingVideos={loadingVideos}
                  currentUserId={user.id}
                  onVideoDeleted={(id) =>
                    setVideos((prev) => prev.filter((v) => v.id !== id))
                  }
                  onOpenProfile={(username) => {
                    setSelectedUserProfile(username);
                  }}
                  onOpenProjectDetails={onOpenProjectDetails}
                />
              </div>
            )}

            {activeSubTab === "rankings" && (
              <CommunityRankings
                isModern={isModern}
                onOpen={(mod: ModHit) => {
                  window.dispatchEvent(
                    new CustomEvent("fomo-open-project-details", {
                      detail: { id: mod.projectId, platform: mod._source },
                    })
                  );
                }}
              />
            )}
          </div>
        )}
      </div>

     {/* Profile Editing Modal */}
      <CommunityEditProfileModal 
        showEditProfileModal={showEditProfileModal}
        setShowEditProfileModal={setShowEditProfileModal}
        editUsername={editUsername}
        setEditUsername={setEditUsername}
        editColor={editColor}
        setEditColor={setEditColor}
        editAvatarUrl={editAvatarUrl}
        setEditAvatarUrl={setEditAvatarUrl}
        editBannerUrl={editBannerUrl}
        setEditBannerUrl={setEditBannerUrl}
        editBannerMeta={editBannerMeta}
        savingProfile={savingProfile}
        handleSaveProfile={handleSaveProfile}
        onStatus={(msg, type) => {
          if (onStatus) {
            onStatus(msg, type === "warning" ? "info" : type);
          }
        }}
      />
      <DraftDownloadProgress isModern={isModern} />
    </div>
  );
}

export const CommunityPanel = React.memo(CommunityPanelInner);
