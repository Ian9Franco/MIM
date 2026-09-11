import { normalizeContentType } from "../projectTypes";

export const ACTIVE_DRAFT_CACHE_KEY = "mim_active_draft";
export const DRAFT_ITEMS_CHANGED_EVENT = "fomo-draft-items-changed";

export interface HomeDraftDependency {
  dependency_type?: string;
  project_id?: string;
  [key: string]: unknown;
}

export interface HomeDraftItem {
  id?: string;
  project_id: string;
  projectId: string;
  name: string;
  title?: string;
  mod_name?: string;
  icon_url?: string;
  iconUrl?: string;
  project_type: string;
  content_type: string;
  category: string;
  side: "client" | "server" | "both";
  version_id?: string | null;
  dependencies: HomeDraftDependency[];
  game_versions?: string[];
  loaders?: string[];
  [key: string]: unknown;
}

export interface HomeDraft {
  id: string;
  name: string;
  minecraft_version: string;
  loader: string;
  visibility: string;
  cover_image?: string | null;
  description?: string;
  items?: HomeDraftItem[];
  /** FomoUserDraft-compatible optional fields */
  created_at?: string;
  updated_at?: string;
  updatedAt?: string;
  is_public?: boolean;
  user_id?: string;
  author_name?: string;
  [key: string]: unknown;
}

export interface DraftMetadataUpdates {
  name?: string;
  minecraft_version?: string;
  loader?: string;
  visibility?: string;
}

export interface DraftAddResult {
  ok: boolean;
  status: "compatible" | "warning" | "exists" | "error";
  message: string;
  contentType?: string;
}

export interface DraftStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function requiredString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function decodeDependencies(value: unknown): HomeDraftDependency[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function decodeSide(value: unknown): "client" | "server" | "both" {
  return value === "client" || value === "server" ? value : "both";
}

function decodeDraftItem(value: unknown, icons: Record<string, string>): HomeDraftItem | null {
  if (!isRecord(value)) return null;
  const projectId = requiredString(value.project_id);
  if (!projectId) return null;
  const contentType = optionalString(value.content_type) ?? optionalString(value.category) ?? "mod";

  return {
    id: optionalString(value.id),
    project_id: projectId,
    projectId,
    name: optionalString(value.name) ?? optionalString(value.mod_name) ?? projectId,
    title: optionalString(value.name) ?? optionalString(value.mod_name),
    mod_name: optionalString(value.mod_name),
    icon_url: optionalString(value.icon_url) ?? icons[projectId],
    project_type: optionalString(value.project_type) ?? contentType,
    content_type: contentType,
    category: optionalString(value.category) ?? contentType,
    side: decodeSide(value.side),
    version_id:
      value.version_id === null || typeof value.version_id === "string" ? value.version_id : undefined,
    dependencies: decodeDependencies(value.dependencies),
  };
}

export function decodeHomeDraft(
  value: unknown,
  icons: Record<string, string> = {},
): HomeDraft | null {
  if (!isRecord(value)) return null;
  const id = requiredString(value.id);
  const name = requiredString(value.name);
  if (!id || !name) return null;

  const minecraftVersion = optionalString(value.minecraft_version) ?? "";
  const loader = optionalString(value.loader) ?? "";
  const rawItems = Array.isArray(value.draft_items)
    ? value.draft_items
    : Array.isArray(value.items)
      ? value.items
      : undefined;
  const items = rawItems?.flatMap((item) => {
    const decoded = decodeDraftItem(item, icons);
    return decoded ? [{
      ...decoded,
      game_versions: decoded.game_versions ?? [minecraftVersion].filter(Boolean),
      loaders: decoded.loaders ?? [loader].filter(Boolean),
    }] : [];
  });

  return {
    id,
    name,
    minecraft_version: minecraftVersion,
    loader,
    visibility: optionalString(value.visibility) ?? "private",
    cover_image: optionalString(value.cover_image) ?? null,
    description: optionalString(value.description),
    items,
  };
}

export function decodeHomeDrafts(value: unknown, icons: Record<string, string>): HomeDraft[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((draft) => {
    const decoded = decodeHomeDraft(draft, icons);
    return decoded ? [decoded] : [];
  });
}

export function collectDraftProjectIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((draft) => {
    if (!isRecord(draft) || !Array.isArray(draft.draft_items)) return [];
    return draft.draft_items.flatMap((item) => {
      if (!isRecord(item)) return [];
      const projectId = requiredString(item.project_id);
      return projectId ? [projectId] : [];
    });
  });
}

export function readActiveDraft(storage: DraftStorage): HomeDraft | null {
  const raw = storage.getItem(ACTIVE_DRAFT_CACHE_KEY);
  if (raw === null) return null;
  try {
    return decodeHomeDraft(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeActiveDraft(storage: DraftStorage, draft: HomeDraft | null): void {
  if (draft) storage.setItem(ACTIVE_DRAFT_CACHE_KEY, JSON.stringify(draft));
  else storage.removeItem(ACTIVE_DRAFT_CACHE_KEY);
}

export function changedDraftMetadata(updates: DraftMetadataUpdates): string[] {
  const changed: string[] = [];
  if (updates.name) changed.push("nombre");
  if (updates.minecraft_version) changed.push("versión");
  if (updates.loader) changed.push("loader");
  if (updates.visibility) changed.push("visibilidad");
  return changed;
}

export function buildDraftProjectUrl(item: Pick<HomeDraftItem, "content_type" | "category" | "project_id">): string {
  const contentType = normalizeContentType({ projectType: item.content_type || item.category });
  return `https://modrinth.com/${contentType}/${encodeURIComponent(item.project_id)}`;
}
