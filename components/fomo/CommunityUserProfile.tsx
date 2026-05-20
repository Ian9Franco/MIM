"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, LayoutGrid, Package, TvMinimalPlay, Heart, CircleFadingPlus, Calendar, ExternalLink, Play, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export function CommunityUserProfile({ username, onBack }: { username: string; onBack: () => void }) {
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [modpacks, setModpacks] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'favorites' | 'videos' | 'modpacks'>('favorites');
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

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUserId(session?.user?.id || null);
    };
    load();
  }, []);

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
          // 2. Fetch Favorites
          const { data: favs } = await supabase
            .from("favorite_mods")
            .select("*")
            .eq("profile_id", profile.id)
            .order("created_at", { ascending: false });
          setFavorites(favs || []);

          // 3. Fetch Videos
          const { data: vids } = await supabase
            .from("showcase_videos")
            .select("*")
            .eq("profile_id", profile.id)
            .order("created_at", { ascending: false });
          setVideos(vids || []);

          // 4. Fetch Modpacks
          const { data: packs } = await supabase
            .from("modpack_builds")
            .select("*")
            .eq("profile_id", profile.id)
            .order("created_at", { ascending: false });
          setModpacks(packs || []);
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

  const deleteItem = async (type: 'favorite' | 'video' | 'modpack', id: string) => {
    if (deletingId) return;
    setDeletingId(id);
    try {
      let error: any;
      if (type === 'favorite') {
        ({ error } = await supabase.from("favorite_mods").delete().eq("id", id));
        if (!error) setFavorites(prev => prev.filter(f => f.id !== id));
      } else if (type === 'video') {
        ({ error } = await supabase.from("showcase_videos").delete().eq("id", id));
        if (!error) setVideos(prev => prev.filter(v => v.id !== id));
      } else if (type === 'modpack') {
        ({ error } = await supabase.from("modpack_builds").delete().eq("id", id));
        if (!error) setModpacks(prev => prev.filter(m => m.id !== id));
      }
      if (error) throw error;
      window.dispatchEvent(new CustomEvent("fomo-show-status", {
        detail: { text: "Eliminado correctamente.", type: "success" }
      }));
      window.dispatchEvent(new CustomEvent("fomo-refresh-sharing"));
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
      <div className={`relative pt-12 pb-6 px-6 shrink-0 border-b ${isModern ? 'border-border' : 'border-white/5'}`}>
        <div 
          className="absolute inset-0 opacity-10"
          style={{ background: `linear-gradient(135deg, ${profileData.color || 'var(--primary)'} 0%, transparent 100%)` }}
        />
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
          onClick={() => setActiveTab('favorites')}
          className={`text-[11px] font-bold uppercase tracking-wider px-2 py-1 transition-all ${activeTab === 'favorites' ? (isModern ? 'text-foreground border-b-2 border-primary' : 'text-white border-b-2 border-primary') : (isModern ? 'text-muted-foreground hover:text-foreground' : 'text-white/40 hover:text-white/80')}`}
        >
          Mods & Autores ({favorites.length})
        </button>
        <button
          onClick={() => setActiveTab('videos')}
          className={`text-[11px] font-bold uppercase tracking-wider px-2 py-1 transition-all ${activeTab === 'videos' ? (isModern ? 'text-foreground border-b-2 border-primary' : 'text-white border-b-2 border-primary') : (isModern ? 'text-muted-foreground hover:text-foreground' : 'text-white/40 hover:text-white/80')}`}
        >
          Showcases ({videos.length})
        </button>
        <button
          onClick={() => setActiveTab('modpacks')}
          className={`text-[11px] font-bold uppercase tracking-wider px-2 py-1 transition-all ${activeTab === 'modpacks' ? (isModern ? 'text-foreground border-b-2 border-primary' : 'text-white border-b-2 border-primary') : (isModern ? 'text-muted-foreground hover:text-foreground' : 'text-white/40 hover:text-white/80')}`}
        >
          Modpacks ({modpacks.length})
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
        {activeTab === 'favorites' && (
          favorites.length === 0 ? (
            <div className={`py-12 text-center text-xs border border-dashed rounded-2xl ${isModern ? 'text-muted-foreground border-border' : 'text-white/40 border-white/10'}`}>
              No compartió proyectos todavía.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {favorites.map(f => (
                <div key={f.id} className={`p-3 rounded-2xl border flex gap-3 group relative transition-colors ${isModern ? 'bg-card text-card-foreground border-border hover:bg-muted/50' : 'bg-white/4 border-white/5 hover:bg-white/10'}`}>
                  <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 border overflow-hidden relative ${isModern ? 'bg-muted border-border' : 'bg-white/5 border-white/10'}`}>
                    {f.icon_url ? <img src={f.icon_url} alt="" className="w-full h-full object-cover" /> : <LayoutGrid className={`w-5 h-5 ${isModern ? 'text-muted-foreground' : 'opacity-40'}`} />}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h4 className={`font-bold text-xs truncate ${isModern ? 'text-foreground' : 'text-white'}`}>{f.name}</h4>
                    {f.summary && <p className={`text-[10px] line-clamp-1 italic ${isModern ? 'text-muted-foreground' : 'text-white/50'}`}>"{f.summary}"</p>}
                    <span className={`text-[8px] mt-1 ${isModern ? 'text-muted-foreground/60' : 'text-white/30'}`}>{formatDate(f.created_at)}</span>
                  </div>
                  {isOwnProfile && (
                    <button
                      onClick={() => deleteItem('favorite', f.id)}
                      disabled={deletingId === f.id}
                      className="shrink-0 self-center p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all opacity-0 group-hover:opacity-100 cursor-pointer border-none bg-transparent disabled:opacity-30"
                      title="Eliminar compartido"
                    >
                      <Trash2 className={`w-3.5 h-3.5 ${deletingId === f.id ? 'animate-spin' : ''}`} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )
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

        {activeTab === 'modpacks' && (
          modpacks.length === 0 ? (
            <div className={`py-12 text-center text-xs border border-dashed rounded-2xl ${isModern ? 'text-muted-foreground border-border' : 'text-white/40 border-white/10'}`}>
              No compartió modpacks todavía.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {modpacks.map(m => (
                <div key={m.id} className={`p-4 rounded-2xl border flex flex-col gap-2 group ${isModern ? 'bg-card text-card-foreground border-border' : 'bg-white/4 border-white/5'}`}>
                  <div className="flex gap-3 items-start">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border text-primary ${isModern ? 'bg-muted border-border' : 'bg-white/5 border-white/10'}`}>
                      <Package className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-bold text-xs truncate ${isModern ? 'text-foreground' : 'text-white'}`}>{m.name}</h4>
                      <p className={`text-[10px] line-clamp-2 ${isModern ? 'text-muted-foreground' : 'text-white/60'}`}>{m.description || "Sin descripción."}</p>
                    </div>
                    {isOwnProfile && (
                      <button
                        onClick={() => deleteItem('modpack', m.id)}
                        disabled={deletingId === m.id}
                        className="shrink-0 p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all opacity-0 group-hover:opacity-100 cursor-pointer border-none bg-transparent disabled:opacity-30"
                        title="Eliminar modpack"
                      >
                        <Trash2 className={`w-3.5 h-3.5 ${deletingId === m.id ? 'animate-spin' : ''}`} />
                      </button>
                    )}
                  </div>
                  <div className={`mt-2 text-[9px] flex items-center justify-between ${isModern ? 'text-muted-foreground' : 'text-white/40'}`}>
                    <span>v{m.version} • {m.loader} {m.game_version}</span>
                    <span>{formatDate(m.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
