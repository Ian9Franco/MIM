"use client";

import React from "react";
import { Heart, Search, RefreshCw, Puzzle, Sparkles, CircleFadingPlus } from "lucide-react";

interface SharedFavorite {
  id: string;
  profile_id: string;
  mod_id: string;
  platform: string;
  name: string;
  icon_url?: string | null;
  summary?: string | null;
  created_at?: string;
  profiles: {
    username: string;
    avatar_url?: string | null;
    color?: string | null;
  };
}

interface CommunityFavoritesProps {
  cloudFavorites: SharedFavorite[];
  loadingFavorites: boolean;
  selectedUserFilter: { username: string; type: 'mods' | 'videos' } | null;
  setSelectedUserFilter: (val: { username: string; type: 'mods' | 'videos' } | null) => void;
  onSearchProject?: (title: string, type?: string, source?: string, loader?: string, version?: string) => void;
  onSearchAuthor: (author: string) => void;
}

const formatSharedDate = (dateStr?: string) => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch (e) {
    return "";
  }
};

export function CommunityFavorites({
  cloudFavorites,
  loadingFavorites,
  selectedUserFilter,
  setSelectedUserFilter,
  onSearchProject,
  onSearchAuthor
}: CommunityFavoritesProps) {
  const handleItemSearch = (fav: SharedFavorite) => {
    const isAuthor = fav.summary === "Autor de Minecraft" || fav.summary?.startsWith("¿Querés agregar") || fav.summary === "Autor de Minecraft";
    // Check if it's stored as author or minecraft creator
    if (isAuthor || fav.summary === "Autor de Minecraft") {
      onSearchAuthor(fav.name);
    } else {
      window.dispatchEvent(new CustomEvent("fomo-open-project-details", {
        detail: { id: fav.mod_id, platform: fav.platform }
      }));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-white">Mods y Creadores Compartidos</h3>
        <p className="text-[10px] text-white/40 mt-0.5">Descubre mods y creadores compartidos por la comunidad.</p>
      </div>

      {loadingFavorites ? (
        <div className="py-12 text-center text-white/40"><RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" /> Cargando compartidos...</div>
      ) : cloudFavorites.length === 0 ? (
        <div className="py-12 border border-dashed border-white/10 rounded-2xl text-center text-white/40 text-xs flex flex-col items-center justify-center gap-2">
          <CircleFadingPlus className="w-6 h-6 opacity-30" />
          Aún no hay contenido compartido.
        </div>
      ) : selectedUserFilter && selectedUserFilter.type === 'mods' ? (() => {
        const filteredFavs = cloudFavorites.filter(mod => (mod.profiles?.username || "Usuario") === selectedUserFilter.username);
        const userProfile = filteredFavs[0]?.profiles;
        const profileColor = userProfile?.color;
        const profileAvatar = userProfile?.avatar_url;

        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-2xl border border-white/5 relative overflow-hidden bg-white/4">
              <div 
                className="absolute inset-0 opacity-15"
                style={{
                  background: `linear-gradient(135deg, ${profileColor || 'var(--primary)'} 0%, transparent 100%)`
                }}
              />
              <button 
                onClick={() => setSelectedUserFilter(null)}
                className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-all text-[11px] font-bold cursor-pointer relative z-10"
              >
                ← Volver
              </button>
              <div className="flex items-center gap-3 relative z-10 pl-2">
                <div 
                  className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm uppercase border overflow-hidden shrink-0 bg-white/5"
                  style={{ 
                    borderColor: profileColor || 'var(--primary)',
                  }}
                >
                  {profileAvatar ? (
                    <img src={profileAvatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (selectedUserFilter.username || "U").charAt(0)
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Compartidos de @{selectedUserFilter.username}</h3>
                  <p className="text-[10px] text-white/40 mt-0.5">{filteredFavs.length} items compartidos</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredFavs.map((fav) => {
                const isAuthor = fav.summary === "Autor de Minecraft";
                return (
                  <div key={fav.id} className="p-4 rounded-2xl bg-white/4 border border-white/5 hover:border-primary/20 transition-all flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                      {fav.icon_url ? (
                        <img src={fav.icon_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Puzzle className="w-5 h-5 opacity-40" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-white truncate">{fav.name}</h4>
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-white/5 border border-white/10 uppercase opacity-60">
                          {isAuthor ? "Autor" : fav.platform}
                        </span>
                      </div>
                      <p className="text-[10px] text-white/50 mt-1 line-clamp-1">{fav.summary || ""}</p>
                      {fav.created_at && (
                        <span className="text-[8px] text-white/25 block mt-0.5 font-medium">
                          Compartido el {formatSharedDate(fav.created_at)}
                        </span>
                      )}
                    </div>
                    <button 
                      onClick={() => handleItemSearch(fav)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-all cursor-pointer"
                      title={isAuthor ? "Buscar autor en la app" : "Buscar mod en la app"}
                    >
                      <Search className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })() : (() => {
        const groups: Record<string, SharedFavorite[]> = {};
        cloudFavorites.forEach(fav => {
          const username = fav.profiles?.username || "Usuario";
          if (!groups[username]) groups[username] = [];
          groups[username].push(fav);
        });

        return (
          <div className="space-y-8">
            {Object.keys(groups).map(username => {
              const userFavs = groups[username];
              const displayFavs = userFavs.slice(0, 3);
              const firstFav = userFavs[0];
              const profileColor = firstFav?.profiles?.color;
              const profileAvatar = firstFav?.profiles?.avatar_url;

              return (
                <div key={username} className="space-y-4">
                  <div className="flex items-center justify-between p-3.5 bg-white/4 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm uppercase border overflow-hidden shrink-0"
                        style={{ 
                          backgroundColor: profileColor || 'var(--primary)',
                          borderColor: profileColor || 'var(--primary)',
                          color: profileColor ? '#000000' : 'var(--primary-foreground)'
                        }}
                      >
                        {profileAvatar ? (
                          <img src={profileAvatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          (username || "U").charAt(0)
                        )}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">@{username}</span>
                        <span className="text-[10px] text-white/40 block mt-0.5">Compartió {userFavs.length} {userFavs.length === 1 ? 'item' : 'items'}</span>
                      </div>
                    </div>
                    {userFavs.length > 3 && (
                      <button 
                        onClick={() => setSelectedUserFilter({ username, type: 'mods' })}
                        className="px-3.5 py-1.5 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary text-xs font-bold transition-all cursor-pointer bg-transparent"
                      >
                        Ver todos (+{userFavs.length - 3})
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {displayFavs.map((fav) => {
                      const isAuthor = fav.summary === "Autor de Minecraft" || fav.summary?.startsWith("¿Querés agregar");
                      return (
                        <div key={fav.id} className="p-3.5 rounded-2xl bg-white/4 border border-white/5 hover:border-primary/20 transition-all flex flex-col justify-between h-[155px]">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                              {fav.icon_url ? (
                                <img src={fav.icon_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Puzzle className="w-4 h-4 opacity-40" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs font-bold text-white truncate">{fav.name}</h4>
                              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-white/5 border border-white/10 uppercase opacity-60 inline-block mt-1">
                                {isAuthor ? "Autor" : fav.platform}
                              </span>
                            </div>
                          </div>
                          <p className="text-[9px] text-white/50 line-clamp-2 mt-2 flex-1 leading-normal">{fav.summary || ""}</p>
                          <div className="flex items-center justify-between pt-2 mt-2 border-t border-white/5 shrink-0">
                            {fav.created_at ? (
                              <span className="text-[8px] text-white/20">
                                {formatSharedDate(fav.created_at)}
                              </span>
                            ) : <span />}
                            <button 
                              onClick={() => handleItemSearch(fav)}
                              className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1.5"
                              title={isAuthor ? "Buscar autor en la app" : "Buscar mod en la app"}
                            >
                              Buscar <Search className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}
