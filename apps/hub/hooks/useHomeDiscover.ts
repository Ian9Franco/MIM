"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { ModHit } from "../components/SpotlightMarquees";
import {
  DEFAULT_DISCOVER_CACHE_STATE,
  readDiscoverCache,
  shouldRunInitialDiscoverSearch,
  writeDiscoverCache,
} from "../lib/discover/discoverCache";
import {
  executeDiscoverSearch,
  type DiscoverFilters,
  type SearchOverrideSource,
} from "../lib/discover/discoverSearch";
import type { DiscoverSource } from "../lib/discover/discoverPayload";

interface UseHomeDiscoverOptions {
  activeTab: string;
  setActiveTab: Dispatch<SetStateAction<string>>;
  closeProjectDetails: () => void;
}

export const HOME_DISCOVER_PUBLIC_KEYS = [
  "discoverQuery",
  "setDiscoverQuery",
  "discoverType",
  "setDiscoverType",
  "discoverVersion",
  "setDiscoverVersion",
  "discoverLoader",
  "setDiscoverLoader",
  "discoverEnvironment",
  "setDiscoverEnvironment",
  "discoverCategory",
  "setDiscoverCategory",
  "discoverSort",
  "setDiscoverSort",
  "discoverResults",
  "setDiscoverResults",
  "discoverLoading",
  "discoverPage",
  "setDiscoverPage",
  "discoverTotal",
  "discoverSource",
  "setDiscoverSource",
  "discoverError",
  "runDiscoverSearch",
  "handleSearchAuthor",
  "handleSearchMod",
] as const;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Error al buscar mods";
}

