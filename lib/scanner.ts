/**
 * MIM – Mod Scanner
 * ─────────────────────────────────────────────────────────────────────────────
 * Reads the internal metadata of a .jar file (which is just a ZIP archive)
 * without extracting it to disk.
 *
 * Loader detection priority:
 *   1. NeoForge → META-INF/neoforge.mods.toml
 *   2. Forge   → META-INF/mods.toml
 *   3. Fabric  → fabric.mod.json
 *   4. Quilt   → quilt.mod.json
 *   5. Resourcepack / Datapack / Shaderpack (Assets/Data folders or pack.mcmeta)
 *   6. Unknown → filename-only heuristic for gameVersion
 * ─────────────────────────────────────────────────────────────────────────────
 */

import AdmZip from "adm-zip";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { SOURCE_BASE } from "./constants";

// ── Public Interface ──────────────────────────────────────────────────────────

export interface ModMeta {
  modId: string;
  modName: string;
  modVersion: string;
  gameVersion: string;
  loader: string;
  projectType: string;
  /** True when this is a Fabric mod that could be used via Sinytra Connector. */
  isCompatibleWithConnector: boolean;
  author?: string;
  iconBase64?: string;
  sha1?: string;
  conflicts?: string[]; // IDs of mods this mod is incompatible with
  breaks?: string[];    // Fabric/Quilt 'breaks' field
  providedIds?: string[]; // IDs this mod provides (aliases/stubs)
}

// ── Internal Defaults ─────────────────────────────────────────────────────────

const UNKNOWN = "unknown";

const DEFAULT_META: ModMeta = {
  modId: UNKNOWN,
  modName: UNKNOWN,
  modVersion: UNKNOWN,
  gameVersion: UNKNOWN,
  loader: UNKNOWN,
  projectType: UNKNOWN,
  isCompatibleWithConnector: false,
};

// ── Version Parsing Helpers ───────────────────────────────────────────────────

function extractMcVersionFromRange(range: string): string | null {
  const matches = [...range.matchAll(/1\.(1[6-9]|2\d)(?:\.\d+)?/g)].map(m => m[0]);
  if (matches.length === 0) return null;
  if (matches.length === 1) {
    return (range.includes(",") || range.includes(">") || range.includes(".x")) 
      ? `${matches[0]}+` 
      : matches[0];
  }
  if (matches[0] === matches[1]) return matches[0];
  return `${matches[0]} - ${matches[1]}`;
}

function gameVersionFromFilename(filePath: string): string | null {
  const base = path.basename(filePath, ".jar");
  const patterns = [
    /mc?1\.(1[6-9]|2\d)(?:\.\d+)?/g,
    /[_\-\+](1\.(1[6-9]|2\d)(?:\.\d+)?)[_\-\+\.]/g,
    /(?:^|[_\-\+])(1\.(1[6-9]|2\d)(?:\.\d+)?)(?:[_\-\+]|$)/g,
    /1\.(1[6-9]|2\d)(?:\.\d+)?/g,
  ];
  for (const pattern of patterns) {
    const matches = [...base.matchAll(pattern)];
    if (matches.length > 0) {
      let version = matches[matches.length - 1][0];
      version = version.replace(/^mc?/, '').replace(/[_\-\+]/g, '');
      return version;
    }
  }
  return null;
}

function normalizeModVersion(version: string): string {
  if (!version || version === "unknown") return version;
  let clean = version.trim()
    .replace(/^v/i, "")
    .replace(/[-+]?(fabric|forge|neoforge|quilt|snapshot|alpha|beta|dev|local|all|release|final|pre|build)/gi, "")
    .replace(/[-+]?(mc)?1\.(1[6-9]|2\d)(\.\d+)?/gi, "")
    .replace(/[_-]/g, ".")
    .replace(/[^0-9.]/g, "")
    .replace(/^\.+|\.+$/g, "")
    .replace(/\.{2,}/g, ".");
  const parts = clean.split(".");
  if (parts.length > 4) clean = parts.slice(0, 4).join(".");
  return clean || version;
}

