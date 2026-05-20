import { useState, useCallback } from "react";
import { ModHit, VersionEntry } from "@/lib/types";

export function useFomoDetails(source: string, loader: string, projectType: string, sinytraActive: boolean) {
  const [selectingVersionFor, setSelectingVersionFor] = useState<ModHit | null>(null);
  const [projectVersions, setProjectVersions] = useState<VersionEntry[]>([]);
  const [versLoading, setVersLoading] = useState(false);

  const handleOpenVersionSelector = useCallback(async (mod: ModHit) => {
    setSelectingVersionFor(mod);
    setVersLoading(true);
    try {
      const apiSource = mod._source === "curseforge" ? "curseforge" : "modrinth";
      const res = await fetch(`/api/${apiSource}/versions?projectId=${mod.projectId}&loader=all&projectType=${mod.projectType || projectType}`);
      if (res.ok) {
        const data = await res.json();
        setProjectVersions(data.versions ?? []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setVersLoading(false);
    }
  }, [loader, projectType]);

  const handleOpenLiveProject = useCallback(async (mod: ModHit) => {
    setSelectingVersionFor(mod); // Mostramos lo que tenemos mientras carga
    setVersLoading(true);
    try {
      const apiSource = mod._source === "curseforge" ? "curseforge" : "modrinth";
      const endpoint = apiSource === "curseforge" 
        ? `/api/curseforge/project?projectId=${mod.projectId}`
        : `/api/modrinth/project?projectId=${mod.projectId}`;
        
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        
        // Extraemos el autor de los miembros si es Modrinth
        let author = mod.author;
        if (apiSource === "modrinth" && data.members) {
          const owner = data.members.find((m: any) => m.role.toLowerCase() === "owner") || data.members[0];
          if (owner) author = owner.username;
        } else if (apiSource === "curseforge" && data.authors) {
          author = data.authors[0]?.name || author;
        }
        
        // Normalizamos descargas
        let downloads = data.downloads ?? data.downloadCount ?? (mod as any).downloads ?? (mod as any).downloadCount ?? 0;
        if (typeof downloads !== "number" || isNaN(downloads)) {
          downloads = Number(downloads) || 0;
        }
        
        const rawCategories = data.categories || mod.categories || [];
        const normalizedCategories = Array.from(new Set(rawCategories.map((c: any) => {
          if (typeof c === "string") return c;
          if (c && typeof c === "object") {
            if (typeof c.name === "string") return c.name;
            if (typeof c.slug === "string") return c.slug;
          }
          return "";
        }).filter(Boolean)));

        const fullMod = { 
          ...mod, 
          ...data, 
          author,
          downloads,
          categories: normalizedCategories
        };
        setSelectingVersionFor(fullMod);
      }
      
      // Ahora cargamos las versiones
      const versRes = await fetch(`/api/${apiSource}/versions?projectId=${mod.projectId}&loader=all&projectType=${mod.projectType || projectType}`);
      if (versRes.ok) {
        const data = await versRes.json();
        setProjectVersions(data.versions ?? []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setVersLoading(false);
    }
  }, [projectType]);

  const handleOpenProjectById = useCallback(async (id: string, sourcePlatform?: string) => {
    setVersLoading(true);
    try {
      const apiSource = sourcePlatform === "curseforge" ? "curseforge" : "modrinth";
      const endpoint = apiSource === "curseforge" 
        ? `/api/curseforge/project?projectId=${id}`
        : `/api/modrinth/project?projectId=${id}`;
        
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        
        let author = "Creador";
        if (apiSource === "modrinth" && data.members) {
          const owner = data.members.find((m: any) => m.role.toLowerCase() === "owner") || data.members[0];
          if (owner) author = owner.username;
        } else if (apiSource === "curseforge" && data.authors) {
          author = data.authors[0]?.name || author;
        }
        
        let downloads = data.downloads ?? data.downloadCount ?? 0;
        if (typeof downloads !== "number" || isNaN(downloads)) {
          downloads = Number(downloads) || 0;
        }
        
        const rawCategories = data.categories || [];
        const normalizedCategories = Array.from(new Set(rawCategories.map((c: any) => {
          if (typeof c === "string") return c;
          if (c && typeof c === "object") {
            if (typeof c.name === "string") return c.name;
            if (typeof c.slug === "string") return c.slug;
          }
          return "";
        }).filter(Boolean)));

        const pt = data.projectType || data.project_type || (apiSource === "curseforge" ? "mod" : "mod");

        const slug =
          typeof data.slug === "string" && data.slug.length > 0 ? data.slug : String(id);

        const follows =
          typeof data.followers === "number" && !Number.isNaN(data.followers)
            ? data.followers
            : 0;

        const latestVersion =
          data.latest_version != null
            ? String(data.latest_version)
            : data.latestFilesIndexes?.[0]?.gameVersion != null
              ? String(data.latestFilesIndexes[0].gameVersion)
              : null;

        const rawDate = data.published ?? data.dateReleased ?? data.dateCreated;
        const dateCreated =
          rawDate == null || rawDate === ""
            ? ""
            : typeof rawDate === "number"
              ? new Date(rawDate).toISOString()
              : String(rawDate);

        const modHit: ModHit = {
          projectId: id,
          slug,
          title: data.title || data.name || "Proyecto",
          description: data.description || data.summary || "",
          author: author,
          downloads: downloads,
          follows,
          latestVersion,
          iconUrl: data.iconUrl || data.icon_url || data.logo?.url || null,
          url: data.url || (apiSource === "modrinth" ? `https://modrinth.com/${pt}/${id}` : `https://www.curseforge.com/minecraft/${pt}s/${id}`),
          categories: normalizedCategories as string[],
          dateCreated,
          _source: apiSource,
          projectType: pt
        };
        
        setSelectingVersionFor(modHit);
        
        // Cargar versiones
        const versRes = await fetch(`/api/${apiSource}/versions?projectId=${id}&loader=all&projectType=${pt}`);
        if (versRes.ok) {
          const dataV = await versRes.json();
          setProjectVersions(dataV.versions ?? []);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setVersLoading(false);
    }
  }, [projectType]);

  return { selectingVersionFor, setSelectingVersionFor, projectVersions, versLoading, handleOpenVersionSelector, handleOpenLiveProject, handleOpenProjectById };
}