export function useHomeDiscover({
  activeTab,
  setActiveTab,
  closeProjectDetails,
}: UseHomeDiscoverOptions) {
  const [discoverQuery, setDiscoverQueryState] = useState(DEFAULT_DISCOVER_CACHE_STATE.query);
  const [discoverType, setDiscoverTypeState] = useState(DEFAULT_DISCOVER_CACHE_STATE.projectType);
  const [discoverVersion, setDiscoverVersionState] = useState<string[]>(DEFAULT_DISCOVER_CACHE_STATE.versions);
  const [discoverLoader, setDiscoverLoaderState] = useState<string[]>(DEFAULT_DISCOVER_CACHE_STATE.loaders);
  const [discoverEnvironment, setDiscoverEnvironmentState] = useState(DEFAULT_DISCOVER_CACHE_STATE.environment);
  const [discoverCategory, setDiscoverCategoryState] = useState<string[]>(DEFAULT_DISCOVER_CACHE_STATE.categories);
  const [discoverSort, setDiscoverSortState] = useState(DEFAULT_DISCOVER_CACHE_STATE.sort);
  const [discoverResults, setDiscoverResults] = useState<ModHit[]>(DEFAULT_DISCOVER_CACHE_STATE.results);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverPage, setDiscoverPage] = useState(DEFAULT_DISCOVER_CACHE_STATE.page);
  const [discoverTotal, setDiscoverTotal] = useState(DEFAULT_DISCOVER_CACHE_STATE.total);
  const [discoverSource, setDiscoverSourceState] = useState<DiscoverSource>(DEFAULT_DISCOVER_CACHE_STATE.source);
  const [discoverError, setDiscoverError] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const initialSearchReadyRef = useRef(false);

  useEffect(() => {
    const cached = readDiscoverCache(localStorage);
    setDiscoverQueryState(cached.query);
    setDiscoverTypeState(cached.projectType);
    setDiscoverVersionState(cached.versions);
    setDiscoverLoaderState(cached.loaders);
    setDiscoverEnvironmentState(cached.environment);
    setDiscoverCategoryState(cached.categories);
    setDiscoverSortState(cached.sort);
    setDiscoverResults(cached.results);
    setDiscoverPage(cached.page);
    setDiscoverTotal(cached.total);
    setDiscoverSourceState(cached.source);
    initialSearchReadyRef.current = shouldRunInitialDiscoverSearch(cached.results);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeDiscoverCache(localStorage, {
      query: discoverQuery,
      projectType: discoverType,
      versions: discoverVersion,
      loaders: discoverLoader,
      environment: discoverEnvironment,
      categories: discoverCategory,
      sort: discoverSort,
      source: discoverSource,
      page: discoverPage,
      results: discoverResults,
      total: discoverTotal,
    });
  }, [
    hydrated,
    discoverQuery,
    discoverType,
    discoverVersion,
    discoverLoader,
    discoverEnvironment,
    discoverCategory,
    discoverSort,
    discoverSource,
    discoverPage,
    discoverResults,
    discoverTotal,
  ]);

  const setDiscoverQuery = useCallback((value: string) => {
    setDiscoverQueryState(value);
    setDiscoverPage(1);
  }, []);
  const setDiscoverType = useCallback((value: string) => {
    setDiscoverTypeState(value);
    setDiscoverPage(1);
  }, []);
  const setDiscoverVersion = useCallback((value: string[]) => {
    setDiscoverVersionState(value);
    setDiscoverPage(1);
  }, []);
  const setDiscoverLoader = useCallback((value: string[]) => {
    setDiscoverLoaderState(value);
    setDiscoverPage(1);
  }, []);
  const setDiscoverEnvironment = useCallback((value: string) => {
    setDiscoverEnvironmentState(value);
    setDiscoverPage(1);
  }, []);
  const setDiscoverCategory = useCallback((value: string[]) => {
    setDiscoverCategoryState(value);
    setDiscoverPage(1);
  }, []);
  const setDiscoverSort = useCallback((value: string) => {
    setDiscoverSortState(value);
    setDiscoverPage(1);
  }, []);
  const setDiscoverSource = useCallback((value: DiscoverSource) => {
    setDiscoverSourceState(value);
    setDiscoverPage(1);
  }, []);

  const runDiscoverSearch = useCallback(async (
    pageNumber = 1,
    overrideQuery?: string,
    overrideSource?: SearchOverrideSource,
  ) => {
    setDiscoverLoading(true);
    setDiscoverError("");

    const filters: DiscoverFilters = {
      query: overrideQuery ?? discoverQuery,
      projectType: discoverType,
      versions: discoverVersion,
      loaders: discoverLoader,
      environment: discoverEnvironment,
      categories: discoverCategory,
      sort: discoverSort,
    };

    try {
      const result = await executeDiscoverSearch({
        source: overrideSource ?? discoverSource,
        pageNumber,
        filters,
      });
      setDiscoverResults(result.mods);
      setDiscoverTotal(result.total);
      setDiscoverPage(pageNumber);
    } catch (error: unknown) {
      console.error("Discover search error:", error);
      setDiscoverError(errorMessage(error));
      if (pageNumber === 1) setDiscoverResults([]);
    } finally {
      setDiscoverLoading(false);
    }
  }, [
    discoverQuery,
    discoverType,
    discoverVersion,
    discoverLoader,
    discoverEnvironment,
    discoverCategory,
    discoverSort,
    discoverSource,
  ]);

  const handleSearchAuthor = useCallback((authorName: string, platform: string) => {
    const cleanPlatform: SearchOverrideSource =
      platform === "curseforge" || platform === "all" ? platform : "modrinth";
    const authorQuery = authorName.startsWith("organization:") ? authorName : `author:${authorName}`;

    setDiscoverQuery(authorQuery);
    setDiscoverSource(cleanPlatform);
    setDiscoverCategory([]);
    setDiscoverResults([]);
    setDiscoverPage(1);
    setActiveTab("discover");
    closeProjectDetails();
    void runDiscoverSearch(1, authorQuery, cleanPlatform);
  }, [closeProjectDetails, runDiscoverSearch, setActiveTab]);

  const handleSearchMod = useCallback((title: string) => {
    setDiscoverQuery(title);
    setDiscoverSource("all");
    setDiscoverType("any");
    setDiscoverVersion([]);
    setDiscoverLoader([]);
    setDiscoverEnvironment("any");
    setDiscoverCategory([]);
    setDiscoverResults([]);
    setDiscoverPage(1);
    setActiveTab("discover");
    closeProjectDetails();
  }, [closeProjectDetails, setActiveTab]);

  const criteriaKeyRef = useRef("");
  const criteriaKey = [
    discoverQuery,
    discoverType,
    discoverVersion.join(","),
    discoverLoader.join(","),
    discoverEnvironment,
    discoverCategory.join(","),
    discoverSort,
    discoverSource,
  ].join("|");

  useEffect(() => {
    if (!hydrated || activeTab !== "discover") return;
    if (!initialSearchReadyRef.current) {
      initialSearchReadyRef.current = true;
      criteriaKeyRef.current = criteriaKey;
      return;
    }
    if (criteriaKeyRef.current !== criteriaKey) {
      criteriaKeyRef.current = criteriaKey;
      if (discoverPage !== 1) {
        setDiscoverPage(1);
        return;
      }
    }
    void runDiscoverSearch(discoverPage);
  }, [activeTab, criteriaKey, discoverPage, hydrated, runDiscoverSearch]);

  return {
    discoverQuery,
    setDiscoverQuery,
    discoverType,
    setDiscoverType,
    discoverVersion,
    setDiscoverVersion,
    discoverLoader,
    setDiscoverLoader,
    discoverEnvironment,
    setDiscoverEnvironment,
    discoverCategory,
    setDiscoverCategory,
    discoverSort,
    setDiscoverSort,
    discoverResults,
    setDiscoverResults,
    discoverLoading,
    discoverPage,
    setDiscoverPage,
    discoverTotal,
    discoverSource,
    setDiscoverSource,
    discoverError,
    runDiscoverSearch,
    handleSearchAuthor,
    handleSearchMod,
  };
}
