import { useState, useEffect, useCallback } from "react";
import { SortOrder } from "../../constants/app";

export type DiscoverViewMode = "list" | "gallery" | "card";
export const DISCOVER_PAGE_SIZES = [21, 42, 63] as const;

export function useFomoFilters(defaultLoader = "unknown", defaultGameVersion = "") {
  const [source, setSourceRaw] = useState<"modrinth" | "curseforge" | "all" | "chunk">("all");
  const [loader, setLoaderRaw] = useState(defaultLoader);
  const [gameVersions, setGameVersionsRaw] = useState<string[]>(
    defaultGameVersion ? [defaultGameVersion] : []
  );
  const [projectType, setProjectTypeRaw] = useState("mod");
  const [categories, setCategoriesRaw] = useState<string[]>([]);
  const [environments, setEnvironmentsRaw] = useState<string[]>([]);
  const [sortOrder, setSortOrderRaw] = useState<SortOrder>("relevance");
  const [query, setQueryRaw] = useState("");
  const [sinytraActive, setSinytraActive] = useState(false);
  const [page, setPage] = useState(1);
  const [onlyExclusives, setOnlyExclusives] = useState(false);
  const [collectionId, setCollectionIdRaw] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<DiscoverViewMode>("list");
  const [pageSize, setPageSizeRaw] = useState<number>(21);

  const setSource = useCallback((next: "modrinth" | "curseforge" | "all" | "chunk") => {
    setSourceRaw(next);
    setPage(1);
  }, []);
  const setLoader = useCallback((next: string) => {
    setLoaderRaw(next);
    setPage(1);
  }, []);
  const setGameVersions = useCallback((next: string[]) => {
    setGameVersionsRaw(next);
    setPage(1);
  }, []);
  const setProjectType = useCallback((next: string) => {
    setProjectTypeRaw(next);
    setPage(1);
  }, []);
  const setCategories = useCallback((next: string[]) => {
    setCategoriesRaw(next);
    setPage(1);
  }, []);
  const setEnvironments = useCallback((next: string[]) => {
    setEnvironmentsRaw(next);
    setPage(1);
  }, []);
  const setQuery = useCallback((next: string) => {
    setQueryRaw(next);
    setPage(1);
  }, []);
  const setCollectionId = useCallback((next: string | null) => {
    setCollectionIdRaw(next);
    setPage(1);
  }, []);
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
        if (nextSource) setSourceRaw(nextSource);
        if (!migratedDefaultsV3 && s.loader === "forge" && Array.isArray(s.gameVersions) && s.gameVersions.includes("1.20.1")) {
          setLoaderRaw("unknown");
          setGameVersionsRaw([]);
        } else {
          if (s.loader) setLoaderRaw(s.loader);
          if (s.gameVersions) setGameVersionsRaw(s.gameVersions);
        }
        if (s.projectType) setProjectTypeRaw(s.projectType);
        if (s.sortOrder) setSortOrderRaw(s.sortOrder);
        if (s.query) setQueryRaw(s.query);
        if (s.sinytraActive !== undefined) setSinytraActive(s.sinytraActive);
        if (Array.isArray(s.categories)) setCategoriesRaw(s.categories);
        if (Array.isArray(s.environments)) setEnvironmentsRaw(s.environments);
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
