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
      const res = await fetch(`/api/${apiSource}/versions?projectId=${mod.projectId}&loader=${loader}&projectType=${mod.projectType || projectType}`);
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

  const handleOpenProjectById = useCallback(async (id: string) => {
    // Logic for opening by ID
    setVersLoading(true);
    try {
      const res = await fetch(`/api/modrinth/project?projectId=${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectingVersionFor(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setVersLoading(false);
    }
  }, []);

  return { selectingVersionFor, setSelectingVersionFor, projectVersions, versLoading, handleOpenVersionSelector, handleOpenProjectById };
}
