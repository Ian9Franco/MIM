import { useState, useEffect, useCallback, useMemo } from "react";
import type { ModHit } from "@/lib/types";

export function useFomoFollowedManager() {
  const [subTab, setSubTab] = useState<"projects" | "authors">("projects");
  const [followedAuthors, setFollowedAuthors] = useState<string[]>([]);
  const [followedMods, setFollowedMods] = useState<ModHit[]>([]);
  const [modrinthStatus, setModrinthStatus] = useState<Record<string, any>>({});
  const [showOnlyWithUpdates, setShowOnlyWithUpdates] = useState(false);

  useEffect(() => {
    const load = () => {
      try {
        setFollowedAuthors(JSON.parse(localStorage.getItem("mim_followed_authors") || "[]"));
        setFollowedMods(JSON.parse(localStorage.getItem("mim_followed_mods") || "[]"));
        setModrinthStatus(JSON.parse(localStorage.getItem("mim_modrinth_status") || "{}"));
      } catch {}
    };
    load();
    window.addEventListener("mim-followed-authors-changed", load);
    window.addEventListener("mim-followed-mods-changed", load);
    window.addEventListener("mim-modrinth-status-changed", load);
    return () => { window.removeEventListener("mim-followed-authors-changed", load); window.removeEventListener("mim-followed-mods-changed", load); window.removeEventListener("mim-modrinth-status-changed", load); };
  }, []);

  const handleUnfollowAuthor = useCallback((author: string) => {
    const next = followedAuthors.filter(a => a !== author);
    setFollowedAuthors(next);
    localStorage.setItem("mim_followed_authors", JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("mim-followed-authors-changed", { detail: next }));
  }, [followedAuthors]);

  const handleUnfollowMod = useCallback((id: string) => {
    const next = followedMods.filter(m => m.projectId !== id);
    setFollowedMods(next);
    localStorage.setItem("mim_followed_mods", JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("mim-followed-mods-changed", { detail: next }));
  }, [followedMods]);

  const getModUpdateInfo = useCallback((id: string) => {
    const s = modrinthStatus[`collection:${id}`];
    return (s && s.status === "update_available") ? s : null;
  }, [modrinthStatus]);

  const filteredMods = useMemo(() => showOnlyWithUpdates ? followedMods.filter(m => !!getModUpdateInfo(m.projectId)) : followedMods, [followedMods, showOnlyWithUpdates, getModUpdateInfo]);

  return { subTab, setSubTab, followedAuthors, followedMods, filteredMods, showOnlyWithUpdates, setShowOnlyWithUpdates, getModUpdateInfo, handleUnfollowAuthor, handleUnfollowMod };
}
