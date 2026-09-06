"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { ModHit } from "../components/SpotlightMarquees";

export type DiscoverSource = "modrinth" | "curseforge" | "all" | "chunk";
type SearchOverrideSource = Exclude<DiscoverSource, "chunk">;

interface UseHomeDiscoverOptions {
  activeTab: string;
  setActiveTab: Dispatch<SetStateAction<string>>;
  closeProjectDetails: () => void;
}

interface DiscoverFilters {
  query: string;
  projectType: string;
  versions: string[];
  loaders: string[];
  environment: string;
  categories: string[];
  sort: string;
}

interface DiscoverPayload {
  mods: ModHit[];
  total: number;
}

const CACHE = {
  query: "mim_discover_query",
  type: "mim_discover_type",
  version: "mim_discover_version",
  loader: "mim_discover_loader",
  environment: "mim_discover_environment",
  category: "mim_discover_category",
  sort: "mim_discover_sort",
  sortDefaultMigration: "mim_discover_sort_default_v2",
  source: "mim_discover_source",
  page: "mim_discover_page",
  results: "mim_discover_results",
  total: "mim_discover_total",
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function decodeModHit(value: unknown, source: Exclude<DiscoverSource, "all">): ModHit | null {
  if (!isRecord(value)) return null;

  const projectId = optionalString(value.projectId) ?? optionalString(value.project_id);
  const title = optionalString(value.title) ?? optionalString(value.name);
  const projectType = optionalString(value.projectType) ?? optionalString(value.project_type) ?? "mod";

  if (!projectId || !title) return null;

  const author = optionalString(value.author) ?? "Comunidad";
  const versionIdValue = value.versionId ?? value.version_id;

  return {
    projectId,
    title,
    author,
    projectType,
    slug: optionalString(value.slug),
    iconUrl: optionalString(value.iconUrl) ?? optionalString(value.icon_url),
    categories: stringArray(value.categories),
    description: optionalString(value.description),
    url: optionalString(value.url),
    _source: source,
    downloads: optionalNumber(value.downloads),
    gameVersions: stringArray(value.gameVersions ?? value.game_versions),
    loaders: stringArray(value.loaders),
    side: optionalString(value.side),
    versionId: typeof versionIdValue === "string" || versionIdValue === null ? versionIdValue : undefined,
  };
}

function decodePayload(value: unknown, source: Exclude<DiscoverSource, "all">): DiscoverPayload {
  if (!isRecord(value)) return { mods: [], total: 0 };
  const rawMods = Array.isArray(value.mods) ? value.mods : [];
  return {
    mods: rawMods.flatMap((item) => {
      const decoded = decodeModHit(item, source);
      return decoded ? [decoded] : [];
    }),
    total: typeof value.total === "number" && Number.isFinite(value.total) ? value.total : 0,
  };
}

function parseCachedArray(value: string | null): string[] {
  if (!value) return [];
  try {
    return stringArray(JSON.parse(value));
  } catch {
    return [];
  }
}

function parseCachedMods(value: string | null): ModHit[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      if (!isRecord(item)) return [];
      const sourceValue = optionalString(item._source);
      const source: Exclude<DiscoverSource, "all"> =
        sourceValue === "curseforge" || sourceValue === "chunk" ? sourceValue : "modrinth";
      const decoded = decodeModHit(item, source);
      return decoded ? [decoded] : [];
    });
  } catch {
    return [];
  }
}

function parseSource(value: string | null): DiscoverSource {
  return value === "curseforge" || value === "all" || value === "chunk" ? value : "modrinth";
}

function parsePositiveInteger(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseNonNegativeInteger(value: string | null): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Error al buscar mods";
}

export function buildDiscoverQueryParams(filters: DiscoverFilters, pageNumber: number): URLSearchParams {
  const environments = filters.environment && filters.environment !== "any" ? [filters.environment] : [];
  return new URLSearchParams({
    projectType: filters.projectType,
    loader: filters.loaders.length > 0 ? filters.loaders.join(",") : "any",
    page: String(pageNumber),
    pageSize: "12",
    q: filters.query,
    sort: filters.sort,
    gameVersions: JSON.stringify(filters.versions),
    categories: JSON.stringify(filters.categories),
    environments: JSON.stringify(environments),
  });
}

export function interleaveDiscoverResults(left: ModHit[], right: ModHit[]): ModHit[] {
  const result: ModHit[] = [];
  const maxLength = Math.max(left.length, right.length);
  for (let index = 0; index < maxLength; index += 1) {
    if (index < left.length) result.push(left[index]);
    if (index < right.length) result.push(right[index]);
  }
  return result;
}

