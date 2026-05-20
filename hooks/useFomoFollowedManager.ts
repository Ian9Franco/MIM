import { useState, useEffect, useCallback, useMemo } from "react";
import type { ModHit } from "@/lib/types";
import { mimDB } from "@/lib/indexeddb";

export function useFomoFollowedManager() {
  const [subTab, setSubTab] = useState<"projects" | "authors" | "history" | "showcases">(
    () => (typeof window !== "undefined" ? localStorage.getItem("fomo_active_subtab") as any : "projects") || "projects"
  );
  const [followedAuthors, setFollowedAuthors] = useState<any[]>([]);
  const [followedMods, setFollowedMods] = useState<ModHit[]>([]);
  const [modrinthStatus, setModrinthStatus] = useState<Record<string, any>>({});
  const [showOnlyWithUpdates, setShowOnlyWithUpdates] = useState(false);

  useEffect(() => {
    localStorage.setItem("fomo_active_subtab", subTab);
  }, [subTab]);

  useEffect(() => {
    const load = async () => {
      try {
        await mimDB.init(); // Aseguramos que la DB esté lista
        let authors = await mimDB.getAllFollowedAuthors();
        let mods = await mimDB.getAllFollowedMods();
        
        // Migración desde localStorage si IndexedDB está vacío
        if (authors.length === 0) {
          const lsAuthors = JSON.parse(localStorage.getItem("mim_followed_authors") || "[]");
          if (lsAuthors.length > 0) {
            for (const a of lsAuthors) {
              const name = typeof a === "string" ? a : a.name;
              const iconUrl = typeof a === "string" ? null : a.iconUrl;
              await mimDB.setFollowedAuthor({ name, iconUrl, dateFollowed: Date.now() });
            }
            authors = await mimDB.getAllFollowedAuthors();
          }
        }
        
        if (mods.length === 0) {
          const lsMods = JSON.parse(localStorage.getItem("mim_followed_mods") || "[]");
          if (lsMods.length > 0) {
            for (const m of lsMods) {
              await mimDB.setFollowedMod({ projectId: m.projectId, data: m, dateFollowed: Date.now() });
            }
            mods = await mimDB.getAllFollowedMods();
          }
        }

        // Normalizamos a objetos si eran strings (datos heredados)
        const normalizedAuthors = authors.map((a: any) => typeof a === "string" ? { name: a, iconUrl: null } : a);
        const cleanAuthors = normalizedAuthors.filter((a: any) => a && a.name && a.name !== "Autor Desconocido");
        
        setFollowedAuthors(cleanAuthors);
        // Extraemos el data de los objetos de IndexedDB para mantener compatibilidad con ModHit[]
        setFollowedMods(mods.map((m: any) => m.data));

        let statusData = {};
        const cacheStatusEntry = await mimDB.getCache("mim_modrinth_status");
        if (cacheStatusEntry?.data) {
          statusData = cacheStatusEntry.data;
        } else {
          const lsStatus = localStorage.getItem("mim_modrinth_status");
          if (lsStatus) {
            try {
              statusData = JSON.parse(lsStatus);
              await mimDB.setCache("mim_modrinth_status", statusData, 30 * 24 * 60 * 60 * 1000);
              localStorage.removeItem("mim_modrinth_status");
            } catch (e) {}
          }
        }
        setModrinthStatus(statusData);
      } catch (err) {
        console.error("Error loading followed data from IndexedDB", err);
      }
    };
    load();
    
    const handleEvent = () => { load(); };
    
    window.addEventListener("mim-followed-authors-changed", handleEvent);
    window.addEventListener("mim-followed-mods-changed", handleEvent);
    window.addEventListener("mim-modrinth-status-changed", handleEvent);
    return () => {
      window.removeEventListener("mim-followed-authors-changed", handleEvent);
      window.removeEventListener("mim-followed-mods-changed", handleEvent);
      window.removeEventListener("mim-modrinth-status-changed", handleEvent);
    };
  }, []);

  const handleUnfollowAuthor = useCallback(async (author: string) => {
    await mimDB.deleteFollowedAuthor(author);
    const next = followedAuthors.filter((a: any) => a.name !== author);
    setFollowedAuthors(next);
    window.dispatchEvent(new CustomEvent("mim-followed-authors-changed", { detail: next }));
  }, [followedAuthors]);

  const handleUnfollowMod = useCallback(async (id: string) => {
    await mimDB.deleteFollowedMod(id);
    const next = followedMods.filter(m => m.projectId !== id);
    setFollowedMods(next);
    window.dispatchEvent(new CustomEvent("mim-followed-mods-changed", { detail: next }));
  }, [followedMods]);

  const getModUpdateInfo = useCallback((id: string) => {
    const s = modrinthStatus[`collection:${id}`];
    return (s && s.status === "update_available") ? s : null;
  }, [modrinthStatus]);

  const filteredMods = useMemo(() => showOnlyWithUpdates ? followedMods.filter(m => !!getModUpdateInfo(m.projectId)) : followedMods, [followedMods, showOnlyWithUpdates, getModUpdateInfo]);

  const isRecent = useCallback((mod: ModHit) => {
    const dateStr = mod.dateModified || mod.dateCreated;
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 15;
  }, []);

  return { subTab, setSubTab, followedAuthors, followedMods, filteredMods, showOnlyWithUpdates, setShowOnlyWithUpdates, getModUpdateInfo, handleUnfollowAuthor, handleUnfollowMod, isRecent };
}

