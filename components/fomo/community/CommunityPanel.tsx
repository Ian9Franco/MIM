"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { LogOut, TvMinimalPlay, RefreshCw, Blocks, Club, FlaskConical } from "lucide-react";
import { useAuth } from "@/components/security/AuthContext";
import { LoginPortal } from "@/components/fomo/core/LoginPortal";
import { supabase } from "@/lib/core/supabaseClient";

// Subcomponents
import { CommunityEditProfileModal } from "@/components/fomo/community/CommunityEditProfileModal";
import { CommunityModPool } from "@/components/fomo/community/CommunityModPool";
import { CommunityVideos } from "@/components/fomo/community/CommunityVideos";

import { CommunityDrafts } from "@/components/fomo/community/CommunityDrafts";
import { CommunityUserProfile } from "@/components/fomo/community/CommunityUserProfile";
import { CommunityAddToDraftModal } from "@/components/fomo/community/CommunityAddToDraftModal";
import { DraftDownloadProgress } from "@/components/fomo/community/DraftDownloadProgress";

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
  const [activeSubTab, setActiveSubTab] = useState<
    "modpacks" | "drafts" | "videos" | "profile"
  >(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("fomo_community_subtab") as any) || "modpacks";
    }
    return "modpacks";
  });

  useEffect(() => {
    localStorage.setItem("fomo_community_subtab", activeSubTab);
  }, [activeSubTab]);
  
  // States for Videos
  const [videos, setVideos] = useState<any[]>([]);
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
  const [cloudFavorites, setCloudFavorites] = useState<any[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);

  // Auto-fetch data trigger (only used after publish/profile update)
  const [reloadTrigger, setReloadTrigger] = useState(0);
  // Track which tabs have already loaded data (lazy fetch)
  const loadedTabs = React.useRef<Set<string>>(new Set());

  const [currentTheme, setCurrentTheme] = useState("official");
  const [tabIndex, setTabIndex] = useState(0);
  const tabOrder = ["modpacks", "drafts", "videos"] as const;
  const [insideDraft, setInsideDraft] = useState(false);

  useEffect(() => {
    const handler = (e: any) => setInsideDraft(e.detail);
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
    if (activeSubTab !== "profile") {
      setSelectedUserProfile(null);
      const idx = tabOrder.indexOf(activeSubTab as (typeof tabOrder)[number]);
      if (idx !== -1) setTabIndex(idx);
    }
  }, [activeSubTab]);

  useEffect(() => {
    const handleApplyFilter = (e: Event) => {
      const { username } = (e as CustomEvent).detail || {};
      if (username) {
        setActiveSubTab('profile');
        setSelectedUserProfile(username);
      }
    };
    
    // Check localStorage in case filter was set before panel mounted
    const savedFilter = localStorage.getItem("fomo_community_user_filter");
    if (savedFilter) {
      try {
        const { username } = JSON.parse(savedFilter);
        if (username) {
          setActiveSubTab('profile');
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
        setActiveSubTab("profile");
        setSelectedUserProfile(username);
      }
    };
    
    const handleTab = (e: Event) => {
      const tab = (e as CustomEvent).detail;
      if (tab) {
        const idx = ["modpacks", "drafts", "videos"].indexOf(tab);
        if (idx !== -1) setTabIndex(idx);
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
    } catch (err: any) {
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
      setVideos(data || []);
    } catch (err: any) {
      if (retries > 0) { await new Promise(res => setTimeout(res, 500)); return fetchVideos(retries - 1); }
      console.error("Error fetching videos:", err?.message || err);
    } finally {
      setLoadingVideos(false);
    }
  }, []);

  const fetchFavorites = React.useCallback(async (retries = 2): Promise<void> => {
    setLoadingFavorites(true);
    try {
      const { data, error } = await supabase
        .from("favorite_mods")
        .select("id, profile_id, mod_id, platform, name, icon_url, summary, created_at, profiles ( username, avatar_url, color )")
        .order("created_at", { ascending: false });
      if (error) {
        if (retries > 0) { await new Promise(res => setTimeout(res, 500)); return fetchFavorites(retries - 1); }
        console.error("Error fetching favorites:", error.message);
        return;
      }
      setCloudFavorites(data || []);
    } catch (err: any) {
      if (retries > 0) { await new Promise(res => setTimeout(res, 500)); return fetchFavorites(retries - 1); }
      console.error("Error fetching favorites:", err?.message || err);
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
  const profileBannerMeta = profile?.banner_meta ?? { zoom: 1, x: 0, y: 0, blur: 0 };
  
  const switchTab = (tab: typeof activeSubTab) => {
    const idx = tabOrder.indexOf(tab as any);
    if (idx !== -1) setTabIndex(idx);
    setActiveSubTab(tab);
  };

  return (
    <div className={`fomo-community flex-1 flex flex-col overflow-hidden animate-fade-in ${isModern ? 'bg-background text-foreground' : 'bg-[#09090b] text-white/90'}`}>
      {!selectedUserProfile && !insideDraft && (
        <>
          {/* Immersive Profile Header */}
          <div className="relative shrink-0 flex flex-col justify-end p-6 pb-6 overflow-hidden min-h-[160px] border-b border-white/5">
            {profile?.banner_url && (
              <div className="absolute inset-0 z-0 overflow-hidden">
                <img
                  src={profile.banner_url}
                  alt="Banner"
                  className="w-full h-full object-cover"
                  style={{
                    objectPosition: `calc(50% + ${profileBannerMeta.x}px) calc(50% + ${profileBannerMeta.y}px)`,
                    transform: `scale(${profileBannerMeta.zoom})`,
                    filter: `blur(${profileBannerMeta.blur}px)`,
                    transformOrigin: "center center",
                  }}
                />
              </div>
            )}
            {/* Animated Background */}
            <div 
              className="absolute inset-0 z-0 opacity-50 mix-blend-screen"
              style={{
                background: `radial-gradient(circle at top right, ${profile?.color || 'var(--color-primary)'}50, transparent 70%),
                             radial-gradient(circle at bottom left, ${profile?.color || 'var(--color-primary)'}30, transparent 50%)`
              }}
            />
            {isModern && (
               <div className="absolute inset-0 bg-white/20 z-0" />
            )}
            {!isModern && (
               <div className="absolute inset-0 bg-black/35 z-0" />
            )}

            {/* Decorative Grid or Elements */}
            <div className="absolute inset-0 z-0 bg-[url('/grid-pattern.svg')] bg-repeat opacity-[0.03]" />

            <div className="relative z-10 flex flex-row justify-between items-end gap-4 mt-auto">
              <div id="onboarding-community-profile" className="flex flex-row items-center gap-4">
                {/* Avatar with Glow */}
                <div className="relative group cursor-pointer" onClick={handleOpenEditProfile}>
                  <div 
                    className="absolute inset-0 rounded-2xl blur-xl opacity-60 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ backgroundColor: profile?.color || 'var(--color-primary)' }}
                  />
                  <div 
                    className="relative w-16 h-16 rounded-2xl flex items-center justify-center text-background font-black text-2xl shadow-2xl overflow-hidden border-2 transition-transform duration-300 group-hover:scale-105"
                    style={{ 
                      backgroundColor: profile?.color || 'var(--color-primary)',
                      borderColor: isModern ? 'white' : 'rgba(255,255,255,0.1)'
                    }}
                  >
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      profile?.username ? profile.username[0].toUpperCase() : "U"
                    )}
                  </div>
                </div>

                {/* User Info */}
                <div className="flex flex-col">
                  <h4 className={`text-xl font-black tracking-tight text-white drop-shadow-md`}>
                    {profile?.username || "Conectado"}
                  </h4>
                  <p className={`text-xs font-medium text-white/80 drop-shadow-sm`}>
                    {user.email}
                  </p>
                  <button 
                    onClick={handleOpenEditProfile} 
                    className="mt-1.5 text-[10px] font-black text-purple-400 hover:text-purple-300 drop-shadow-sm hover:underline uppercase cursor-pointer bg-transparent border-none text-left w-fit tracking-wider"
                  >
                    Editar Perfil
                  </button>
                </div>
              </div>

              <button 
                onClick={signOut} 
                className={`p-3 rounded-2xl transition-all cursor-pointer backdrop-blur-md shadow-sm border ${isModern ? 'bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20' : 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20'}`}
                title="Cerrar Sesión"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Sub Tabs – Floating Liquid Glass Pill */}
          <div id="onboarding-fomo-community-tabs" className={`px-4 py-4 shrink-0 z-20 ${isModern ? 'bg-card/40' : 'bg-black/20'}`}>
        <div
          className="relative flex items-center h-12 p-1.5 rounded-2xl overflow-hidden shadow-sm"
          style={{
            background: isModern ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${isModern ? 'rgba(0,0,0,0.05)' : 'var(--color-border)'}`,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          {/* Liquid Sliding Pill */}
          <div
            className="absolute transition-all duration-500 ease-[cubic-bezier(0.6,0.01,-0.05,0.95)] rounded-xl pointer-events-none inset-y-1.5"
            style={{
              left: `calc(6px + ${tabIndex} * (100% - 12px) / 3)`,
              width: 'calc((100% - 12px) / 3)',
              background: isModern
                ? 'white'
                : 'rgba(255,255,255,0.1)',
              border: `1px solid ${isModern ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'}`,
              boxShadow: isModern ? '0 4px 12px rgba(0,0,0,0.05)' : '0 4px 12px rgba(0,0,0,0.2)',
            }}
          />

          {[
            { id: "modpacks", icon: <Blocks className="w-4 h-4" />, label: "Pool" },
            { id: "drafts", icon: <FlaskConical className="w-4 h-4" />, label: "Drafts" },
            { id: "videos", icon: <TvMinimalPlay className="w-4 h-4" />, label: "Showcases" },
          ].map((tab) => {
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => switchTab(tab.id as any)}
                className="relative z-10 flex-1 h-full flex items-center justify-center gap-2 text-xs font-headline font-bold tracking-wide rounded-xl transition-all duration-300 cursor-pointer"
                style={{
                  color: isActive
                    ? (isModern ? 'var(--color-primary)' : 'white')
                    : (isModern ? 'rgba(13,39,80,0.5)' : 'rgba(255,255,255,0.4)'),
                }}
              >
                {React.cloneElement(tab.icon, {
                  className: `w-4 h-4 transition-transform duration-300 ${isActive ? 'scale-110' : 'scale-100'}`
                })}
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
      </>)}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-0 scrollbar-thin flex flex-col relative z-10">
        {activeSubTab !== 'profile' && (
          <div className="p-6 pt-2 flex-1 animate-fade-in" id={activeSubTab === "modpacks" ? "onboarding-community-pool" : undefined}>
            {activeSubTab === "modpacks" && (
              <CommunityModPool
                cloudFavorites={cloudFavorites}
                loadingFavorites={loadingFavorites}
                currentUserId={user.id}
                onOpenProjectDetails={onOpenProjectDetails}
                onFavoriteDeleted={(id) =>
                  setCloudFavorites((prev) => prev.filter((f) => f.id !== id))
                }
                onOpenProfile={(username) => {
                  setSelectedUserProfile(username);
                  setActiveSubTab("profile");
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
                    setActiveSubTab("profile");
                  }}
                  onOpenProjectDetails={onOpenProjectDetails}
                />
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'profile' && selectedUserProfile && (
          <CommunityUserProfile
            username={selectedUserProfile}
            onOpenProjectDetails={onOpenProjectDetails}
            onBack={() => {
              setActiveSubTab("modpacks");
              setSelectedUserProfile(null);
            }}
          />
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
