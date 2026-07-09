"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Film, ExternalLink, Loader2, X, Play, Eye, EyeOff, Puzzle } from "lucide-react";
import { FeedSkeleton } from "../FomoSkeletons";
import type { ModHit } from "../SpotlightMarquees";

function CollapsibleVideoDescription({ text }: { text: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLong = text.split("\n").length > 6 || text.length > 300;

  if (!isLong) {
    return (
      <div className="text-[10px] text-white/70 leading-relaxed font-mono whitespace-pre-wrap bg-black/25 border border-white/5 p-2 rounded-lg select-text">
        {text}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 w-full">
      <div 
        className={`text-[10px] text-white/70 leading-relaxed font-mono whitespace-pre-wrap bg-black/25 border border-white/5 p-2 rounded-lg select-text transition-all duration-300 relative ${
          isExpanded ? "max-h-80 overflow-y-auto scrollbar-none" : "max-h-24 overflow-hidden"
        }`}
      >
        {text}
        {!isExpanded && (
          <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
        )}
      </div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-[9px] font-bold text-orange-400 hover:text-orange-300 transition-colors self-start mt-0.5"
      >
        {isExpanded ? "Mostrar menos ▲" : "Mostrar descripción completa ▼"}
      </button>
    </div>
  );
}

interface FeedTabProps {
  followedChannels: { name: string; url: string; visible?: boolean }[];
  currentChannel: string;
  setCurrentChannel: (url: string) => void;
  showChannelManager: boolean;
  setShowChannelManager: (v: boolean) => void;
  newChannelInput: string;
  setNewChannelInput: (v: string) => void;
  youtubePosts: any[];
  loadingYoutube: boolean;
  handleAddChannel: () => void;
  handleRemoveChannel: (url: string) => void;
  youtubeFeedType: "posts" | "videos" | "shorts";
  setYoutubeFeedType: (type: "posts" | "videos" | "shorts") => void;
  handleToggleChannelVisibility: (url: string) => void;
  handleOpenModDetails?: (mod: ModHit) => void;
}

/**
 * FeedTab — feed de YouTube comunitario con administración de canales.
 */
export function FeedTab({
  followedChannels, currentChannel, setCurrentChannel,
  showChannelManager, setShowChannelManager,
  newChannelInput, setNewChannelInput,
  youtubePosts, loadingYoutube,
  handleAddChannel, handleRemoveChannel,
  youtubeFeedType, setYoutubeFeedType,
  handleToggleChannelVisibility,
  handleOpenModDetails,
}: FeedTabProps) {

  const [visibleCount, setVisibleCount] = useState(6);
  const [expandedPostMods, setExpandedPostMods] = useState<string | null>(null);

  const toggleExpandMods = (postId: string) => {
    setExpandedPostMods(prev => prev === postId ? null : postId);
  };

  // Reset pagination limit when channel or feed type changes
  useEffect(() => {
    setVisibleCount(6);
    setExpandedPostMods(null);
  }, [currentChannel, youtubeFeedType]);

  const handlePlayVideo = (videoId: string) => {
    window.dispatchEvent(new CustomEvent("fomo-play-video", { detail: { videoId } }));
  };

  const visibleChannels = followedChannels.filter(c => c.visible !== false);

  return (
    <motion.div
      key="feed"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="flex-1 flex flex-col min-h-0"
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-3 shrink-0">
        <span className="text-[10px] font-black uppercase tracking-wider text-white/30">Canales Seguidos</span>
        <button
          onClick={() => setShowChannelManager(!showChannelManager)}
          className="text-[10.5px] font-bold text-orange-500 hover:text-orange-400 flex items-center gap-1.5 transition-colors"
        >
          {showChannelManager ? "Ocultar Ajustes" : "Administrar Canales"}
        </button>
      </div>

      {/* Channel manager */}
      {showChannelManager && (
        <div className="bg-white/5 border border-white/[0.06] rounded-2xl p-3.5 mb-4 flex flex-col gap-3 shrink-0 animate-fadeIn">
          <div className="flex gap-2">
            <input
              type="text"
              value={newChannelInput}
              onChange={(e) => setNewChannelInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddChannel()}
              placeholder="User o URL (ej. @ElRichMC)"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/20 outline-none focus:border-orange-500/50"
            />
            <button
              onClick={handleAddChannel}
              className="px-3.5 py-2 rounded-xl bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/30 text-orange-400 text-xs font-bold transition-all"
            >
              Agregar
            </button>
          </div>
          
          <div className="max-h-36 overflow-y-auto space-y-1.5 scrollbar-none pr-1">
            <span className="text-[9px] font-bold text-white/30 block mb-1">Elegir hasta 3 visibles:</span>
            {followedChannels.map((chan) => (
              <div key={chan.url} className="flex items-center justify-between bg-white/[0.02] border border-white/[0.04] rounded-xl px-3 py-1.5">
                <span className="text-[11px] font-semibold text-white/70 truncate mr-2 flex-1">{chan.name}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleChannelVisibility(chan.url)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-all active:scale-95 text-[10px] font-bold ${
                      chan.visible
                        ? "bg-orange-500/10 border-orange-500/30 text-orange-400"
                        : "bg-white/5 border-white/10 text-white/30 hover:text-white/50"
                    }`}
                  >
                    {chan.visible ? (
                      <>
                        <Eye className="w-3 h-3" />
                        <span>Visible</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3 h-3" />
                        <span>Oculto</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleRemoveChannel(chan.url)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-all active:scale-95"
                    title="Eliminar"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Channel selector pills (Max 3 visible) */}
      <div className="flex gap-2 mb-3 shrink-0 overflow-x-auto pb-1 scrollbar-none">
        {visibleChannels.map(chan => (
          <button
            key={chan.url}
            onClick={() => setCurrentChannel(chan.url)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              currentChannel === chan.url
                ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                : "bg-white/5 text-white/50 border border-white/[0.05]"
            }`}
          >
            {chan.name}
          </button>
        ))}
      </div>

      {/* Feed type tab selector */}
      <div className="flex bg-white/5 border border-white/[0.06] rounded-xl p-1 gap-1 mb-4 shrink-0">
        {[
          { id: "posts", label: "Publicaciones" },
          { id: "videos", label: "Videos" },
          { id: "shorts", label: "Shorts" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setYoutubeFeedType(t.id as any)}
            className={`flex-1 py-1.5 rounded-lg text-center text-[10.5px] font-bold transition-all ${
              youtubeFeedType === t.id
                ? "bg-orange-600/20 text-orange-400 border border-orange-500/20 shadow-inner"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Posts list */}
      {loadingYoutube ? (
        <FeedSkeleton />
      ) : youtubePosts.length > 0 ? (
        <div className="flex-1 overflow-y-auto space-y-4 pb-28 pr-1 scrollbar-none">
          {youtubePosts.slice(0, visibleCount).map((post) => (
            <div key={post.postId} className="bg-surface/90 border border-border rounded-2xl p-4 flex flex-col gap-3 shadow-sm">
              {/* Bold Title for videos and shorts */}
              {(post.mode === "video" || post.mode === "short" || post.mode === "video-short") && post.title && (
                <h3 className="text-xs font-bold text-white/90 leading-snug">{post.title}</h3>
              )}
              
              {/* Description (only if it is a post OR if it's different from the title) */}
              {(post.mode === "post" || (post.description && post.description !== post.title)) && (
                <p className="text-xs text-white/70 leading-relaxed whitespace-pre-wrap">{post.description}</p>
              )}

              {/* Clickable Video Thumbnail Trigger */}
              {post.embeddedVideoId ? (
                <div
                  onClick={() => handlePlayVideo(post.embeddedVideoId)}
                  className="relative aspect-video w-full rounded-xl overflow-hidden bg-white/5 border border-white/[0.05] cursor-pointer group/thumb"
                >
                  {post.modSlugs && post.modSlugs.length > 0 && (
                    <div
                      className="absolute top-2 left-2 z-10 px-2 py-1 bg-black/75 backdrop-blur-md text-[9px] font-bold text-white/90 rounded-lg border border-white/10 flex items-center gap-1 shadow-lg hover:bg-orange-500/10 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpandMods(post.postId);
                      }}
                    >
                      <Puzzle className="w-3 h-3 text-orange-500" />
                      <span>{post.modSlugs.length} Mods</span>
                    </div>
                  )}
                  <img
                    src={post.thumbnail || `https://i.ytimg.com/vi/${post.embeddedVideoId}/mqdefault.jpg`}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="object-cover w-full h-full transition-transform duration-300 group-hover/thumb:scale-105"
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (!img.src.includes("mqdefault.jpg")) {
                        img.src = `https://i.ytimg.com/vi/${post.embeddedVideoId}/mqdefault.jpg`;
                      } else {
                        img.style.display = "none";
                      }
                    }}
                  />
                  <div className="absolute inset-0 bg-black/25 flex items-center justify-center transition-opacity hover:bg-black/35">
                    <div className="w-10 h-10 rounded-full bg-orange-600/90 flex items-center justify-center shadow-lg text-white border border-white/20 transition-transform active:scale-90">
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>
              ) : post.thumbnail ? (
                /* Non-video post image */
                <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-white/5 border border-white/[0.05]">
                  <img src={post.thumbnail} alt="" referrerPolicy="no-referrer" className="object-cover w-full h-full" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                </div>
              ) : null}

              {post.description && (
                <div className="mt-1 flex flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => toggleExpandMods(post.postId)}
                    className="flex items-center gap-1.5 text-[10px] font-bold text-orange-400 hover:text-orange-300 transition-colors self-start py-0.5"
                  >
                    <Puzzle className="w-3.5 h-3.5" />
                    <span>
                      {expandedPostMods === post.postId
                        ? "Ocultar descripción"
                        : post.modSlugs && post.modSlugs.length > 0
                          ? `${post.modSlugs.length} mods detectados (Tocar para ver)`
                          : "Ver descripción (Tocar para ver)"}
                    </span>
                  </button>

                  {expandedPostMods === post.postId && (
                    <div className="flex flex-col gap-2.5 bg-white/[0.02] border border-white/[0.04] p-3 rounded-xl animate-fadeIn">
                      <CollapsibleVideoDescription text={post.description} />

                      {post.modSlugs && post.modSlugs.length > 0 && (
                        <div className="flex flex-col gap-1.5 pt-1.5 border-t border-white/5">
                          <span className="text-[8px] font-bold text-white/40 uppercase tracking-wider mb-1">
                            Mods Detectados:
                          </span>
                          <div className="grid grid-cols-2 gap-2">
                            {post.modSlugs.map((slugStr: string, idx: number) => {
                              const parts = slugStr.split(":");
                              const source = parts[0];
                              const type = parts.length >= 3 ? parts[1] : "mod";
                              const slug = parts.length >= 3 ? parts[2] : parts[1];
                              
                              const isCurse = source === "curseforge";
                              const displayName = slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
                              
                              return (
                                <div
                                  key={slugStr + idx}
                                  onClick={() => {
                                    if (handleOpenModDetails) {
                                      handleOpenModDetails({
                                        projectId: slug,
                                        title: displayName,
                                        description: "",
                                        iconUrl: "",
                                        author: "",
                                        projectType: type,
                                        categories: [],
                                        url: source === "curseforge" 
                                          ? `https://www.curseforge.com/minecraft/mc-mods/${slug}` 
                                          : `https://modrinth.com/${type}/${slug}`,
                                        _source: source as "modrinth" | "curseforge"
                                      });
                                    }
                                  }}
                                  className="p-2 rounded-lg border border-white/5 bg-white/[0.01] hover:bg-white/5 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
                                  style={{
                                    borderColor: isCurse ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)",
                                  }}
                                >
                                  <div 
                                    className="w-5 h-5 rounded-md flex items-center justify-center text-[7.5px] font-black uppercase shrink-0"
                                    style={{
                                      background: isCurse ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)",
                                      color: isCurse ? "#f87171" : "#34d399",
                                    }}
                                  >
                                    {source.substring(0, 2)}
                                  </div>
                                  <span className="text-[10px] font-bold text-white/80 truncate flex-1">
                                    {displayName}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-between items-center pt-2 border-t border-white/[0.04] mt-1">
                <span className="text-[10px] text-white/40 font-mono">{post.publishedAt}</span>
                <a
                  href={post.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-bold text-orange-400 hover:underline flex items-center gap-1"
                >
                  Abrir YouTube <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}

          {/* Load More Button */}
          {visibleCount < youtubePosts.length && (
            <div className="flex justify-center pt-2 pb-8">
              <button
                onClick={() => setVisibleCount((prev) => prev + 6)}
                className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/[0.08] text-white/80 text-xs font-bold transition-all active:scale-95 cursor-pointer"
              >
                Cargar más
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-center items-center text-center p-6">
          <Film className="w-12 h-12 text-orange-500/50 mb-4" />
          <h2 className="text-sm font-semibold text-white">Sin contenido</h2>
          <p className="text-xs text-white/40 mt-1">No se encontraron elementos en esta sección.</p>
        </div>
      )}
    </motion.div>
  );
}
