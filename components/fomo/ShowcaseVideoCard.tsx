"use client";

import React from "react";
import { TvMinimalPlay, Globe, Puzzle } from "lucide-react";
import { COLORS } from "@/theme/tokens";
import { supabase } from "@/lib/supabaseClient";

function formatYoutubeDate(rawDate?: string): string {
  if (!rawDate || rawDate.length !== 8) return "";
  const year = rawDate.substring(0, 4);
  const monthIdx = parseInt(rawDate.substring(4, 6), 10) - 1;
  const day = parseInt(rawDate.substring(6, 8), 10);
  
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${day} ${months[monthIdx] || ""} ${year}`;
}

function ShowcaseVideoThumbnail({ video }: { video: any }) {
  const [imgError, setImgError] = React.useState(false);
  const [imgSrc, setImgSrc] = React.useState(video.thumbnail);

  const handleError = () => {
    if (video.videoId && imgSrc && imgSrc.includes("maxresdefault")) {
      setImgSrc(`https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`);
    } else if (video.videoId && imgSrc && imgSrc.includes("mqdefault")) {
      setImgSrc(`https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`);
    } else {
      setImgError(true);
    }
  };

  React.useEffect(() => {
    setImgSrc(video.thumbnail);
    setImgError(false);
  }, [video.thumbnail, video.videoId]);

  if (imgError || !imgSrc) {
    return (
      <div 
        className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 20l20-20v20L20 40V20zM0 40l20-20v20L0 40zm0-20L20 0v20L0 20z' fill='%23ffffff' fill-opacity='0.03' fill-rule='evenodd'/%3E%3C/svg%3E")`,
          backgroundColor: "rgba(255,255,255,0.02)"
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-red-950/20 via-transparent to-black/40 pointer-events-none" />
        <TvMinimalPlay className="w-5 h-5 text-red-500/40" />
      </div>
    );
  }

  return (
    <img 
      src={imgSrc} 
      alt="" 
      className="w-full h-full object-cover" 
      onError={handleError}
    />
  );
}

interface ShowcaseVideoCardProps {
  video: any;
  currentUser: any;
  allSharedVideos: any[];
  fetchCommunitySharingInfo: () => Promise<void>;
  onSearchProject?: (title: string, type?: string, source?: string, loader?: string, version?: string) => void;
  expandedVideo: string | null;
  setExpandedVideo: (id: string | null) => void;
  currentUserColor?: string | null;
}

