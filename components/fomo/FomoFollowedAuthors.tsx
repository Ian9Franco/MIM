/**
 * MIM — FOMO Followed Authors & Projects
 * Optimized for v5.9: Modularized into hooks and components.
 */

"use client";

import React from "react";
import { Heart, FolderHeart, Sparkles, Package, UserCheck, RefreshCw, Timeline, ChefHat, CookingPot, Award, Star, Puzzle, TvMinimalPlay, MonitorCheck, MonitorUp, ChevronDown, Trash2, ExternalLink } from "lucide-react";
import { COLORS } from "@/theme/tokens";
import { useFomoFollowedManager } from "@/hooks/useFomoFollowedManager";
import { FollowedProjectCard, FollowedAuthorCard } from "./FomoFollowedComponents";
import { FomoSkeleton } from "./FomoSkeleton";
import { PillToggleGroup } from "../ui/primitives";

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

  const [currentTheme, setCurrentTheme] = React.useState("official");
  React.useEffect(() => {
    const update = () => setCurrentTheme(document.documentElement.getAttribute("data-theme") || "official");
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  const isModern = currentTheme === "modern";

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

  const [showcaseType, setShowcaseType] = React.useState<"videos" | "shorts">("videos");
  const [loadingShowcases, setLoadingShowcases] = React.useState(false);
  const [expandedVideo, setExpandedVideo] = React.useState<string | null>(null);
  const [videos, setVideos] = React.useState<any[]>([]);
  const [shorts, setShorts] = React.useState<any[]>([]);
  const [videoPage, setVideoPage] = React.useState(1);
  const [shortsPage, setShortsPage] = React.useState(1);
  const [hasMoreVideos, setHasMoreVideos] = React.useState(true);
  const [hasMoreShorts, setHasMoreShorts] = React.useState(true);

  const [channels, setChannels] = React.useState<string[]>([]);
  const [activeChannel, setActiveChannel] = React.useState("https://www.youtube.com/@EnderVerseMC");
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const [channelUsage, setChannelUsage] = React.useState<Record<string, number>>({});

  React.useEffect(() => {
    fetch(`/api/fomo/youtube-usage`)
      .then(res => res.json())
      .then(data => {
        setChannelUsage(data.usage || {});
      })
      .catch(e => console.error("Error loading usage", e));
  }, []);

  const trackChannelUsage = (url: string) => {
    setChannelUsage(prev => {
      const next = { ...prev, [url]: (prev[url] || 0) + 1 };
      fetch(`/api/fomo/youtube-usage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usage: next })
      });
      return next;
    });
  };

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

  const prevChannelRef = React.useRef(activeChannel);

  React.useEffect(() => {
    let ignore = false;
    
    // Si cambió el canal, reseteamos todo y salimos para que el próximo render use las listas vacías
    if (prevChannelRef.current !== activeChannel) {
      setVideos([]);
      setShorts([]);
      setVideoPage(1);
      setShortsPage(1);
      setHasMoreVideos(true);
      setHasMoreShorts(true);
      prevChannelRef.current = activeChannel;
      return;
    }

    const isVideos = showcaseType === "videos";
    const currentList = isVideos ? videos : shorts;
    const currentPage = isVideos ? videoPage : shortsPage;
    const hasMore = isVideos ? hasMoreVideos : hasMoreShorts;

    if (subTab === "showcases" && (currentList.length === 0 || currentPage > 1) && hasMore) {
      setLoadingShowcases(true);
      fetch(`/api/fomo/youtube-showcase?channel=${encodeURIComponent(activeChannel)}&limit=5&page=${currentPage}&type=${showcaseType}`)
        .then(res => res.json())
        .then(data => {
          if (ignore) return;
          
          const newItems = data.showcases || [];
          if (isVideos) {
            setVideos(prev => {
              const next = currentPage === 1 ? newItems : [...prev, ...newItems];
              localStorage.setItem(`fomo_videos_${activeChannel}`, JSON.stringify(next));
              return next;
            });
            setHasMoreVideos(newItems.length === 5);
          } else {
            setShorts(prev => {
              const next = currentPage === 1 ? newItems : [...prev, ...newItems];
              localStorage.setItem(`fomo_shorts_${activeChannel}`, JSON.stringify(next));
              return next;
            });
            setHasMoreShorts(newItems.length === 5);
          }
          setLoadingShowcases(false);
        })
        .catch(e => {
          if (ignore) return;
          console.error(`Error loading ${showcaseType}`, e);
          setLoadingShowcases(false);
        });
    }
    
    return () => {
      ignore = true;
    };
  }, [subTab, videoPage, shortsPage, activeChannel, showcaseType, videos, shorts, hasMoreVideos, hasMoreShorts]);

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
        <PillToggleGroup 
          options={[
            { value: "projects", label: `Proyectos (${followedMods.length})`, icon: <CookingPot className="w-4 h-4" /> },
            { value: "authors", label: `Autores (${followedAuthors.length})`, icon: <ChefHat className="w-4 h-4" /> },
            { value: "history", label: "Rank/Historial", icon: <Timeline className="w-4 h-4" /> },
            { value: "showcases", label: "Showcases", icon: <TvMinimalPlay className="w-4 h-4" /> },
          ]} 
          value={subTab} 
          onChange={(v: any) => {
            setSubTab(v);
            if (v === "history") setPage(1);
          }} 
          ariaLabel="Seleccionar sub-pestaña"
          className="p-1"
        />
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
            <div className="mb-6 bg-white/5 p-4 rounded-2xl border border-white/10 space-y-4">
              {/* Accesos Rápidos */}
              {(() => {
                const quickAccess = Object.entries(channelUsage)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 4)
                  .map(([url]) => url)
                  .filter(url => channels.includes(url));

                if (quickAccess.length === 0) return null;

                return (
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-[10px] font-black uppercase tracking-wider opacity-40">Accesos Rápidos:</span>
                    {quickAccess.map(url => (
                      <button
                        key={url}
                        onClick={() => {
                          setActiveChannel(url);
                          trackChannelUsage(url);
                        }}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all ${url === activeChannel ? "bg-primary border-primary text-white" : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"}`}
                      >
                        @{((url.split("@")[1] || url).split("/")[0])}
                      </button>
                    ))}
                  </div>
                );
              })()}

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-full sm:w-1/2 min-w-0">
                  <p className="font-headline text-xs mb-1.5 flex items-center gap-2"><MonitorCheck className="w-3.5 h-3.5 text-primary" />Canal Activo</p>
                  
                  {/* Custom Dropdown */}
                  <div className="relative">
                    <button 
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      className={`w-full border rounded-xl px-3 py-2 text-xs flex items-center justify-between focus:border-primary/50 outline-none transition-all ${isModern ? "bg-white text-slate-700 border-slate-200" : "bg-black/40 text-white border-white/10"}`}
                    >
                      <span className="truncate">{(activeChannel.split("@")[1] || activeChannel).split("/")[0]}</span>
                      <ChevronDown className={`w-3.5 h-3.5 opacity-60 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
                    </button>
                    
                    {dropdownOpen && (
                      <div className={`absolute z-50 w-full mt-1 border rounded-xl shadow-xl max-h-60 overflow-y-auto ${isModern ? "bg-white border-slate-200" : "bg-neutral-900/95 border-white/10"}`} style={{ background: isModern ? "white" : "hsl(220 14% 9%)" }}>
                        {channels.map(c => (
                          <div 
                            key={c} 
                            className={`flex items-center justify-between px-3 py-2 text-xs hover:bg-primary/10 cursor-pointer ${isModern ? "text-slate-700" : "text-white"}`}
                            onClick={() => {
                              setActiveChannel(c);
                              trackChannelUsage(c);
                              setDropdownOpen(false);
                            }}
                          >
                            <span className={`truncate ${c === activeChannel ? "text-primary font-bold" : "opacity-80"}`}>{(c.split("@")[1] || c).split("/")[0]}</span>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                const next = channels.filter(chan => chan !== c);
                                setChannels(next);
                                if (activeChannel === c) {
                                  setActiveChannel(next[0] || "");
                                }
                                fetch(`/api/fomo/youtube-channels`, {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ channels: next })
                                });
                              }}
                              className="opacity-40 hover:opacity-100 hover:text-red-500 transition-all ml-2"
                              title="Eliminar canal"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="w-full sm:w-1/2 min-w-0">
                  <p className="font-headline text-xs mb-1.5 flex items-center gap-2"><MonitorUp className="w-3.5 h-3.5 text-primary" />Añadir Canal</p>
                  <input 
                    type="text" 
                    placeholder="@usuario o URL + Enter"
                    className={`w-full border rounded-xl px-3 py-2 text-xs focus:border-primary/50 outline-none transition-all ${isModern ? "bg-white text-slate-700 border-slate-200" : "bg-black/40 text-white border-white/10"}`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const value = e.currentTarget.value.trim();
                        if (value) {
                          let url = value;
                          if (!url.startsWith("http")) {
                            url = `https://www.youtube.com/${url.startsWith("@") ? "" : "@"}${url}`;
                          }
                          // Normalizar para remover /featured, /videos, /shorts etc.
                          const handleMatch = url.match(/(https?:\/\/www\.youtube\.com\/@[^\/]+)/);
                          if (handleMatch) {
                            url = handleMatch[1];
                          }
                          if (!channels.includes(url)) {
                            const next = [...channels, url];
                            setChannels(next);
                            setActiveChannel(url); // Cambiar al nuevo canal
                            trackChannelUsage(url); // Contar como uso
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
            </div>

            {/* Toggle Videos/Shorts */}
            <div className="flex gap-2 mb-4 bg-white/5 p-1 rounded-xl w-fit border border-white/5">
              <button 
                onClick={() => setShowcaseType("videos")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${showcaseType === "videos" ? "bg-primary text-white" : "opacity-40 text-white hover:opacity-100"}`}
              >
                Videos
              </button>
              <button 
                onClick={() => setShowcaseType("shorts")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${showcaseType === "shorts" ? "bg-primary text-white" : "opacity-40 text-white hover:opacity-100"}`}
              >
                Shorts
              </button>
            </div>

            {(() => {
              const showcasesList = showcaseType === "videos" ? videos : shorts;
              const hasMore = showcaseType === "videos" ? hasMoreVideos : hasMoreShorts;
              const page = showcaseType === "videos" ? videoPage : shortsPage;
              const setPage = showcaseType === "videos" ? setVideoPage : setShortsPage;
              const loading = loadingShowcases && page === 1;

              if (loading) {
                return <FomoSkeleton variant="list" message={`Cargando ${showcaseType}...`} count={5} />;
              }

              if (showcasesList.length === 0) {
                return (
                  <div className="py-20 text-center flex flex-col items-center opacity-40">
                    <TvMinimalPlay className="w-16 h-16 mb-4" />
                    <h3 className="font-headline text-lg">No hay {showcaseType === "videos" ? "videos" : "shorts"}</h3>
                    <p className="text-xs max-w-sm">Los {showcaseType === "videos" ? "videos" : "shorts"} del canal aparecerán acá.</p>
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  {showcasesList.map((video, idx) => (
                    <div key={`${video.videoId}-${idx}`} className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer">
                      <div 
                        className="flex items-center gap-4"
                        onClick={() => setExpandedVideo(expandedVideo === video.videoId ? null : video.videoId)}
                      >
                        <div className="w-20 h-14 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10 overflow-hidden">
                          {video.thumbnail ? <img src={video.thumbnail} alt="" className="w-full h-full object-cover" /> : <TvMinimalPlay className="w-4 h-4 opacity-40" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm truncate">{video.title}</p>
                          <p className="font-caption text-[10px]" style={{ color: COLORS.muted }}>{video.modSlugs.length} mods detectados</p>
                        </div>
                        <a 
                          href={`https://www.youtube.com/watch?v=${video.videoId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[10px] font-black px-2 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 uppercase hover:bg-red-500/20 transition-all flex items-center gap-1"
                          title="Ver video en YouTube"
                        >
                          YouTube <ExternalLink className="w-3 h-3" />
                        </a>
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
                  
                  {hasMore && (
                    <button
                      onClick={() => setPage(prev => prev + 1)}
                      disabled={loadingShowcases}
                      className="w-full p-3 rounded-2xl border border-dashed border-white/10 hover:border-primary/30 hover:bg-primary/5 transition-all flex items-center justify-center gap-2 text-sm font-bold mt-4"
                    >
                      {loadingShowcases ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Cargar más"}
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
