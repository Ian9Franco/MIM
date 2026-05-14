import { useState, useEffect, useCallback } from "react";
import { fetchCurseForgeFeatured, fetchOfficialCollections, fetchCollectionMods } from "@/services/api";
import type { ModHit, CollectionEntry } from "@/lib/types";

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
      if (cfData.featured) setCfFeatured(cfData.featured.map((m: any) => ({ ...m, _source: "curseforge" })));
      
      const cLoader = loader === "fabric" ? "Fabric" : "Forge";
      const resRecent = await fetch(`/api/curseforge/discover?sortField=2&sortOrder=desc&gameVersion=${gameVersion}&modLoaderType=${cLoader}`);
      if (resRecent.ok) { const d = await resRecent.json(); setCfRecent(d.mods.map((m: any) => ({ ...m, _source: "curseforge" }))); }

      const mdLoader = sinytraActive ? "[\"categories:forge\",\"categories:fabric\"]" : `["categories:${loader}"]`;
      const facets = `[${mdLoader},["versions:${gameVersion}"]]`;
      const resNew = await fetch(`https://api.modrinth.com/v2/search?index=newest&limit=10&facets=${encodeURIComponent(facets)}`);
      if (resNew.ok) { 
        const d = await resNew.json(); 
        setNewestMods(d.hits.map((m: any) => ({ projectId: m.project_id, slug: m.slug, title: m.title, iconUrl: m.icon_url, author: m.author, projectType: m.project_type, _source: "modrinth" }))); 
      }

      const colls = await fetchOfficialCollections();
      if (colls.collections?.length > 0) {
        const m = await fetchCollectionMods(colls.collections[0].id);
        setLatestCollectionMods(m.mods.map((x: any) => ({ ...x, _source: "modrinth" })));
      }
    } catch {} finally { setLoading(false); }
  }, [loader, gameVersion, sinytraActive]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const check = () => {
      try {
        const stored = JSON.parse(localStorage.getItem("mim_followed_mods") || "[]");
        const status = JSON.parse(localStorage.getItem("mim_modrinth_status") || "{}");
        setFollowedUpdates(stored.filter((m: any) => status[`collection:${m.projectId}`]?.status === "update_available"));
      } catch {}
    };
    check();
    window.addEventListener("mim-followed-mods-changed", check);
    window.addEventListener("mim-modrinth-status-changed", check);
    return () => { window.removeEventListener("mim-followed-mods-changed", check); window.removeEventListener("mim-modrinth-status-changed", check); };
  }, []);

  useEffect(() => {
    const update = () => setTheme(document.documentElement.getAttribute("data-theme") as any || "official");
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  return { loading, cfFeatured, cfRecent, newestMods, latestCollectionMods, followedUpdates, theme };
}
