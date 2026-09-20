/**
 * Closed layout of the canonical MIM index.
 * Writers must use these paths; do not invent sibling folders.
 */

import fs from "fs";
import path from "path";

export const SINCERAMIENTO_01_ID = "sinceramiento_01";

export interface MimIndexLayout {
  root: string;
  settings: string;
  secrets: string;
  migrationsDir: string;
  marker: string;
  cache: string;
  sageCache: string;
  semanticCache: string;
  vtCache: string;
  remoteCache: string;
  curseforgeModpackCache: string;
  data: string;
  collections: string;
  downloadHistory: string;
  whitelist: string;
  showcaseChannels: string;
  showcaseUsage: string;
  tweak: string;
  tweakDraft: string;
  tweakMaster: string;
  tweakSnapshots: string;
  history: string;
  historyConfig: string;
  staging: string;
  playerRescue: string;
  serverManager: string;
}

/** Maps a relative path inside a legacy .mim-index onto the canonical layout. */
export const LEGACY_INDEX_RELOCATIONS: Array<{ from: string; to: keyof MimIndexLayout }> = [
  { from: "mim-settings.json", to: "settings" },
  { from: "mim-secrets.enc.json", to: "secrets" },
  { from: "collections.json", to: "collections" },
  { from: "download-history.json", to: "downloadHistory" },
  { from: "tweak_global_draft.json", to: "tweakDraft" },
  { from: "remote-cache.json", to: "remoteCache" },
  { from: "semantic-cache.json", to: "semanticCache" },
  { from: "data/collections.json", to: "collections" },
  { from: "data/download-history.json", to: "downloadHistory" },
  { from: "data/whitelist.json", to: "whitelist" },
  { from: "data/showcase_channels.json", to: "showcaseChannels" },
  { from: "data/showcase_usage.json", to: "showcaseUsage" },
  { from: "cache/sage-cache.json", to: "sageCache" },
  { from: "cache/semantic-cache.json", to: "semanticCache" },
  { from: "cache/vt-cache.json", to: "vtCache" },
  { from: "cache/remote-cache.json", to: "remoteCache" },
  { from: "cache/fomo_modpack_dependencies_cache.json", to: "curseforgeModpackCache" },
  { from: "tweak", to: "tweak" },
  { from: "history", to: "history" },
  { from: "server-manager", to: "serverManager" },
  { from: "player-rescue", to: "playerRescue" },
];

export function mimIndexLayout(indexPath: string): MimIndexLayout {
  const root = path.resolve(indexPath);
  return {
    root,
    settings: path.join(root, "mim-settings.json"),
    secrets: path.join(root, "mim-secrets.enc.json"),
    migrationsDir: path.join(root, ".migrations"),
    marker: path.join(root, ".migrations", `${SINCERAMIENTO_01_ID}.json`),
    cache: path.join(root, "cache"),
    sageCache: path.join(root, "cache", "sage-cache.json"),
    semanticCache: path.join(root, "cache", "semantic-cache.json"),
    vtCache: path.join(root, "cache", "vt-cache.json"),
    remoteCache: path.join(root, "cache", "remote-cache.json"),
    curseforgeModpackCache: path.join(root, "cache", "fomo_modpack_dependencies_cache.json"),
    data: path.join(root, "data"),
    collections: path.join(root, "data", "collections.json"),
    downloadHistory: path.join(root, "data", "download-history.json"),
    whitelist: path.join(root, "data", "whitelist.json"),
    showcaseChannels: path.join(root, "data", "showcase_channels.json"),
    showcaseUsage: path.join(root, "data", "showcase_usage.json"),
    tweak: path.join(root, "tweak"),
    tweakDraft: path.join(root, "tweak", "tweak_global_draft.json"),
    tweakMaster: path.join(root, "tweak", "master_options.txt"),
    tweakSnapshots: path.join(root, "tweak", "snapshots"),
    history: path.join(root, "history"),
    historyConfig: path.join(root, "history", "config"),
    staging: path.join(root, "staging"),
    playerRescue: path.join(root, "player-rescue"),
    serverManager: path.join(root, "server-manager"),
  };
}

export function samePath(a: string, b: string): boolean {
  const left = path.resolve(a);
  const right = path.resolve(b);
  if (process.platform === "win32") {
    return left.toLowerCase() === right.toLowerCase();
  }
  return left === right;
}

export function ensureDirForWrite(fileOrDir: string): void {
  const dir = path.extname(fileOrDir) ? path.dirname(fileOrDir) : fileOrDir;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function isEmptyDir(dir: string): boolean {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return false;
  return fs.readdirSync(dir).length === 0;
}
