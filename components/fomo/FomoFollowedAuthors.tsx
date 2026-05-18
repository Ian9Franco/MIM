/**
 * MIM — FOMO Followed Authors & Projects
 * Optimized for v5.9: Modularized into hooks and components.
 */

"use client";

import React from "react";
import { Heart, FolderHeart, Sparkles, Package, UserCheck, RefreshCw, Timeline, ChefHat, CookingPot, Award, Star, Puzzle } from "lucide-react";
import { COLORS } from "@/theme/tokens";
import { useFomoFollowedManager } from "@/hooks/useFomoFollowedManager";
import { FollowedProjectCard, FollowedAuthorCard } from "./FomoFollowedComponents";
import { FomoSkeleton } from "./FomoSkeleton";

interface FomoFollowedAuthorsProps {
  onSearchAuthor: (author: string) => void;
  onSearchProject?: (title: string, type?: string, source?: string, loader?: string, version?: string) => void;
  onOpenVersions?: (mod: any) => void;
  onDownloadMod?: (mod: any) => Promise<void>;
  downloading?: Record<string, boolean>;
}

export function FomoFollowedAuthors({ onSearchAuthor, onSearchProject, onOpenVersions, onDownloadMod, downloading = {} }: FomoFollowedAuthorsProps) {
  const { subTab, setSubTab, followedAuthors, followedMods, filteredMods, showOnlyWithUpdates, setShowOnlyWithUpdates, getModUpdateInfo, handleUnfollowAuthor, handleUnfollowMod, isRecent } = useFomoFollowedManager();
  const [history, setHistory] = React.useState<any[]>([]);
  const [rankings, setRankings] = React.useState<Record<string, any[]>>({});
  const [loadingHistory, setLoadingHistory] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(false);

  // Sistema de dirección para la animación
  const TABS = ["projects", "authors", "history", "showcases"];
  const [direction, setDirection] = React.useState("forward");
  const prevTabRef = React.useRef(subTab);

  React.useEffect(() => {
    if (subTab !== prevTabRef.current) {
      const idx = TABS.indexOf(subTab);
      const prevIdx = TABS.indexOf(prevTabRef.current);
      setDirection(idx >= prevIdx ? "forward" : "backward");
      prevTabRef.current = subTab;
    }
  }, [subTab]);

  const animationClass = direction === "forward" ? "animate-slide-in-right" : "animate-slide-in-left";

  React.useEffect(() => {
    if (subTab === "history") {
      setLoadingHistory(true);
      fetch(`/api/fomo/download-history?page=${page}&limit=20`)
        .then(res => res.json())
        .then(data => {
          if (page === 1) {
            setHistory(data.history || []);
            setRankings(data.rankings || {});
          } else {
            setHistory(prev => [...prev, ...(data.history || [])]);
          }
          setHasMore(data.hasMore);
          setLoadingHistory(false);
        })
        .catch(e => {
          console.error("Error loading history", e);
          setLoadingHistory(false);
        });
    }
  }, [subTab, page]);

  const [showcases, setShowcases] = React.useState<any[]>([]);
  const [loadingShowcases, setLoadingShowcases] = React.useState(false);
  const [expandedVideo, setExpandedVideo] = React.useState<string | null>(null);
  const [showcasePage, setShowcasePage] = React.useState(1);
  const [hasMoreShowcases, setHasMoreShowcases] = React.useState(true);

  const [channels, setChannels] = React.useState<string[]>([]);
  const [activeChannel, setActiveChannel] = React.useState("https://www.youtube.com/@EnderVerseMC");

  React.useEffect(() => {
    fetch(`/api/fomo/youtube-channels`)
      .then(res => res.json())
      .then(data => {
        const list = data.channels || [];
        setChannels(list);
        if (list.length > 0) {
          setActiveChannel(list[0]);
        }
      })
      .catch(e => console.error("Error loading channels", e));
  }, []);

  React.useEffect(() => {
    setShowcases([]);
    setShowcasePage(1);
    setHasMoreShowcases(true);
  }, [activeChannel]);

  React.useEffect(() => {
    const cached = localStorage.getItem(`fomo_showcases_${activeChannel}`);
    if (cached && showcases.length === 0) {
      setShowcases(JSON.parse(cached));
    }
  }, [activeChannel]);

  React.useEffect(() => {
    if (subTab === "showcases" && (showcases.length === 0 || showcasePage > 1)) {
      setLoadingShowcases(true);
      fetch(`/api/fomo/youtube-showcase?channel=${encodeURIComponent(activeChannel)}&limit=5&page=${showcasePage}`)
        .then(res => res.json())
        .then(data => {
          const newShowcases = data.showcases || [];
          if (showcasePage === 1) {
            setShowcases(newShowcases);
            localStorage.setItem(`fomo_showcases_${activeChannel}`, JSON.stringify(newShowcases));
          } else {
            setShowcases(prev => {
              const combined = [...prev, ...newShowcases];
              localStorage.setItem(`fomo_showcases_${activeChannel}`, JSON.stringify(combined));
              return combined;
            });
          }
          setHasMoreShowcases(newShowcases.length === 5);
          setLoadingShowcases(false);
        })
        .catch(e => {
          console.error("Error loading showcases", e);
          setLoadingShowcases(false);
        });
    }
  }, [subTab, showcasePage, activeChannel]);

  return (
    <div className="flex-1 overflow-hidden flex flex-col h-full animate-fade-in">
      {/* Estilos inyectados para las animaciones direccionales */}
      <style>{`
        @keyframes slideInFromRight {
          from { transform: translateX(30px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideInFromLeft {
          from { transform: translateX(-30px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in-right {
          opacity: 0;
          animation: slideInFromRight 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .animate-slide-in-left {
          opacity: 0;
          animation: slideInFromLeft 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
      `}</style>

      <div className="px-6 pt-5 pb-3 border-b flex items-center justify-between shrink-0" style={{ background: "var(--fomo-secondary-bg)", borderColor: "var(--fomo-border)" }}>
        <div className="flex p-1 rounded-2xl bg-black/20 gap-1 border border-white/5">
          <button onClick={() => setSubTab("projects")} className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${subTab === "projects" ? "bg-primary text-white" : "opacity-40 text-white"}`}><CookingPot className="w-4 h-4" />Proyectos ({followedMods.length})</button>
          <button onClick={() => setSubTab("authors")} className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${subTab === "authors" ? "bg-primary text-white" : "opacity-40 text-white"}`}><ChefHat className="w-4 h-4" />Autores ({followedAuthors.length})</button>
          <button onClick={() => { setSubTab("history"); setPage(1); }} className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${subTab === "history" ? "bg-primary text-white" : "opacity-40 text-white"}`}><Timeline className="w-4 h-4" />Rank/Historial</button>
          <button onClick={() => setSubTab("showcases")} className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${subTab === "showcases" ? "bg-primary text-white" : "opacity-40 text-white"}`}><Heart className="w-4 h-4" />Showcases</button>
        </div>
        {subTab === "projects" && followedMods.length > 0 && (
          <button onClick={() => setShowOnlyWithUpdates(!showOnlyWithUpdates)} className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border ${showOnlyWithUpdates ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" : "bg-white/5 border-white/10 text-white/60"}`}><RefreshCw className={`w-3.5 h-3.5 ${showOnlyWithUpdates ? "animate-spin-slow" : ""}`} /><span>Actualizaciones</span></button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {subTab === "projects" && (
          <div key="projects" className={animationClass}>
            {followedMods.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center opacity-40"><FolderHeart className="w-16 h-16 mb-4" /><h3 className="font-headline text-lg">No seguís ningún mod</h3><p className="text-xs max-w-sm">Seguí tus proyectos favoritos para verlos acá.</p></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredMods.map(mod => <FollowedProjectCard key={mod.projectId} mod={mod} updateInfo={getModUpdateInfo(mod.projectId)} isRecent={isRecent(mod)} isDownloading={!!downloading[`collection:${mod.projectId}`]} onOpenVersions={onOpenVersions} onDownloadMod={onDownloadMod} onSearchProject={onSearchProject} onUnfollow={handleUnfollowMod} />)}
              </div>
            )}
          </div>
        )}

        {subTab === "authors" && (
          <div key="authors" className={animationClass}>
            {followedAuthors.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center opacity-40"><Heart className="w-16 h-16 mb-4" /><h3 className="font-headline text-lg">Todavia no seguís a ningún autor</h3><p className="text-xs max-w-sm">Segui a creadores para ver sus novedades.</p></div>
            ) : (() => {
              const getAuthorIcons = (author: any) => {
                const icons = new Set<string>();
                const name = typeof author === "string" ? author : author?.name;
                if (typeof author !== "string" && author?.iconUrl) icons.add(author.iconUrl);
                
                followedMods.forEach(m => {
                  if (m.author === name && m.iconUrl) icons.add(m.iconUrl);
                });
                
                history.forEach(item => {
                  if (item.author === name && item.iconUrl) icons.add(item.iconUrl);
                });
                
                return Array.from(icons);
              };

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {followedAuthors.map((author, idx) => {
                    const icons = getAuthorIcons(author);
                    const authorName = typeof author === "string" ? author : author?.name;
                    return <FollowedAuthorCard key={authorName || `unknown-${idx}`} author={author} icons={icons} onSearch={onSearchAuthor} onUnfollow={handleUnfollowAuthor} />;
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {subTab === "history" && (
          <div key="history" className={animationClass}>
            {loadingHistory && page === 1 ? (
              <FomoSkeleton variant="list" message="Cargando historial..." count={5} />
            ) : history.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center opacity-40"><Puzzle className="w-16 h-16 mb-4" /><h3 className="font-headline text-lg">Sin historial de descargas</h3><p className="text-xs max-w-sm">Los mods que descargues aparecerán acá.</p></div>
            ) : (
              <div className="space-y-6">
                {/* Ranking Sections */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {Object.entries(rankings).map(([type, typeRanking]) => {
                    const labels: Record<string, string> = {
                      mod: "Mods",
                      resourcepack: "Texturas",
                      shader: "Shaders",
                      datapack: "Datapacks"
                    };
                    return (
                      <div key={type} className="space-y-2">
                        <h4 className="font-headline text-xs flex items-center gap-2"><Award className="w-3.5 h-3.5 text-primary" />Top {labels[type] || type}</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {typeRanking.map((item, idx) => (
                            <div 
                              key={item.mod.projectId} 
                              onClick={() => onOpenVersions && onOpenVersions(item.mod)}
                              className={`p-2 rounded-xl bg-white/5 border border-white/10 flex relative hover:bg-white/10 transition-all cursor-pointer ${idx === 0 ? "col-span-2 flex-row items-center gap-3" : "col-span-1 flex-col items-center text-center"}`}
                            >
                              <div className={`absolute top-1 left-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white z-10 ${idx === 0 ? "bg-amber-500" : "bg-primary"}`}>
                                {idx + 1}
                              </div>
                              <div className={`${idx === 0 ? "w-10 h-10" : "w-8 h-8 mb-1"} rounded-lg bg-white/5 flex items-center justify-center overflow-hidden border border-white/10 shrink-0`}>
                                {item.mod.iconUrl ? <img src={item.mod.iconUrl} alt="" className="w-full h-full object-cover" /> : <Puzzle className="w-4 h-4 opacity-40" />}
                              </div>
                              <div className={idx === 0 ? "flex-1 min-w-0" : "w-full"}>
                                <p className={`font-bold text-[10px] truncate w-full ${idx === 0 ? "text-sm" : ""}`}>{item.mod.title}</p>
                                <p className="font-caption text-[8px] mt-0.5" style={{ color: COLORS.muted }}>{item.count} dls</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Full History Section */}
                <div className="space-y-3">
                  <h4 className="font-headline text-sm flex items-center gap-2"><Star className="w-4 h-4 text-primary" />Historial Completo</h4>
                  <div className="space-y-2">
                    {history.map((item, idx) => (
                      <div 
                        key={`${item.projectId}-${idx}`} 
                        onClick={() => onOpenVersions && onOpenVersions({ projectId: item.projectId, title: item.title, iconUrl: item.iconUrl })}
                        className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer"
                      >
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10 overflow-hidden">
                          {item.iconUrl ? <img src={item.iconUrl} alt="" className="w-full h-full object-cover" /> : <Puzzle className="w-4 h-4 opacity-40" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm truncate">{item.title}</p>
                          <p className="font-caption text-[10px]" style={{ color: COLORS.muted }}>{item.loader} • {item.gameVersion} • {new Date(item.downloadedAt).toLocaleDateString()}</p>
                        </div>
                        <div className="text-[10px] font-bold px-2 py-1 rounded-lg bg-white/5 border border-white/10 uppercase">
                          {item._source}
                        </div>
                      </div>
                    ))}
                    
                    {hasMore && (
                      <button
                        onClick={() => setPage(prev => prev + 1)}
                        disabled={loadingHistory}
                        className="w-full p-3 rounded-2xl border border-dashed border-white/10 hover:border-primary/30 hover:bg-primary/5 transition-all flex items-center justify-center gap-2 text-sm font-bold mt-2"
                      >
                        {loadingHistory ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Cargar más"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {subTab === "showcases" && (
          <div key="showcases" className={animationClass}>
            {/* Gestor de Canales */}
            <div className="flex flex-col sm:flex-row items-center gap-3 mb-6 bg-white/5 p-3 rounded-2xl border border-white/10">
              <div className="w-full sm:w-1/2 min-w-0">
                <p className="font-headline text-xs mb-1.5 flex items-center gap-2"><Heart className="w-3.5 h-3.5 text-primary" />Canal Activo</p>
                <select 
                  value={activeChannel}
                  onChange={(e) => setActiveChannel(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-primary/50 outline-none transition-all"
                >
                  {channels.map(c => (
                    <option key={c} value={c}>{c.split("@")[1] || c}</option>
                  ))}
                </select>
              </div>
              
              <div className="w-full sm:w-1/2 min-w-0">
                <p className="font-headline text-xs mb-1.5 flex items-center gap-2"><Puzzle className="w-3.5 h-3.5 text-primary" />Añadir Canal</p>
                <input 
                  type="text" 
                  placeholder="@usuario o URL + Enter"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-primary/50 outline-none transition-all"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const value = e.currentTarget.value.trim();
                      if (value) {
                        let url = value;
                        if (!url.startsWith("http")) {
                          url = `https://www.youtube.com/${url.startsWith("@") ? "" : "@"}${url}`;
                        }
                        if (!channels.includes(url)) {
                          const next = [...channels, url];
                          setChannels(next);
                          setActiveChannel(url); // Cambiar al nuevo canal
                          fetch(`/api/fomo/youtube-channels`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ channels: next })
                          });
                        }
                        e.currentTarget.value = "";
                      }
                    }
                  }}
                />
              </div>
            </div>

            {loadingShowcases && showcasePage === 1 ? (
              <FomoSkeleton variant="list" message="Cargando showcases..." count={5} />
            ) : showcases.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center opacity-40"><Heart className="w-16 h-16 mb-4" /><h3 className="font-headline text-lg">No hay showcases</h3><p className="text-xs max-w-sm">Los videos del canal aparecerán acá.</p></div>
            ) : (
              <div className="space-y-4">
                {showcases.map((video, idx) => (
                  <div key={`${video.videoId}-${idx}`} className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer">
                    <div 
                      className="flex items-center gap-4"
                      onClick={() => setExpandedVideo(expandedVideo === video.videoId ? null : video.videoId)}
                    >
                      <div className="w-20 h-14 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10 overflow-hidden">
                        {video.thumbnail ? <img src={video.thumbnail} alt="" className="w-full h-full object-cover" /> : <Heart className="w-4 h-4 opacity-40" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{video.title}</p>
                        <p className="font-caption text-[10px]" style={{ color: COLORS.muted }}>{video.modSlugs.length} mods detectados</p>
                      </div>
                      <div className="text-[10px] font-black px-2 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 uppercase">
                        YouTube
                      </div>
                    </div>
                    
                    {/* Expandable Grid */}
                    {expandedVideo === video.videoId && (
                      <div className="mt-4 pt-4 border-t border-white/5 animate-fade-in">
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
                                  e.stopPropagation(); // Evitar colapsar el video
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
                      </div>
                    )}
                  </div>
                ))}
                
                {hasMoreShowcases && (
                  <button
                    onClick={() => setShowcasePage(prev => prev + 1)}
                    disabled={loadingShowcases}
                    className="w-full p-3 rounded-2xl border border-dashed border-white/10 hover:border-primary/30 hover:bg-primary/5 transition-all flex items-center justify-center gap-2 text-sm font-bold mt-4"
                  >
                    {loadingShowcases ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Cargar más"}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
