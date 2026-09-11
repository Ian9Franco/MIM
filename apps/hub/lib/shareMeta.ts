import { supabase } from "./supabaseClient";

export const SHARE_META_PATTERN = /<!--mim:([\s\S]*?)-->/;

export interface CommunityShareMeta {
  gameVersion?: string;
  modloader?: string;
  projectType?: string;
  priority?: boolean;
}

export function stripShareMeta(summary?: string | null): string {
  if (!summary) return "";
  return summary.replace(SHARE_META_PATTERN, "").trim();
}

export function encodeShareMeta(summary: string, meta: CommunityShareMeta): string {
  const clean = stripShareMeta(summary);
  const payload = JSON.stringify(meta);
  return clean ? `${clean} <!--mim:${payload}-->` : `<!--mim:${payload}-->`;
}

export function readSharePriority(summary?: string | null) {
  const value = String(summary || "").trim();
  try {
    if (value.startsWith("{")) return !!JSON.parse(value).priority;
    const match = value.match(SHARE_META_PATTERN);
    return match?.[1] ? !!JSON.parse(match[1]).priority : false;
  } catch {
    return false;
  }
}

export function isMissingPinnedColumnError(error: any) {
  const message = String(error?.message || error?.details || "");
  return error?.code === "42703" || error?.code === "PGRST204" || /\bpinned\b/i.test(message);
}

export function isFavoritePlatformConstraintError(error: any) {
  const message = String(error?.message || error?.details || "");
  return error?.code === "23514" && /favorite_mods_platform_check|platform/i.test(message);
}

export function isSharePinned(share: any) {
  if (share?.pinned === true) return true;
  if (share?.pinned === false) return false;
  return readSharePriority(share?.summary);
}

export function sortSharesByPriority<T extends Record<string, any>>(shares: T[]): T[] {
  return [...shares].sort((a, b) => {
    const priorityOrder = Number(isSharePinned(b)) - Number(isSharePinned(a));
    if (priorityOrder) return priorityOrder;
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });
}

export async function fetchUserShares(userId: string) {
  const withPinned = await supabase
    .from("favorite_mods")
    .select("*")
    .eq("profile_id", userId)
    .order("pinned", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (!withPinned.error) return sortSharesByPriority(withPinned.data || []);
  if (!isMissingPinnedColumnError(withPinned.error)) throw withPinned.error;

  const fallback = await supabase
    .from("favorite_mods")
    .select("*")
    .eq("profile_id", userId)
    .order("created_at", { ascending: false });

  if (fallback.error) throw fallback.error;
  return sortSharesByPriority(fallback.data || []);
}