export function ShowcaseVideoCard({
  video,
  currentUser,
  allSharedVideos,
  fetchCommunitySharingInfo,
  onSearchProject,
  expandedVideo,
  setExpandedVideo,
  currentUserColor
}: ShowcaseVideoCardProps) {
  const isSharedByMe = allSharedVideos.some(v => v.youtube_video_id === video.videoId && v.profile_id === currentUser?.id);
  const sharedOthers = allSharedVideos
    .filter(v => v.youtube_video_id === video.videoId && v.profile_id !== currentUser?.id)
    .map(v => ({ username: v.profiles?.username || "Usuario", color: v.profiles?.color, avatar_url: v.profiles?.avatar_url }));

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

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      window.dispatchEvent(new CustomEvent("fomo-show-status", {
        detail: { text: "Tenés que iniciar sesión en la pestaña Comunidad para compartir.", type: "error" }
      }));
      return;
    }
    const comment = prompt("¿Querés agregar un comentario opcional sobre este video?");
    if (comment === null) return; // cancelled
    const descText = comment.trim() || "Compartido desde Seguidos/Showcases";

    try {
      const { error } = await supabase
        .from("showcase_videos")
        .insert({
          profile_id: currentUser.id,
          youtube_video_id: video.videoId,
          title: video.title || "Mod Showcase",
          description: descText
        });
      if (error) {
        if (error.code === "23505") {
          window.dispatchEvent(new CustomEvent("fomo-show-status", {
            detail: { text: "Este video ya está compartido en la comunidad.", type: "info" }
          }));
          return;
        }
        throw error;
      }
      window.dispatchEvent(new CustomEvent("fomo-show-status", {
        detail: { text: "¡Video compartido con la comunidad!", type: "success" }
      }));
      fetchCommunitySharingInfo();
    } catch (err) {
      console.error(err);
      window.dispatchEvent(new CustomEvent("fomo-show-status", {
        detail: { text: "Error al compartir video.", type: "error" }
      }));
    }
  };

  return (
    <div className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer">
      <div 
        className="flex items-center gap-4"
        onClick={() => setExpandedVideo(expandedVideo === video.videoId ? null : video.videoId)}
      >
        <div className="w-20 h-14 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10 overflow-hidden">
          <ShowcaseVideoThumbnail video={video} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate">{video.title}</p>
          <p className="font-caption text-[10px]" style={{ color: COLORS.muted }}>
            {video.publishedAt ? `${formatYoutubeDate(video.publishedAt)} • ` : ""}{video.modSlugs.length} mods detectados
          </p>
          
          {sharedOthers.length > 0 && (
            <div className="flex items-center gap-1 mt-1 flex-wrap" onClick={e => e.stopPropagation()}>
              <span className="text-[8px] text-white/40">Compartido por:</span>
              {sharedOthers.map(o => (
                <button
                  key={o.username}
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent("fomo-community-apply-filter", {
                      detail: { username: o.username, type: 'videos' }
                    }));
                    window.dispatchEvent(new CustomEvent("fomo-switch-tab", {
                      detail: { tab: "community" }
                    }));
                  }}
                  className="flex items-center gap-1 px-1 py-0.5 rounded-md bg-white/5 border border-white/10 hover:border-primary/40 hover:bg-white/10 text-[8px] text-white transition-all cursor-pointer"
                  title={`Ver perfil de @${o.username}`}
                >
                  <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] text-background font-bold uppercase shrink-0 overflow-hidden" style={{ backgroundColor: o.color || 'var(--primary)' }}>
                    {o.avatar_url ? <img src={o.avatar_url} alt="" className="w-full h-full object-cover" /> : o.username.charAt(0)}
                  </div>
                  <span style={{ color: o.color || 'inherit' }}>@{o.username}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleShare}
            className="text-[10px] font-black px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
            style={isSharedByMe ? {
              backgroundColor: currentUserColor ? `${currentUserColor}22` : 'rgba(249, 115, 22, 0.2)',
              color: currentUserColor || '#f97316',
              border: `1px solid ${currentUserColor ? `${currentUserColor}44` : 'rgba(249, 115, 22, 0.3)'}`
            } : {
              backgroundColor: 'rgba(249, 115, 22, 0.1)',
              color: '#f97316',
              border: '1px solid rgba(249, 115, 22, 0.2)'
            }}
            title={isSharedByMe ? "Ya compartido por ti" : "Compartir video en la comunidad"}
          >
            {isSharedByMe ? "Compartido" : "Compartir"} <Globe className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              window.dispatchEvent(new CustomEvent("fomo-play-video", { detail: { videoId: video.videoId } }));
            }}
            className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 uppercase hover:bg-red-500/20 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
            title="Reproducir video en la app"
          >
            Reproducir <TvMinimalPlay className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    
      {/* Expandable Grid */}
      {expandedVideo === video.videoId && (
        <div className="mt-4 pt-4 border-t border-white/5 animate-fade-in" onClick={e => e.stopPropagation()}>
          {video.modSlugs.length > 0 ? (
            <>
              <h4 className="font-headline text-xs mb-2 flex items-center gap-2"><Puzzle className="w-3.5 h-3.5 text-primary" />Mods Detectados</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {video.modSlugs.map((slugStr: string, sIdx: number) => {
                  const parts = slugStr.split(":");
                  const source = parts[0];
                  const type = parts.length >= 3 ? parts[1] : "mod";
                  const slug = parts.length >= 3 ? parts[2] : parts[1];
                  const loader = parts.length >= 4 ? parts[3] : "";
                  const version = parts.length >= 5 ? parts[4] : "";
                  
                  const isCurse = source === "curseforge";
                  const displayName = slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
                  const typeLabel = typeLabels[type] || "Mod";
                  const extraInfo = [loader, version].filter(Boolean).join(" ");
                  const fullTypeLabel = extraInfo ? `${typeLabel} (${extraInfo})` : typeLabel;
                  
                  return (
                    <div 
                      key={`${slug}-${sIdx}`}
                      className="p-2 rounded-xl border transition-all cursor-pointer flex items-center gap-2 hover:shadow-lg hover:-translate-y-0.5"
                      style={{
                        background: "rgba(0, 0, 0, 0.6)",
                        borderColor: isCurse ? "rgba(248,113,113,0.3)" : "rgba(30,215,96,0.3)",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        const query = slug.replace(/-/g, " ");
                        const targetType = typeToProjectType[type] || "mod";
                        if (onSearchProject) onSearchProject(query, targetType, source, loader, version);
                      }}
                    >
                      <div 
                        className="w-5 h-5 rounded flex items-center justify-center text-[8px] font-black uppercase shrink-0" 
                        style={{ 
                          background: isCurse ? "rgba(248,113,113,0.2)" : "rgba(30,215,96,0.2)", 
                          color: isCurse ? "#f87171" : "#4ade80",
                          border: isCurse ? "1px solid rgba(248,113,113,0.4)" : "1px solid rgba(30,215,96,0.4)"
                        }}
                      >
                        {source.substring(0, 2)}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-bold truncate" style={{ color: isCurse ? "#fca5a5" : "#a7f3d0" }}>
                          {displayName}
                        </span>
                        <span className="text-[8px] font-medium opacity-60" style={{ color: isCurse ? "#fca5a5" : "#a7f3d0" }}>
                          {fullTypeLabel}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-[10px] font-mono text-center text-white/40">
              ℹ️ Este video no contiene mods de Minecraft detectados en su descripción. ¡Podés reproducirlo directamente haciendo click en <strong>Reproducir</strong>!
            </div>
          )}
        </div>
      )}
    </div>
  );
}
