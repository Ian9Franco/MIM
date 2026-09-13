import { useState, useEffect, useCallback, useMemo } from "react";
import type { ModHit } from "@/lib/core/types";
import { mimDB } from "@/lib/storage/indexeddb";
import { getCurrentUserId, pushFollowAuthorToCloud, pushFollowModToCloud, syncCloudFollowsToLocal } from "@/lib/fomo/followedSyncService";

export function useFomoFollowedManager() {
  const [subTab, setSubTab] = useState<"projects" | "authors" | "history" | "showcases">("projects");
  const [followedAuthors, setFollowedAuthors] = useState<any[]>([]);
  const [followedMods, setFollowedMods] = useState<ModHit[]>([]);
  const [modrinthStatus, setModrinthStatus] = useState<Record<string, any>>({});
  const [showOnlyWithUpdates, setShowOnlyWithUpdates] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("fomo_active_subtab") as any;
      if (saved) {
        setSubTab(saved);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("fomo_active_subtab", subTab);
  }, [subTab]);

  const loadFromStorage = useCallback(async (mergeCloud = false) => {
    try {
      await mimDB.init();
      const userId = mergeCloud ? await getCurrentUserId() : null;
      if (userId) {
        setSyncing(true);
        const merged = await syncCloudFollowsToLocal(userId);
        setFollowedAuthors(merged.authors.filter((a: any) => a?.name && a.name !== "Autor Desconocido"));
        setFollowedMods(merged.mods);
        setLastSyncedAt(Date.now());
        setSyncing(false);
      } else {
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
        setFollowedMods(mods.map((m: any) => m.data));
      }

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
          } catch (e) {
            console.warn("[useFomoFollowedManager] Error parsing legacy mim_modrinth_status:", e);
          }
        }
      }
      setModrinthStatus(statusData);
    } catch (err) {
      console.error("Error loading followed data from IndexedDB", err);
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    loadFromStorage(true);

    const handleEvent = () => { loadFromStorage(false); };

    window.addEventListener("mim-followed-authors-changed", handleEvent);
    window.addEventListener("mim-followed-mods-changed", handleEvent);
    window.addEventListener("mim-modrinth-status-changed", handleEvent);
    return () => {
      window.removeEventListener("mim-followed-authors-changed", handleEvent);
      window.removeEventListener("mim-followed-mods-changed", handleEvent);
      window.removeEventListener("mim-modrinth-status-changed", handleEvent);
    };
  }, [loadFromStorage]);

  const refreshFromCloud = useCallback(async () => {
    await loadFromStorage(true);
  }, [loadFromStorage]);

  const handleUnfollowAuthor = useCallback(async (author: string) => {
    const entry = followedAuthors.find((a: any) => a.name === author);
    await mimDB.deleteFollowedAuthor(author);
    const next = followedAuthors.filter((a: any) => a.name !== author);
    setFollowedAuthors(next);
    window.dispatchEvent(new CustomEvent("mim-followed-authors-changed", { detail: next }));
    const userId = await getCurrentUserId();
    if (userId) {
      void pushFollowAuthorToCloud(userId, author, entry?.url, entry?.iconUrl, entry?.platform || "modrinth", false);
    }
  }, [followedAuthors]);

  const handleUnfollowMod = useCallback(async (id: string) => {
    const mod = followedMods.find((m) => m.projectId === id);
    await mimDB.deleteFollowedMod(id);
    const next = followedMods.filter(m => m.projectId !== id);
    setFollowedMods(next);
    window.dispatchEvent(new CustomEvent("mim-followed-mods-changed", { detail: next }));
    const userId = await getCurrentUserId();
    if (userId && mod) {
      void pushFollowModToCloud(userId, mod, false);
    }
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

  return {
    subTab, setSubTab, followedAuthors, followedMods, filteredMods,
    showOnlyWithUpdates, setShowOnlyWithUpdates, getModUpdateInfo,
    handleUnfollowAuthor, handleUnfollowMod, isRecent,
    syncing, lastSyncedAt, refreshFromCloud,
  };
}

