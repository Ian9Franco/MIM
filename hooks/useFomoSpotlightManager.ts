import { useState, useEffect, useCallback } from "react";
import { fetchCurseForgeFeatured, fetchOfficialCollections, fetchCollectionMods } from "@/services/api";
import type { ModHit } from "@/lib/core/types";
import { mimDB } from "@/lib/storage/indexeddb";

interface ModrinthSearchHit {
  project_id: string;
  slug: string;
  title: string;
  icon_url?: string;
  author: string;
  project_type: string;
}

interface StoredModEntry {
  projectId: string;
  [key: string]: unknown;
}

export function useFomoSpotlightManager(loader: string, gameVersion: string, sinytraActive: boolean) {
  const [loading, setLoading] = useState(true);
  const [cfFeatured, setCfFeatured] = useState<ModHit[]>([]);
  const [cfRecent, setCfRecent] = useState<ModHit[]>([]);
  const [newestMods, setNewestMods] = useState<ModHit[]>([]);
  const [latestCollectionMods, setLatestCollectionMods] = useState<ModHit[]>([]);
  const [followedUpdates, setFollowedUpdates] = useState<ModHit[]>([]);
  const [theme, setTheme] = useState<"official" | "vampire" | "modern">("official");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const cfData = await fetchCurseForgeFeatured();
      if (cfData.featured) setCfFeatured(cfData.featured.map((m) => ({ ...m, _source: "curseforge" as const })));
      
      const cLoader = loader === "fabric" ? "Fabric" : "Forge";
      const resRecent = await fetch(`/api/curseforge/discover?sortField=2&sortOrder=desc&gameVersion=${gameVersion}&modLoaderType=${cLoader}`);
      if (resRecent.ok) { 
        const d = await resRecent.json(); 
        const modsList = Array.isArray(d.mods) ? (d.mods as ModHit[]) : [];
        setCfRecent(modsList.map((m) => ({ ...m, _source: "curseforge" as const }))); 
      }

      const mdLoader = sinytraActive ? "[\"categories:forge\",\"categories:fabric\"]" : `["categories:${loader}"]`;
      const facets = `[${mdLoader},["versions:${gameVersion}"]]`;
      const resNew = await fetch(`https://api.modrinth.com/v2/search?index=newest&limit=10&facets=${encodeURIComponent(facets)}`);
      if (resNew.ok) { 
        const d = await resNew.json(); 
        const hits = Array.isArray(d.hits) ? (d.hits as ModrinthSearchHit[]) : [];
        setNewestMods(hits.map((m) => ({ projectId: m.project_id, slug: m.slug, title: m.title, iconUrl: m.icon_url, author: m.author, projectType: m.project_type, _source: "modrinth" as const } as ModHit))); 
      }

      const colls = await fetchOfficialCollections();
      if (colls.collections?.length > 0) {
        const m = await fetchCollectionMods(colls.collections[0].id);
        const mods = Array.isArray(m.mods) ? m.mods : [];
        setLatestCollectionMods(mods.map((x) => ({ ...x, _source: "modrinth" as const })));
      }
    } catch (err) {
      console.error("[useFomoSpotlightManager] Error loading spotlight data:", err);
    } finally { 
      setLoading(false); 
    }
  }, [loader, gameVersion, sinytraActive]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const check = async () => {
      try {
        await mimDB.init();
        const mods = await mimDB.getAllFollowedMods();
        const stored = mods.map((m) => m.data as StoredModEntry);
        
        let status: Record<string, { status?: string }> = {};
        const cacheStatusEntry = await mimDB.getCache("mim_modrinth_status");
        if (cacheStatusEntry?.data && typeof cacheStatusEntry.data === "object") {
          status = cacheStatusEntry.data as Record<string, { status?: string }>;
        } else {
          const lsStatus = localStorage.getItem("mim_modrinth_status");
          if (lsStatus) {
            try { 
              status = JSON.parse(lsStatus); 
            } catch (e) {
              console.warn("[useFomoSpotlightManager] Corrupt mim_modrinth_status in localStorage:", e);
            }
          }
        }
        
        setFollowedUpdates(stored.filter((m) => status[`collection:${m.projectId}`]?.status === "update_available") as unknown as ModHit[]);
      } catch (err) {
        console.error("Error checking followed updates in spotlight manager", err);
      }
    };
    check();
    window.addEventListener("mim-followed-mods-changed", check);
    window.addEventListener("mim-modrinth-status-changed", check);
    return () => { 
      window.removeEventListener("mim-followed-mods-changed", check); 
      window.removeEventListener("mim-modrinth-status-changed", check); 
    };
  }, []);

  useEffect(() => {
    const update = () => {
      const currentTheme = document.documentElement.getAttribute("data-theme");
      if (currentTheme === "official" || currentTheme === "vampire" || currentTheme === "modern") {
        setTheme(currentTheme);
      } else {
        setTheme("official");
      }
    };
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  return { loading, cfFeatured, cfRecent, newestMods, latestCollectionMods, followedUpdates, theme };
}

