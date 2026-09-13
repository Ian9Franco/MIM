import type { ModHit } from "@/lib/core/types";
import type { FollowedAuthor } from "@/lib/db/schema";
import { supabase } from "@/lib/core/supabaseClient";
import { mimDB } from "@/lib/storage/indexeddb";

export interface CloudFollowedMod {
  mod_id: string;
  name?: string;
  icon_url?: string | null;
  platform?: string;
  project_type?: string;
  created_at?: string;
}

export interface CloudFollowedAuthor {
  author_name: string;
  author_url?: string | null;
  icon_url?: string | null;
  platform?: string;
  created_at?: string;
}

function cloudModToModHit(row: CloudFollowedMod): ModHit {
  let title = row.name || "Proyecto";
  let author = "Comunidad";
  if (title.includes(" ::: ")) {
    [title, author] = title.split(" ::: ");
  }
  const platform = row.platform || "modrinth";
  const projectType = row.project_type || "mod";
  return {
    projectId: row.mod_id,
    title,
    author,
    projectType,
    iconUrl: row.icon_url ?? null,
    _source: platform as ModHit["_source"],
    url:
      platform === "curseforge"
        ? `https://www.curseforge.com/projects/${row.mod_id}`
        : `https://modrinth.com/${projectType}/${row.mod_id}`,
  } as ModHit;
}

function cloudAuthorToLocal(row: CloudFollowedAuthor): FollowedAuthor {
  return {
    name: row.author_name,
    iconUrl: row.icon_url ?? undefined,
    dateFollowed: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
}

export async function fetchCloudFollows(userId: string) {
  const [{ data: mods }, { data: authors }] = await Promise.all([
    supabase.from("followed_mods").select("*").eq("profile_id", userId).order("created_at", { ascending: false }),
    supabase.from("followed_authors").select("*").eq("profile_id", userId).order("created_at", { ascending: false }),
  ]);
  return {
    mods: (mods || []) as CloudFollowedMod[],
    authors: (authors || []) as CloudFollowedAuthor[],
  };
}

/** Merge cloud follows into IndexedDB (union, cloud wins on same id). */
export async function syncCloudFollowsToLocal(userId: string): Promise<{ mods: ModHit[]; authors: FollowedAuthor[] }> {
  await mimDB.init();
  const { mods: cloudMods, authors: cloudAuthors } = await fetchCloudFollows(userId);

  const localMods = await mimDB.getAllFollowedMods();
  const localAuthors = await mimDB.getAllFollowedAuthors();

  const cloudModIds = new Set(cloudMods.map((m) => m.mod_id));
  const cloudAuthorKeys = new Set(cloudAuthors.map((a) => `${a.author_name}::${a.platform || "modrinth"}`));

  for (const row of cloudMods) {
    const hit = cloudModToModHit(row);
    await mimDB.setFollowedMod({
      projectId: hit.projectId,
      data: hit,
      dateFollowed: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    });
  }

  for (const row of cloudAuthors) {
    const local = cloudAuthorToLocal(row);
    await mimDB.setFollowedAuthor(local);
  }

  for (const entry of localMods) {
    const id = entry.projectId || entry.data?.projectId;
    if (id && !cloudModIds.has(id)) {
      await pushFollowModToCloud(userId, entry.data, true);
    }
  }

  for (const entry of localAuthors) {
    const name = typeof entry === "string" ? entry : entry.name;
    const platform = "modrinth";
    const key = `${name}::${platform}`;
    if (name && !cloudAuthorKeys.has(key)) {
      const iconUrl = typeof entry === "string" ? undefined : entry.iconUrl;
      await pushFollowAuthorToCloud(userId, name, undefined, iconUrl, platform, true);
    }
  }

  const mergedMods = await mimDB.getAllFollowedMods();
  const mergedAuthors = await mimDB.getAllFollowedAuthors();

  return {
    mods: mergedMods.map((m) => m.data),
    authors: mergedAuthors.map((a) => (typeof a === "string" ? { name: a, dateFollowed: Date.now() } : a)),
  };
}

export async function pushFollowModToCloud(userId: string, mod: ModHit, isFollow: boolean) {
  const modId = mod.projectId;
  if (!modId) return;

  if (isFollow) {
    const { error } = await supabase.from("followed_mods").insert({
      profile_id: userId,
      mod_id: modId,
      name: mod.author ? `${mod.title} ::: ${mod.author}` : mod.title,
      icon_url: mod.iconUrl || null,
      platform: mod._source || "modrinth",
      project_type: mod.projectType || "mod",
    });
    if (error && !/duplicate|unique/i.test(error.message)) {
      console.warn("[followedSync] push mod:", error.message);
    }
  } else {
    const { error } = await supabase
      .from("followed_mods")
      .delete()
      .eq("profile_id", userId)
      .eq("mod_id", modId);
    if (error) console.warn("[followedSync] unfollow mod:", error.message);
  }
}

export async function pushFollowAuthorToCloud(
  userId: string,
  authorName: string,
  authorUrl?: string,
  iconUrl?: string | null,
  platform = "modrinth",
  isFollow = true
) {
  if (!authorName) return;

  if (isFollow) {
    const { error } = await supabase.from("followed_authors").insert({
      profile_id: userId,
      author_name: authorName,
      author_url: authorUrl || null,
      icon_url: iconUrl || null,
      platform,
    });
    if (error && !/duplicate|unique/i.test(error.message)) {
      console.warn("[followedSync] push author:", error.message);
    }
  } else {
    const { error } = await supabase
      .from("followed_authors")
      .delete()
      .eq("profile_id", userId)
      .eq("author_name", authorName)
      .eq("platform", platform);
    if (error) console.warn("[followedSync] unfollow author:", error.message);
  }
}

export async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}
