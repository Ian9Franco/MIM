import { useState, useEffect, useCallback } from "react";
import { SortOrder } from "../../constants/app";

export type DiscoverViewMode = "list" | "gallery" | "card";
export const DISCOVER_PAGE_SIZES = [21, 42, 63] as const;

export function useFomoFilters(defaultLoader = "unknown", defaultGameVersion = "") {
  const [source, setSource] = useState<"modrinth" | "curseforge" | "all" | "chunk">("all");
  const [loader, setLoader] = useState(defaultLoader);
  const [gameVersions, setGameVersions] = useState<string[]>(
    defaultGameVersion ? [defaultGameVersion] : []
  );
  const [projectType, setProjectType] = useState("mod");
  const [categories, setCategories] = useState<string[]>([]);
  const [environments, setEnvironments] = useState<string[]>([]);
  const [sortOrder, setSortOrderRaw] = useState<SortOrder>("relevance");
  const [query, setQuery] = useState("");
  const [sinytraActive, setSinytraActive] = useState(false);
  const [page, setPage] = useState(1);
  const [onlyExclusives, setOnlyExclusives] = useState(false);
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<DiscoverViewMode>("list");
  const [pageSize, setPageSizeRaw] = useState<number>(21);

  const setSortOrder = useCallback((next: SortOrder) => {
    setSortOrderRaw(next);
    setPage(1);
  }, []);

  const setPageSize = useCallback((next: number) => {
    setPageSizeRaw(next);
    setPage(1);
  }, []);

  // Persistence
  useEffect(() => {
    const saved = localStorage.getItem("fomo_discover_state");
    const migratedSource = localStorage.getItem("fomo_discover_source_default_v2") === "1";
    const migratedDefaultsV3 = localStorage.getItem("fomo_discover_defaults_v3") === "1";
    localStorage.setItem("fomo_discover_source_default_v2", "1");
    if (!migratedDefaultsV3) {
      localStorage.setItem("fomo_discover_defaults_v3", "1");
    }
    if (saved) {
      try {
        const s = JSON.parse(saved);
        const nextSource = !migratedSource && s.source === "modrinth" ? "all" : s.source;
        if (nextSource) setSource(nextSource);
        if (!migratedDefaultsV3 && s.loader === "forge" && Array.isArray(s.gameVersions) && s.gameVersions.includes("1.20.1")) {
          setLoader("unknown");
          setGameVersions([]);
        } else {
          if (s.loader) setLoader(s.loader);
          if (s.gameVersions) setGameVersions(s.gameVersions);
        }
        if (s.projectType) setProjectType(s.projectType);
        if (s.sortOrder) setSortOrderRaw(s.sortOrder);
        if (s.query) setQuery(s.query);
        if (s.sinytraActive !== undefined) setSinytraActive(s.sinytraActive);
        if (Array.isArray(s.categories)) setCategories(s.categories);
        if (Array.isArray(s.environments)) setEnvironments(s.environments);
        if (typeof s.page === "number" && s.page >= 1) setPage(s.page);
        if (typeof s.onlyExclusives === "boolean") setOnlyExclusives(s.onlyExclusives);
        if (s.viewMode === "list" || s.viewMode === "gallery" || s.viewMode === "card") setViewMode(s.viewMode);
        if (typeof s.pageSize === "number" && s.pageSize >= 1) setPageSizeRaw(s.pageSize);
      } catch (e) {
        console.warn("[useFomoFilters] Corrupt fomo_discover_state in localStorage:", e);
      }
    }
  }, []);

  useEffect(() => {
    const state = { source, loader, gameVersions, projectType, categories, environments, sortOrder, query, sinytraActive, page, onlyExclusives, viewMode, pageSize };
    localStorage.setItem("fomo_discover_state", JSON.stringify(state));
  }, [source, loader, gameVersions, projectType, categories, environments, sortOrder, query, sinytraActive, page, onlyExclusives, viewMode, pageSize]);

  return {
    source, setSource, loader, setLoader, gameVersions, setGameVersions,
    projectType, setProjectType, categories, setCategories, environments, setEnvironments,
    sortOrder, setSortOrder, query, setQuery, sinytraActive, setSinytraActive,
    page, setPage, onlyExclusives, setOnlyExclusives, collectionId, setCollectionId,
    viewMode, setViewMode, pageSize, setPageSize,
  };
}
