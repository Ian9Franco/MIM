import type { ModHit } from "../../components/SpotlightMarquees";
import {
  decodeDiscoverPayload,
  type DiscoverPayload,
  type DiscoverSource,
} from "./discoverPayload";

export const PROVIDER_ENDPOINTS = {
  modrinth: "/api/modrinth/discover",
  curseforge: "/api/curseforge/discover",
} as const;

export const BEDROCK_DISCOVER_ENDPOINT = "/api/bedrock/discover" as const;

export type SearchProvider = keyof typeof PROVIDER_ENDPOINTS;
export type SearchOverrideSource = SearchProvider | "all";

export interface DiscoverFilters {
  query: string;
  projectType: string;
  versions: string[];
  loaders: string[];
  environment: string;
  categories: string[];
  sort: string;
}

export interface DiscoverSearchInput {
  source: DiscoverSource;
  pageNumber: number;
  filters: DiscoverFilters;
}

export type DiscoverFetch = (url: string) => Promise<Response>;

type ProviderEndpoint = (typeof PROVIDER_ENDPOINTS)[SearchProvider];
type AllowedEndpoint = ProviderEndpoint | typeof BEDROCK_DISCOVER_ENDPOINT;

export function resolveProviderEndpoint(provider: unknown): ProviderEndpoint | null {
  if (provider === "modrinth") return PROVIDER_ENDPOINTS.modrinth;
  if (provider === "curseforge") return PROVIDER_ENDPOINTS.curseforge;
  return null;
}

function appendQuery(endpoint: AllowedEndpoint, params: URLSearchParams): string {
  const query = params.toString();
  return query.length > 0 ? `${endpoint}?${query}` : endpoint;
}

export function buildDiscoverQueryParams(
  filters: DiscoverFilters,
  pageNumber: number,
): URLSearchParams {
  const environments =
    filters.environment && filters.environment !== "any" ? [filters.environment] : [];

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
  const combined: ModHit[] = [];
  const maxLength = Math.max(left.length, right.length);

  for (let index = 0; index < maxLength; index += 1) {
    const leftItem = left[index];
    const rightItem = right[index];
    if (leftItem) combined.push(leftItem);
    if (rightItem) combined.push(rightItem);
  }

  return combined;
}

async function requestProvider(
  provider: SearchProvider,
  params: URLSearchParams,
  fetcher: DiscoverFetch,
): Promise<DiscoverPayload> {
  const endpoint = resolveProviderEndpoint(provider);
  if (!endpoint) throw new Error("Proveedor Discover no permitido");

  const response = await fetcher(appendQuery(endpoint, params));
  if (!response.ok) {
    const label = provider === "curseforge" ? "CurseForge" : "Modrinth";
    throw new Error(`Error en la API de ${label}`);
  }

  const payload: unknown = await response.json();
  return decodeDiscoverPayload(payload, provider);
}

async function requestBedrock(
  filters: DiscoverFilters,
  pageNumber: number,
  fetcher: DiscoverFetch,
): Promise<DiscoverPayload> {
  const params = new URLSearchParams({ page: String(pageNumber) });
  if (filters.query) params.set("q", filters.query);

  const response = await fetcher(appendQuery(BEDROCK_DISCOVER_ENDPOINT, params));
  if (!response.ok) throw new Error("Error en la API de Bedrock (chunk.gg)");

  const payload: unknown = await response.json();
  return decodeDiscoverPayload(payload, "chunk");
}

function fulfilledPayload(
  result: PromiseSettledResult<DiscoverPayload>,
): DiscoverPayload {
  return result.status === "fulfilled" ? result.value : { mods: [], total: 0 };
}

async function requestAllProviders(
  params: URLSearchParams,
  fetcher: DiscoverFetch,
): Promise<DiscoverPayload> {
  const [modrinthResult, curseForgeResult] = await Promise.allSettled([
    requestProvider("modrinth", params, fetcher),
    requestProvider("curseforge", params, fetcher),
  ]);
  const modrinth = fulfilledPayload(modrinthResult);
  const curseForge = fulfilledPayload(curseForgeResult);

  return {
    mods: interleaveDiscoverResults(modrinth.mods, curseForge.mods),
    total: modrinth.total + curseForge.total,
  };
}

export async function executeDiscoverSearch(
  input: DiscoverSearchInput,
  fetcher: DiscoverFetch = fetch,
): Promise<DiscoverPayload> {
  if (input.source === "chunk") {
    return requestBedrock(input.filters, input.pageNumber, fetcher);
  }

  const params = buildDiscoverQueryParams(input.filters, input.pageNumber);
  if (input.source === "all") return requestAllProviders(params, fetcher);
  return requestProvider(input.source, params, fetcher);
}
