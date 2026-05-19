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

  const handleOpenProjectById = useCallback(async (id: string) => {
    // Logic for opening by ID
    setVersLoading(true);
    try {
      const res = await fetch(`/api/modrinth/project?projectId=${id}`);
      if (res.ok) {
        const data = await res.json();
        const rawCategories = data.categories || [];
        const normalizedCategories = Array.from(new Set(rawCategories.map((c: any) => {
          if (typeof c === "string") return c;
          if (c && typeof c === "object") {
            if (typeof c.name === "string") return c.name;
            if (typeof c.slug === "string") return c.slug;
          }
          return "";
        }).filter(Boolean)));
        setSelectingVersionFor({ ...data, categories: normalizedCategories });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setVersLoading(false);
    }
  }, []);

  return { selectingVersionFor, setSelectingVersionFor, projectVersions, versLoading, handleOpenVersionSelector, handleOpenLiveProject, handleOpenProjectById };
}
