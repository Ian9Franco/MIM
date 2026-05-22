"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, TvMinimalPlay, CircleFadingPlus, Calendar, Play, Trash2, Club } from "lucide-react";
import { CommunityClubs } from "@/components/fomo/community/CommunityClubs";
import { CommunityProfileModPool } from "@/components/fomo/community/CommunityProfileModPool";
import { supabase } from "@/lib/core/supabaseClient";
import { deleteCommunityContent } from "@/components/fomo/community/communityActions";

export function CommunityUserProfile({
  username,
  onBack,
  onOpenProjectDetails,
}: {
  username: string;
  onBack: () => void;
  onOpenProjectDetails?: (id: string, platform?: string) => void;
}) {
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<
    "pool" | "videos" | "clubs"
  >("pool");
  const [currentTheme, setCurrentTheme] = useState("official");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const update = () => setCurrentTheme(document.documentElement.getAttribute("data-theme") || "official");
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  // currentUserId is resolved during the main profile fetch below — no separate auth call needed.

  useEffect(() => {
    const fetchUserAndContent = async (retries = 2) => {
      setLoading(true);
      try {
        // 1. Fetch Profile
        const { data: profiles, error: profileErr } = await supabase
          .from("profiles")
          .select("*")
          .eq("username", username)
          .limit(1);
          
        if (profileErr) {
          // Supabase errors don't serialize well, log code + message
          const errMsg = profileErr?.message || profileErr?.code || JSON.stringify(profileErr);
          if (retries > 0) {
            console.warn("[Profile] Fetch failed, retrying...", errMsg);
            setTimeout(() => fetchUserAndContent(retries - 1), 600);
            return;
          }
          console.error("Error fetching user profile:", errMsg);
          setLoading(false);
          return;
        }
        const profile = profiles?.[0];
        setProfileData(profile || null);

        if (profile) {
          // Resolve current user id + all content in parallel — single async wave
          const [
            { data: { session } },
            { data: favs },
            { data: vids }
          ] = await Promise.all([
            supabase.auth.getSession(),
            supabase.from("favorite_mods").select("*").eq("profile_id", profile.id).order("created_at", { ascending: false }),
            supabase.from("showcase_videos").select("*").eq("profile_id", profile.id).order("created_at", { ascending: false }),
          ]);
          setCurrentUserId(session?.user?.id || null);
          setFavorites(favs || []);
          setVideos(vids || []);
        }
      } catch (err: any) {
        const errMsg = err?.message || err?.code || String(err);
        if (retries > 0) {
          console.warn("[Profile] Unexpected error, retrying...", errMsg);
          setTimeout(() => fetchUserAndContent(retries - 1), 600);
          return;
        }
        console.error("Error fetching user profile:", errMsg);
      } finally {
        setLoading(false);
      }
    };
    if (username) {
      fetchUserAndContent();
    }
  }, [username]);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString("es-AR", {
        day: "2-digit", month: "2-digit", year: "numeric"
      });
    } catch {
      return "";
    }
  };

  const isModern = currentTheme === "modern";
  const isOwnProfile = !!currentUserId && profileData?.id === currentUserId;
  const profileBannerMeta = profileData?.banner_meta ?? { zoom: 1, x: 0, y: 0, blur: 0 };

  const deleteItem = async (type: 'favorite' | 'video', id: string) => {
    if (deletingId) return;
    setDeletingId(id);
    try {
      const { ok, error } = await deleteCommunityContent(type, id);
      if (!ok) throw new Error(error || "Error al eliminar");
      if (type === 'favorite') setFavorites(prev => prev.filter(f => f.id !== id));
      else if (type === 'video') setVideos(prev => prev.filter(v => v.id !== id));
      
    } catch (err) {
      console.error(err);
      window.dispatchEvent(new CustomEvent("fomo-show-status", {
        detail: { text: "Error al eliminar.", type: "error" }
      }));
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className={`flex-1 flex items-center justify-center py-20 ${isModern ? 'text-muted-foreground' : 'text-white/40'}`}>
        <CircleFadingPlus className="w-8 h-8 animate-spin text-primary opacity-50" />
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className={`flex-1 p-6 space-y-4 ${isModern ? 'bg-background text-foreground' : ''}`}>
        <button onClick={onBack} className={`flex items-center gap-2 text-xs transition-colors cursor-pointer bg-transparent border-none ${isModern ? 'text-muted-foreground hover:text-foreground' : 'text-white/50 hover:text-white'}`}>
          <ArrowLeft className="w-4 h-4" /> Volver
        </button>
        <div className={`py-20 text-center text-xs border border-dashed rounded-2xl ${isModern ? 'text-muted-foreground border-border' : 'text-white/40 border-white/10'}`}>
          Usuario no encontrado o no existe.
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full overflow-hidden animate-fade-in relative ${isModern ? 'bg-background text-foreground' : ''}`}>
      {/* Profile Header Banner */}
      <div className={`relative pt-12 pb-6 px-6 shrink-0 border-b overflow-hidden ${isModern ? 'border-border' : 'border-white/5'}`}>
        {profileData?.banner_url && (
          <div className="absolute inset-0 z-0 overflow-hidden">
            <img
              src={profileData.banner_url}
              alt="Banner"
              className="w-full h-full object-cover"
              style={{
                transform: `translate(${profileBannerMeta.x}px, ${profileBannerMeta.y}px) scale(${profileBannerMeta.zoom})`,
                filter: `blur(${profileBannerMeta.blur}px)`,
                transformOrigin: "center center",
              }}
            />
          </div>
        )}
        <div 
          className="absolute inset-0 z-0 opacity-50 mix-blend-screen"
          style={{
            background: `radial-gradient(circle at top right, ${profileData.color || 'var(--primary)'}50, transparent 70%),
                         radial-gradient(circle at bottom left, ${profileData.color || 'var(--primary)'}30, transparent 50%)`
          }}
        />
        {isModern && (
           <div className="absolute inset-0 z-0 bg-white/20" />
        )}
        {!isModern && (
           <div className="absolute inset-0 z-0 bg-black/35" />
        )}
        <div className="absolute inset-0 z-0 bg-[url('/grid-pattern.svg')] bg-repeat opacity-[0.03]" />
        <button 
          onClick={onBack} 
          className="absolute top-4 left-6 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all text-xs font-bold cursor-pointer border border-white/5 backdrop-blur-sm z-10"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Volver
        </button>

        <div className="flex items-end gap-5 relative z-10 mt-4">
          <div 
            className="w-20 h-20 rounded-2xl flex items-center justify-center font-black text-3xl uppercase shadow-2xl border-2 overflow-hidden bg-black/40 backdrop-blur-md shrink-0"
            style={{ borderColor: profileData.color || 'var(--primary)', color: profileData.color || 'var(--primary)' }}
          >
            {profileData.avatar_url ? (
              <img src={profileData.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              (profileData.username || "U").charAt(0)
            )}
          </div>
          <div className="mb-1">
            <h2 className={`text-2xl font-black ${isModern ? 'text-foreground' : 'text-white'}`}>{profileData.username}</h2>
            <div className={`flex items-center gap-3 mt-1 text-[11px] font-medium ${isModern ? 'text-muted-foreground' : 'text-white/50'}`}>
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Unido en {formatDate(profileData.created_at)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Internal Tabs */}
      <div className={`flex gap-4 px-6 py-3 border-b shrink-0 ${isModern ? 'bg-muted/20 border-border' : 'bg-black/10 border-white/5'}`}>
        <button
          onClick={() => setActiveTab("pool")}
          className={`text-[11px] font-bold uppercase tracking-wider px-2 py-1 transition-all ${activeTab === "pool" ? (isModern ? "text-foreground border-b-2 border-primary" : "text-white border-b-2 border-primary") : isModern ? "text-muted-foreground hover:text-foreground" : "text-white/40 hover:text-white/80"}`}
        >
          Pool ({favorites.filter((f) => !/autor de minecraft/i.test(f.summary || "")).length})
        </button>
        <button
          onClick={() => setActiveTab('videos')}
          className={`text-[11px] font-bold uppercase tracking-wider px-2 py-1 transition-all ${activeTab === 'videos' ? (isModern ? 'text-foreground border-b-2 border-primary' : 'text-white border-b-2 border-primary') : (isModern ? 'text-muted-foreground hover:text-foreground' : 'text-white/40 hover:text-white/80')}`}
        >
          Showcases ({videos.length})
        </button>
        <button
          onClick={() => setActiveTab("clubs")}
          className={`text-[11px] font-bold uppercase tracking-wider px-2 py-1 transition-all flex items-center gap-1 ${activeTab === "clubs" ? (isModern ? "text-foreground border-b-2 border-primary" : "text-white border-b-2 border-primary") : isModern ? "text-muted-foreground hover:text-foreground" : "text-white/40 hover:text-white/80"}`}
        >
          <Club className="w-3 h-3" /> Club
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
        {activeTab === "pool" && (
          <CommunityProfileModPool
            favorites={favorites}
            onOpenProjectDetails={onOpenProjectDetails}
          />
        )}

        {activeTab === 'videos' && (
          videos.length === 0 ? (
            <div className={`py-12 text-center text-xs border border-dashed rounded-2xl ${isModern ? 'text-muted-foreground border-border' : 'text-white/40 border-white/10'}`}>
              No compartió videos todavía.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {videos.map(v => (
                <div key={v.id} className={`rounded-xl overflow-hidden border flex flex-col group ${isModern ? 'bg-card text-card-foreground border-border' : 'bg-white/4 border-white/5'}`}>
                  <div className="relative w-full aspect-video bg-black flex items-center justify-center group/thumb cursor-pointer"
                       onClick={() => window.dispatchEvent(new CustomEvent("fomo-play-video", { detail: { videoId: v.youtube_video_id } }))}>
                    <img src={`https://img.youtube.com/vi/${v.youtube_video_id}/mqdefault.jpg`} alt="" className="w-full h-full object-cover opacity-80 group-hover/thumb:opacity-60 transition-opacity" />
                    <div className="absolute w-8 h-8 rounded-full bg-primary/95 text-background flex items-center justify-center shadow-lg group-hover/thumb:scale-110 transition-transform">
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    </div>
                    {isOwnProfile && (
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteItem('video', v.id); }}
                        disabled={deletingId === v.id}
                        className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/60 text-red-400 hover:text-red-300 transition-all opacity-0 group-hover:opacity-100 cursor-pointer border-none disabled:opacity-30"
                        title="Eliminar showcase"
                      >
                        <Trash2 className={`w-3 h-3 ${deletingId === v.id ? 'animate-spin' : ''}`} />
                      </button>
                    )}
                  </div>
                  <div className="p-3">
                    <h4 className={`text-[11px] font-bold line-clamp-2 leading-tight ${isModern ? 'text-foreground' : 'text-white'}`}>{v.title}</h4>
                    {v.description && v.description !== "Compartido desde Seguidos/Showcases" && (
                      <p className={`text-[9px] line-clamp-2 italic leading-snug mt-1 ${isModern ? 'text-muted-foreground' : 'text-white/50'}`}>"{v.description}"</p>
                    )}
                    <span className={`text-[8px] block mt-2 ${isModern ? 'text-muted-foreground/60' : 'text-white/30'}`}>{formatDate(v.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}


        {activeTab === "clubs" && profileData?.username && (
          <CommunityClubs username={profileData.username} singleUser />
        )}
      </div>
    </div>
  );
}
