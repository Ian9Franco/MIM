"use client";

import React from "react";
import { Search, RefreshCw, Puzzle, CircleFadingPlus } from "lucide-react";
import { CommunityUserAvatar } from "./CommunityUserAvatar";
import { CommunityDeleteButton } from "./CommunityDeleteButton";

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
  currentUserId?: string;
  onFavoriteDeleted?: (id: string) => void;
  onOpenProfile?: (username: string) => void;
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
  currentUserId,
  onFavoriteDeleted,
  onOpenProfile,
  onSearchAuthor,
}: CommunityFavoritesProps) {
  const [progress, setProgress] = React.useState(0);
  const progressIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    if (loadingFavorites) {
      setProgress(10);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = setInterval(() => {
        setProgress(prev => {
          if (prev >= 95) return 95;
          if (prev >= 80) return prev + 0.4;
          if (prev >= 50) return prev + 1.2;
          return prev + 3.8;
        });
      }, 100);
    } else {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setProgress(prev => {
        if (prev > 0) return 100;
        return 0;
      });
      const t = setTimeout(() => {
        setProgress(0);
      }, 500);
      return () => clearTimeout(t);
    }
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [loadingFavorites]);

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

      {/* Top Loading Progress Bar */}
      <div className="h-1 w-full relative overflow-hidden bg-white/5 rounded-full mb-4">
        <div 
          className="h-full bg-gradient-to-r from-primary via-fuchsia-500 to-primary transition-all duration-300 ease-out shadow-[0_0_8px_rgba(187,150,228,0.8)]"
          style={{ 
            width: `${progress}%`,
            opacity: progress > 0 && progress < 100 ? 1 : 0,
            transition: progress === 100 ? "width 0.2s, opacity 0.5s 0.2s" : "width 0.4s ease-out"
          }}
        />
      </div>

      {loadingFavorites ? (
        <div className="py-12 text-center text-white/40"><RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" /> Cargando compartidos...</div>
      ) : cloudFavorites.length === 0 ? (
        <div className="py-12 border border-dashed border-white/10 rounded-2xl text-center text-white/40 text-xs flex flex-col items-center justify-center gap-2">
          <CircleFadingPlus className="w-6 h-6 opacity-30" />
          Aún no hay contenido compartido.
        </div>
      ) : (() => {
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
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => onOpenProfile?.(username)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") onOpenProfile?.(username);
                      }}
                      className="flex items-center gap-3 cursor-pointer text-left"
                    >
                      <CommunityUserAvatar
                        username={username}
                        avatarUrl={profileAvatar}
                        color={profileColor}
                        size="sm"
                        interactive={false}
                      />
                      <div>
                        <span className="text-xs font-bold text-white block hover:text-primary transition-colors">@{username}</span>
                        <span className="text-[10px] text-white/40 block mt-0.5">Compartió {userFavs.length} {userFavs.length === 1 ? "item" : "items"}</span>
                      </div>
                    </div>
                    {userFavs.length > 3 && (
                      <button
                        type="button"
                        onClick={() => onOpenProfile?.(username)}
                        className="px-3.5 py-1.5 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary text-xs font-bold transition-all cursor-pointer bg-transparent"
                      >
                        Ver perfil (+{userFavs.length - 3})
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
                            <div className="flex items-center gap-1.5">
                              {currentUserId && fav.profile_id === currentUserId && (
                                <CommunityDeleteButton
                                  type="favorite"
                                  id={fav.id}
                                  onDeleted={onFavoriteDeleted}
                                />
                              )}
                              <button
                                type="button"
                                onClick={() => handleItemSearch(fav)}
                                className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1.5"
                                title={isAuthor ? "Buscar autor en la app" : "Buscar mod en la app"}
                              >
                                Buscar <Search className="w-3 h-3" />
                              </button>
                            </div>
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
