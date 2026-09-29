import type { ModHit } from "../../components/SpotlightMarquees";
import type { HomeDraftDependency } from "./draftContract";
import { normalizeLoader } from "../projectTypes";
import {
  contentTypesFromLoaders,
  pickVersionForFormat,
  uniqueDraftFormats,
  type DraftItemFormat,
} from "@/lib/fomo/draftItemFormats";
import { enrichDraftItemsWithIcons } from "@/lib/fomo/enrichDraftItemIcons";
import type { DraftItemIconFetchRow } from "./draftContract";

type DraftFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

interface ModrinthVersion {
  id: string;
  game_versions: string[];
  loaders: string[];
  dependencies: HomeDraftDependency[];
}

interface ModrinthProject {
  id: string;
  title: string;
  icon_url?: string;
  project_type?: string;
  client_side?: string;
  server_side?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function decodeProject(value: unknown): ModrinthProject | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.title !== "string") return null;
  return {
    id: value.id,
    title: value.title,
    icon_url: typeof value.icon_url === "string" ? value.icon_url : undefined,
    project_type: typeof value.project_type === "string" ? value.project_type : undefined,
    client_side: typeof value.client_side === "string" ? value.client_side : undefined,
    server_side: typeof value.server_side === "string" ? value.server_side : undefined,
  };
}

function decodeVersion(value: unknown): ModrinthVersion | null {
  if (!isRecord(value) || typeof value.id !== "string") return null;
  return {
    id: value.id,
    game_versions: Array.isArray(value.game_versions)
      ? value.game_versions.filter((item): item is string => typeof item === "string")
      : [],
    loaders: Array.isArray(value.loaders)
      ? value.loaders.filter((item): item is string => typeof item === "string")
      : [],
    dependencies: Array.isArray(value.dependencies)
      ? value.dependencies.filter(isRecord)
      : [],
  };
}

async function responseJson(response: Response): Promise<unknown> {
  return response.ok ? response.json() : null;
}

export async function fetchDraftIconsFromItems(
  items: DraftItemIconFetchRow[],
  fetcher: DraftFetch = fetch,
): Promise<Record<string, string>> {
  if (items.length === 0) return {};
  try {
    const enriched = await enrichDraftItemsWithIcons(items, fetcher);
    return enriched.reduce<Record<string, string>>((icons, item) => {
      const icon = item.icon_url || item.iconUrl;
      if (icon) icons[String(item.project_id)] = icon;
      return icons;
    }, {});
  } catch (error) {
    console.error("Error fetching draft item icons:", error);
    return {};
  }
}

/** @deprecated Prefer fetchDraftIconsFromItems when source is known (CurseForge + Modrinth). */
export async function fetchDraftIcons(
  projectIds: string[],
  fetcher: DraftFetch = fetch,
): Promise<Record<string, string>> {
  const ids = [...new Set(projectIds.filter(Boolean))];
  return fetchDraftIconsFromItems(
    ids.map((project_id) => ({ project_id, source: "modrinth" })),
    fetcher,
  );
}

export async function fetchDraftVersions(
  versionIds: string[],
  fetcher: DraftFetch = fetch,
): Promise<Record<string, ModrinthVersion>> {
  const ids = [...new Set(versionIds.filter(Boolean))];
  if (ids.length === 0) return {};
  const url = new URL("https://api.modrinth.com/v2/versions");
  url.searchParams.set("ids", JSON.stringify(ids));

  try {
    const payload = await responseJson(await fetcher(url));
    if (!Array.isArray(payload)) return {};
    return payload.reduce<Record<string, ModrinthVersion>>((versions, item) => {
      const version = decodeVersion(item);
      if (version) versions[version.id] = version;
      return versions;
    }, {});
  } catch (error) {
    console.error("Error fetching version metadata from Modrinth:", error);
    return {};
  }
}

