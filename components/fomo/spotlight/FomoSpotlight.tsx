"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, ChevronRight, Clock, Spotlight, Calendar } from "lucide-react";
import { COLORS } from "@/theme/tokens";
import { FomoSkeleton } from "@/components/fomo/core/FomoSkeleton";
import { fetchCurseForgeFeatured, fetchOfficialCollections, fetchCollectionMods } from "@/services/api";
import type { ModHit, CollectionEntry } from "@/lib/core/types";
import { SpotlightShowcaseRow } from "./SpotlightShowcaseRow";
import { mimDB } from "@/lib/storage/indexeddb";



interface FomoSpotlightProps {
  onOpenVersions: (mod: ModHit) => void;
  onOpenCollection?: (collection: CollectionEntry) => void;
  onDownloadMod: (mod: ModHit) => Promise<void>;
  downloading: Record<string, boolean>;
  selectedMods?: ModHit[];
  onToggleSelect?: (mod: ModHit) => void;
  sinytraActive?: boolean;
  loader?: string;
  gameVersion?: string;

}

import { AnimatedHeadline } from "./AnimatedHeadline";
import { SpotlightSkeleton } from "./SpotlightSkeleton";
import { VerticalTicker, HorizontalEditorialMarquee } from "./SpotlightMarquees";

