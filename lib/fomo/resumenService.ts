import { supabase } from "@/lib/core/supabaseClient";
import { mimDB } from "@/lib/storage/indexeddb";
import type { ModHit } from "@/lib/core/types";
import {
  EMPTY_CLUB,
  type ClubAuthorEntry,
  type ClubModEntry,
  type CommunityResumenMember,
  type UserResumenData,
} from "@/lib/fomo/resumenTypes";
import { inferTypeFromModHit } from "@/lib/fomo/communityShareMeta";

const AUTHOR_MARKERS = ["autor de minecraft", "¿querés agregar"];

function isAuthorFavorite(summary?: string | null): boolean {
  if (!summary) return false;
  const s = summary.toLowerCase();
  return AUTHOR_MARKERS.some((m) => s.includes(m));
}

export function parseResumenData(raw: unknown): UserResumenData {
  if (!raw || typeof raw !== "object") return { ...EMPTY_CLUB };
  const o = raw as UserResumenData;
  return {
    mods: Array.isArray(o.mods) ? o.mods : [],
    authors: Array.isArray(o.authors) ? o.authors : [],
    youtubeChannels: Array.isArray(o.youtubeChannels) ? o.youtubeChannels : [],
    updatedAt: o.updatedAt,
  };
}

export function resumenFromFavoriteRows(
  rows: {
    mod_id: string;
    platform: string;
    name: string;
    icon_url?: string | null;
    summary?: string | null;
  }[]
): UserResumenData {
  const mods: ClubModEntry[] = [];
  const authors: ClubAuthorEntry[] = [];
  for (const r of rows) {
    if (isAuthorFavorite(r.summary)) {
      authors.push({ name: r.name, iconUrl: r.icon_url });
    } else {
      mods.push({
        projectId: r.mod_id,
        title: r.name,
        platform: r.platform,
        iconUrl: r.icon_url,
        projectType: "mod",
      });
    }
  }
  return { mods, authors, youtubeChannels: [] };
}

export async function buildLocalResumenSnapshot(): Promise<UserResumenData> {
  await mimDB.init();
  const [modRows, authorRows] = await Promise.all([
    mimDB.getAllFollowedMods(),
    mimDB.getAllFollowedAuthors(),
  ]);

  const mods: ClubModEntry[] = modRows
    .map((r: { data: ModHit }) => r.data)
    .filter(Boolean)
    .map((m: ModHit) => {
      const cats = (m.categories || []).map((c) =>
        typeof c === "string" ? c.toLowerCase() : ""
      );
      const known = ["forge", "fabric", "neoforge", "quilt"];
      return {
        projectId: m.projectId,
        title: m.title,
        author: m.author,
        iconUrl: m.iconUrl,
        platform: m._source || "modrinth",
        projectType: inferTypeFromModHit(m),
        gameVersion: (m as any).gameVersions?.[0] || (m as { gameVersion?: string }).gameVersion,        modloader:
          cats.find((c) => known.includes(c)) ||
          (typeof (m as { loader?: string }).loader === "string"
            ? (m as { loader?: string }).loader
            : undefined),
      };
    });

  const authors: ClubAuthorEntry[] = authorRows
    .map((a: { name: string; iconUrl?: string | null }) => ({
      name: typeof a === "string" ? a : a.name,
      iconUrl: typeof a === "string" ? null : a.iconUrl,
    }))
    .filter((a) => a.name && a.name !== "Autor Desconocido");

  let youtubeChannels: string[] = [];
  try {
    const res = await fetch("/api/fomo/youtube-channels");
    if (res.ok) {
      const data = await res.json();
      youtubeChannels = data.channels || [];
    }
  } catch {
    /* local-only */
  }

  return {
    mods,
    authors,
    youtubeChannels,
    updatedAt: new Date().toISOString(),
  };
}

export async function syncMyResumenToCloud(userId: string): Promise<boolean> {
  // Función desactivada: El resumen es ahora un resumen en vivo (no requiere sync manual)
  return true;
}

export async function fetchCommunityResumen(
  currentUserId?: string
): Promise<CommunityResumenMember[]> {
  const [profilesRes, favsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, avatar_url, color")
      .order("username"),
    supabase
      .from("favorite_mods")
      .select("profile_id, mod_id, platform, name, icon_url, summary"),
  ]);

  const profiles = profilesRes.data || [];
  const favsByProfile = new Map<string, typeof favsRes.data>();
  for (const f of favsRes.data || []) {
    const pid = f.profile_id;
    if (!favsByProfile.has(pid)) favsByProfile.set(pid, []);
    favsByProfile.get(pid)!.push(f);
  }

  const members: CommunityResumenMember[] = profiles.map((p) => {
    let resumen = parseResumenData(null);
    const hasCloudResumen = false;
    const inferred = resumenFromFavoriteRows(favsByProfile.get(p.id) || []);
    if (resumen.mods.length === 0 && inferred.mods.length > 0) {
      resumen = { ...resumen, mods: inferred.mods };
    }
    if (resumen.authors.length === 0 && inferred.authors.length > 0) {
      resumen = { ...resumen, authors: inferred.authors };
    }
    return {
      id: p.id,
      username: p.username,
      avatar_url: p.avatar_url,
      color: p.color,
      resumen,
      hasCloudResumen,
    };
  });

  if (currentUserId) {
    const me = members.find((m) => m.id === currentUserId);
    if (me) {
      const local = await buildLocalResumenSnapshot();
      const hasLocal =
        local.mods.length > 0 ||
        local.authors.length > 0 ||
        local.youtubeChannels.length > 0;
      if (
        hasLocal &&
        local.mods.length >= me.resumen.mods.length &&
        local.updatedAt
      ) {
        me.resumen = local;
      }
    } else {
      const prof = profiles.find((p) => p.id === currentUserId);
      if (prof) {
        const local = await buildLocalResumenSnapshot();
        members.push({
          id: prof.id,
          username: prof.username,
          avatar_url: prof.avatar_url,
          color: prof.color,
          resumen: local,
          hasCloudResumen: false,
        });
      }
    }
  }

  return members.sort((a, b) => {
    const score = (m: CommunityResumenMember) =>
      m.resumen.mods.length +
      m.resumen.authors.length +
      m.resumen.youtubeChannels.length;
    return score(b) - score(a) || a.username.localeCompare(b.username);
  });
}

export function youtubeChannelLabel(url: string): string {
  const m = url.match(/@([^/?]+)/);
  if (m) return `@${m[1]}`;
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url.slice(0, 24);
  }
}

