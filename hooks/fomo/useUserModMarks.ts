"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/core/supabaseClient";
import { mimDB } from "@/lib/storage/indexeddb";
import { useActiveDraft } from "@/hooks/fomo/useActiveDraft";

function modKey(platform: string, projectId: string) {
  const p = platform === "curseforge" ? "curseforge" : "modrinth";
  return `${p}:${projectId}`;
}

export function useUserModMarks(userId?: string | null) {
  const [followedKeys, setFollowedKeys] = useState<Set<string>>(new Set());
  const [favoriteKeys, setFavoriteKeys] = useState<Set<string>>(new Set());
  const { activeDraft, isProjectInDraft } = useActiveDraft();

  const reload = useCallback(async () => {
    try {
      await mimDB.init();
      const mods = await mimDB.getAllFollowedMods();
      const keys = new Set(
        mods
          .map((m: { projectId?: string; data?: { projectId?: string; _source?: string } }) => {
            const id = m.data?.projectId || m.projectId;
            if (!id) return null;
            const src = m.data?._source === "curseforge" ? "curseforge" : "modrinth";
            return modKey(src, String(id));
          })
          .filter(Boolean) as string[],
      );
      setFollowedKeys(keys);
    } catch {
      // ignore
    }

    if (!userId) {
      setFavoriteKeys(new Set());
      return;
    }

    try {
      const { data } = await supabase
        .from("favorite_mods")
        .select("mod_id, platform")
        .eq("profile_id", userId);
      setFavoriteKeys(
        new Set((data || []).map((r) => modKey(r.platform || "modrinth", String(r.mod_id)))),
      );
    } catch {
      // ignore
    }
  }, [userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const onChange = () => void reload();
    window.addEventListener("fomo-draft-items-changed", onChange);
    window.addEventListener("mim-followed-mods-changed", onChange);
    window.addEventListener("fomo-community-favorite-changed", onChange);
    return () => {
      window.removeEventListener("fomo-draft-items-changed", onChange);
      window.removeEventListener("mim-followed-mods-changed", onChange);
      window.removeEventListener("fomo-community-favorite-changed", onChange);
    };
  }, [reload]);

  const isFollowedByUser = useCallback(
    (platformKey: string, projectId: string) =>
      followedKeys.has(modKey(platformKey, projectId)),
    [followedKeys],
  );

  const isFavoritedByUser = useCallback(
    (platformKey: string, projectId: string) =>
      favoriteKeys.has(modKey(platformKey, projectId)),
    [favoriteKeys],
  );

  const isInActiveDraft = useCallback(
    (projectId: string) => isProjectInDraft(projectId),
    [isProjectInDraft],
  );

  return {
    activeDraft,
    isFollowedByUser,
    isFavoritedByUser,
    isInActiveDraft,
    reload,
  };
}
