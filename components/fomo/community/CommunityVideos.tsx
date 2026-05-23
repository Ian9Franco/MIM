"use client";

import React, { useState } from "react";
import { TvMinimalPlay, Play, RefreshCw, Puzzle, Globe, ChevronDown, ChevronUp } from "lucide-react";
import { CommunityUserAvatar } from "@/components/fomo/community/CommunityUserAvatar";
import { CommunityDeleteButton } from "@/components/fomo/community/CommunityDeleteButton";

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
  onOpenProjectDetails?: (id: string, platform?: string) => void;
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

const typeLabels: Record<string, string> = {
  mod: "Mod",
  plugin: "Plugin",
  datapack: "Data",
  shader: "Shader",
  resourcepack: "Pack",
  modpack: "Pack",
  "mc-mods": "Mod",
  "texture-packs": "Pack",
  customization: "Cust",
  "mc-addons": "Addon"
};

const typeToProjectType: Record<string, string> = {
  mod: "mod",
  plugin: "mod",
  datapack: "datapack",
  shader: "shader",
  resourcepack: "resourcepack",
  modpack: "modpack",
  "mc-mods": "mod",
  "texture-packs": "resourcepack",
  customization: "datapack",
  "mc-addons": "mod"
};

function CommunityVideoItem({ vid, currentUserId, onVideoDeleted, onOpenProjectDetails }: { vid: ShowcaseVideo, currentUserId?: string, onVideoDeleted?: (id: string) => void, onOpenProjectDetails?: (id: string, platform?: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [loadingMods, setLoadingMods] = useState(false);
  const [details, setDetails] = useState<any>(null);

  const toggleExpand = async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (!details) {
      setLoadingMods(true);
      try {
        const res = await fetch(`/api/fomo/youtube-video?videoId=${vid.youtube_video_id}`);
        const data = await res.json();
        setDetails(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingMods(false);
      }
    }
  };

  const handleFollowChannel = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!details?.channelUrl) return;
    try {
      const res = await fetch("/api/fomo/youtube-channels");
      const data = await res.json();
      const channels = data.channels || [];
      
      // Clean target url for duplication checks
      let targetUrl = details.channelUrl.replace(/\/$/, "");
      targetUrl = targetUrl.replace(/\/(videos|shorts|featured|streams|playlists)$/, "");
      
      if (!channels.some((c: string) => c.startsWith(targetUrl))) {
        channels.push(details.channelUrl);
        await fetch("/api/fomo/youtube-channels", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channels })
        });
        window.dispatchEvent(new CustomEvent("fomo-show-status", { detail: { text: "Canal añadido a tus Showcases", type: "success" } }));
        window.dispatchEvent(new CustomEvent("fomo-refresh-sharing"));
      } else {
        window.dispatchEvent(new CustomEvent("fomo-show-status", { detail: { text: "Ya sigues a este canal en Showcases", type: "info" } }));
      }
    } catch(err) {
      console.error("Error siguiendo canal:", err);
    }
  };

  return (
    <div className="rounded-2xl overflow-hidden bg-white/4 border border-white/5 hover:border-primary/20 transition-all flex flex-col justify-between">
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
        <div className="p-3.5 flex flex-col gap-1.5 cursor-pointer" onClick={toggleExpand}>
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-xs font-bold text-white line-clamp-2 leading-snug">
              {vid.title}
            </h4>
            {expanded ? <ChevronUp className="w-4 h-4 text-white/40 shrink-0 mt-0.5" /> : <ChevronDown className="w-4 h-4 text-white/40 shrink-0 mt-0.5" />}
          </div>
          {vid.description && vid.description !== "Compartido desde Seguidos/Showcases" && (
            <p className="text-[10px] text-white/50 line-clamp-2 italic leading-relaxed">
              &quot;{vid.description}&quot;
            </p>
          )}
        </div>
      </div>
      
      {expanded && (
        <div className="px-3.5 pb-3 border-t border-white/5 pt-3 animate-fade-in">
          {loadingMods ? (
            <div className="flex items-center justify-center py-2 text-white/40 text-[10px]">
              <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" /> Analizando mods del video...
            </div>
          ) : details ? (
            <>
              {details.channelUrl && (
                <button 
                  onClick={handleFollowChannel}
                  className="mb-3 w-full py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary text-[10px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Globe className="w-3.5 h-3.5" /> Seguir a {details.channelName || "este canal"} en Showcases
                </button>
              )}
              
              {details.modSlugs && details.modSlugs.length > 0 ? (
                <>
                  <h4 className="font-headline text-[10px] mb-2 flex items-center gap-1.5 text-white/60"><Puzzle className="w-3 h-3 text-primary" />Mods Encontrados</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {details.modSlugs.map((slugStr: string, sIdx: number) => {
                      const parts = slugStr.split(":");
                      const source = parts[0];
                      const type = parts.length >= 3 ? parts[1] : "mod";
                      const slug = parts.length >= 3 ? parts[2] : parts[1];
                      const loader = parts.length >= 4 ? parts[3] : "";
                      const version = parts.length >= 5 ? parts[4] : "";
                      
                      const isCurse = source === "curseforge";
                      const displayName = slug.split("-").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
                      const typeLabel = typeLabels[type] || "Mod";
                      const extraInfo = [loader, version].filter(Boolean).join(" ");
                      const fullTypeLabel = extraInfo ? `${typeLabel} (${extraInfo})` : typeLabel;
                      
                      return (
                        <div 
                          key={`${slug}-${sIdx}`}
                          className="p-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-2 hover:shadow-lg hover:-translate-y-0.5"
                          style={{
                            background: "rgba(0, 0, 0, 0.4)",
                            borderColor: isCurse ? "rgba(248,113,113,0.2)" : "rgba(30,215,96,0.2)",
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onOpenProjectDetails) {
                              onOpenProjectDetails(slug, source);
                            } else {
                              const query = slug.replace(/-/g, " ");
                              const targetType = typeToProjectType[type] || "mod";
                              window.dispatchEvent(new CustomEvent("fomo-search-project", {
                                detail: { query, type: targetType, source, loader, version }
                              }));
                            }
                          }}
                        >
                          <div 
                            className="w-4 h-4 rounded flex items-center justify-center text-[7px] font-black uppercase shrink-0" 
                            style={{ 
                              background: isCurse ? "rgba(248,113,113,0.15)" : "rgba(30,215,96,0.15)", 
                              color: isCurse ? "#f87171" : "#4ade80",
                              border: isCurse ? "1px solid rgba(248,113,113,0.3)" : "1px solid rgba(30,215,96,0.3)"
                            }}
                          >
                            {source.substring(0, 2)}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[9px] font-bold truncate" style={{ color: isCurse ? "#fca5a5" : "#a7f3d0" }}>
                              {displayName}
                            </span>
                            <span className="text-[7px] font-medium opacity-60" style={{ color: isCurse ? "#fca5a5" : "#a7f3d0" }}>
                              {fullTypeLabel}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="p-2 rounded-xl bg-white/5 border border-white/5 text-[9px] text-center text-white/40">
                  No se encontraron links de mods en la descripción de este video.
                </div>
              )}
            </>
          ) : (
            <div className="p-2 text-center text-red-400 text-[10px]">Error al cargar detalles.</div>
          )}
        </div>
      )}

      <div className="px-3.5 pb-3 pt-0 flex items-center justify-between gap-2 border-t border-transparent">
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
  );
}

function CommunityVideosInner({
  videos,
  loadingVideos,
  currentUserId,
  onVideoDeleted,
  onOpenProfile,
  onOpenProjectDetails,
}: CommunityVideosProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-white">Videos de Showcase</h3>
        <p className="text-xs text-white/40 mt-0.5">
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
                        <CommunityVideoItem 
                          key={vid.id} 
                          vid={vid} 
                          currentUserId={currentUserId} 
                          onVideoDeleted={onVideoDeleted} 
                          onOpenProjectDetails={onOpenProjectDetails}
                        />
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
