"use client";

import React from "react";
import { TvMinimalPlay, Play, RefreshCw } from "lucide-react";

interface ShowcaseVideo {
  id: string;
  youtube_video_id: string;
  title: string;
  description: string;
  created_at: string;
  profiles: {
    username: string;
    avatar_url?: string | null;
    color?: string | null;
  };
}

interface CommunityVideosProps {
  videos: ShowcaseVideo[];
  loadingVideos: boolean;
  selectedUserFilter: { username: string; type: 'mods' | 'videos' } | null;
  setSelectedUserFilter: (val: { username: string; type: 'mods' | 'videos' } | null) => void;
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

export function CommunityVideos({
  videos,
  loadingVideos,
  selectedUserFilter,
  setSelectedUserFilter
}: CommunityVideosProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-white">Videos de Showcase</h3>
        <p className="text-[10px] text-white/40 mt-0.5">Mira los últimos videos en acción compartidos por la comunidad.</p>
      </div>

      {loadingVideos ? (
        <div className="py-12 text-center text-white/40"><RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" /> Cargando videos...</div>
      ) : videos.length === 0 ? (
        <div className="py-12 border border-dashed border-white/10 rounded-2xl text-center text-white/40 text-xs flex flex-col items-center justify-center gap-2">
          <TvMinimalPlay className="w-6 h-6 opacity-30" />
          No hay videos compartidos todavía.
        </div>
      ) : selectedUserFilter && selectedUserFilter.type === 'videos' ? (() => {
        const filteredVids = videos.filter(vid => (vid.profiles?.username || "Usuario") === selectedUserFilter.username);
        const userProfile = filteredVids[0]?.profiles;
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
                  <h3 className="text-sm font-bold text-white">Showcases de @{selectedUserFilter.username}</h3>
                  <p className="text-[10px] text-white/40 mt-0.5">{filteredVids.length} videos en total</p>
                </div>
              </div>
            </div>

            {filteredVids.length === 0 ? (
              <div className="py-12 text-center text-white/40 text-xs">No hay videos.</div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2.5">
                {filteredVids.map((vid) => (
                  <div key={vid.id} className="rounded-xl overflow-hidden bg-white/4 border border-white/5 hover:border-primary/20 transition-all flex flex-col justify-between">
                    <div>
                      <div className="relative w-full aspect-video bg-black flex items-center justify-center group cursor-pointer"
                           onClick={() => {
                             window.dispatchEvent(new CustomEvent("fomo-play-video", { 
                               detail: { videoId: vid.youtube_video_id } 
                             }));
                           }}>
                        <img 
                          src={`https://img.youtube.com/vi/${vid.youtube_video_id}/mqdefault.jpg`} 
                          alt="" 
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-60 transition-opacity" 
                        />
                        <div className="absolute w-7 h-7 rounded-full bg-primary/95 text-background flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <Play className="w-3 h-3 fill-current ml-0.5" />
                        </div>
                      </div>
                      <div className="p-2 flex flex-col gap-1">
                        <h4 className="text-[9px] font-bold text-white line-clamp-2 leading-tight">{vid.title}</h4>
                        {vid.description && vid.description !== "Compartido desde Seguidos/Showcases" && (
                          <p className="text-[8px] text-white/50 line-clamp-2 italic leading-snug">"{vid.description}"</p>
                        )}
                      </div>
                    </div>
                    <div className="px-2 pb-2 pt-0">
                      {vid.created_at && (
                        <span className="text-[7px] text-white/20 block font-medium">{formatSharedDate(vid.created_at)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })() : (() => {
        const groups: Record<string, ShowcaseVideo[]> = {};
        videos.forEach(vid => {
          const username = vid.profiles?.username || "Usuario";
          if (!groups[username]) groups[username] = [];
          groups[username].push(vid);
        });

        return (
          <div className="space-y-8">
            {Object.keys(groups).map(username => {
              const userVids = groups[username];
              const displayVids = userVids.slice(0, 2);
              const firstVid = userVids[0];
              const profileColor = firstVid?.profiles?.color;
              const profileAvatar = firstVid?.profiles?.avatar_url;

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
                        <span className="text-[10px] text-white/40 block mt-0.5">Compartió {userVids.length} {userVids.length === 1 ? 'video' : 'videos'}</span>
                      </div>
                    </div>
                    {userVids.length > 2 && (
                      <button 
                        onClick={() => setSelectedUserFilter({ username, type: 'videos' })}
                        className="px-3.5 py-1.5 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary text-xs font-bold transition-all cursor-pointer bg-transparent"
                      >
                        Ver todos (+{userVids.length - 2})
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {displayVids.map((vid) => (
                      <div key={vid.id} className="rounded-2xl overflow-hidden bg-white/4 border border-white/5 hover:border-primary/20 transition-all flex flex-col justify-between">
                        <div>
                          <div className="relative w-full aspect-video bg-black flex items-center justify-center group cursor-pointer"
                               onClick={() => {
                                 window.dispatchEvent(new CustomEvent("fomo-play-video", { 
                                   detail: { videoId: vid.youtube_video_id } 
                                 }));
                               }}>
                            <img 
                              src={`https://img.youtube.com/vi/${vid.youtube_video_id}/mqdefault.jpg`} 
                              alt="" 
                              className="w-full h-full object-cover opacity-80 group-hover:opacity-60 transition-opacity" 
                            />
                            <div className="absolute w-10 h-10 rounded-full bg-primary/95 text-background flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                              <Play className="w-4 h-4 fill-current ml-0.5" />
                            </div>
                          </div>
                          <div className="p-3.5 flex flex-col gap-1.5">
                            <h4 className="text-xs font-bold text-white line-clamp-2 leading-snug">{vid.title}</h4>
                            {vid.description && vid.description !== "Compartido desde Seguidos/Showcases" && (
                              <p className="text-[10px] text-white/50 line-clamp-2 italic leading-relaxed">"{vid.description}"</p>
                            )}
                          </div>
                        </div>
                        <div className="px-3.5 pb-3 pt-0">
                          {vid.created_at && (
                            <span className="text-[9px] text-white/20 block font-medium">{formatSharedDate(vid.created_at)}</span>
                          )}
                        </div>
                      </div>
                    ))}
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