export async function resolveDraftModrinthItem(
  mod: ModHit,
  draftVersion: string,
  draftLoader: string,
  contentType: string,
  fetcher: DraftFetch = fetch,
): Promise<{ project: ModrinthProject | null; version: ModrinthVersion | null }> {
  if ((mod._source || "modrinth") === "curseforge") return { project: null, version: null };

  const projectUrl = new URL(`/v2/project/${encodeURIComponent(mod.projectId)}`, "https://api.modrinth.com");
  const versionUrl = new URL(`/v2/project/${encodeURIComponent(mod.projectId)}/version`, "https://api.modrinth.com");
  versionUrl.searchParams.set("game_versions", JSON.stringify([draftVersion]));
  const [projectPayload, versionsPayload] = await Promise.all([
    responseJson(await fetcher(projectUrl)),
    responseJson(await fetcher(versionUrl)),
  ]);
  const versions = Array.isArray(versionsPayload)
    ? versionsPayload.flatMap((item) => {
        const version = decodeVersion(item);
        return version ? [version] : [];
      })
    : [];
  const preferredLoader = contentType === "mod" ? normalizeLoader(draftLoader) : "";
  const version = pickVersionForFormat(versions, contentType, preferredLoader) ?? versions[0] ?? null;
  return { project: decodeProject(projectPayload), version };
}

export interface DraftProjectFormatInfo {
  types: DraftItemFormat[];
  versionByType: Partial<Record<DraftItemFormat, string>>;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let index = 0;
  async function runNext(): Promise<void> {
    const current = index;
    index += 1;
    if (current >= items.length) return;
    results[current] = await worker(items[current]);
    await runNext();
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, () => runNext());
  await Promise.all(workers);
  return results;
}

export async function fetchDraftProjectFormats(
  projectIds: string[],
  gameVersion: string,
  fetcher: DraftFetch = fetch,
): Promise<Record<string, DraftProjectFormatInfo>> {
  const ids = [...new Set(projectIds.filter(Boolean))];
  if (ids.length === 0 || !gameVersion) return {};

  const rows = await mapWithConcurrency(ids, 4, async (projectId) => {
    const versionUrl = new URL(`/v2/project/${encodeURIComponent(projectId)}/version`, "https://api.modrinth.com");
    versionUrl.searchParams.set("game_versions", JSON.stringify([gameVersion]));
    try {
      const payload = await responseJson(await fetcher(versionUrl));
      const versions = Array.isArray(payload)
        ? payload.flatMap((item) => {
            const version = decodeVersion(item);
            return version ? [version] : [];
          })
        : [];
      const types = uniqueDraftFormats(versions.flatMap((version) => contentTypesFromLoaders(version.loaders)));
      const versionByType: Partial<Record<DraftItemFormat, string>> = {};
      for (const type of types) {
        const match = pickVersionForFormat(versions, type);
        if (match) versionByType[type] = match.id;
      }
      return { projectId, info: { types, versionByType } satisfies DraftProjectFormatInfo };
    } catch (error) {
      console.error("Error fetching draft project formats:", error);
      return { projectId, info: { types: [], versionByType: {} } satisfies DraftProjectFormatInfo };
    }
  });

  return rows.reduce<Record<string, DraftProjectFormatInfo>>((acc, row) => {
    if (row.info.types.length > 0) acc[row.projectId] = row.info;
    return acc;
  }, {});
}

export async function fetchRequiredDependencyProjects(
  projectIds: string[],
  fetcher: DraftFetch = fetch,
): Promise<ModrinthProject[]> {
  if (projectIds.length === 0) return [];
  const url = new URL("https://api.modrinth.com/v2/projects");
  url.searchParams.set("ids", JSON.stringify(projectIds));
  const payload = await responseJson(await fetcher(url));
  if (!Array.isArray(payload)) return [];
  return payload.flatMap((item) => {
    const project = decodeProject(item);
    return project ? [project] : [];
  });
}
