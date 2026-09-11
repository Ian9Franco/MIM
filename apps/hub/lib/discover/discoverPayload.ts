import type { ModHit } from "../../components/SpotlightMarquees";

export const DISCOVER_SOURCES = ["modrinth", "curseforge", "all", "chunk"] as const;
export type DiscoverSource = (typeof DISCOVER_SOURCES)[number];
export type ConcreteDiscoverSource = Exclude<DiscoverSource, "all">;

export interface DiscoverPayload {
  mods: ModHit[];
  total: number;
}

interface GalleryImage {
  url: string;
  thumbnailUrl?: string;
  title?: string;
  featured?: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function optionalFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function decodeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0,
  );
}

export function isConcreteDiscoverSource(value: unknown): value is ConcreteDiscoverSource {
  return value === "modrinth" || value === "curseforge" || value === "chunk";
}

function decodeGallery(value: unknown): GalleryImage[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const images = value.flatMap((item): GalleryImage[] => {
    if (!isRecord(item)) return [];
    const url = nonEmptyString(item.url);
    if (!url) return [];

    const decoded: GalleryImage = { url };
    const thumbnailUrl = optionalString(item.thumbnailUrl ?? item.thumbnail_url);
    const title = optionalString(item.title);
    if (thumbnailUrl) decoded.thumbnailUrl = thumbnailUrl;
    if (title) decoded.title = title;
    if (typeof item.featured === "boolean") decoded.featured = item.featured;
    return [decoded];
  });

  return images.length > 0 ? images : undefined;
}

export function decodeDiscoverModHit(
  value: unknown,
  trustedSource: ConcreteDiscoverSource,
): ModHit | null {
  if (!isRecord(value)) return null;

  const projectId = nonEmptyString(value.projectId) ?? nonEmptyString(value.project_id);
  const title = nonEmptyString(value.title) ?? nonEmptyString(value.name);
  if (!projectId || !title) return null;

  const projectType = nonEmptyString(value.projectType) ?? nonEmptyString(value.project_type) ?? "mod";
  const versionIdValue = value.versionId ?? value.version_id;
  const versionId =
    versionIdValue === null || typeof versionIdValue === "string" ? versionIdValue : undefined;

  const decoded: ModHit = {
    projectId,
    title,
    author: nonEmptyString(value.author) ?? "Comunidad",
    projectType,
    _source: trustedSource,
  };

  const slug = optionalString(value.slug);
  const iconUrl = optionalString(value.iconUrl) ?? optionalString(value.icon_url);
  const description = optionalString(value.description);
  const url = optionalString(value.url);
  const downloads = optionalFiniteNumber(value.downloads);
  const side = optionalString(value.side);
  const categories = decodeStringArray(value.categories);
  const gameVersions = decodeStringArray(value.gameVersions ?? value.game_versions);
  const loaders = decodeStringArray(value.loaders);
  const gallery = decodeGallery(value.gallery);

  if (slug) decoded.slug = slug;
  if (iconUrl) decoded.iconUrl = iconUrl;
  if (description !== undefined) decoded.description = description;
  if (url) decoded.url = url;
  if (downloads !== undefined) decoded.downloads = downloads;
  if (side) decoded.side = side;
  if (categories.length > 0) decoded.categories = categories;
  if (gameVersions.length > 0) decoded.gameVersions = gameVersions;
  if (loaders.length > 0) decoded.loaders = loaders;
  if (versionId !== undefined) decoded.versionId = versionId;
  if (gallery) decoded.gallery = gallery;

  return decoded;
}

export function decodeCachedDiscoverModHit(value: unknown): ModHit | null {
  if (!isRecord(value) || !isConcreteDiscoverSource(value._source)) return null;
  return decodeDiscoverModHit(value, value._source);
}

export function decodeDiscoverPayload(
  value: unknown,
  trustedSource: ConcreteDiscoverSource,
): DiscoverPayload {
  if (!isRecord(value)) return { mods: [], total: 0 };

  const rawMods = Array.isArray(value.mods) ? value.mods : [];
  const mods = rawMods.flatMap((item): ModHit[] => {
    const decoded = decodeDiscoverModHit(item, trustedSource);
    return decoded ? [decoded] : [];
  });
  const total =
    typeof value.total === "number" && Number.isInteger(value.total) && value.total >= 0
      ? value.total
      : 0;

  return { mods, total };
}
