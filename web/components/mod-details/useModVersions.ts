"use client";

import { useState, useCallback, useEffect } from "react";
import type { FomoModDetails } from "../../types/fomo";
import type { ModHit } from "../SpotlightMarquees";
import {
  KNOWN_LOADERS,
  DEFAULT_VERSION_FILTERS,
  type VersionRow,
  normalizeVersionRows,
  translateDescription,
} from "./utils";

interface UseModVersionsOptions {
  selectedMod: ModHit | null;
  selectedModDetails: FomoModDetails | null;
}

export function useModVersions({ selectedMod, selectedModDetails }: UseModVersionsOptions) {
  const [expandedVersionId, setExpandedVersionId] = useState<string | null>(null);
  const [versionChangelogs, setVersionChangelogs] = useState<Record<string, string>>({});
  const [loadingVersionChangelog, setLoadingVersionChangelog] = useState<string | null>(null);
  const [translatedVersionChangelogs, setTranslatedVersionChangelogs] = useState<Record<string, string>>({});
  const [translatingVersionChangelog, setTranslatingVersionChangelog] = useState<string | null>(null);
  const [selectedGameVersionFilters, setSelectedGameVersionFilters] = useState<string[]>(DEFAULT_VERSION_FILTERS);
  const [selectedLoaderFilters, setSelectedLoaderFilters] = useState<string[]>([]);

  // Reset states when selected project changes
  useEffect(() => {
    setExpandedVersionId(null);
    setVersionChangelogs({});
    setLoadingVersionChangelog(null);
    setTranslatedVersionChangelogs({});
    setTranslatingVersionChangelog(null);
    setSelectedGameVersionFilters(DEFAULT_VERSION_FILTERS);
    setSelectedLoaderFilters([]);
  }, [selectedMod?.projectId]);

  const versionRows = normalizeVersionRows(selectedModDetails);
  const availableGameVersionFilters = Array.from(
    new Set(versionRows.flatMap((version) => version.gameVersions))
  );
  const activeGameVersionFilters = selectedGameVersionFilters.filter((version) =>
    availableGameVersionFilters.includes(version)
  );
  const availableVersionLoaderFilters = Array.from(
    new Set(versionRows.flatMap((version) => version.loaders.map((loader) => loader.toLowerCase())))
  ).filter((loader) => KNOWN_LOADERS.includes(loader as (typeof KNOWN_LOADERS)[number]));
  const activeLoaderFilters = selectedLoaderFilters.filter((loader) =>
    availableVersionLoaderFilters.includes(loader)
  );
  const filteredVersionRows = versionRows.filter((version) => {
    const matchesGameVersion =
      activeGameVersionFilters.length === 0 ||
      version.gameVersions.some((gameVersion) => activeGameVersionFilters.includes(gameVersion));
    const matchesLoader =
      activeLoaderFilters.length === 0 ||
      version.loaders.some((loader) => activeLoaderFilters.includes(loader.toLowerCase()));
    return matchesGameVersion && matchesLoader;
  });

  const handleToggleGameVersionFilter = useCallback((gameVersion: string) => {
    setSelectedGameVersionFilters((current) =>
      current.includes(gameVersion)
        ? current.filter((version) => version !== gameVersion)
        : [...current, gameVersion]
    );
    setExpandedVersionId(null);
  }, []);

  const handleToggleLoaderFilter = useCallback((loader: string) => {
    setSelectedLoaderFilters((current) =>
      current.includes(loader)
        ? current.filter((value) => value !== loader)
        : [...current, loader]
    );
    setExpandedVersionId(null);
  }, []);

  const handleToggleVersion = useCallback(
    async (version: VersionRow) => {
      if (expandedVersionId === version.id) {
        setExpandedVersionId(null);
        return;
      }
      setExpandedVersionId(version.id);
      if (version.changelog || versionChangelogs[version.id] || selectedMod?._source !== "curseforge") return;

      setLoadingVersionChangelog(version.id);
      try {
        const res = await fetch(
          `/api/curseforge/file-changelog?projectId=${encodeURIComponent(
            selectedMod.projectId
          )}&fileId=${encodeURIComponent(version.id)}`
        );
        if (!res.ok) throw new Error();
        const data = await res.json();
        setVersionChangelogs((prev) => ({ ...prev, [version.id]: data.changelog || "" }));
      } catch {
        setVersionChangelogs((prev) => ({ ...prev, [version.id]: "" }));
      } finally {
        setLoadingVersionChangelog(null);
      }
    },
    [expandedVersionId, selectedMod, versionChangelogs]
  );

  const handleTranslateVersionChangelog = useCallback(
    async (version: VersionRow, changelog: string) => {
      if (!changelog || translatingVersionChangelog) return;
      if (translatedVersionChangelogs[version.id]) {
        setTranslatedVersionChangelogs((prev) => {
          const next = { ...prev };
          delete next[version.id];
          return next;
        });
        return;
      }

      setTranslatingVersionChangelog(version.id);
      try {
        const html = await translateDescription(
          `${selectedMod?.projectId || "version"}:changelog:${version.id}`,
          changelog
        );
        setTranslatedVersionChangelogs((prev) => ({ ...prev, [version.id]: html }));
      } finally {
        setTranslatingVersionChangelog(null);
      }
    },
    [selectedMod?.projectId, translatedVersionChangelogs, translatingVersionChangelog]
  );

  return {
    versionRows,
    filteredVersionRows,
    availableGameVersionFilters,
    selectedGameVersionFilters,
    handleToggleGameVersionFilter,
    availableVersionLoaderFilters,
    selectedLoaderFilters,
    handleToggleLoaderFilter,
    expandedVersionId,
    handleToggleVersion,
    versionChangelogs,
    loadingVersionChangelog,
    translatedVersionChangelogs,
    translatingVersionChangelog,
    handleTranslateVersionChangelog,
  };
}
