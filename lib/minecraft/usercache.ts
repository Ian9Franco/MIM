import fs from "fs";
import path from "path";
import os from "os";

export interface MinecraftProfileEntry {
  name: string;
  uuid: string;
}

export interface PrimaryMinecraftProfile {
  username: string;
  uuid: string;
  displayName: string;
  avatarUrl: string;
  minecraftDir: string;
}

function normalizeUuidString(uuid: string): string {
  return uuid.replace(/-/g, "").toLowerCase();
}

function getDefaultMinecraftDirectory(): string | null {
  const envPath = process.env.MINECRAFT_PATH || process.env.MINECRAFT_DIR;
  if (envPath && fs.existsSync(envPath)) {
    return envPath;
  }

  const home = os.homedir();
  if (!home) return null;

  const candidates = [
    path.join(home, ".minecraft"),
    path.join(home, "Library", "Application Support", "minecraft"),
  ];

  if (process.platform === "win32") {
    const appData = process.env.APPDATA;
    if (appData) {
      candidates.unshift(path.join(appData, ".minecraft"));
    }
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function findUsercachePath(startDir?: string, levels = 4): string | null {
  const root = startDir ? path.resolve(startDir) : getDefaultMinecraftDirectory();
  if (!root) return null;

  let current = root;
  for (let i = 0; i <= levels; i++) {
    const candidate = path.join(current, "usercache.json");
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  return null;
}

export async function loadUsercacheEntries(startDir?: string): Promise<MinecraftProfileEntry[]> {
  const usercachePath = findUsercachePath(startDir, 4);
  if (!usercachePath) return [];

  try {
    const content = await fs.promises.readFile(usercachePath, "utf8");
    const parsed = JSON.parse(content) as Array<Partial<MinecraftProfileEntry>>;
    return parsed
      .filter((entry): entry is MinecraftProfileEntry => Boolean(entry?.name && entry?.uuid))
      .map((entry) => ({ name: entry.name, uuid: entry.uuid }));
  } catch {
    return [];
  }
}

export async function resolveUuidToUsername(uuid: string, startDir?: string): Promise<string | null> {
  const normalized = normalizeUuidString(uuid);
  if (!/^[0-9a-f]{32}$/.test(normalized)) return null;

  const entries = await loadUsercacheEntries(startDir);
  for (const entry of entries) {
    if (normalizeUuidString(entry.uuid) === normalized) {
      return entry.name;
    }
  }

  try {
    const url = `https://api.mojang.com/user/profile/${normalized}`;
    const res = await fetch(url, { cache: "no-store" } as any);
    if (!res.ok) return null;
    const body = await res.json();
    if (body?.name) {
      return String(body.name);
    }
  } catch {
    return null;
  }

  return null;
}

export async function getPrimaryMinecraftProfile(minecraftDir?: string): Promise<PrimaryMinecraftProfile | null> {
  const usercacheDir = minecraftDir || getDefaultMinecraftDirectory();
  if (!usercacheDir) return null;

  const entries = await loadUsercacheEntries(usercacheDir);
  if (entries.length === 0) return null;

  const primary = entries[entries.length - 1];
  const normalized = normalizeUuidString(primary.uuid);
  return {
    username: primary.name,
    uuid: normalized,
    displayName: `${primary.name} (${primary.uuid})`,
    avatarUrl: `https://crafatar.com/avatars/${normalized}?size=64`,
    minecraftDir: usercacheDir,
  };
}
