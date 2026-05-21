import { incidentManager } from "@/lib/incidentManager";

const STORAGE_KEY = "mim_seen_community_share_ids";

export type ShareRow = {
  id: string;
  profile_id?: string;
  profiles?: { username?: string } | null;
};

function loadSeen(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveSeen(seen: Set<string>) {
  const arr = [...seen].slice(-500);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}

function notifyNew(
  rows: ShareRow[],
  kind: "mod" | "showcase" | "modpack",
  label: string,
  currentUserId?: string
) {
  const seen = loadSeen();
  const fresh = rows.filter(
    (r) =>
      r.id &&
      !seen.has(r.id) &&
      (!currentUserId || r.profile_id !== currentUserId)
  );
  if (fresh.length === 0) return;

  for (const row of fresh.slice(0, 5)) {
    const user = row.profiles?.username || "Alguien";
    incidentManager.createIncident({
      id: `fomo-share-${kind}-${row.id}`,
      title: `Nuevo ${label} en MIM Cloud`,
      detail: `@${user} compartió contenido en FOMO Cloud (${label}).`,
      severity: "info",
      module: "FOMO",
      meta: { kind, id: row.id, username: user },
    });
  }

  fresh.forEach((r) => seen.add(r.id));
  saveSeen(seen);
}

/** Marca el snapshot actual como visto (primera carga sin alertas). */
export function seedCommunityShareSeen(
  mods: ShareRow[],
  videos: ShareRow[],
  modpacks: ShareRow[]
) {
  const seen = loadSeen();
  [...mods, ...videos, ...modpacks].forEach((r) => {
    if (r.id) seen.add(r.id);
  });
  saveSeen(seen);
}

export function checkNewCommunityShares(
  mods: ShareRow[],
  videos: ShareRow[],
  modpacks: ShareRow[],
  currentUserId?: string
) {
  notifyNew(
    mods.filter((m) => !m.id?.startsWith("author-")),
    "mod",
    "compartido",
    currentUserId
  );
  notifyNew(videos, "showcase", "showcase", currentUserId);
  notifyNew(modpacks, "modpack", "modpack", currentUserId);
}
