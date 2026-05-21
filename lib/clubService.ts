import { supabase } from "@/lib/supabaseClient";
import { mimDB } from "@/lib/indexeddb";
import type { ModHit } from "@/lib/types";
import {
  EMPTY_CLUB,
  type ClubAuthorEntry,
  type ClubModEntry,
  type CommunityClubMember,
  type UserClubData,
} from "./clubTypes";
import { inferTypeFromModHit } from "./communityShareMeta";

const AUTHOR_MARKERS = ["autor de minecraft", "¿querés agregar"];

function isAuthorFavorite(summary?: string | null): boolean {
  if (!summary) return false;
  const s = summary.toLowerCase();
  return AUTHOR_MARKERS.some((m) => s.includes(m));
}

export function parseClubData(raw: unknown): UserClubData {
  if (!raw || typeof raw !== "object") return { ...EMPTY_CLUB };
  const o = raw as UserClubData;
  return {
    mods: Array.isArray(o.mods) ? o.mods : [],
    authors: Array.isArray(o.authors) ? o.authors : [],
    youtubeChannels: Array.isArray(o.youtubeChannels) ? o.youtubeChannels : [],
    updatedAt: o.updatedAt,
  };
}

export function clubFromFavoriteRows(
  rows: {
    mod_id: string;
    platform: string;
    name: string;
    icon_url?: string | null;
    summary?: string | null;
  }[]
): UserClubData {
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

export async function buildLocalClubSnapshot(): Promise<UserClubData> {
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
        gameVersion: m.gameVersions?.[0] || (m as { gameVersion?: string }).gameVersion,
        modloader:
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

/** Publica el club local del usuario en profiles.club_data (si la columna existe). */
export async function syncMyClubToCloud(userId: string): Promise<boolean> {
  const club = await buildLocalClubSnapshot();
  const { error } = await supabase
    .from("profiles")
    .update({ club_data: club, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) {
    console.warn("[club] sync skipped:", error.message);
    return false;
  }
  return true;
}

export async function fetchCommunityClubs(
  currentUserId?: string
): Promise<CommunityClubMember[]> {
  const [profilesRes, favsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, avatar_url, color, club_data")
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

  const members: CommunityClubMember[] = profiles.map((p) => {
    let club = parseClubData(p.club_data);
    const hasCloudClub = p.club_data != null;
    const inferred = clubFromFavoriteRows(favsByProfile.get(p.id) || []);
    if (club.mods.length === 0 && inferred.mods.length > 0) {
      club = { ...club, mods: inferred.mods };
    }
    if (club.authors.length === 0 && inferred.authors.length > 0) {
      club = { ...club, authors: inferred.authors };
    }
    return {
      id: p.id,
      username: p.username,
      avatar_url: p.avatar_url,
      color: p.color,
      club,
      hasCloudClub,
    };
  });

  if (currentUserId) {
    const me = members.find((m) => m.id === currentUserId);
    if (me) {
      const local = await buildLocalClubSnapshot();
      const hasLocal =
        local.mods.length > 0 ||
        local.authors.length > 0 ||
        local.youtubeChannels.length > 0;
      if (
        hasLocal &&
        local.mods.length >= me.club.mods.length &&
        local.updatedAt
      ) {
        me.club = local;
      }
    } else {
      const prof = profiles.find((p) => p.id === currentUserId);
      if (prof) {
        const local = await buildLocalClubSnapshot();
        members.push({
          id: prof.id,
          username: prof.username,
          avatar_url: prof.avatar_url,
          color: prof.color,
          club: local,
          hasCloudClub: false,
        });
      }
    }
  }

  return members.sort((a, b) => {
    const score = (m: CommunityClubMember) =>
      m.club.mods.length +
      m.club.authors.length +
      m.club.youtubeChannels.length;
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
