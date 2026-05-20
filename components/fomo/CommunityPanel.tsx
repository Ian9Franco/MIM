"use client";

import React, { useState, useEffect, useRef } from "react";
import { LogOut, Package, TvMinimalPlay, Heart, RefreshCw, CircleFadingPlus, Blocks } from "lucide-react";
import { useAuth } from "@/components/security/AuthContext";
import { LoginPortal } from "./LoginPortal";
import { supabase } from "@/lib/supabaseClient";

// Subcomponents
import { CommunityEditProfileModal } from "./CommunityEditProfileModal";
import { CommunityModpacks } from "./CommunityModpacks";
import { CommunityVideos } from "./CommunityVideos";
import { CommunityFavorites } from "./CommunityFavorites";
import { CommunityUserProfile } from "./CommunityUserProfile";

export function CommunityPanel({ activeProject, onClose, onStatus }: any) {
  const { user, profile, loading, signOut, refreshProfile } = useAuth();
  
  // Navigation Tabs: 'modpacks' | 'videos' | 'favorites' | 'profile'
  const [activeSubTab, setActiveSubTab] = useState<'modpacks' | 'videos' | 'favorites' | 'profile'>('modpacks');
  
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
  const [savingProfile, setSavingProfile] = useState(false);

  // States for Favorites
  const [cloudFavorites, setCloudFavorites] = useState<any[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);

  // Auto-fetch data trigger
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const onStatusRef = useRef(onStatus);

  const [currentTheme, setCurrentTheme] = useState("official");
  const [tabIndex, setTabIndex] = useState(0);
  const tabOrder = ['modpacks', 'videos', 'favorites'] as const;

  useEffect(() => {
    const update = () => setCurrentTheme(document.documentElement.getAttribute("data-theme") || "official");
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    onStatusRef.current = onStatus;
  }, [onStatus]);

  useEffect(() => {
    if (activeSubTab !== 'profile') {
      setSelectedUserProfile(null);
      const idx = ['modpacks', 'videos', 'favorites'].indexOf(activeSubTab);
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
      } catch (err) {}
      localStorage.removeItem("fomo_community_user_filter");
    }

    window.addEventListener("fomo-community-apply-filter", handleApplyFilter);
    return () => {
      window.removeEventListener("fomo-community-apply-filter", handleApplyFilter);
    };
  }, []);

  const handleOpenEditProfile = () => {
    setEditUsername(profile?.username || "");
    setEditColor(profile?.color || "#F05A28");
    setEditAvatarUrl(profile?.avatar_url || null);
    setShowEditProfileModal(true);
  };

  const handleSaveProfile = async (e: React.FormEvent, finalAvatar?: string | null) => {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    try {
      const updates = {
        username: editUsername.trim(),
        avatar_url: finalAvatar !== undefined ? finalAvatar : editAvatarUrl,
        color: editColor,
        updated_at: new Date().toISOString(),
      };
      
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);
        
      if (error) throw error;
      
      await refreshProfile();
      
      // Dispatch event to refresh followed authors/projects sharing
      window.dispatchEvent(new CustomEvent("fomo-refresh-sharing"));

      if (onStatusRef.current) onStatusRef.current("¡Perfil actualizado con éxito!", "success");
      setShowEditProfileModal(false);
      setReloadTrigger(prev => prev + 1);
    } catch (err: any) {
      console.error(err);
      if (onStatusRef.current) {
        onStatusRef.current("Error al actualizar perfil.", "error");
      }
    } finally {
      setSavingProfile(false);
    }
  };

  // Fetch data for subtabs (modpacks handles its own fetching)
  useEffect(() => {
    if (!user) return;

    const fetchAllData = async (retries = 2) => {
      // Fetch videos
      const fetchVideos = async (r = retries): Promise<void> => {
        setLoadingVideos(true);
        try {
          const { data, error } = await supabase
            .from("showcase_videos")
            .select("id, youtube_video_id, title, description, created_at, profiles ( username, avatar_url, color )")
            .order("created_at", { ascending: false });

          if (error) {
            if (r > 0) {
              await new Promise(res => setTimeout(res, 500));
              return fetchVideos(r - 1);
            }
            console.error("Error fetching videos:", error.message, error.details, error.hint);
            return;
          }
          setVideos(data || []);
        } catch (err: any) {
          if (r > 0) {
            await new Promise(res => setTimeout(res, 500));
            return fetchVideos(r - 1);
          }
          console.error("Error fetching videos (exception):", err?.message || err);
        } finally {
          setLoadingVideos(false);
        }
      };

      // Fetch favorites
      const fetchFavorites = async (r = retries): Promise<void> => {
        setLoadingFavorites(true);
        try {
          const { data, error } = await supabase
            .from("favorite_mods")
            .select("id, mod_id, platform, name, icon_url, summary, created_at, profiles ( username, avatar_url, color )")
            .order("created_at", { ascending: false });

          if (error) {
            if (r > 0) {
              await new Promise(res => setTimeout(res, 500));
              return fetchFavorites(r - 1);
            }
            console.error("Error fetching favorites:", error.message, error.details);
            return;
          }
          setCloudFavorites(data || []);
        } catch (err: any) {
          if (r > 0) {
            await new Promise(res => setTimeout(res, 500));
            return fetchFavorites(r - 1);
          }
          console.error("Error fetching favorites (exception):", err?.message || err);
        } finally {
          setLoadingFavorites(false);
        }
      };

      // Fetch all data in parallel
      await Promise.all([fetchVideos(), fetchFavorites()]);
    };

    fetchAllData();
  }, [user?.id, reloadTrigger]);

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
  
  const switchTab = (tab: typeof activeSubTab) => {
    const idx = tabOrder.indexOf(tab as any);
    if (idx !== -1) setTabIndex(idx);
    setActiveSubTab(tab);
  };

  return (
    <div className={`flex-1 flex flex-col overflow-hidden animate-fade-in ${isModern ? 'bg-background text-foreground' : ''}`}>
      {/* Profile Header */}
      <div className={`px-6 py-4 border-b shrink-0 flex items-center justify-between ${isModern ? 'bg-card/80 border-border shadow-sm' : 'bg-white/2 border-white/5'}`}>
        <div className="flex items-center gap-3">
          <div 
            onClick={handleOpenEditProfile}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-background font-bold text-sm shadow-md cursor-pointer hover:opacity-90 border overflow-hidden shrink-0" 
            style={{ 
              backgroundColor: profile?.color || 'var(--primary)',
              borderColor: profile?.color || 'var(--primary)'
            }}
            title="Editar Perfil"
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              profile?.username ? profile.username[0].toUpperCase() : "U"
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className={`text-sm font-bold leading-none ${isModern ? 'text-foreground' : 'text-white'}`}>{profile?.username || "Conectado"}</h4>
              <button 
                onClick={handleOpenEditProfile} 
                className="text-[9px] font-black text-primary hover:underline uppercase cursor-pointer bg-transparent border-none"
              >
                Editar
              </button>
            </div>
            <p className={`text-[10px] mt-1 ${isModern ? 'text-muted-foreground' : 'text-white/40'}`}>{user.email}</p>
          </div>
        </div>
        <button 
          onClick={signOut} 
          className={`p-2 rounded-xl transition-all cursor-pointer ${isModern ? 'bg-destructive/10 text-destructive hover:bg-destructive/20' : 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/10'}`}
          title="Cerrar Sesión"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Sub Tabs – Liquid Glass Pill Style */}
      <div className={`px-6 py-3 border-b shrink-0 ${isModern ? 'bg-card/60 border-border' : 'bg-black/20 border-white/5'}`}>
        <div
          className="relative flex items-center h-10 p-1 rounded-2xl overflow-hidden"
          style={{
            background: isModern ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${isModern ? 'rgba(0,0,0,0.1)' : 'var(--color-border)'}`,
            backdropFilter: 'var(--liquid-blur)',
            WebkitBackdropFilter: 'var(--liquid-blur)',
          }}
        >
          {/* Liquid Sliding Pill */}
          <div
            className="absolute transition-all duration-500 ease-[cubic-bezier(0.6,0.01,-0.05,0.95)] rounded-xl pointer-events-none inset-y-1"
            style={{
              left: `calc(4px + ${tabIndex} * (100% - 8px) / 3)`,
              width: 'calc((100% - 8px) / 3)',
              background: isModern
                ? 'color-mix(in srgb, var(--color-primary) 12%, white)'
                : 'color-mix(in srgb, var(--color-primary) 20%, transparent)',
              border: `1px solid color-mix(in srgb, var(--color-primary) ${isModern ? '25%' : '30%'}, transparent)`,
              boxShadow: `0 0 16px color-mix(in srgb, var(--color-primary) 15%, transparent)`,
            }}
          />

          {[{id: 'modpacks', icon: <Blocks className="w-3.5 h-3.5" />, label: 'Modpacks'}, {id: 'videos', icon: <TvMinimalPlay className="w-3.5 h-3.5" />, label: 'Showcases'}, {id: 'favorites', icon: <CircleFadingPlus className="w-3.5 h-3.5" />, label: 'Compartidos'}].map((tab, i) => (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id as any)}
              className="relative z-10 flex-1 h-full flex items-center justify-center gap-1.5 text-[11px] font-headline font-bold tracking-wide rounded-xl transition-all duration-300 cursor-pointer"
              style={{
                color: activeSubTab === tab.id
                  ? 'var(--color-primary)'
                  : isModern ? 'rgba(13,39,80,0.5)' : 'rgba(255,255,255,0.4)',
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-0 scrollbar-thin flex flex-col">
        {activeSubTab !== 'profile' && (
          <div className="p-6 flex-1">
            {activeSubTab === 'modpacks' && (
              <CommunityModpacks />
            )}

            {activeSubTab === 'videos' && (
              <CommunityVideos 
                videos={videos}
                loadingVideos={loadingVideos}
                selectedUserFilter={null}
                setSelectedUserFilter={(f) => {
                  if (f?.username) {
                    setSelectedUserProfile(f.username);
                    setActiveSubTab('profile');
                  }
                }}
              />
            )}

            {activeSubTab === 'favorites' && (
              <CommunityFavorites 
                cloudFavorites={cloudFavorites}
                loadingFavorites={loadingFavorites}
                selectedUserFilter={null}
                setSelectedUserFilter={(f) => {
                  if (f?.username) {
                    setSelectedUserProfile(f.username);
                    setActiveSubTab('profile');
                  }
                }}
                onSearchAuthor={(a) => {
                  window.dispatchEvent(new CustomEvent("fomo-search-author", { 
                    detail: { author: a } 
                  }));
                }}
              />
            )}
          </div>
        )}

        {activeSubTab === 'profile' && selectedUserProfile && (
          <CommunityUserProfile 
            username={selectedUserProfile} 
            onBack={() => {
              setActiveSubTab('favorites');
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
        savingProfile={savingProfile}
        handleSaveProfile={handleSaveProfile}
        onStatus={onStatus}
      />
    </div>
  );
}
