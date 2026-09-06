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
  const [discoverQuery, setDiscoverQuery] = useState(DEFAULT_DISCOVER_CACHE_STATE.query);
  const [discoverType, setDiscoverType] = useState(DEFAULT_DISCOVER_CACHE_STATE.projectType);
  const [discoverVersion, setDiscoverVersion] = useState<string[]>(DEFAULT_DISCOVER_CACHE_STATE.versions);
  const [discoverLoader, setDiscoverLoader] = useState<string[]>(DEFAULT_DISCOVER_CACHE_STATE.loaders);
  const [discoverEnvironment, setDiscoverEnvironment] = useState(DEFAULT_DISCOVER_CACHE_STATE.environment);
  const [discoverCategory, setDiscoverCategory] = useState<string[]>(DEFAULT_DISCOVER_CACHE_STATE.categories);
  const [discoverSort, setDiscoverSort] = useState(DEFAULT_DISCOVER_CACHE_STATE.sort);
  const [discoverResults, setDiscoverResults] = useState<ModHit[]>(DEFAULT_DISCOVER_CACHE_STATE.results);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverPage, setDiscoverPage] = useState(DEFAULT_DISCOVER_CACHE_STATE.page);
  const [discoverTotal, setDiscoverTotal] = useState(DEFAULT_DISCOVER_CACHE_STATE.total);
  const [discoverSource, setDiscoverSource] = useState<DiscoverSource>(DEFAULT_DISCOVER_CACHE_STATE.source);
  const [discoverError, setDiscoverError] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const initialSearchReadyRef = useRef(false);

  useEffect(() => {
    const cached = readDiscoverCache(localStorage);
    setDiscoverQuery(cached.query);
    setDiscoverType(cached.projectType);
    setDiscoverVersion(cached.versions);
    setDiscoverLoader(cached.loaders);
    setDiscoverEnvironment(cached.environment);
    setDiscoverCategory(cached.categories);
    setDiscoverSort(cached.sort);
    setDiscoverResults(cached.results);
    setDiscoverPage(cached.page);
    setDiscoverTotal(cached.total);
    setDiscoverSource(cached.source);
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

  useEffect(() => {
    if (!hydrated || activeTab !== "discover") return;
    if (!initialSearchReadyRef.current) {
      initialSearchReadyRef.current = true;
      return;
    }
    void runDiscoverSearch(discoverPage);
  }, [activeTab, discoverPage, hydrated, runDiscoverSearch]);

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
