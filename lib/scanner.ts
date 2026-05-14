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
  dependencies?: string[];
  categories?: string[];
  clientSide?: string;
  serverSide?: string;
  environment?: "client" | "server" | "both" | "unknown";
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
    /(?:^|[_\-\+])(?:mc)?(1\.(1[6-9]|2\d)(?:\.\d+)?)(?=[_\-\+]|$)/g,
    /(?:mc)?(1\.(1[6-9]|2\d)(?:\.\d+)?)/g,
  ];
  for (const pattern of patterns) {
    const matches = [...base.matchAll(pattern)];
    if (matches.length > 0) {
      return matches[matches.length - 1][1];
    }
  }
  return null;
}

function extractVersionFromFilename(filename: string): string | null {
  const base = filename.replace(/\.(zip|jar)$/i, "");
  const match = base.match(/[vr]([0-9]+(?:\.[0-9]+)+)/i) || 
                base.match(/(?:\D|^)([0-9]+\.[0-9]+(?:\.[0-9]+)*)(?:\D|$)/);
  return match ? match[1] : null;
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
  
  // Parse all [[mods]] sections to extract real mod IDs and avoid matching dependency modIds
  const modSections = content.split(/\[\[mods\]\]/i).slice(1);
  const mainModIds: string[] = [];
  let firstDisplayName = "";
  let firstVersion = "";
  let firstAuthor = "";

  for (const section of modSections) {
    const modContent = section.split("[[")[0];
    const idMatch = modContent.match(/modId\s*=\s*["']([^"']+)["']/);
    if (idMatch) {
      mainModIds.push(idMatch[1]);
    }
    if (!firstDisplayName) {
      const nameMatch = modContent.match(/displayName\s*=\s*"([^"]+)"/);
      if (nameMatch) firstDisplayName = nameMatch[1];
    }
    if (!firstVersion) {
      const verMatch = modContent.match(/^version\s*=\s*"(?![^"]*\$\{)([^"]+)"/m);
      if (verMatch) firstVersion = normalizeModVersion(verMatch[1]);
    }
    if (!firstAuthor) {
      const authorMatch = modContent.match(/authors?\s*=\s*"([^"]+)"/i);
      if (authorMatch) firstAuthor = authorMatch[1];
    }
  }

  if (mainModIds.length > 0) {
    result.modId = mainModIds[0];
    (result as any).providedIds = mainModIds;
  }

  if (firstDisplayName) result.modName = firstDisplayName;
  if (firstVersion) result.modVersion = firstVersion;
  if (firstAuthor) (result as any).author = firstAuthor;

  // Extract game version from [[dependencies]] sections
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
  const dependencies: string[] = [];
  for (const section of sections) {
    const typeMatch = section.match(/type\s*=\s*["']incompatible["']/i);
    const modIdMatch = section.match(/modId\s*=\s*["']([^"']+)["']/i);
    if (modIdMatch) {
      const depId = modIdMatch[1];
      if (typeMatch) {
        conflicts.push(depId);
      } else if (depId !== "minecraft" && depId !== "forge" && depId !== "neoforge") {
        dependencies.push(depId);
      }
    }
  }
  if (conflicts.length > 0) result.conflicts = conflicts;
  if (dependencies.length > 0) result.dependencies = dependencies;

  return result;
}

// ── Cache Layer ───────────────────────────────────────────────────────────────

const CACHE_FILE = path.join(SOURCE_BASE, ".mim-index", "mod-cache.json");
const CURRENT_CACHE_VERSION = 5;
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
  const findEntry = (name: string) => {
    const exact = entries.find((e: AdmZip.IZipEntry) => e.entryName === name);
    if (exact) return exact;
    const normalized = name.toLowerCase().replace(/^\//, "");
    return entries.find((e: AdmZip.IZipEntry) => {
      const entryLower = e.entryName.toLowerCase();
      return entryLower === normalized || entryLower.endsWith("/" + normalized);
    });
  };

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
    const gvFilename = gameVersionFromFilename(filePath);
    const finalGv = (gvFilename && parsed.gameVersion && gvFilename.length > parsed.gameVersion.length) ? gvFilename : (parsed.gameVersion ?? gvFilename ?? UNKNOWN);
    return { ...DEFAULT_META, ...parsed, loader: "neoforge", projectType: "mod", gameVersion: finalGv, ...(iconBase64 ? { iconBase64 } : {}), sha1 };
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
    const gvFilename = gameVersionFromFilename(filePath);
    const finalGv = (gvFilename && parsed.gameVersion && gvFilename.length > parsed.gameVersion.length) ? gvFilename : (parsed.gameVersion ?? gvFilename ?? UNKNOWN);
    return { ...DEFAULT_META, ...parsed, loader: "forge", projectType: "mod", gameVersion: finalGv, ...(iconBase64 ? { iconBase64 } : {}), sha1 };
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

      const depends = data.depends ? Object.keys(data.depends).filter(k => k !== "minecraft" && k !== "fabricloader" && k !== "fabric") : [];
      return { ...DEFAULT_META, loader: "fabric", projectType: "mod", modId: data.id ?? UNKNOWN, modName: data.name ?? UNKNOWN, modVersion: data.version ? normalizeModVersion(data.version) : UNKNOWN, gameVersion: gv ?? gameVersionFromFilename(filePath) ?? UNKNOWN, isCompatibleWithConnector: true, ...(iconBase64 ? { iconBase64 } : {}), sha1, ...(breaks.length > 0 ? { breaks } : {}), ...(conflicts.length > 0 ? { conflicts } : {}), ...(provides.length > 0 ? { providedIds: provides } : {}), ...(depends.length > 0 ? { dependencies: depends } : {}) };
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
      const depends = ql.depends ? ql.depends.map((d: any) => d.id).filter((id: string) => id && id !== "minecraft" && id !== "quilt_loader" && id !== "quilt") : [];
      return { ...DEFAULT_META, loader: "quilt", projectType: "mod", modId: ql.id ?? UNKNOWN, modName: ql.metadata?.name ?? UNKNOWN, modVersion: ql.version ?? UNKNOWN, gameVersion: gv ?? gameVersionFromFilename(filePath) ?? UNKNOWN, ...(iconBase64 ? { iconBase64 } : {}), sha1, ...(breaks.length > 0 ? { breaks } : {}), ...(depends.length > 0 ? { dependencies: depends } : {}) };
    } catch { return { ...DEFAULT_META, loader: "quilt", projectType: "mod", sha1 }; }
  }

  // 5. Shader / Pack / Library Heuristic
  const isShader = entries.some(e => e.entryName.startsWith("shaders/"));
  const packMcmetaEntry = findEntry("pack.mcmeta");
  const isResourcePack = entries.some(e => e.entryName.startsWith("assets/"));
  const isDataPack = entries.some(e => e.entryName.startsWith("data/"));
  const baseName = path.basename(filePath);
  const versionFromFilename = extractVersionFromFilename(baseName) || UNKNOWN;

  let projectType: string = DEFAULT_META.projectType;
  if (isShader) projectType = "shader";
  else if (isResourcePack) projectType = "resourcepack";
  else if (isDataPack) projectType = "datapack";
  else {
    const lowerName = baseName.toLowerCase();
    const keywords = ["library", "api", "lib-", "-lib", "core", "support", "framework"];
    if (keywords.some(k => lowerName.includes(k))) {
      projectType = "library";
    }
  }

  if (packMcmetaEntry || isResourcePack || isDataPack || isShader) {
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
    
    return { 
      ...DEFAULT_META, 
      projectType, 
      modId: path.basename(filePath, path.extname(filePath)), 
      modName: description, 
      modVersion: versionFromFilename,
      gameVersion: gameVersionFromFilename(filePath) ?? UNKNOWN, 
      ...(iconBase64 ? { iconBase64 } : {}), 
      sha1 
    };
  }

  return { ...DEFAULT_META, projectType, gameVersion: gameVersionFromFilename(filePath) ?? UNKNOWN, sha1 };
}