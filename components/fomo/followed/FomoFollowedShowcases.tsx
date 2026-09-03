"use client";

import React from "react";
import { 
  TvMinimalPlay, RefreshCw, Trash2, ChevronDown, 
  MonitorCheck, MonitorUp, Sparkles, Pin, Newspaper, ExternalLink, Flame, Puzzle
} from "lucide-react";
import { mimDB } from "@/lib/storage/indexeddb";
import { FomoSkeleton } from "@/components/fomo/core/FomoSkeleton";
import { ShowcaseVideoCard } from "@/components/fomo/showcase/ShowcaseVideoCard";

// No hardcoded POSTS_CHANNELS limit anymore

const SPOTLIGHT_CHANNELS_KEY = "mim_spotlight_showcase_channels";
const DEFAULT_SPOTLIGHT_CHANNELS = [
  "https://www.youtube.com/@EnderVerseMC",
  "https://www.youtube.com/@KreksuMinecraft",
  "https://www.youtube.com/@NoxusMods",
  "https://www.youtube.com/@sir_color",
  "https://www.youtube.com/@Wero_lovernite",
];

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

  const [showcaseType, setShowcaseType] = React.useState<"videos" | "shorts" | "posts">("videos");
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
  const [posts, setPosts] = React.useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = React.useState(false);
  const [postsError, setPostsError] = React.useState("");
  const [videoCursor, setVideoCursor] = React.useState(1);
  const [shortsCursor, setShortsCursor] = React.useState(1);
  const [postsCursor, setPostsCursor] = React.useState(1);
  const [nextVideoCursor, setNextVideoCursor] = React.useState(1);
  const [nextShortsCursor, setNextShortsCursor] = React.useState(1);
  const [hasMoreVideos, setHasMoreVideos] = React.useState(true);
  const [hasMoreShorts, setHasMoreShorts] = React.useState(true);

  const [channels, setChannels] = React.useState<string[]>([]);
  const [activeChannel, setActiveChannel] = React.useState("https://www.youtube.com/@EnderVerseMC");
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const [channelUsage, setChannelUsage] = React.useState<Record<string, number>>({});
  // Canales pinneados al Spotlight showcase (multi-canal)
  const [spotlightChannels, setSpotlightChannels] = React.useState<string[]>(DEFAULT_SPOTLIGHT_CHANNELS);

  React.useEffect(() => {
    const saved = localStorage.getItem(SPOTLIGHT_CHANNELS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setSpotlightChannels(parsed);
      } catch (e) {
        console.warn("[FomoFollowedShowcases] Error parsing saved spotlight channels:", e);
      }
    }
  }, []);

  // Escuchar cambios externos (desde SpotlightShowcaseRow)
  React.useEffect(() => {
    const onUpdate = () => {
      const saved = localStorage.getItem(SPOTLIGHT_CHANNELS_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) setSpotlightChannels(parsed);
        } catch (e) {
          console.warn("[FomoFollowedShowcases] Error parsing spotlight channels on change:", e);
        }
      }
    };
    window.addEventListener("fomo-spotlight-channels-changed", onUpdate);
    return () => window.removeEventListener("fomo-spotlight-channels-changed", onUpdate);
  }, []);

  const handleToggleSpotlightChannel = React.useCallback((url: string) => {
    setSpotlightChannels(prev => {
      const next = prev.includes(url) ? prev.filter(c => c !== url) : [...prev, url];
      localStorage.setItem(SPOTLIGHT_CHANNELS_KEY, JSON.stringify(next));
      // Notificar al SpotlightShowcaseRow
      window.dispatchEvent(new CustomEvent("fomo-spotlight-channels-changed"));
      return next;
    });
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
          } catch (e) {
            console.warn("[FomoFollowedShowcases] Error migrating video cache from localStorage:", e);
          }
        }
        if (!cachedS && lsS) {
          try {
            cachedS = JSON.parse(lsS);
            await mimDB.setCache(cacheSKey, cachedS, 12 * 60 * 60 * 1000);
            localStorage.removeItem(cacheSKey);
          } catch (e) {
            console.warn("[FomoFollowedShowcases] Error migrating shorts cache from localStorage:", e);
          }
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
    setPostsCursor(1);
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

  // Cargar posts de comunidad cuando corresponda
  React.useEffect(() => {
    if (showcaseType !== "posts") return;
    if (posts.length > 0 && postsCursor > 1) return; // Ya tenemos posts y solo estamos paginando
    
    setLoadingPosts(true);
    setPostsError("");
    fetch(`/api/fomo/youtube-posts?channel=${encodeURIComponent(activeChannel)}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setPosts(data.showcases || []);
      })
      .catch(e => {
        console.error("Error loading posts:", e);
        setPostsError(e.message || "Error al cargar los posts de comunidad");
      })
      .finally(() => setLoadingPosts(false));
  }, [showcaseType, activeChannel]);

  const showcasesList = showcaseType === "videos" ? videos : showcaseType === "shorts" ? shorts : posts;
  const hasMore = showcaseType === "videos" ? hasMoreVideos : showcaseType === "shorts" ? hasMoreShorts : false;
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
                        {spotlightChannels.includes(c) && (
                          <span className="ml-1.5 text-[8px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 font-black uppercase tracking-wider align-middle">Spotlight</span>
                        )}
                      </span>
                      <div className="flex items-center gap-1 ml-2 shrink-0">
                        {/* Botón Spotlight */}
                         <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleSpotlightChannel(c);
                          }}
                          title={spotlightChannels.includes(c) ? "Quitar del Spotlight" : "Agregar al Spotlight"}
                          className={`transition-all cursor-pointer bg-transparent border-none p-0.5 rounded ${
                            spotlightChannels.includes(c)
                              ? "text-amber-400 opacity-100"
                              : "opacity-30 hover:opacity-100 hover:text-amber-400"
                          }`}
                        >
                          <Pin className={`w-3 h-3 ${spotlightChannels.includes(c) ? "fill-amber-400/30" : ""}`} />
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
                            // Si el canal estaba pineado en el Spotlight, sacarlo
                            if (spotlightChannels.includes(c)) {
                              handleToggleSpotlightChannel(c);
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
                        setPostsCursor(1);
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
          <Flame className="w-3 h-3 text-amber-400 fill-amber-400/20" />
          <span className="text-[10px] text-amber-400/80 font-bold">
            Spotlight showcase:
          </span>
          <span className="text-[10px] text-amber-300 font-mono">
            {spotlightChannels.length} canal{spotlightChannels.length !== 1 ? "es" : ""}
          </span>
          {activeChannel && !spotlightChannels.includes(activeChannel) && (
            <button
              onClick={() => handleToggleSpotlightChannel(activeChannel)}
              className="ml-auto flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25 transition-all cursor-pointer shrink-0"
            >
              <Pin className="w-2.5 h-2.5" />
              Agregar al Spotlight
            </button>
          )}
          {activeChannel && spotlightChannels.includes(activeChannel) && (
            <button
              onClick={() => handleToggleSpotlightChannel(activeChannel)}
              className="ml-auto flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg bg-amber-500/25 border border-amber-500/40 text-amber-300 hover:bg-red-500/15 hover:border-red-500/30 hover:text-red-400 transition-all cursor-pointer shrink-0"
            >
              <Pin className="w-2.5 h-2.5 fill-amber-400/40" />
              En Spotlight
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

      {/* Toggle Videos/Shorts/Posts */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-1 bg-white/5 p-1 rounded-xl w-fit border border-white/5">
          <button 
            onClick={() => setShowcaseType("videos")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${showcaseType === "videos" ? "bg-primary text-white" : "opacity-40 text-white hover:opacity-100"}`}
          >
            <TvMinimalPlay className="w-3 h-3" />
            Videos
          </button>
          <button 
            onClick={() => setShowcaseType("shorts")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${showcaseType === "shorts" ? "bg-primary text-white" : "opacity-40 text-white hover:opacity-100"}`}
          >
            Shorts
          </button>
          <button 
            onClick={() => setShowcaseType("posts")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              showcaseType === "posts" 
                ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30" 
                : "opacity-40 text-white hover:opacity-100"
            }`}
            title="Posts de Comunidad"
          >
            <Newspaper className="w-3 h-3" />
            Posts
          </button>
        </div>
        
        {(loadingShowcases || loadingPosts) && showcasesList.length > 0 && (
          <div className="flex items-center gap-1.5 opacity-55 text-[10px] font-mono select-none mr-2">
            <RefreshCw className="w-3 h-3 animate-spin text-primary" />
            <span>Actualizando...</span>
          </div>
        )}
      </div>
      {/* === Modo Posts de Comunidad === */}
      {showcaseType === "posts" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20">
            <Newspaper className="w-3.5 h-3.5 text-orange-400 shrink-0" />
            <p className="text-[10px] text-orange-300/80">Posts de comunidad — compilaciones de mods compartidas por el canal.</p>
          </div>
          {loadingPosts ? (
            <FomoSkeleton variant="list" message="Cargando posts de comunidad..." count={4} />
          ) : postsError ? (
            <div className="py-10 text-center flex flex-col items-center opacity-60 gap-3">
              <Newspaper className="w-12 h-12 opacity-40" />
              <p className="text-xs text-red-400 max-w-sm">{postsError}</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center opacity-40">
              <Newspaper className="w-16 h-16 mb-4" />
              <h3 className="font-headline text-lg">Sin posts disponibles</h3>
              <p className="text-xs max-w-sm">Los posts de comunidad del canal aparecerán aquí.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {posts.slice(0, postsCursor * 5).map((post, idx) => {
                  const channelName = activeChannel.includes("@") ? activeChannel.split("@")[1].split("/")[0] : activeChannel.split("/").pop();
                  return (
                    <div key={post.postId || idx} className={`group rounded-3xl border transition-all duration-300 flex flex-col overflow-hidden hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] hover:border-orange-500/20 hover:-translate-y-1 ${
                      isModern ? "bg-white border-slate-200" : "bg-[#121212] border-white/5 hover:bg-[#161616]"
                    }`}>
                      {/* Header */}
                      <div className="flex items-center gap-3 p-4 pb-2">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500/20 to-orange-600/10 flex items-center justify-center shrink-0 overflow-hidden text-orange-400 font-bold text-lg border border-orange-500/30 shadow-inner">
                          {channelName?.[0]?.toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className={`text-[14px] font-bold truncate transition-colors ${isModern ? "text-slate-800 group-hover:text-orange-600" : "text-white/90 group-hover:text-orange-100"}`}>{channelName}</span>
                          <span className={`text-[11px] font-medium ${isModern ? "text-slate-500" : "text-white/40"}`}>{post.publishedAt || "Reciente"}</span>
                        </div>
                        <a href={post.videoUrl} target="_blank" rel="noopener noreferrer" className={`ml-auto p-2 rounded-full transition-colors ${isModern ? "text-slate-400 hover:text-orange-500 hover:bg-orange-50" : "text-white/20 hover:text-orange-400 hover:bg-orange-500/10"}`} title="Ver en YouTube">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>

                      {/* Text */}
                      <div className={`px-4 py-2 text-[13px] leading-relaxed whitespace-pre-wrap break-words ${isModern ? "text-slate-600" : "text-white/70"}`}>
                        {post.description || post.title}
                      </div>

                      {/* Image */}
                      {post.thumbnail && (
                        <div 
                          className={`mt-3 mx-4 rounded-xl bg-black/40 border border-white/5 overflow-hidden flex items-center justify-center relative ${post.embeddedVideoId ? 'cursor-pointer group/video' : ''}`}
                          onClick={() => {
                            if (post.embeddedVideoId) {
                              window.dispatchEvent(new CustomEvent("fomo-play-video", { detail: { videoId: post.embeddedVideoId } }));
                            }
                          }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10" />
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={post.thumbnail} alt="" className="w-full object-cover max-h-[350px] transform group-hover:scale-[1.02] transition-transform duration-500" loading="lazy" />
                          
                          {post.embeddedVideoId && (
                            <div className="absolute inset-0 flex items-center justify-center opacity-90 group-hover/video:opacity-100 transition-opacity duration-300 z-20">
                              <div className="w-12 h-12 rounded-full bg-primary/90 text-white flex items-center justify-center shadow-lg shadow-primary/30 transform scale-90 group-hover/video:scale-100 transition-transform duration-500 delay-75">
                                <TvMinimalPlay className="w-6 h-6 ml-0.5" />
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Mod Slugs */}
                      {post.modSlugs && post.modSlugs.length > 0 && (
                        <div className="p-4 pt-3 mt-auto">
                          <div className="flex items-center gap-1.5 mb-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-1">
                              <Puzzle className="w-3 h-3 text-orange-500/70" /> {post.modSlugs.length} mod{post.modSlugs.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {(post.modSlugs as string[]).slice(0, 6).map((slug: string, i: number) => {
                              const parts = slug.split(":");
                              const platform = parts[0];
                              const modSlug = parts[2] || parts[1] || slug;
                              const isModrinth = platform === "modrinth";
                              return (
                                <button 
                                  key={i} 
                                  onClick={() => {
                                    window.dispatchEvent(new CustomEvent("fomo-open-project-details", { 
                                      detail: { id: modSlug, platform: platform } 
                                    }));
                                  }}
                                  className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${isModrinth ? "bg-green-500/5 border-green-500/10 text-green-400/80 hover:bg-green-500/20 hover:text-green-300 hover:border-green-500/30" : "bg-orange-500/5 border-orange-500/10 text-orange-400/80 hover:bg-orange-500/20 hover:text-orange-300 hover:border-orange-500/30"}`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${isModrinth ? 'bg-green-500/50' : 'bg-orange-500/50'}`} />
                                  {modSlug}
                                </button>
                              );
                            })}
                            {post.modSlugs.length > 6 && (
                              <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg border border-white/5 bg-white/5 text-white/40">+{post.modSlugs.length - 6}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {posts.length > postsCursor * 5 && (
                <div className="flex justify-center mt-6 mb-4">
                  <button 
                    onClick={() => setPostsCursor(prev => prev + 1)}
                    className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition-all"
                  >
                    Cargar más posts ({posts.length - postsCursor * 5} restantes)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* === Modo Videos / Shorts === */}
      {showcaseType !== "posts" && (
        <>
          {loading ? (
            <FomoSkeleton variant="list" message={`Cargando ${showcaseType}...`} count={5} />
          ) : showcasesList.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center opacity-40">
              <TvMinimalPlay className="w-16 h-16 mb-4" />
              <h3 className="font-headline text-lg">No hay {showcaseType === "videos" ? "videos" : "shorts"}</h3>
              <p className="text-xs max-w-sm">Los {showcaseType === "videos" ? "videos" : "shorts"} del canal aparecerán acá.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
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
                    isLatest={idx === 0 && cursor === 1}
                    theme={currentTheme}
                  />
                ))}
              </div>
              {hasMore && (
                <div className="w-full mt-2">
                  <button
                    onClick={() => {
                      if (showcaseType === "videos") setVideoCursor(nextVideoCursor);
                      else setShortsCursor(nextShortsCursor);
                    }}
                    disabled={loadingShowcases}
                    className="w-full p-3 rounded-2xl border border-dashed border-white/10 hover:border-primary/30 hover:bg-primary/5 transition-all flex items-center justify-center gap-2 text-sm font-bold cursor-pointer"
                  >
                    {loadingShowcases ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Cargar más"}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
