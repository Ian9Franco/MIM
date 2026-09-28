import {
  fixedOrgParentForContentType,
  normalizeDraftContentType,
  type MapParentId,
} from "./draftMapLayout";

export type DraftItemFormat = "mod" | "resourcepack" | "shader" | "datapack";

const FORMAT_ORDER: DraftItemFormat[] = ["mod", "resourcepack", "shader", "datapack"];

const LOADER_TO_FORMAT: Record<string, DraftItemFormat> = {
  fabric: "mod",
  forge: "mod",
  neoforge: "mod",
  quilt: "mod",
  liteloader: "mod",
  rift: "mod",
  bukkit: "mod",
  spigot: "mod",
  paper: "mod",
  purpur: "mod",
  sponge: "mod",
  bungeecord: "mod",
  velocity: "mod",
  waterfall: "mod",
  datapack: "datapack",
  minecraft: "resourcepack",
  resourcepack: "resourcepack",
  iris: "shader",
  canvas: "shader",
  optifine: "shader",
  vanilla: "shader",
};

export function contentTypesFromLoaders(loaders: string[] | undefined): DraftItemFormat[] {
  const found = new Set<DraftItemFormat>();
  for (const loader of loaders || []) {
    const mapped = LOADER_TO_FORMAT[String(loader).toLowerCase()];
    if (mapped) found.add(mapped);
  }
  return FORMAT_ORDER.filter((format) => found.has(format));
}

export function uniqueDraftFormats(formats: Array<string | undefined>): DraftItemFormat[] {
  const found = new Set<DraftItemFormat>();
  for (const value of formats) {
    const normalized = normalizeDraftContentType(value) as DraftItemFormat;
    if (FORMAT_ORDER.includes(normalized)) found.add(normalized);
  }
  return FORMAT_ORDER.filter((format) => found.has(format));
}

export function isDualDraftFormat(formats: string[] | undefined): boolean {
  return (formats || []).length > 1;
}

export function formatDisplayLabel(format: string): string {
  if (format === "resourcepack") return "Textura";
  if (format === "shader") return "Shader";
  if (format === "datapack") return "Datapack";
  return "Mod";
}

export function dualFormatBadgeLabel(formats: string[] | undefined): string {
  const labels = uniqueDraftFormats(formats || []).map(formatDisplayLabel);
  if (labels.length < 2) return "";
  return labels.join(" + ");
}

export function allowedOrgParentsForFormat(contentType?: string): MapParentId[] {
  const locked = fixedOrgParentForContentType(contentType);
  if (locked) return [locked];
  return ["client", "server", "both"];
}

export function isOrgParentAllowedForFormat(parent: MapParentId, contentType?: string): boolean {
  return allowedOrgParentsForFormat(contentType).includes(parent);
}

export function pickVersionForFormat<T extends { id: string; loaders?: string[] }>(
  versions: T[],
  format: string,
  preferredLoader?: string,
): T | null {
  const wanted = normalizeDraftContentType(format);
  const matching = versions.filter((version) => contentTypesFromLoaders(version.loaders).includes(wanted as DraftItemFormat));
  if (matching.length === 0) return null;
  if (wanted === "mod" && preferredLoader) {
    const loader = preferredLoader.toLowerCase();
    const withLoader = matching.find((version) => (version.loaders || []).some((entry) => String(entry).toLowerCase() === loader));
    if (withLoader) return withLoader;
  }
  return matching[0];
}