// ─────────────────────────────────────────────────────────────────────────────
// Main Spotlight Component
// ─────────────────────────────────────────────────────────────────────────────
export function FomoSpotlight({
  onOpenVersions,
  onOpenCollection,
  onDownloadMod,
  downloading,
  loader = "forge",
  gameVersion = "1.20.1",
  sinytraActive = false,
}: FomoSpotlightProps) {

  const [activePlatform, setActivePlatform] = useState<"modrinth" | "curseforge">("modrinth");
  const [cfPicks, setCfPicks] = useState<CollectionEntry[]>([]);
  const [cfPopular, setCfPopular] = useState<ModHit[]>([]);
  const [cfRecent, setCfRecent] = useState<ModHit[]>([]);
  const [newestMods, setNewestMods] = useState<ModHit[]>([]);
  const [latestCollection, setLatestCollection] = useState<CollectionEntry | null>(null);
  const [latestCollectionMods, setLatestCollectionMods] = useState<ModHit[]>([]);
  const [loading, setLoading] = useState(true);
  const [latestCfCollection, setLatestCfCollection] = useState<CollectionEntry | null>(null);
  const [latestCfMods, setLatestCfMods] = useState<ModHit[]>([]);

  const [currentTheme, setCurrentTheme] = useState("official");
  useEffect(() => {
    const update = () => setCurrentTheme(document.documentElement.getAttribute("data-theme") || "official");
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  const isModern = currentTheme === "modern";
  const isVampire = currentTheme === "vampire";

  // Compute styles for the right pane container
  const paneBg = isModern 
    ? "linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(240,237,227,0.4) 100%)" 
    : isVampire 
    ? "linear-gradient(135deg, rgba(30,22,45,0.75) 0%, rgba(15,10,25,0.5) 100%)" 
    : "linear-gradient(135deg, rgba(40,40,40,0.6) 0%, rgba(15,15,15,0.4) 100%)";

  const paneBorder = isModern 
    ? "1px solid rgba(255,255,255,0.9)" 
    : isVampire 
    ? "1px solid rgba(187,150,228,0.25)" 
    : "1px solid rgba(255,255,255,0.08)";

  const paneShadow = isModern 
    ? "0 30px 60px rgba(0,0,0,0.08)" 
    : isVampire 
    ? "0 30px 60px rgba(0,0,0,0.6)" 
    : "0 30px 60px rgba(0,0,0,0.6)";

  // El cache se carga sincrónicamente en el useState para evitar flickeos de UI

  useEffect(() => {
    const loadCache = async () => {
      try {
        await mimDB.init();
        
        let cachedPicks = null;
        let cachedMods = null;
        
        const cachePicksEntry = await mimDB.getCache("fomo_cf_picks");
        const cacheModsEntry = await mimDB.getCache("fomo_modrinth_mods");
        
        if (cachePicksEntry?.data) cachedPicks = cachePicksEntry.data;
        if (cacheModsEntry?.data) cachedMods = cacheModsEntry.data;
        
        const lsPicks = localStorage.getItem("fomo_cf_picks");
        const lsMods = localStorage.getItem("fomo_modrinth_mods");
        
        if (!cachedPicks && lsPicks) {
          try {
            cachedPicks = JSON.parse(lsPicks);
            await mimDB.setCache("fomo_cf_picks", cachedPicks, 12 * 60 * 60 * 1000);
            localStorage.removeItem("fomo_cf_picks");
          } catch (e) {}
        }
        
        if (!cachedMods && lsMods) {
          try {
            cachedMods = JSON.parse(lsMods);
            await mimDB.setCache("fomo_modrinth_mods", cachedMods, 12 * 60 * 60 * 1000);
            localStorage.removeItem("fomo_modrinth_mods");
          } catch (e) {}
        }
        
        if (cachedPicks) setCfPicks(cachedPicks);
        if (cachedMods) setLatestCollectionMods(cachedMods);
        
        if (cachedPicks || cachedMods) {
          setLoading(false);
        }
      } catch (err) {
        console.error("Error loading spotlight cache from IndexedDB", err);
      }
    };
    loadCache();
  }, []);

  const loadSpotlight = useCallback(async () => {
    try {
      const cachePicksEntry = await mimDB.getCache("fomo_cf_picks");
      const cacheModsEntry = await mimDB.getCache("fomo_modrinth_mods");
      
      if (!cachePicksEntry?.data && !cacheModsEntry?.data) {
        setLoading(true);
      }
      
      // 1. Fetch CurseForge Community Picks (Collections)
      const picksRes = await fetch("/api/curseforge/picks");
      if (picksRes.ok) {
        const d = await picksRes.json();
        const picks = d.picks || [];
        setCfPicks(picks);
        await mimDB.setCache("fomo_cf_picks", picks, 12 * 60 * 60 * 1000);
        
        // Pick the latest CurseForge collection to feature its mods
        if (picks.length > 0) {
          const latest = picks[0];
          setLatestCfCollection(latest);
          const cfModsRes = await fetch(`/api/curseforge/picks/${latest.slug}`);
          if (cfModsRes.ok) {
            const md = await cfModsRes.json();
            setLatestCfMods(md.mods || []);
          }
        }
      }

      // 2. We fetch contextual popular and recent from CurseForge
      const cLoader = loader === "fabric" ? "Fabric" : loader === "neoforge" ? "NeoForge" : "Forge";
      
      const cfPopPromise = fetch(`/api/curseforge/discover?sortField=6&sortOrder=desc&gameVersion=${gameVersion}&modLoaderType=${cLoader}`).then(r => r.json());
      const cfRecPromise = fetch(`/api/curseforge/discover?sortField=2&sortOrder=desc&gameVersion=${gameVersion}&modLoaderType=${cLoader}`).then(r => r.json());
      
      // 3. We fetch contextual newest from Modrinth
      const mdLoader = (sinytraActive && (loader === "forge" || loader === "neoforge")) ? "[\"categories:forge\",\"categories:fabric\"]" : `["categories:${loader}"]`;
      const facets = `[${mdLoader},["versions:${gameVersion}"]]`;
      const mdNewPromise = fetch(`https://api.modrinth.com/v2/search?index=newest&limit=10&facets=${encodeURIComponent(facets)}`).then(r => r.json());

      // 4. We fetch the Modrinth official collections (global)
      const collPromise = fetchOfficialCollections();

      const [popData, recData, newMdData, collsData] = await Promise.all([cfPopPromise, cfRecPromise, mdNewPromise, collPromise]);

      if (popData?.mods) setCfPopular(popData.mods.map((m: any) => ({ ...m, _source: "curseforge" })));
      if (recData?.mods) {
        setCfRecent(recData.mods.map((m: any) => ({ ...m, projectType: m.projectType || "mod", _source: "curseforge" })));
      }
      
      if (newMdData?.hits) {
        const mapped = newMdData.hits.map((m: any) => ({
          projectId: m.project_id,
          slug: m.slug,
          title: m.title,
          description: m.description,
          iconUrl: m.icon_url,
          author: m.author,
          downloads: m.downloads,
          projectType: m.project_type,
          categories: m.categories,
          versions: m.versions,
          url: `https://modrinth.com/${m.project_type}/${m.slug}`,
          _source: "modrinth"
        }));
        setNewestMods(mapped);
      }

      if (collsData?.collections && collsData.collections.length > 0) {
        // Tomamos siempre la última colección (la más reciente)
        const latestColl = collsData.collections[0];
        setLatestCollection(latestColl);
        
        const modsData = await fetchCollectionMods(latestColl.id);
        const allMods = modsData.mods ? [...modsData.mods] : [];

        // Añadimos otras 3 colecciones aleatorias para que el carrusel sea muy largo
        const otherColls = collsData.collections.slice(1);
        if (otherColls.length > 0) {
          // Mezclamos y tomamos 3
          const shuffledColls = [...otherColls].sort(() => Math.random() - 0.5).slice(0, 3);
          for (const coll of shuffledColls) {
            const moreModsData = await fetchCollectionMods(coll.id);
            if (moreModsData.mods) {
              allMods.push(...moreModsData.mods);
            }
          }
        }
        
        const mappedMods = allMods.map((m: any) => ({ ...m, _source: "modrinth" }));
        setLatestCollectionMods(mappedMods);
        await mimDB.setCache("fomo_modrinth_mods", mappedMods, 12 * 60 * 60 * 1000);
      }

    } catch (e) {
      console.error("Error loading spotlight", e);
    } finally {
      setLoading(false);
    }
  }, [loader, gameVersion, sinytraActive]);

  useEffect(() => { loadSpotlight(); }, [loadSpotlight]);

  if (loading) {
    return <SpotlightSkeleton />;
  }

  const modrinthMods = latestCollectionMods.map(m => ({ ...m, color: "#1ED760" }));
  const curseForgeFeaturedMods = latestCfMods.map(m => ({ ...m, color: "#f87171" }));

  return (
    <div className="flex-1 flex flex-col xl:flex-row h-full overflow-hidden p-6 gap-8 animate-fade-in">
      
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* LEFT PANE: Typography & Trending (Vertical Tickers) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-between h-full relative xl:max-w-md 2xl:max-w-lg">
        {/* Editorial Header */}
        <div className="mt-0 xl:mt-0 shrink-0">
          <p className="font-mono text-xs uppercase tracking-widest opacity-60 mb-6 flex items-center gap-2">
            <Spotlight className="w-4 h-4" /> Editorial
          </p>
          <AnimatedHeadline />
        </div>

        {/* Bottom Area: Vertical Tickers side-by-side */}
        <div className="mt-8 xl:mt-auto flex h-[40vh] xl:h-[360px] gap-4 pb-2">
          
          {/* Recently Updated Ticker (Y) */}
          {cfRecent.length > 0 && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <h3 className="font-subhead text-xs text-white/80 tracking-wide mb-3 flex items-center gap-2 shrink-0">
                <Clock className="w-3.5 h-3.5 text-blue-400" /> Actualizados
              </h3>
              <div className="flex-1 relative">
                <VerticalTicker 
                  mods={cfRecent} 
                  onOpenVersions={onOpenVersions} 
                  speed={0.5} 
                  color="text-blue-400" 
                  reverse={true}
                  globalLoader={loader}
                  theme={currentTheme}
                />
              </div>
            </div>
          )}

          {/* Newest Created Ticker (Y) */}
          {newestMods.length > 0 && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <h3 className="font-subhead text-xs text-white/80 tracking-wide mb-3 flex items-center gap-2 shrink-0">
                <Calendar className="w-3.5 h-3.5 text-purple-400" /> Recién Creados
              </h3>
              <div className="flex-1 relative">
                <VerticalTicker 
                  mods={newestMods} 
                  onOpenVersions={onOpenVersions} 
                  speed={0.6} 
                  color="text-purple-400" 
                  theme={currentTheme}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* RIGHT PANE: Horizontal Editorial Marquees (Stacked) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div 
        id="onboarding-spotlight-carousel"
        className="flex-1 h-[70vh] xl:h-full relative rounded-[2.5rem] overflow-hidden flex flex-col py-6 gap-6" 
        style={{ 
          background: paneBg,
          border: paneBorder,
          boxShadow: paneShadow,
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)"
        }}
      >
        {/* Decorative Glass Highlights and Ambient Glow */}
        <div 
          className="absolute inset-x-0 top-0 h-px w-full z-0 opacity-70" 
          style={{ 
            background: isModern 
              ? "linear-gradient(90deg, transparent, rgba(255,255,255,1), transparent)" 
              : isVampire 
              ? "linear-gradient(90deg, transparent, rgba(187,150,228,0.8), transparent)" 
              : "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)" 
          }} 
        />
        <div 
          className="absolute -top-40 -left-40 w-96 h-96 rounded-full blur-[120px] opacity-30 pointer-events-none z-0" 
          style={{ background: isModern ? "#ffffff" : isVampire ? "#bb96e4" : "#ffffff" }} 
        />
        
        {/* Row 1 & 2 Toggled: Modrinth / CurseForge */}
        <div className="flex-1 w-full min-h-0 flex flex-col gap-3 relative z-10 overflow-hidden">
          {/* Header with Toggle */}
          <div className="px-8 shrink-0 flex items-center justify-between">
            <span className="px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase bg-white/5 text-white/80 border border-white/10 shadow-sm backdrop-blur-md">
              {activePlatform === "modrinth" 
                ? (latestCollection?.name || "Modrinth Picks")
                : "CurseForge Community Picks"}
            </span>
            
            {/* Toggle Button */}
            <button
              onClick={() => setActivePlatform(activePlatform === "modrinth" ? "curseforge" : "modrinth")}
              className="flex items-center gap-1 px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase bg-white/5 text-white/80 border border-white/10 shadow-sm backdrop-blur-md hover:bg-white/10 transition-colors"
            >
              <span>{activePlatform === "modrinth" ? "Ver CurseForge" : "Ver Modrinth"}</span>
              <ChevronRight className={`w-3 h-3 transform transition-transform ${activePlatform === "curseforge" ? "rotate-180" : ""}`} />
            </button>
          </div>

          {/* Marquee Content — takes remaining space, cards NOT clipped */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {activePlatform === "modrinth" ? (
              <HorizontalEditorialMarquee 
                items={modrinthMods} 
                type="mod"
                onOpenVersions={onOpenVersions} 
                onDownload={onDownloadMod} 
                downloading={downloading} 
                speed={0.7}
                reverse={true} 
                globalLoader={loader}
                theme={currentTheme}
              />
            ) : (
              <HorizontalEditorialMarquee 
                items={cfPicks} 
                type="collection"
                onOpenCollection={onOpenCollection}
                speed={0.6}
                reverse={true} 
                accentColor={COLORS.primary}
                theme={currentTheme}
              />
            )}
          </div>
        </div>

        {/* Row 3: Multi-channel Showcase */}
        <div className="w-full shrink-0">
          <SpotlightShowcaseRow theme={currentTheme} />
        </div>
      </div>

    </div>
  );
}