export function useHomeDiscover({ activeTab, setActiveTab, closeProjectDetails }: UseHomeDiscoverOptions) {
  const [discoverQuery, setDiscoverQuery] = useState("");
  const [discoverType, setDiscoverType] = useState("mod");
  const [discoverVersion, setDiscoverVersion] = useState<string[]>([]);
  const [discoverLoader, setDiscoverLoader] = useState<string[]>([]);
  const [discoverEnvironment, setDiscoverEnvironment] = useState("any");
  const [discoverCategory, setDiscoverCategory] = useState<string[]>([]);
  const [discoverSort, setDiscoverSort] = useState("newest");
  const [discoverResults, setDiscoverResults] = useState<ModHit[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverPage, setDiscoverPage] = useState(1);
  const [discoverTotal, setDiscoverTotal] = useState(0);
  const [discoverSource, setDiscoverSource] = useState<DiscoverSource>("modrinth");
  const [discoverError, setDiscoverError] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const initialSearchSkippedRef = useRef(false);

  useEffect(() => {
    setDiscoverQuery(localStorage.getItem(CACHE.query) ?? "");
    setDiscoverType(localStorage.getItem(CACHE.type) ?? "mod");
    setDiscoverVersion(parseCachedArray(localStorage.getItem(CACHE.version)));
    setDiscoverLoader(parseCachedArray(localStorage.getItem(CACHE.loader)));
    setDiscoverEnvironment(localStorage.getItem(CACHE.environment) ?? "any");
    setDiscoverCategory(parseCachedArray(localStorage.getItem(CACHE.category)));

    const cachedSort = localStorage.getItem(CACHE.sort);
    const migrated = localStorage.getItem(CACHE.sortDefaultMigration) === "1";
    if (cachedSort && (migrated || cachedSort !== "relevance")) setDiscoverSort(cachedSort);
    localStorage.setItem(CACHE.sortDefaultMigration, "1");

    setDiscoverSource(parseSource(localStorage.getItem(CACHE.source)));
    setDiscoverPage(parsePositiveInteger(localStorage.getItem(CACHE.page), 1));
    setDiscoverTotal(parseNonNegativeInteger(localStorage.getItem(CACHE.total)));

    const cachedResults = parseCachedMods(localStorage.getItem(CACHE.results));
    setDiscoverResults(cachedResults);
    initialSearchSkippedRef.current = cachedResults.length === 0;
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(CACHE.query, discoverQuery);
    localStorage.setItem(CACHE.type, discoverType);
    localStorage.setItem(CACHE.version, JSON.stringify(discoverVersion));
    localStorage.setItem(CACHE.loader, JSON.stringify(discoverLoader));
    localStorage.setItem(CACHE.environment, discoverEnvironment);
    localStorage.setItem(CACHE.category, JSON.stringify(discoverCategory));
    localStorage.setItem(CACHE.sort, discoverSort);
    localStorage.setItem(CACHE.source, discoverSource);
    localStorage.setItem(CACHE.page, String(discoverPage));
    localStorage.setItem(CACHE.results, JSON.stringify(discoverResults));
    localStorage.setItem(CACHE.total, String(discoverTotal));
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
    try {
      setDiscoverLoading(true);
      setDiscoverError("");

      const activeSource = overrideSource ?? discoverSource;
      const activeQuery = overrideQuery ?? discoverQuery;
      const filters: DiscoverFilters = {
        query: activeQuery,
        projectType: discoverType,
        versions: discoverVersion,
        loaders: discoverLoader,
        environment: discoverEnvironment,
        categories: discoverCategory,
        sort: discoverSort,
      };
      const queryParams = buildDiscoverQueryParams(filters, pageNumber);

      let next: DiscoverPayload;
      if (activeSource === "chunk") {
        const chunkParams = new URLSearchParams({
          page: String(pageNumber),
          ...(activeQuery ? { q: activeQuery } : {}),
        });
        const response = await fetch(`/api/bedrock/discover?${chunkParams.toString()}`);
        if (!response.ok) throw new Error("Error en la API de Bedrock (chunk.gg)");
        next = decodePayload(await response.json(), "chunk");
      } else if (activeSource === "all") {
        const [modrinthResponse, curseForgeResponse] = await Promise.allSettled([
          fetch(`/api/modrinth/discover?${queryParams.toString()}`),
          fetch(`/api/curseforge/discover?${queryParams.toString()}`),
        ]);
        const modrinth = modrinthResponse.status === "fulfilled" && modrinthResponse.value.ok
          ? decodePayload(await modrinthResponse.value.json(), "modrinth")
          : { mods: [], total: 0 };
        const curseForge = curseForgeResponse.status === "fulfilled" && curseForgeResponse.value.ok
          ? decodePayload(await curseForgeResponse.value.json(), "curseforge")
          : { mods: [], total: 0 };
        next = {
          mods: interleaveDiscoverResults(modrinth.mods, curseForge.mods),
          total: modrinth.total + curseForge.total,
        };
      } else {
        const response = await fetch(`/${`api/${activeSource}/discover`}?${queryParams.toString()}`);
        if (!response.ok) {
          throw new Error(activeSource === "curseforge" ? "Error en la API de CurseForge" : "Error en la API de Modrinth");
        }
        next = decodePayload(await response.json(), activeSource);
      }

      setDiscoverResults(next.mods);
      setDiscoverTotal(next.total);
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
    discoverSource,
    discoverEnvironment,
    discoverCategory,
    discoverSort,
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
    if (!initialSearchSkippedRef.current) {
      initialSearchSkippedRef.current = true;
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
