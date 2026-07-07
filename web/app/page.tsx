"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Clock, Calendar, Compass, Share2, Download, ExternalLink, X, Film, Loader2 } from "lucide-react";
import { BottomNav } from "../components/BottomNav";
import { VerticalTicker, ModHit } from "../components/SpotlightMarquees";
import { mockUpdatedMods, mockNewestMods } from "../lib/mockData";

export default function Home() {
  const [activeTab, setActiveTab] = useState("spotlight");
  const [selectedMod, setSelectedMod] = useState<ModHit | null>(null);

  // Spotlight Live Data State
  const [updatedMods, setUpdatedMods] = useState<ModHit[]>(mockUpdatedMods);
  const [newestMods, setNewestMods] = useState<ModHit[]>(mockNewestMods);
  const [loadingSpotlight, setLoadingSpotlight] = useState(false);

  // YouTube Live Data State
  const [youtubePosts, setYoutubePosts] = useState<any[]>([]);
  const [loadingYoutube, setLoadingYoutube] = useState(false);
  const [currentChannel, setCurrentChannel] = useState("https://www.youtube.com/@EnderVerseMC");

  // Rankings Live Data State
  const [rankings, setRankings] = useState<ModHit[]>([]);
  const [loadingRankings, setLoadingRankings] = useState(false);

  // 1. Fetch Spotlight in live from Modrinth API
  const loadSpotlightData = useCallback(async () => {
    try {
      setLoadingSpotlight(true);
      const facets = encodeURIComponent('[["versions:1.20.1"],["categories:fabric"]]');
      
      // Get newly updated mods from Modrinth
      const updatedPromise = fetch(`https://api.modrinth.com/v2/search?index=updated&limit=12&facets=${facets}`).then(r => r.json());
      // Get newly created mods from Modrinth
      const newestPromise = fetch(`https://api.modrinth.com/v2/search?index=newest&limit=12&facets=${facets}`).then(r => r.json());

      const [updatedRes, newestRes] = await Promise.all([updatedPromise, newestPromise]);

      const mapHits = (hits: any[], defaultBackup: ModHit[]) => {
        if (!hits || !Array.isArray(hits) || hits.length === 0) return defaultBackup;
        return hits.map((m: any) => ({
          projectId: m.project_id,
          title: m.title,
          description: m.description,
          iconUrl: m.icon_url,
          author: m.author,
          projectType: m.project_type,
          categories: m.categories,
          url: `https://modrinth.com/${m.project_type}/${m.slug}`
        }));
      };

      setUpdatedMods(mapHits(updatedRes.hits, mockUpdatedMods));
      setNewestMods(mapHits(newestRes.hits, mockNewestMods));
    } catch (e) {
      console.error("Error loading live Modrinth data, keeping mock fallback:", e);
    } finally {
      setLoadingSpotlight(false);
    }
  }, []);

  // 2. Fetch community rankings from Supabase API
  const loadRankingsData = useCallback(async () => {
    try {
      setLoadingRankings(true);
      const res = await fetch("/api/fomo/community-rankings");
      if (res.ok) {
        const d = await res.json();
        setRankings(d.rankings || []);
      }
    } catch (e) {
      console.error("Error fetching community rankings:", e);
    } finally {
      setLoadingRankings(false);
    }
  }, []);

  // 3. Fetch YouTube posts from scrapper API
  const loadYoutubeData = useCallback(async (channel: string) => {
    try {
      setLoadingYoutube(true);
      const res = await fetch(`/api/fomo/youtube-posts?channel=${encodeURIComponent(channel)}`);
      if (res.ok) {
        const d = await res.json();
        setYoutubePosts(d.showcases || []);
      }
    } catch (e) {
      console.error("Error loading YouTube posts:", e);
    } finally {
      setLoadingYoutube(false);
    }
  }, []);

  // Sync tab loading logic
  useEffect(() => {
    if (activeTab === "spotlight") {
      loadSpotlightData();
    } else if (activeTab === "rankings") {
      loadRankingsData();
    } else if (activeTab === "feed") {
      loadYoutubeData(currentChannel);
    }
  }, [activeTab, currentChannel, loadSpotlightData, loadRankingsData, loadYoutubeData]);

  const handleOpenModDetails = (mod: ModHit) => {
    setSelectedMod(mod);
  };

  const handleCloseModDetails = () => {
    setSelectedMod(null);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden px-4 pt-6">
      
      {/* Header Bar */}
      <header className="flex justify-between items-center mb-6 px-1">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-orange-500 font-bold">MIM Hub</span>
          <h1 className="text-lg font-bold text-white tracking-tight mt-0.5">FOMO Cloud</h1>
        </div>
        <button 
          onClick={() => alert("MIM FOMO Web v1.0.0 — En vivo de Supabase")}
          className="bg-white/5 hover:bg-white/10 border border-white/[0.08] rounded-full p-2 text-white/70 active:scale-95 transition-all"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </header>

      {/* Main Tab Routing */}
      <main className="flex-1 flex flex-col min-h-0 relative">
        {activeTab === "spotlight" && (
          <div className="flex-1 flex flex-col min-h-0 animate-fade-in">
            {/* Spotlight mini headline */}
            <div className="bg-gradient-to-r from-orange-500/10 to-transparent border-l-2 border-orange-500 rounded-r-lg p-3 mb-6">
              <p className="text-[10px] font-mono text-orange-400 uppercase tracking-wider font-bold">Live Spotlight</p>
              <h2 className="text-xs font-semibold text-white/90 mt-1 flex items-center gap-1.5">
                {loadingSpotlight ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin text-orange-500" /> Sincronizando mods en tiempo real...
                  </>
                ) : (
                  "Minecraft Mods en tiempo real directo de Modrinth."
                )}
              </h2>
            </div>

            {/* Tickers container side-by-side */}
            <div className="flex-1 flex gap-4 min-h-0 pb-6">
              
              {/* Column 1: Recently Updated */}
              <div className="flex-1 flex flex-col min-h-0">
                <h3 className="text-[11px] font-bold text-white/80 tracking-wide mb-3 flex items-center gap-1.5 shrink-0">
                  <Clock className="w-3.5 h-3.5 text-blue-400" /> Actualizados
                </h3>
                <div className="flex-1 relative bg-white/[0.01] rounded-xl border border-white/[0.03]">
                  <VerticalTicker 
                    mods={updatedMods} 
                    onSelectMod={handleOpenModDetails}
                    speed={0.4}
                    color="text-blue-400"
                    reverse={true}
                  />
                </div>
              </div>

              {/* Column 2: Newest Created */}
              <div className="flex-1 flex flex-col min-h-0">
                <h3 className="text-[11px] font-bold text-white/80 tracking-wide mb-3 flex items-center gap-1.5 shrink-0">
                  <Calendar className="w-3.5 h-3.5 text-purple-400" /> Creados
                </h3>
                <div className="flex-1 relative bg-white/[0.01] rounded-xl border border-white/[0.03]">
                  <VerticalTicker 
                    mods={newestMods} 
                    onSelectMod={handleOpenModDetails}
                    speed={0.5}
                    color="text-purple-400"
                  />
                </div>
              </div>

            </div>
          </div>
        )}

        {activeTab === "feed" && (
          <div className="flex-1 flex flex-col min-h-0 animate-fade-in">
            {/* Channel Selector */}
            <div className="flex gap-2 mb-4 shrink-0 overflow-x-auto pb-1 scrollbar-none">
              {[
                { name: "Wero Lovernite", url: "https://www.youtube.com/@Wero_lovernite" },
                { name: "EnderVerseMC", url: "https://www.youtube.com/@EnderVerseMC" }
              ].map(chan => (
                <button
                  key={chan.url}
                  onClick={() => setCurrentChannel(chan.url)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                    currentChannel === chan.url 
                      ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" 
                      : "bg-white/5 text-white/50 border border-white/[0.05]"
                  }`}
                >
                  {chan.name}
                </button>
              ))}
            </div>

            {/* Posts feed */}
            {loadingYoutube ? (
              <div className="flex-1 flex flex-col justify-center items-center">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                <span className="text-xs text-white/40 mt-3 font-mono">Conectando con YouTube...</span>
              </div>
            ) : youtubePosts.length > 0 ? (
              <div className="flex-1 overflow-y-auto space-y-4 pb-20 pr-1">
                {youtubePosts.map((post) => (
                  <div key={post.postId} className="bg-[#151518]/90 border border-white/[0.05] rounded-2xl p-4 flex flex-col gap-3">
                    <p className="text-xs text-white/95 leading-relaxed whitespace-pre-wrap">{post.description}</p>
                    
                    {post.thumbnail && (
                      <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-white/5 border border-white/[0.05]">
                        <img src={post.thumbnail} alt="" className="object-cover w-full h-full" />
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-2 border-t border-white/[0.04] mt-1">
                      <span className="text-[10px] text-white/40 font-mono">{post.publishedAt}</span>
                      <a
                        href={post.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-bold text-blue-400 hover:underline flex items-center gap-1"
                      >
                        Abrir YouTube <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-center items-center text-center p-6">
                <Film className="w-12 h-12 text-blue-400 mb-4 opacity-50" />
                <h2 className="text-sm font-semibold text-white">Sin publicaciones</h2>
                <p className="text-xs text-white/40 mt-1">No se encontraron posteos de mods recientes en este canal.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "rankings" && (
          <div className="flex-1 flex flex-col min-h-0 animate-fade-in">
            {/* Top votes title */}
            <div className="bg-gradient-to-r from-purple-500/10 to-transparent border-l-2 border-purple-500 rounded-r-lg p-3 mb-6 shrink-0">
              <p className="text-[10px] font-mono text-purple-400 uppercase tracking-wider font-bold">Supabase Cloud</p>
              <h2 className="text-xs font-semibold text-white/90 mt-1">Top Mods votados por la comunidad de MIM.</h2>
            </div>

            {loadingRankings ? (
              <div className="flex-1 flex flex-col justify-center items-center">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                <span className="text-xs text-white/40 mt-3 font-mono">Leyendo Supabase Cloud...</span>
              </div>
            ) : rankings.length > 0 ? (
              <div className="flex-1 overflow-y-auto space-y-3 pb-20 pr-1">
                {rankings.map((mod, i) => (
                  <div 
                    key={mod.projectId} 
                    onClick={() => handleOpenModDetails(mod)}
                    className="bg-[#151518]/90 border border-white/[0.05] rounded-2xl p-3 flex items-center gap-3 active:scale-[0.98] transition-all cursor-pointer"
                  >
                    {/* Rank counter */}
                    <div className="w-6 text-center font-mono font-black text-sm text-purple-400/80">
                      #{i + 1}
                    </div>

                    <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/[0.05] flex items-center justify-center overflow-hidden flex-shrink-0">
                      {mod.iconUrl ? (
                        <img src={mod.iconUrl} alt="" className="object-cover w-full h-full" />
                      ) : (
                        <span className="text-white/40 text-xs font-bold uppercase">{mod.title.substring(0,2)}</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{mod.title}</p>
                      <p className="text-[9px] text-white/40 mt-0.5 capitalize">{mod._source}</p>
                    </div>

                    <div className="bg-purple-500/10 border border-purple-500/20 text-purple-300 font-mono text-[10px] px-2 py-0.5 rounded-full">
                      {mod.downloads} {mod.downloads === 1 ? "voto" : "votos"}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-center items-center text-center p-6">
                <Compass className="w-12 h-12 text-purple-400 mb-4 opacity-50" />
                <h2 className="text-sm font-semibold text-white">Sin rankings</h2>
                <p className="text-xs text-white/40 mt-1">No hay votos registrados en Supabase todavía.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "saved" && (
          <div className="flex-1 flex flex-col justify-center items-center text-center p-6 animate-fade-in">
            <Compass className="w-12 h-12 text-rose-500 mb-4 opacity-50" />
            <h2 className="text-sm font-semibold text-white font-headline">Mods Guardados</h2>
            <p className="text-xs text-white/50 mt-2 max-w-xs leading-relaxed">
              Pronto vas a poder iniciar sesión con tu cuenta de Supabase en esta WebApp para administrar los mods guardados en tu PC desde tu celular.
            </p>
          </div>
        )}
      </main>

      {/* Bottom Nav Bar */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Mod Details Sheet / Modal */}
      {selectedMod && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-end justify-center z-50 animate-fade-in" onClick={handleCloseModDetails}>
          <div 
            className="bg-[#151518] border-t border-white/[0.08] rounded-t-3xl w-full max-w-md p-6 pb-8 shadow-[0_-10px_40px_rgba(0,0,0,0.6)] flex flex-col gap-5 relative translate-y-0 transition-transform duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag line */}
            <div className="w-12 h-1.5 rounded-full bg-white/10 mx-auto -mt-2 mb-2" />

            {/* Header info */}
            <div className="flex gap-4">
              <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/[0.08] flex items-center justify-center overflow-hidden">
                {selectedMod.iconUrl ? (
                  <img src={selectedMod.iconUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white/40 font-bold uppercase">{selectedMod.title.substring(0, 2)}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[9px] font-mono uppercase tracking-wider text-orange-400 font-semibold">Mod Cloud Details</span>
                <h3 className="text-sm font-bold text-white truncate mt-0.5">{selectedMod.title}</h3>
                <p className="text-[10px] text-white/40 mt-1">Plataforma: <span className="capitalize font-semibold text-white/60">{selectedMod._source || "Modrinth"}</span></p>
              </div>
              <button 
                onClick={handleCloseModDetails}
                className="bg-white/5 hover:bg-white/10 rounded-full p-1.5 self-start text-white/60 active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Description */}
            <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4">
              <p className="text-xs text-white/70 leading-relaxed max-h-36 overflow-y-auto scrollbar-none">
                {selectedMod.description || "Este mod es genial y expande significativamente las posibilidades de juego en Minecraft."}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 mt-2">
              <a
                href={selectedMod.url || (selectedMod._source === "curseforge" 
                  ? `https://www.curseforge.com/minecraft/mc-mods/${selectedMod.projectId}` 
                  : `https://modrinth.com/mod/${selectedMod.projectId}`)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-medium text-xs rounded-xl py-3.5 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <Download className="w-4 h-4" /> Descargar Manual
              </a>
              <button
                onClick={() => alert(`Para instalar automáticamente ${selectedMod.title} en tu PC, abrí la aplicación de escritorio de MIM.`)}
                className="bg-white/5 hover:bg-white/10 border border-white/[0.08] text-white font-medium text-xs rounded-xl px-4 py-3.5 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <ExternalLink className="w-4 h-4" /> En PC
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
