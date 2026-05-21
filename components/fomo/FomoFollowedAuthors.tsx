/**
 * MIM — FOMO Followed Authors & Projects
 * Optimized for v5.9: Modularized into hooks and subcomponents.
 */

"use client";

import React from "react";
import { 
  Heart, FolderHeart, RefreshCw, 
  Timeline, ChefHat, CookingPot, TvMinimalPlay,
  CircleFadingPlus, X, Loader2
} from "lucide-react";
import { useFomoFollowedManager } from "@/hooks/useFomoFollowedManager";
import { supabase } from "@/lib/supabaseClient";
import { fetchJsonWithRetry } from "@/lib/fetchJsonWithRetry";
import { FollowedProjectCard, FollowedAuthorCard } from "./FomoFollowedComponents";
import { PillToggleGroup } from "../ui/primitives";
import { FomoFollowedRankings } from "./FomoFollowedRankings";
import { FomoFollowedShowcases } from "./FomoFollowedShowcases";
import { buildShareMetaFromMod } from "@/lib/communityShareMeta";

function platformKeyForMod(mod: { _source?: string }): "modrinth" | "curseforge" {
  return mod._source === "curseforge" ? "curseforge" : "modrinth";
}

interface FomoFollowedAuthorsProps {
  onSearchAuthor: (author: string) => void;
  onSearchProject?: (title: string, type?: string, source?: string, loader?: string, version?: string) => void;
  onOpenVersions?: (mod: any) => void;
  onDownloadMod?: (mod: any) => Promise<void>;
  downloading?: Record<string, boolean>;
}