function gameVersionFromPath(filePath: string): string | null {
  const match = filePath.match(/[\\/](1\.(?:1[6-9]|2\d)(?:\.\d+)?)[\\/]/);
  return match ? match[1] : null;
}

function parseForgeToml(content: string): Partial<ModMeta> {
  const result: Partial<ModMeta> = {};
  const idMatch = content.match(/^modId\s*=\s*["']([^"']+)["']/m);
  if (idMatch) result.modId = idMatch[1];
  const allIds = [...content.matchAll(/modId\s*=\s*["']([^"']+)["']/g)].map(m => m[1]);
  if (allIds.length > 0) (result as any).providedIds = Array.from(new Set(allIds));
  const nameMatch = content.match(/displayName\s*=\s*"([^"]+)"/);
  if (nameMatch) result.modName = nameMatch[1];
  const verMatch = content.match(/^version\s*=\s*"(?![^"]*\$\{)([^"]+)"/m);
  if (verMatch) {
    result.modVersion = normalizeModVersion(verMatch[1]);
  }
  const authorMatch = content.match(/authors?\s*=\s*"([^"]+)"/i);
  if (authorMatch) (result as any).author = authorMatch[1];
  const sections = content.split(/\[\[dependencies/i);
  let foundGv = null;
  for (const section of sections) {
    const isMc = /modId\s*=\s*["']minecraft["']/i.test(section);
    const rangeMatch = section.match(/versionRange\s*=\s*"([^"]+)"/);
    if (rangeMatch) {
      const gv = extractMcVersionFromRange(rangeMatch[1]);
      if (gv) {
        foundGv = gv;
        if (isMc) break;
      }
    }
  }
  if (foundGv) result.gameVersion = foundGv;
  const logoMatch = content.match(/logoFile\s*=\s*"([^"]+)"/);
  if (logoMatch) (result as any)._logoFile = logoMatch[1];

  const conflicts: string[] = [];
  for (const section of sections) {
    const typeMatch = section.match(/type\s*=\s*["']incompatible["']/i);
    const modIdMatch = section.match(/modId\s*=\s*["']([^"']+)["']/i);
    if (typeMatch && modIdMatch) conflicts.push(modIdMatch[1]);
  }
  if (conflicts.length > 0) result.conflicts = conflicts;

  return result;
}

// ── Cache Layer ───────────────────────────────────────────────────────────────

const CACHE_FILE = path.join(SOURCE_BASE, ".mim-index", "mod-cache.json");
const CURRENT_CACHE_VERSION = 3;
let modCache: { version: number; entries: Record<string, { mtimeMs: number; size: number; meta: ModMeta }> } | null = null;
let saveTimeout: NodeJS.Timeout | null = null;

function loadCache() {
  if (modCache) return modCache;
  if (fs.existsSync(CACHE_FILE)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
      if (parsed && parsed.version === CURRENT_CACHE_VERSION) modCache = parsed;
    } catch (e) {}
  }
  if (!modCache || !modCache.entries) modCache = { version: CURRENT_CACHE_VERSION, entries: {} };
  return modCache;
}

function queueSaveCache() {
  if (saveTimeout) return;
  saveTimeout = setTimeout(() => {
    saveTimeout = null;
    if (modCache) {
      try {
        fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
        fs.writeFileSync(CACHE_FILE, JSON.stringify(modCache, null, 2), "utf-8");
      } catch (e) {}
    }
  }, 1000);
}

export function scanMod(filePath: string): ModMeta {
  if (!fs.existsSync(filePath)) throw new Error(`[scanner] File not found: ${filePath}`);
  try {
    const stat = fs.statSync(filePath);
    const mtimeMs = stat.mtimeMs;
    const size = stat.size;
    const cache = loadCache();
    const cachedEntry = cache.entries[filePath];
    if (cachedEntry && cachedEntry.mtimeMs === mtimeMs && cachedEntry.size === size) return cachedEntry.meta;
    const meta = scanModRaw(filePath);
    cache.entries[filePath] = { mtimeMs, size, meta };
    queueSaveCache();
    return meta;
  } catch (e) {
    return scanModRaw(filePath);
  }
}

function scanModRaw(filePath: string): ModMeta {
  if (!fs.existsSync(filePath)) throw new Error(`[scanner] File not found: ${filePath}`);
  const fileBuffer = fs.readFileSync(filePath);
  const sha1 = crypto.createHash("sha1").update(fileBuffer).digest("hex");
  const zip = new AdmZip(fileBuffer);
  const entries = zip.getEntries();
  const findEntry = (name: string) => entries.find((e: AdmZip.IZipEntry) => e.entryName === name);

  // 1. NeoForge
  const neoforgeEntry = findEntry("META-INF/neoforge.mods.toml");
  if (neoforgeEntry) {
    const parsed = parseForgeToml(neoforgeEntry.getData().toString("utf8"));
    let iconBase64: string | undefined;
    if ((parsed as any)._logoFile) {
      const iconEntry = findEntry((parsed as any)._logoFile);
      if (iconEntry) try { iconBase64 = `data:image/png;base64,${iconEntry.getData().toString("base64")}`; } catch {}
      delete (parsed as any)._logoFile;
    }
    return { ...DEFAULT_META, ...parsed, loader: "neoforge", projectType: "mod", gameVersion: parsed.gameVersion ?? gameVersionFromFilename(filePath) ?? UNKNOWN, ...(iconBase64 ? { iconBase64 } : {}), sha1 };
  }

  // 2. Forge
  const forgeEntry = findEntry("META-INF/mods.toml");
  if (forgeEntry) {
    const parsed = parseForgeToml(forgeEntry.getData().toString("utf8"));
    let iconBase64: string | undefined;
    if ((parsed as any)._logoFile) {
      const iconEntry = findEntry((parsed as any)._logoFile);
      if (iconEntry) try { iconBase64 = `data:image/png;base64,${iconEntry.getData().toString("base64")}`; } catch {}
      delete (parsed as any)._logoFile;
    }
    return { ...DEFAULT_META, ...parsed, loader: "forge", projectType: "mod", gameVersion: parsed.gameVersion ?? gameVersionFromFilename(filePath) ?? UNKNOWN, ...(iconBase64 ? { iconBase64 } : {}), sha1 };
  }

  // 3. Fabric
  const fabricEntry = findEntry("fabric.mod.json");
  if (fabricEntry) {
    try {
      const data = JSON.parse(fabricEntry.getData().toString("utf8"));
      const mcDep = data.depends?.minecraft;
      const depStr = Array.isArray(mcDep) ? mcDep[0] : String(mcDep || "");
      const gv = depStr ? extractMcVersionFromRange(depStr) : null;
      let iconBase64: string | undefined;
      const iconPath = typeof data.icon === "string" ? data.icon : Array.isArray(data.icon) ? data.icon[0] : null;
      if (iconPath) {
        const iconEntry = findEntry(iconPath.replace(/^\//, ""));
        if (iconEntry) try { iconBase64 = `data:image/png;base64,${iconEntry.getData().toString("base64")}`; } catch {}
      }
      const breaks = data.breaks ? Object.keys(data.breaks) : [];
      const conflicts = data.conflicts ? Object.keys(data.conflicts) : [];
      const provides = data.provides ? (Array.isArray(data.provides) ? data.provides : Object.keys(data.provides)) : [];

      return { ...DEFAULT_META, loader: "fabric", projectType: "mod", modId: data.id ?? UNKNOWN, modName: data.name ?? UNKNOWN, modVersion: data.version ? normalizeModVersion(data.version) : UNKNOWN, gameVersion: gv ?? gameVersionFromFilename(filePath) ?? UNKNOWN, isCompatibleWithConnector: true, ...(iconBase64 ? { iconBase64 } : {}), sha1, ...(breaks.length > 0 ? { breaks } : {}), ...(conflicts.length > 0 ? { conflicts } : {}), ...(provides.length > 0 ? { providedIds: provides } : {}) };
    } catch { return { ...DEFAULT_META, loader: "fabric", projectType: "mod", isCompatibleWithConnector: true, sha1 }; }
  }

  // 4. Quilt
  const quiltEntry = findEntry("quilt.mod.json");
  if (quiltEntry) {
    try {
      const data = JSON.parse(quiltEntry.getData().toString("utf8"));
      const ql = data.quilt_loader ?? {};
      const mcDep = (ql.depends ?? []).find((d: any) => d.id === "minecraft");
      const gv = mcDep?.versions ? extractMcVersionFromRange(String(mcDep.versions)) : null;
      let iconBase64: string | undefined;
      const iconPath = ql.metadata?.icon;
      if (iconPath) {
        const iconEntry = findEntry(iconPath.replace(/^\//, ""));
        if (iconEntry) try { iconBase64 = `data:image/png;base64,${iconEntry.getData().toString("base64")}`; } catch {}
      }
      const breaks = ql.breaks ? Object.keys(ql.breaks) : [];
      return { ...DEFAULT_META, loader: "quilt", projectType: "mod", modId: ql.id ?? UNKNOWN, modName: ql.metadata?.name ?? UNKNOWN, modVersion: ql.version ?? UNKNOWN, gameVersion: gv ?? gameVersionFromFilename(filePath) ?? UNKNOWN, ...(iconBase64 ? { iconBase64 } : {}), sha1, ...(breaks.length > 0 ? { breaks } : {}) };
    } catch { return { ...DEFAULT_META, loader: "quilt", projectType: "mod", sha1 }; }
  }

  // 5. Shader / Pack Heuristic
  const isShader = entries.some(e => e.entryName.startsWith("shaders/"));
  if (isShader) return { ...DEFAULT_META, projectType: "shader", modId: path.basename(filePath, path.extname(filePath)), modName: path.basename(filePath, path.extname(filePath)), gameVersion: gameVersionFromFilename(filePath) ?? UNKNOWN, sha1 };

  const packMcmetaEntry = findEntry("pack.mcmeta");
  const isResourcePack = entries.some(e => e.entryName.startsWith("assets/"));
  const isDataPack = entries.some(e => e.entryName.startsWith("data/"));

  if (packMcmetaEntry || isResourcePack || isDataPack) {
    let description = path.basename(filePath, path.extname(filePath));
    let iconBase64: string | undefined;
    if (packMcmetaEntry) {
      try {
        const parsed = JSON.parse(packMcmetaEntry.getData().toString("utf8"));
        if (parsed?.pack?.description) description = typeof parsed.pack.description === "object" ? (parsed.pack.description.text || description) : String(parsed.pack.description);
      } catch {}
    }
    const packPngEntry = findEntry("pack.png");
    if (packPngEntry) try { iconBase64 = `data:image/png;base64,${packPngEntry.getData().toString("base64")}`; } catch {}
    
    return { ...DEFAULT_META, projectType: isResourcePack ? "resourcepack" : isDataPack ? "datapack" : UNKNOWN, modId: path.basename(filePath, path.extname(filePath)), modName: description, gameVersion: gameVersionFromFilename(filePath) ?? UNKNOWN, ...(iconBase64 ? { iconBase64 } : {}), sha1 };
  }

  return { ...DEFAULT_META, projectType: UNKNOWN, gameVersion: gameVersionFromFilename(filePath) ?? UNKNOWN, sha1 };
}