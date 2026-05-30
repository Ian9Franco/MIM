"use client";

import React from "react";
import { TvMinimalPlay, Globe, Puzzle } from "lucide-react";
import { COLORS } from "@/theme/tokens";
import { supabase } from "@/lib/core/supabaseClient";

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
  isLatest?: boolean;
  theme?: string;
}

function ShowcaseVideoCardInner({
  video,
  currentUser,
  allSharedVideos,
  fetchCommunitySharingInfo,
  onSearchProject,
  expandedVideo,
  setExpandedVideo,
  currentUserColor,
  isLatest = false,
  theme = "official"
}: ShowcaseVideoCardProps) {
  const isModern = theme === "modern";
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
    // En Electron, prompt() está bloqueado. Usamos una descripción por defecto.
    const descText = "Compartido desde Seguidos/Showcases";

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

  const isExpanded = expandedVideo === video.videoId;

  return (
    <div 
      className={`group relative flex rounded-2xl overflow-hidden transition-all duration-500 border ${
        isModern ? "bg-white hover:bg-slate-50" : "bg-[#161616] hover:bg-[#1a1a1a]"
      } ${
        isExpanded ? "flex-col xl:flex-row col-span-1 sm:col-span-2 xl:col-span-3 shadow-2xl ring-1 ring-primary/30 scale-[1.01] z-10" : "flex-col"
      } ${
        isLatest && !isExpanded
          ? "border-primary/40 shadow-[0_0_20px_rgba(var(--primary-rgb),0.15)] hover:shadow-[0_8px_30px_rgba(var(--primary-rgb),0.3)] hover:-translate-y-1" 
          : !isExpanded 
            ? isModern 
              ? "border-slate-200 hover:border-slate-300 hover:shadow-lg hover:-translate-y-1"
              : "border-white/5 hover:border-white/20 hover:shadow-[0_8px_25px_rgba(0,0,0,0.5)] hover:-translate-y-1" 
            : "border-primary/40"
      } cursor-pointer`}
      onClick={() => setExpandedVideo(isExpanded ? null : video.videoId)}
    >
      <div className={`flex flex-col ${isExpanded ? 'w-full xl:w-[450px] shrink-0' : 'w-full'}`}>
        {/* Background Image / Thumbnail Area */}
        <div className={`relative w-full overflow-hidden bg-black/40 ${isLatest && !isExpanded ? "aspect-video" : "aspect-[16/9]"}`}>
          <div className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-110">
             <ShowcaseVideoThumbnail video={video} />
          </div>
          
          {/* Gradients for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#161616] via-[#161616]/60 to-transparent opacity-90 transition-opacity duration-300 group-hover:opacity-100" />
          
          {/* Play Icon overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
             <div className="w-12 h-12 rounded-full bg-primary/90 text-white flex items-center justify-center shadow-lg shadow-primary/30 transform scale-75 group-hover:scale-100 transition-transform duration-500 delay-75">
               <TvMinimalPlay className="w-6 h-6 ml-0.5" />
             </div>
          </div>

          {/* Tags overlay */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
            <span className="px-2 py-1 bg-black/60 backdrop-blur-md text-[10px] font-bold text-white/90 rounded-lg border border-white/10 flex items-center gap-1 shadow-lg">
              <Puzzle className="w-3 h-3 text-primary" />
              {video.modSlugs.length} Mods
            </span>
            {isLatest && (
              <span className="px-2 py-1 bg-primary/20 backdrop-blur-md text-[10px] font-black text-primary uppercase tracking-widest rounded-lg border border-primary/30 flex items-center gap-1 w-fit shadow-lg shadow-primary/10">
                Nuevo
              </span>
            )}
          </div>

          {/* Title Overlay */}
          <div className="absolute bottom-0 left-0 w-full p-4 z-10 flex flex-col justify-end translate-y-1 group-hover:translate-y-0 transition-transform duration-500">
             <h3 className="text-[15px] font-bold text-neutral-50 line-clamp-2 leading-tight drop-shadow-xl mb-1">
               {video.title}
             </h3>
             <p className="font-caption text-[11px] text-neutral-50/80 font-medium drop-shadow-md">
               {video.publishedAt ? formatYoutubeDate(video.publishedAt) : "Reciente"}
             </p>
          </div>
        </div>

        {/* Action Bar / Additional Info */}
        <div className="flex flex-col px-4 pb-4 pt-2">
          <div className="flex items-center gap-2 mt-1" onClick={e => e.stopPropagation()}>
             <button 
               onClick={handleShare}
               className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold transition-all active:scale-95"
               style={isSharedByMe ? {
                 backgroundColor: currentUserColor ? `${currentUserColor}22` : 'rgba(249, 115, 22, 0.2)',
                 color: currentUserColor || '#f97316',
                 border: `1px solid ${currentUserColor ? `${currentUserColor}44` : 'rgba(249, 115, 22, 0.3)'}`
               } : {
                 backgroundColor: isModern ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.05)',
                 color: isModern ? 'rgba(0, 0, 0, 0.65)' : 'rgba(255, 255, 255, 0.8)',
                 border: isModern ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.1)'
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
               className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-all active:scale-95"
             >
               Reproducir <TvMinimalPlay className="w-3.5 h-3.5" />
             </button>
          </div>

          {sharedOthers.length > 0 && (
            <div className="flex items-center gap-1 mt-3 flex-wrap" onClick={e => e.stopPropagation()}>
              <span className="text-[10px] text-white/40 font-medium">Por:</span>
              {sharedOthers.slice(0, 3).map((o, idx) => (
                <button
                  key={o.username + idx}
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent("fomo-community-apply-filter", {
                      detail: { username: o.username, type: 'videos' }
                    }));
                    window.dispatchEvent(new CustomEvent("fomo-switch-tab", {
                      detail: { tab: "community" }
                    }));
                  }}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-white/5 border border-white/10 hover:border-primary/40 hover:bg-white/10 text-[9px] font-bold text-white transition-all cursor-pointer"
                  title={`Ver perfil de @${o.username}`}
                >
                  <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] text-background font-black uppercase shrink-0 overflow-hidden" style={{ backgroundColor: o.color || 'var(--primary)' }}>
                    {o.avatar_url ? <img src={o.avatar_url} alt="" className="w-full h-full object-cover" /> : o.username.charAt(0)}
                  </div>
                  <span style={{ color: o.color || 'inherit' }}>@{o.username}</span>
                </button>
              ))}
              {sharedOthers.length > 3 && (
                <span className="text-[9px] text-white/30 ml-1">+{sharedOthers.length - 3} más</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Expandable Right Side for Mods List */}
      {isExpanded && (
        <div 
          className={`flex-1 p-6 border-t xl:border-t-0 xl:border-l animate-fade-in flex flex-col ${isModern ? "border-slate-200 bg-slate-50/50" : "border-white/5 bg-black/20"}`}
          onClick={e => e.stopPropagation()}
        >
          {video.modSlugs.length > 0 ? (
            <>
              <div className="mb-4">
                <h4 className={`font-headline text-sm flex items-center gap-2 ${isModern ? "text-slate-800" : "text-white/90"}`}>
                  <Puzzle className="w-4 h-4 text-primary" />
                  Mods Detectados ({video.modSlugs.length})
                </h4>
                <p className={`text-[11px] mt-1 ${isModern ? "text-slate-500" : "text-white/40"}`}>Hacé clic en cualquier mod para ver sus detalles o descargarlo.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 auto-rows-max overflow-y-auto pr-1" style={{ maxHeight: 'max(400px, 100%)' }}>
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
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 hover:shadow-lg hover:-translate-y-0.5 group/mod ${isModern ? "bg-white hover:bg-slate-50 shadow-sm" : "bg-[#161616] hover:bg-[#1e1e1e]"}`}
                      style={{
                        borderColor: isModern 
                          ? (isCurse ? "rgba(220,38,38,0.15)" : "rgba(5,150,105,0.15)") 
                          : (isCurse ? "rgba(248,113,113,0.15)" : "rgba(30,215,96,0.15)"),
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        window.dispatchEvent(new CustomEvent("fomo-open-project-details", { 
                          detail: { id: slug, platform: source } 
                        }));
                      }}
                    >
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black uppercase shrink-0 transition-colors" 
                        style={{ 
                          background: isModern 
                            ? (isCurse ? "rgba(220,38,38,0.08)" : "rgba(5,150,105,0.08)") 
                            : (isCurse ? "rgba(248,113,113,0.1)" : "rgba(30,215,96,0.1)"), 
                          color: isModern 
                            ? (isCurse ? "#dc2626" : "#059669") 
                            : (isCurse ? "#f87171" : "#4ade80"),
                        }}
                      >
                        {source.substring(0, 2)}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className={`text-xs font-bold truncate transition-colors ${isModern ? "text-slate-700 group-hover/mod:text-slate-900" : "text-white/90 group-hover/mod:text-white"}`}>
                          {displayName}
                        </span>
                        <span className="text-[10px] font-medium opacity-80 mt-0.5" style={{ 
                          color: isModern 
                            ? (isCurse ? "#b91c1c" : "#047857") 
                            : (isCurse ? "#fca5a5" : "#a7f3d0") 
                        }}>
                          {fullTypeLabel}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className={`flex-1 flex flex-col items-center justify-center p-6 text-center gap-3 ${isModern ? "text-slate-500" : "text-white/40"}`}>
              <TvMinimalPlay className="w-10 h-10 opacity-30" />
              <p className="text-xs max-w-xs leading-relaxed">
                Este video no contiene mods detectados en su descripción.<br/>
                ¡Podés reproducirlo directamente haciendo click en <strong className={isModern ? "text-slate-700" : "text-white"}>Reproducir</strong>!
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const ShowcaseVideoCard = React.memo(ShowcaseVideoCardInner);