export function FomoFollowedAuthors({ 
  onSearchAuthor, 
  onSearchProject, 
  onOpenVersions, 
  onDownloadMod, 
  downloading = {} 
}: FomoFollowedAuthorsProps) {
  const { 
    subTab, 
    setSubTab, 
    followedAuthors, 
    followedMods, 
    filteredMods, 
    showOnlyWithUpdates, 
    setShowOnlyWithUpdates, 
    getModUpdateInfo, 
    handleUnfollowAuthor, 
    handleUnfollowMod, 
    isRecent 
  } = useFomoFollowedManager();
  
  // Community sharing — favorite_mods + showcase_videos for sub-tabs
  const [allSharedMods, setAllSharedMods] = React.useState<any[]>([]);
  const [allSharedVideos, setAllSharedVideos] = React.useState<any[]>([]);
  const [currentUser, setCurrentUser] = React.useState<any>(null);
  const [currentUserColor, setCurrentUserColor] = React.useState<string | null>(null);

  const fetchCommunitySharingInfo = React.useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user || null;
      setCurrentUser(user);

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("color")
          .eq("id", user.id)
          .single();
        if (profile?.color) {
          setCurrentUserColor(profile.color);
        }
      }

      const { data: modsData } = await supabase
        .from("favorite_mods")
        .select("id, profile_id, mod_id, platform, name, profiles ( username, avatar_url, color )");
      if (modsData) setAllSharedMods(modsData);

      const { data: videosRows } = await supabase
        .from("showcase_videos")
        .select("id, profile_id, youtube_video_id, title, profiles ( username, avatar_url, color )");
      if (videosRows) setAllSharedVideos(videosRows);
    } catch (err) {
      console.error("Error loading community shared info:", err);
    }
  }, []);

  // Share modal state — declared BEFORE handleShareToCommunity that uses them
  const [shareModalItem, setShareModalItem] = React.useState<any>(null);
  const [shareComment, setShareComment] = React.useState("");
  const [isSharing, setIsSharing] = React.useState(false);

  const openShareModal = async (item: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      window.dispatchEvent(new CustomEvent("fomo-show-status", {
        detail: { text: "Tenés que iniciar sesión en la pestaña Comunidad para compartir.", type: "error" }
      }));
      return;
    }
    setShareModalItem(item);
    setShareComment("");
  };

  const handleShareToCommunity = async () => {
    if (!shareModalItem || isSharing) return;
    
    // Optimistic UI: capturar item y cerrar modal al instante
    const item = shareModalItem;
    const commentText = shareComment;
    setShareModalItem(null);
    setShareComment("");
    setIsSharing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user || null;
      if (!user) {
        window.dispatchEvent(new CustomEvent("fomo-show-status", {
          detail: { text: "Tenés que iniciar sesión en la pestaña Comunidad para compartir.", type: "error" }
        }));
        setIsSharing(false);
        return;
      }

      if (item.isAuthor) {
        const summaryText = commentText.trim() || "Autor de Minecraft";
        const { error } = await supabase.from("favorite_mods").insert({
          profile_id: user.id,
          mod_id: item.id,
          platform: "modrinth",
          name: item.name,
          icon_url: item.icon_url,
          summary: summaryText
        });
        if (error) {
          if (error.code === "23505") {
            window.dispatchEvent(new CustomEvent("fomo-show-status", {
              detail: { text: "Este creador ya está compartido en la comunidad.", type: "info" }
            }));
            return;
          }
          throw error;
        }
        window.dispatchEvent(new CustomEvent("fomo-show-status", {
          detail: { text: "¡Creador compartido con la comunidad!", type: "success" }
        }));
        fetchCommunitySharingInfo();
        window.dispatchEvent(new CustomEvent("fomo-refresh-sharing"));
      } else {
        const summaryText = buildShareMetaFromMod(item, {
          comment:
            commentText.trim() ||
            (item.description || item.summary || "Mod de Minecraft"),
          gameVersion: item.gameVersions?.[0] || item.gameVersion,
          modloader: item.loader,
        });
        const { error } = await supabase.from("favorite_mods").insert({
          profile_id: user.id,
          mod_id: item.projectId || item.id,
          platform: item._source || "modrinth",
          name: item.title || item.name || "Mod",
          icon_url: item.iconUrl || item.icon_url || null,
          summary: summaryText,
        });
        if (error) {
          if (error.code === "23505") {
            window.dispatchEvent(new CustomEvent("fomo-show-status", {
              detail: { text: "Este mod ya está compartido en la comunidad.", type: "info" }
            }));
            return;
          }
          throw error;
        }
        window.dispatchEvent(new CustomEvent("fomo-show-status", {
          detail: { text: "¡Mod compartido con la comunidad!", type: "success" }
        }));
        fetchCommunitySharingInfo();
        window.dispatchEvent(new CustomEvent("fomo-refresh-sharing"));
      }
    } catch (err: any) {
      console.error("[ShareError]:", err);
      window.dispatchEvent(new CustomEvent("fomo-show-status", {
        detail: { text: "Error al compartir en la comunidad.", type: "error" }
      }));
    } finally {
      setIsSharing(false);
    }
  };

  const [history, setHistory] = React.useState<any[]>([]);
  const [rankings, setRankings] = React.useState<Record<string, any[]>>({});
  const [communityRankings, setCommunityRankings] = React.useState<Record<string, any[]>>({});
  const [loadingHistory, setLoadingHistory] = React.useState(false);
  const [loadingCommunityRankings, setLoadingCommunityRankings] = React.useState(false);
  const [historyFetchError, setHistoryFetchError] = React.useState<string | null>(null);
  const [communityRankingsError, setCommunityRankingsError] = React.useState<string | null>(null);
  const [rankingsRetryKey, setRankingsRetryKey] = React.useState(0);
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

  // Load community shared info on mount and tab changes
  React.useEffect(() => {
    fetchCommunitySharingInfo();
    const handleRefresh = () => fetchCommunitySharingInfo();
    window.addEventListener("fomo-refresh-sharing", handleRefresh);
    return () => window.removeEventListener("fomo-refresh-sharing", handleRefresh);
  }, [fetchCommunitySharingInfo, subTab]);

  const TABS = ["projects", "authors", "history"];
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
    if (subTab !== "history") return;

    setLoadingHistory(true);
    setLoadingCommunityRankings(true);
    setHistoryFetchError(null);
    setCommunityRankingsError(null);

    const fetchPersonalData = async () => {
      const result = await fetchJsonWithRetry<{
        history?: any[];
        rankings?: Record<string, any[]>;
        hasMore?: boolean;
      }>(`/api/fomo/download-history?page=${page}&limit=20`, { retries: 4, retryDelayMs: 350 });

      if (result.ok) {
        const data = result.data;
        if (page === 1) {
          setHistory(data.history || []);
          setRankings(data.rankings || {});
        } else {
          setHistory((prev) => [...prev, ...(data.history || [])]);
        }
        setHasMore(!!data.hasMore);
        setHistoryFetchError(null);
      } else {
        console.error("Error loading history", result.error);
        setHistoryFetchError(result.error);
      }
      setLoadingHistory(false);
    };

    const fetchCommunityRankings = async () => {
      const result = await fetchJsonWithRetry<{ rankings?: Record<string, any[]> }>(
        "/api/fomo/community-rankings",
        { retries: 4, retryDelayMs: 350 }
      );

      if (result.ok) {
        setCommunityRankings(result.data.rankings || {});
        setCommunityRankingsError(null);
      } else {
        console.error("Error loading community rankings", result.error);
        setCommunityRankings({});
        setCommunityRankingsError(result.error);
      }
      setLoadingCommunityRankings(false);
    };

    void fetchPersonalData();
    void fetchCommunityRankings();
  }, [subTab, page, rankingsRetryKey]);

  const communitySharedMap = React.useMemo(() => {
    const map = new Map<string, { isSharedByMe: boolean; sharedByOthers: any[] }>();
    for (const m of allSharedMods) {
      const key = `${m.platform || "modrinth"}:${m.mod_id}`;
      if (!map.has(key)) map.set(key, { isSharedByMe: false, sharedByOthers: [] });
      const entry = map.get(key)!;
      
      if (m.profile_id === currentUser?.id) {
        entry.isSharedByMe = true;
      } else {
        entry.sharedByOthers.push({
          username: m.profiles?.username || "Usuario",
          color: m.profiles?.color,
          avatar_url: m.profiles?.avatar_url,
        });
      }
    }
    return map;
  }, [allSharedMods, currentUser?.id]);

  const communityAuthorSharedMap = React.useMemo(() => {
    const map = new Map<string, { isSharedByMe: boolean; sharedByOthers: any[] }>();
    for (const m of allSharedMods) {
      const key = m.mod_id;
      if (!map.has(key)) map.set(key, { isSharedByMe: false, sharedByOthers: [] });
      const entry = map.get(key)!;
      
      if (m.profile_id === currentUser?.id) {
        entry.isSharedByMe = true;
      } else {
        entry.sharedByOthers.push({
          username: m.profiles?.username || "Usuario",
          color: m.profiles?.color,
          avatar_url: m.profiles?.avatar_url,
        });
      }
    }
    return map;
  }, [allSharedMods, currentUser?.id]);

  return (
    <div className="flex-1 overflow-hidden flex flex-col h-full animate-fade-in">
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
          <button onClick={() => setShowOnlyWithUpdates(!showOnlyWithUpdates)} className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border ${showOnlyWithUpdates ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" : "bg-white/5 border-white/10 text-white/60 cursor-pointer"}`}><RefreshCw className={`w-3.5 h-3.5 ${showOnlyWithUpdates ? "animate-spin-slow" : ""}`} /><span>Actualizaciones</span></button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {subTab === "projects" && (
          <div key="projects" className={animationClass}>
            {followedMods.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center opacity-40"><FolderHeart className="w-16 h-16 mb-4" /><h3 className="font-headline text-lg">No seguís ningún mod</h3><p className="text-xs max-w-sm">Seguí tus proyectos favoritos para verlos acá.</p></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredMods.map(mod => {
                  const pf = platformKeyForMod(mod);
                  const shareData = communitySharedMap.get(`${pf}:${mod.projectId}`) || { isSharedByMe: false, sharedByOthers: [] };
                  const isSharedByMe = shareData.isSharedByMe;
                  const sharedByOthers = shareData.sharedByOthers;
                  return (
                    <FollowedProjectCard 
                      key={mod.projectId} 
                      mod={mod} 
                      updateInfo={getModUpdateInfo(mod.projectId)} 
                      isRecent={isRecent(mod)} 
                      isDownloading={!!downloading[`collection:${mod.projectId}`]} 
                      onOpenVersions={onOpenVersions} 
                      onDownloadMod={onDownloadMod} 
                      onSearchProject={onSearchProject} 
                      onUnfollow={handleUnfollowMod} 
                      onShare={openShareModal} 
                      isSharedByMe={isSharedByMe}
                      sharedByOthers={sharedByOthers}
                      currentUserColor={currentUserColor}
                    />
                  );
                })}
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
                    const shareData = communityAuthorSharedMap.get(authorName) || { isSharedByMe: false, sharedByOthers: [] };
                    const isSharedByMe = shareData.isSharedByMe;
                    const sharedByOthers = shareData.sharedByOthers;
                    return (
                      <FollowedAuthorCard 
                        key={authorName || `unknown-${idx}`} 
                        author={author} 
                        icons={icons} 
                        onSearch={onSearchAuthor} 
                        onUnfollow={handleUnfollowAuthor} 
                        onShare={openShareModal} 
                        isSharedByMe={isSharedByMe}
                        sharedByOthers={sharedByOthers}
                        currentUserColor={currentUserColor}
                      />
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}


        {subTab === "history" && (
          <FomoFollowedRankings 
            animationClass={animationClass}
            loadingHistory={loadingHistory}
            loadingCommunityRankings={loadingCommunityRankings}
            historyFetchError={historyFetchError}
            communityRankingsError={communityRankingsError}
            onRetryRankingsLoads={() => setRankingsRetryKey((k) => k + 1)}
            page={page}
            setPage={setPage}
            history={history}
            rankings={rankings}
            communityRankings={communityRankings}
            hasMore={hasMore}
            onOpenVersions={onOpenVersions}
          />
        )}
      </div>

      {/* Share Modal */}
      {shareModalItem && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setShareModalItem(null)}>
          <div className="bg-[hsl(220,14%,10%)] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/5">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <CircleFadingPlus className="w-4 h-4 text-primary" />
                {shareModalItem.isAuthor ? "Compartir Creador" : "Compartir Proyecto"}
              </h3>
              <button onClick={() => setShareModalItem(null)} className="text-white/40 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-[11px] text-white/60">
                ¿Querés agregar un comentario u opinión opcional sobre{" "}
                <strong>{shareModalItem.name || shareModalItem.title}</strong>?
              </p>
              <textarea
                value={shareComment}
                onChange={e => setShareComment(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleShareToCommunity();
                  }
                  // Shift+Enter → nueva línea
                }}
                placeholder={shareModalItem.isAuthor ? "Escribe algo sobre este creador... (Enter para enviar, Shift+Enter para nueva línea)" : "Escribe algo interesante sobre este mod... (Enter para enviar, Shift+Enter para nueva línea)"}
                className="w-full h-20 bg-black/20 border rounded-xl p-3 text-xs text-white placeholder-white/30 resize-none focus:outline-none transition-colors custom-scrollbar"
                style={{ borderColor: "rgba(255,255,255,0.1)" }}
                autoFocus
              />
            </div>
            <div className="p-3 border-t border-white/5 bg-white/5 flex items-center justify-end gap-2">
              <button
                onClick={() => setShareModalItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white/60 hover:text-white hover:bg-white/5 transition-all"
                disabled={isSharing}
              >
                Cancelar
              </button>
              <button
                onClick={handleShareToCommunity}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary/90 flex items-center gap-2 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                disabled={isSharing}
              >
                {isSharing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CircleFadingPlus className="w-3.5 h-3.5" />}
                {isSharing ? "Compartiendo..." : "Compartir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
