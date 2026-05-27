"use client";

import React from "react";
import { 
  TvMinimalPlay, RefreshCw, Trash2, ChevronDown, 
  MonitorCheck, MonitorUp, Sparkles, Pin
} from "lucide-react";
import { mimDB } from "@/lib/storage/indexeddb";
import { FomoSkeleton } from "@/components/fomo/core/FomoSkeleton";
import { ShowcaseVideoCard } from "@/components/fomo/showcase/ShowcaseVideoCard";

const SPOTLIGHT_CHANNEL_KEY = "mim_spotlight_channel";
const ENDERVERSE_DEFAULT = "https://www.youtube.com/@EnderVerseMC";

interface FomoFollowedShowcasesProps {
  currentUser: any;
  allSharedVideos: any[];
  fetchCommunitySharingInfo: () => Promise<void>;
  onSearchProject?: (title: string, type?: string, source?: string, loader?: string, version?: string) => void;
  animationClass: string;
  currentUserColor?: string | null;
}

export function FomoFollowedShowcases({ 
  currentUser, 
  allSharedVideos, 
  fetchCommunitySharingInfo, 
  onSearchProject,
  animationClass,
  currentUserColor
}: FomoFollowedShowcasesProps) {
  const [currentTheme, setCurrentTheme] = React.useState("official");
  React.useEffect(() => {
    const update = () => setCurrentTheme(document.documentElement.getAttribute("data-theme") || "official");
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  const isModern = currentTheme === "modern";

  const [showcaseType, setShowcaseType] = React.useState<"videos" | "shorts">("videos");
  const [loadingShowcases, setLoadingShowcases] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const progressIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    if (loadingShowcases) {
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
  }, [loadingShowcases]);

  const [expandedVideo, setExpandedVideo] = React.useState<string | null>(null);
  const [videos, setVideos] = React.useState<any[]>([]);
  const [shorts, setShorts] = React.useState<any[]>([]);
  const [videoCursor, setVideoCursor] = React.useState(1);
  const [shortsCursor, setShortsCursor] = React.useState(1);
  const [nextVideoCursor, setNextVideoCursor] = React.useState(1);
  const [nextShortsCursor, setNextShortsCursor] = React.useState(1);
  const [hasMoreVideos, setHasMoreVideos] = React.useState(true);
  const [hasMoreShorts, setHasMoreShorts] = React.useState(true);

  const [channels, setChannels] = React.useState<string[]>([]);
  const [activeChannel, setActiveChannel] = React.useState("https://www.youtube.com/@EnderVerseMC");
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const [channelUsage, setChannelUsage] = React.useState<Record<string, number>>({});
  // Canal que actualmente está anclado al Spotlight
  const [spotlightChannel, setSpotlightChannel] = React.useState<string>(ENDERVERSE_DEFAULT);

  React.useEffect(() => {
    const saved = localStorage.getItem(SPOTLIGHT_CHANNEL_KEY);
    if (saved) {
      setSpotlightChannel(saved);
    }
  }, []);

  const handleSetSpotlightChannel = React.useCallback((url: string) => {
    localStorage.setItem(SPOTLIGHT_CHANNEL_KEY, url);
    setSpotlightChannel(url);
    window.dispatchEvent(new CustomEvent("fomo-spotlight-channel-changed", { detail: { channelUrl: url } }));
  }, []);

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

  const lastFetchRef = React.useRef("");

  React.useEffect(() => {
    const loadCache = async () => {
      try {
        await mimDB.init();
        const cacheVKey = `fomo_videos_${activeChannel}`;
        const cacheSKey = `fomo_shorts_${activeChannel}`;
        
        let cachedV = null;
        let cachedS = null;
        
        const cacheVEntry = await mimDB.getCache(cacheVKey);
        const cacheSEntry = await mimDB.getCache(cacheSKey);
        
        if (cacheVEntry?.data) cachedV = cacheVEntry.data;
        if (cacheSEntry?.data) cachedS = cacheSEntry.data;
        
        const lsV = localStorage.getItem(cacheVKey);
        const lsS = localStorage.getItem(cacheSKey);
        
        if (!cachedV && lsV) {
          try {
            cachedV = JSON.parse(lsV);
            await mimDB.setCache(cacheVKey, cachedV, 12 * 60 * 60 * 1000);
            localStorage.removeItem(cacheVKey);
          } catch (e) {}
        }
        if (!cachedS && lsS) {
          try {
            cachedS = JSON.parse(lsS);
            await mimDB.setCache(cacheSKey, cachedS, 12 * 60 * 60 * 1000);
            localStorage.removeItem(cacheSKey);
          } catch (e) {}
        }
        
        setVideos(cachedV || []);
        setShorts(cachedS || []);
      } catch (err) {
        console.error("Error loading followed authors cache from IndexedDB", err);
        setVideos([]);
        setShorts([]);
      }
    };
    
    loadCache();
    
    setVideoCursor(1);
    setShortsCursor(1);
    setNextVideoCursor(1);
    setNextShortsCursor(1);
    setHasMoreVideos(true);
    setHasMoreShorts(true);
    lastFetchRef.current = "";
  }, [activeChannel]);

  React.useEffect(() => {
    let ignore = false;

    const isVideos = showcaseType === "videos";
    const currentCursor = isVideos ? videoCursor : shortsCursor;
    const hasMore = isVideos ? hasMoreVideos : hasMoreShorts;
    const fetchKey = `${activeChannel}_${showcaseType}_${currentCursor}`;

    if (hasMore && lastFetchRef.current !== fetchKey) {
      lastFetchRef.current = fetchKey;
      setLoadingShowcases(true);
      fetch(`/api/fomo/youtube-showcase?channel=${encodeURIComponent(activeChannel)}&limit=5&cursor=${currentCursor}&type=${showcaseType}`)
        .then(res => res.json())
        .then(data => {
          if (ignore) return;
          
          const newItems = data.showcases || [];
          const nextCursor = data.nextCursor || currentCursor + 5;
          const actualHasMore = data.hasMore !== undefined ? data.hasMore : newItems.length === 5;
          
          if (isVideos) {
            setVideos(prev => {
              const next = currentCursor === 1 ? newItems : [...prev, ...newItems];
              mimDB.setCache(`fomo_videos_${activeChannel}`, next, 12 * 60 * 60 * 1000).catch(console.error);
              return next;
            });
            setNextVideoCursor(nextCursor);
            setHasMoreVideos(actualHasMore);
          } else {
            setShorts(prev => {
              const next = currentCursor === 1 ? newItems : [...prev, ...newItems];
              mimDB.setCache(`fomo_shorts_${activeChannel}`, next, 12 * 60 * 60 * 1000).catch(console.error);
              return next;
            });
            setNextShortsCursor(nextCursor);
            setHasMoreShorts(actualHasMore);
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
  }, [videoCursor, shortsCursor, activeChannel, showcaseType, hasMoreVideos, hasMoreShorts]);

  const showcasesList = showcaseType === "videos" ? videos : shorts;
  const hasMore = showcaseType === "videos" ? hasMoreVideos : hasMoreShorts;
  const cursor = showcaseType === "videos" ? videoCursor : shortsCursor;
  const loading = loadingShowcases && cursor === 1 && showcasesList.length === 0;

  return (
    <div key="showcases" className={animationClass}>
      {/* Gestor de Canales */}
      <div className="mb-6 bg-white/5 p-4 rounded-2xl border border-white/10 space-y-4">
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
                  type="button"
                  onClick={() => {
                    setActiveChannel(url);
                    trackChannelUsage(url);
                  }}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all cursor-pointer ${url === activeChannel ? "bg-primary border-primary text-white" : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"}`}
                >
                  @{url.includes("@") ? url.split("@")[1].split("/")[0] : url.split("/").pop()}
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
                className={`w-full border rounded-xl px-3 py-2 text-xs flex items-center justify-between focus:border-primary/50 outline-none transition-all cursor-pointer ${isModern ? "bg-white text-slate-700 border-slate-200" : "bg-black/40 text-white border-white/10"}`}
              >
                <span className="truncate">
                  {activeChannel.includes("@") ? activeChannel.split("@")[1].split("/")[0] : activeChannel.split("/").pop()}
                </span>
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
                      <span className={`truncate ${c === activeChannel ? "text-primary font-bold" : "opacity-80"}`}>
                        {c.includes("@") ? c.split("@")[1].split("/")[0] : c.split("/").pop()}
                        {c === spotlightChannel && (
                          <span className="ml-1.5 text-[8px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 font-black uppercase tracking-wider align-middle">Spotlight</span>
                        )}
                      </span>
                      <div className="flex items-center gap-1 ml-2 shrink-0">
                        {/* Botón Spotlight */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetSpotlightChannel(c);
                            setDropdownOpen(false);
                          }}
                          title={c === spotlightChannel ? "Ya es el canal del Spotlight" : "Usar como Spotlight"}
                          className={`transition-all cursor-pointer bg-transparent border-none p-0.5 rounded ${
                            c === spotlightChannel
                              ? "text-amber-400 opacity-100"
                              : "opacity-30 hover:opacity-100 hover:text-amber-400"
                          }`}
                        >
                          <Pin className="w-3 h-3" />
                        </button>
                        {/* Botón Eliminar */}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            const next = channels.filter(chan => chan !== c);
                            setChannels(next);
                            if (activeChannel === c) {
                              setActiveChannel(next[0] || "");
                            }
                            // Si era el canal del Spotlight, volver al default
                            if (spotlightChannel === c) {
                              handleSetSpotlightChannel(next[0] || ENDERVERSE_DEFAULT);
                            }
                            fetch(`/api/fomo/youtube-channels`, {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ channels: next }),
                            }).then(() => {
                              window.dispatchEvent(new CustomEvent("fomo-club-changed"));
                            });
                          }}
                          className="opacity-40 hover:opacity-100 hover:text-red-500 transition-all ml-1 cursor-pointer bg-transparent border-none"
                          title="Eliminar canal"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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
                    const handleMatch = url.match(/(https?:\/\/www\.youtube\.com\/@[^\/]+)/);
                    if (handleMatch) {
                      url = handleMatch[1];
                    }
                    if (!channels.includes(url)) {
                      const next = [...channels, url];
                      setChannels(next);
                      setActiveChannel(url);
                      trackChannelUsage(url);
                      fetch(`/api/fomo/youtube-channels`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ channels: next }),
                      }).then(() => {
                        window.dispatchEvent(new CustomEvent("fomo-club-changed"));
                      });
                    } else {
                      if (activeChannel === url) {
                        setVideos([]);
                        setShorts([]);
                        setVideoCursor(1);
                        setShortsCursor(1);
                        setNextVideoCursor(1);
                        setNextShortsCursor(1);
                        setHasMoreVideos(true);
                        setHasMoreShorts(true);
                        lastFetchRef.current = "";
                      } else {
                        setActiveChannel(url);
                        trackChannelUsage(url);
                      }
                    }
                    e.currentTarget.value = "";
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Spotlight activo */}
        <div className="flex items-center gap-2 pt-1">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span className="text-[10px] text-amber-400/80 font-bold">
            Spotlight activo:
          </span>
          <span className="text-[10px] text-amber-300 font-mono truncate">
            @{spotlightChannel.includes("@") ? spotlightChannel.split("@")[1].split("/")[0] : spotlightChannel.split("/").pop()}
          </span>
          {activeChannel && activeChannel !== spotlightChannel && (
            <button
              onClick={() => handleSetSpotlightChannel(activeChannel)}
              className="ml-auto flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25 transition-all cursor-pointer shrink-0"
            >
              <Pin className="w-2.5 h-2.5" />
              Usar canal activo
            </button>
          )}
        </div>
      </div>

      {/* Top Loading Progress Bar */}
      <div className="h-1 w-full relative overflow-hidden bg-white/5 rounded-full mb-4">
        <div 
          className="h-full bg-gradient-to-r from-red-500 via-orange-500 to-red-600 transition-all duration-300 ease-out shadow-[0_0_8px_rgba(239,68,68,0.8)]"
          style={{ 
            width: `${progress}%`,
            opacity: progress > 0 && progress < 100 ? 1 : 0,
            transition: progress === 100 ? "width 0.2s, opacity 0.5s 0.2s" : "width 0.4s ease-out"
          }}
        />
      </div>

      {/* Toggle Videos/Shorts */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2 bg-white/5 p-1 rounded-xl w-fit border border-white/5">
          <button 
            onClick={() => setShowcaseType("videos")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${showcaseType === "videos" ? "bg-primary text-white" : "opacity-40 text-white hover:opacity-100"}`}
          >
            Videos
          </button>
          <button 
            onClick={() => setShowcaseType("shorts")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${showcaseType === "shorts" ? "bg-primary text-white" : "opacity-40 text-white hover:opacity-100"}`}
          >
            Shorts
          </button>
        </div>
        
        {loadingShowcases && showcasesList.length > 0 && (
          <div className="flex items-center gap-1.5 opacity-55 text-[10px] font-mono select-none mr-2">
            <RefreshCw className="w-3 h-3 animate-spin text-primary" />
            <span>Actualizando...</span>
          </div>
        )}
      </div>

      {loading ? (
        <FomoSkeleton variant="list" message={`Cargando ${showcaseType}...`} count={5} />
      ) : showcasesList.length === 0 ? (
        <div className="py-20 text-center flex flex-col items-center opacity-40">
          <TvMinimalPlay className="w-16 h-16 mb-4" />
          <h3 className="font-headline text-lg">No hay {showcaseType === "videos" ? "videos" : "shorts"}</h3>
          <p className="text-xs max-w-sm">Los {showcaseType === "videos" ? "videos" : "shorts"} del canal aparecerán acá.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {showcasesList.map((video, idx) => (
            <ShowcaseVideoCard 
              key={`${video.videoId}-${idx}`}
              video={video}
              currentUser={currentUser}
              allSharedVideos={allSharedVideos}
              fetchCommunitySharingInfo={fetchCommunitySharingInfo}
              onSearchProject={onSearchProject}
              expandedVideo={expandedVideo}
              setExpandedVideo={setExpandedVideo}
              currentUserColor={currentUserColor}
              isLatest={idx === 0}
            />
          ))}
          
          {hasMore && (
            <button
              onClick={() => {
                if (showcaseType === "videos") {
                  setVideoCursor(nextVideoCursor);
                } else {
                  setShortsCursor(nextShortsCursor);
                }
              }}
              disabled={loadingShowcases}
              className="w-full p-3 rounded-2xl border border-dashed border-white/10 hover:border-primary/30 hover:bg-primary/5 transition-all flex items-center justify-center gap-2 text-sm font-bold mt-4 cursor-pointer"
            >
              {loadingShowcases ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Cargar más"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
