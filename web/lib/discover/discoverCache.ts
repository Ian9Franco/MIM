import type { ModHit } from "../../components/SpotlightMarquees";
import {
  decodeCachedDiscoverModHit,
  decodeStringArray,
  type DiscoverSource,
} from "./discoverPayload";

export const DISCOVER_CACHE_KEYS = {
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

export const DISCOVER_SORTS = ["relevance", "downloads", "follows", "newest", "updated"] as const;
export type DiscoverSort = (typeof DISCOVER_SORTS)[number];

export const DISCOVER_ENVIRONMENTS = ["any", "client", "server", "both"] as const;
export type DiscoverEnvironment = (typeof DISCOVER_ENVIRONMENTS)[number];

export const DISCOVER_PROJECT_TYPES = [
  "any",
  "mod",
  "resourcepack",
  "shader",
  "datapack",
  "modpack",
] as const;
export type DiscoverProjectType = (typeof DISCOVER_PROJECT_TYPES)[number];

export interface DiscoverStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface DiscoverCacheState {
  query: string;
  projectType: string;
  versions: string[];
  loaders: string[];
  environment: string;
  categories: string[];
  sort: string;
  source: DiscoverSource;
  page: number;
  results: ModHit[];
  total: number;
}

export const DEFAULT_DISCOVER_CACHE_STATE: DiscoverCacheState = {
  query: "",
  projectType: "mod",
  versions: [],
  loaders: [],
  environment: "any",
  categories: [],
  sort: "newest",
  source: "modrinth",
  page: 1,
  results: [],
  total: 0,
};

function parseJson(value: string | null): unknown {
  if (value === null) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

export function parseDiscoverSource(value: string | null): DiscoverSource {
  if (value === "curseforge" || value === "all" || value === "chunk") return value;
  return "modrinth";
}

export function parseDiscoverSort(value: string | null): DiscoverSort | null {
  if (
    value === "relevance" ||
    value === "downloads" ||
    value === "follows" ||
    value === "newest" ||
    value === "updated"
  ) {
    return value;
  }
  return null;
}

export function parseDiscoverEnvironment(value: string | null): DiscoverEnvironment {
  if (value === "client" || value === "server" || value === "both") return value;
  return "any";
}

export function parseDiscoverProjectType(value: string | null): DiscoverProjectType {
  if (
    value === "any" ||
    value === "resourcepack" ||
    value === "shader" ||
    value === "datapack" ||
    value === "modpack"
  ) {
    return value;
  }
  return "mod";
}

export function parseDiscoverPage(value: string | null): number {
  if (value === null) return 1;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export function parseDiscoverTotal(value: string | null): number {
  if (value === null) return 0;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

export function parseDiscoverStringArray(value: string | null): string[] {
  return decodeStringArray(parseJson(value));
}

export function parseDiscoverResults(value: string | null): ModHit[] {
  const parsed = parseJson(value);
  if (!Array.isArray(parsed)) return [];
  return parsed.flatMap((item): ModHit[] => {
    const decoded = decodeCachedDiscoverModHit(item);
    return decoded ? [decoded] : [];
  });
}

function resolveCachedSort(storage: DiscoverStorage): DiscoverSort {
  const rawSort = storage.getItem(DISCOVER_CACHE_KEYS.sort);
  const parsedSort = parseDiscoverSort(rawSort);
  const migrationApplied = storage.getItem(DISCOVER_CACHE_KEYS.sortDefaultMigration) === "1";

  storage.setItem(DISCOVER_CACHE_KEYS.sortDefaultMigration, "1");

  if (!parsedSort) return "newest";
  if (!migrationApplied && parsedSort === "relevance") return "newest";
  return parsedSort;
}

export function readDiscoverCache(storage: DiscoverStorage): DiscoverCacheState {
  return {
    query: storage.getItem(DISCOVER_CACHE_KEYS.query) ?? "",
    projectType: parseDiscoverProjectType(storage.getItem(DISCOVER_CACHE_KEYS.type)),
    versions: parseDiscoverStringArray(storage.getItem(DISCOVER_CACHE_KEYS.version)),
    loaders: parseDiscoverStringArray(storage.getItem(DISCOVER_CACHE_KEYS.loader)),
    environment: parseDiscoverEnvironment(storage.getItem(DISCOVER_CACHE_KEYS.environment)),
    categories: parseDiscoverStringArray(storage.getItem(DISCOVER_CACHE_KEYS.category)),
    sort: resolveCachedSort(storage),
    source: parseDiscoverSource(storage.getItem(DISCOVER_CACHE_KEYS.source)),
    page: parseDiscoverPage(storage.getItem(DISCOVER_CACHE_KEYS.page)),
    results: parseDiscoverResults(storage.getItem(DISCOVER_CACHE_KEYS.results)),
    total: parseDiscoverTotal(storage.getItem(DISCOVER_CACHE_KEYS.total)),
  };
}

function normalizedSort(value: string): DiscoverSort {
  return parseDiscoverSort(value) ?? "newest";
}

function normalizedEnvironment(value: string): DiscoverEnvironment {
  return parseDiscoverEnvironment(value);
}

function normalizedProjectType(value: string): DiscoverProjectType {
  return parseDiscoverProjectType(value);
}

export function writeDiscoverCache(storage: DiscoverStorage, state: DiscoverCacheState): void {
  storage.setItem(DISCOVER_CACHE_KEYS.query, state.query);
  storage.setItem(DISCOVER_CACHE_KEYS.type, normalizedProjectType(state.projectType));
  storage.setItem(DISCOVER_CACHE_KEYS.version, JSON.stringify(decodeStringArray(state.versions)));
  storage.setItem(DISCOVER_CACHE_KEYS.loader, JSON.stringify(decodeStringArray(state.loaders)));
  storage.setItem(DISCOVER_CACHE_KEYS.environment, normalizedEnvironment(state.environment));
  storage.setItem(DISCOVER_CACHE_KEYS.category, JSON.stringify(decodeStringArray(state.categories)));
  storage.setItem(DISCOVER_CACHE_KEYS.sort, normalizedSort(state.sort));
  storage.setItem(DISCOVER_CACHE_KEYS.source, state.source);
  storage.setItem(DISCOVER_CACHE_KEYS.page, String(parseDiscoverPage(String(state.page))));
  storage.setItem(DISCOVER_CACHE_KEYS.results, JSON.stringify(state.results));
  storage.setItem(DISCOVER_CACHE_KEYS.total, String(parseDiscoverTotal(String(state.total))));
}

export function shouldRunInitialDiscoverSearch(results: readonly ModHit[]): boolean {
  return results.length === 0;
}
