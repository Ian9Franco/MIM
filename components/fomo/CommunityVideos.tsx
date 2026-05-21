"use client";

import React from "react";
import { TvMinimalPlay, Play, RefreshCw } from "lucide-react";
import { CommunityUserAvatar } from "./CommunityUserAvatar";
import { CommunityDeleteButton } from "./CommunityDeleteButton";

interface ShowcaseVideo {
  id: string;
  profile_id: string;
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
  currentUserId?: string;
  onVideoDeleted?: (id: string) => void;
  onOpenProfile?: (username: string) => void;
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
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

function CommunityVideosInner({
  videos,
  loadingVideos,
  currentUserId,
  onVideoDeleted,
  onOpenProfile,
}: CommunityVideosProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-white">Videos de Showcase</h3>
        <p className="text-[10px] text-white/40 mt-0.5">
          Mira los últimos videos en acción compartidos por la comunidad.
        </p>
      </div>

      {loadingVideos ? (
        <div className="py-12 text-center text-white/40">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" /> Cargando
          videos...
        </div>
      ) : videos.length === 0 ? (
        <div className="py-12 border border-dashed border-white/10 rounded-2xl text-center text-white/40 text-xs flex flex-col items-center justify-center gap-2">
          <TvMinimalPlay className="w-6 h-6 opacity-30" />
          No hay videos compartidos todavía.
        </div>
      ) : (
        (() => {
          const groups: Record<string, ShowcaseVideo[]> = {};
          videos.forEach((vid) => {
            const username = vid.profiles?.username || "Usuario";
            if (!groups[username]) groups[username] = [];
            groups[username].push(vid);
          });

          return (
            <div className="space-y-8">
              {Object.keys(groups).map((username) => {
                const userVids = groups[username];
                const displayVids = userVids.slice(0, 2);
                const firstVid = userVids[0];
                const profileColor = firstVid?.profiles?.color;
                const profileAvatar = firstVid?.profiles?.avatar_url;

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
                          <span className="text-xs font-bold text-white block hover:text-primary transition-colors">
                            @{username}
                          </span>
                          <span className="text-[10px] text-white/40 block mt-0.5">
                            Compartió {userVids.length}{" "}
                            {userVids.length === 1 ? "video" : "videos"}
                          </span>
                        </div>
                      </div>
                      {userVids.length > 2 && (
                        <button
                          type="button"
                          onClick={() => onOpenProfile?.(username)}
                          className="px-3.5 py-1.5 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary text-xs font-bold transition-all cursor-pointer bg-transparent"
                        >
                          Ver perfil (+{userVids.length - 2})
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {displayVids.map((vid) => (
                        <div
                          key={vid.id}
                          className="rounded-2xl overflow-hidden bg-white/4 border border-white/5 hover:border-primary/20 transition-all flex flex-col justify-between"
                        >
                          <div>
                            <div
                              className="relative w-full aspect-video bg-black flex items-center justify-center group cursor-pointer"
                              onClick={() => {
                                window.dispatchEvent(
                                  new CustomEvent("fomo-play-video", {
                                    detail: { videoId: vid.youtube_video_id },
                                  })
                                );
                              }}
                            >
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
                              <h4 className="text-xs font-bold text-white line-clamp-2 leading-snug">
                                {vid.title}
                              </h4>
                              {vid.description &&
                                vid.description !== "Compartido desde Seguidos/Showcases" && (
                                  <p className="text-[10px] text-white/50 line-clamp-2 italic leading-relaxed">
                                    &quot;{vid.description}&quot;
                                  </p>
                                )}
                            </div>
                          </div>
                          <div className="px-3.5 pb-3 pt-0 flex items-center justify-between gap-2">
                            {vid.created_at && (
                              <span className="text-[9px] text-white/20 font-medium">
                                {formatSharedDate(vid.created_at)}
                              </span>
                            )}
                            {currentUserId && vid.profile_id === currentUserId && (
                              <CommunityDeleteButton
                                type="video"
                                id={vid.id}
                                onDeleted={onVideoDeleted}
                              />
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
        })()
      )}
    </div>
  );
}

export const CommunityVideos = React.memo(CommunityVideosInner);
