/**
 * MIM – Mod Scanner
 * ─────────────────────────────────────────────────────────────────────────────
 * Reads the internal metadata of a .jar file (which is just a ZIP archive)
 * without extracting it to disk.
 *
 * Loader detection priority:
 *   1. Fabric  → fabric.mod.json
 *   2. Quilt   → quilt.mod.json
 *   3. NeoForge → META-INF/neoforge.mods.toml
 *   4. Forge   → META-INF/mods.toml
 *   5. Unknown → filename-only heuristic for gameVersion
 *
 * The `isCompatibleWithConnector` flag marks Fabric mods that can be loaded
 * by Forge via the Sinytra Connector mod.
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

/**
 * Extracts a Minecraft version string from a version range expression.
 *
 * Forge/NeoForge often express the minecraft dependency as a Maven range:
 *   "[1.20.1,1.21)"  →  "1.20.1"
 *   "1.20.x"         →  "1.20"
 *   ">=1.21"         →  "1.21"
 *
 * We use a greedy regex that picks the first MC-like version it finds.
 */
function extractMcVersionFromRange(range: string): string | null {
  // Find all MC-like versions in the range string
  const matches = [...range.matchAll(/1\.(1[6-9]|2\d)(?:\.\d+)?/g)].map(m => m[0]);
  if (matches.length === 0) return null;

  // Case: Single version with a range indicator (e.g., ">=1.21" or "[1.21, )")
  if (matches.length === 1) {
    return (range.includes(",") || range.includes(">") || range.includes(".x")) 
      ? `${matches[0]}+` 
      : matches[0];
  }

  // Case: Explicit range (e.g., "[1.21, 1.21.1]")
  if (matches[0] === matches[1]) return matches[0];
  
  // If it's a typical Forge range like [1.21, 1.22), showing 1.21 - 1.22 can be confusing.
  // We'll show it as a range if it's small, or 1.21+ if it's a major jump.
  return `${matches[0]} - ${matches[1]}`;
}

/**
 * Enhanced fallback: scrape the game version from the filename itself.
 *
 * Examples:
 *   "sodium-fabric-mc1.20.1-0.5.3.jar"  →  "1.20.1"
 *   "primal-1.1.6+1.20.1.jar"           →  "1.20.1"
 *   "mod-1.20.1.jar"                    →  "1.20.1"
 *   "mod_1.20.1.jar"                    →  "1.20.1"
 *   "mod-for-mc1.20.1.jar"              →  "1.20.1"
 *   "mod-1.20.jar"                      →  "1.20"
 *
 * When multiple MC-like strings appear (e.g. "1.20-1.20.1"), we pick the
 * last one because filenames typically end with the MC version.
 */
function gameVersionFromFilename(filePath: string): string | null {
  const base = path.basename(filePath, ".jar");
  
  // Patrones mejorados para detectar versiones
  const patterns = [
    /mc?1\.(1[6-9]|2\d)(?:\.\d+)?/g,           // mc1.20.1, 1.20.1
    /[_\-\+](1\.(1[6-9]|2\d)(?:\.\d+)?)[_\-\+\.]/g, // _1.20.1_, -1.20.1-, +1.20.1+
    /(?:^|[_\-\+])(1\.(1[6-9]|2\d)(?:\.\d+)?)(?:[_\-\+]|$)/g, // inicio/final con separadores
    /1\.(1[6-9]|2\d)(?:\.\d+)?/g,              // fallback original
  ];

  for (const pattern of patterns) {
    const matches = [...base.matchAll(pattern)];
    if (matches.length > 0) {
      // Limpiar el match de prefijos/sufijos
      let version = matches[matches.length - 1][0];
      version = version.replace(/^mc?/, '').replace(/[_\-\+]/g, '');
      return version;
    }
  }

  return null;
}

/**
 * Normalize and clean mod version strings
 */
function normalizeModVersion(version: string): string {
  if (!version || version === "unknown") return version;
  
  // Limpiar caracteres problemáticos
  let clean = version.trim()
    .replace(/^v/i, "") // Quitar 'v' inicial
    .replace(/[-+]?(fabric|forge|neoforge|quilt|snapshot|alpha|beta|dev|local|all|release|final|pre|build)/gi, "") // Quitar sufijos comunes
    .replace(/[-+]?(mc)?1\.(1[6-9]|2\d)(\.\d+)?/gi, "") // Quitar versiones de Minecraft
    .replace(/[_-]/g, ".") // Estandarizar separadores
    .replace(/[^0-9.]/g, "") // Solo números y puntos
    .replace(/^\.+|\.+$/g, "") // Quitar puntos extremos
    .replace(/\.{2,}/g, "."); // Reducir puntos múltiples

  // Validar que la versión tenga sentido
  const parts = clean.split(".");
  if (parts.length > 4) {
    clean = parts.slice(0, 4).join(".");
  }

  return clean || version; // Return original si no se puede limpiar
}

/**
 * Super fallback: if the version isn't in the metadata or filename,
 * look at the directory structure (e.g., .../1.21.1/neoforge/...).
 */
function gameVersionFromPath(filePath: string): string | null {
  const match = filePath.match(/[\\/](1\.(?:1[6-9]|2\d)(?:\.\d+)?)[\\/]/);
  return match ? match[1] : null;
}

// ── Forge / NeoForge TOML Parser ──────────────────────────────────────────────

/**
 * Parses the relevant fields from a Forge / NeoForge `mods.toml` file.
 *
 * We use regex instead of a full TOML library to avoid adding a dependency
 * for what is effectively three field extractions.
 *
 * Known edge cases handled:
 *   - `version = "${file.jarVersion}"` → Gradle placeholder, treated as unknown
 *   - Multiple `[[dependencies.*]]` blocks → we only look at the one with
 *     `modId = "minecraft"` for the gameVersion range
 */
function parseForgeToml(content: string): Partial<ModMeta> {
  const result: Partial<ModMeta> = {};

  // modId — first occurrence is the mod itself; subsequent ones are deps
  const idMatch = content.match(/^modId\s*=\s*"([^"]+)"/m);
  if (idMatch) result.modId = idMatch[1];

  // displayName
  const nameMatch = content.match(/displayName\s*=\s*"([^"]+)"/);
  if (nameMatch) result.modName = nameMatch[1];

  // version — explicitly skip Gradle placeholder strings like "${file.jarVersion}"
  // The negative lookahead `(?![^"]*\$\{)` rejects any value containing "${"
  const verMatch = content.match(/^version\s*=\s*"(?![^"]*\$\{)([^"]+)"/m);
  if (verMatch) {
    result.modVersion = normalizeModVersion(verMatch[1]);
  } else {
    // Intentar extraer versión de otras propiedades comunes
    const altPatterns = [
      /modVersion\s*=\s*"([^"]+)"/,
      /implementation-version\s*:\s*([^,\s]+)/,
      /Specification-Version\s*:\s*([^,\s]+)/
    ];
    
    for (const pattern of altPatterns) {
      const match = content.match(pattern);
      if (match) {
        result.modVersion = normalizeModVersion(match[1]);
        break;
      }
    }
  }

  // authors fallback
  const authorMatch = content.match(/authors?\s*=\s*"([^"]+)"/i);
  if (authorMatch) (result as any).author = authorMatch[1];

  // minecraft dependency version range
  // Split on [[dependencies so each chunk is one dependency block
  const sections = content.split(/\[\[dependencies/i);
  let foundGv = null;

  for (const section of sections) {
    const isMc = /modId\s*=\s*["']minecraft["']/i.test(section);
    const rangeMatch = section.match(/versionRange\s*=\s*"([^"]+)"/);
    if (rangeMatch) {
      const gv = extractMcVersionFromRange(rangeMatch[1]);
      if (gv) {
        foundGv = gv;
        if (isMc) break; // Minecraft block is high priority
      }
    }
  }
  
  if (foundGv) result.gameVersion = foundGv;

  // logoFile
  const logoMatch = content.match(/logoFile\s*=\s*"([^"]+)"/);
  if (logoMatch) {
    // We attach it temporarily to result to pick it up later in scanMod
    (result as any)._logoFile = logoMatch[1];
  }

  return result;
}

// ── Cache Layer ───────────────────────────────────────────────────────────────

const OLD_ROOT_CACHE_FILE = path.join(process.cwd(), "mim-mod-cache.json");
const OLD_INDEX_CACHE_FILE = path.join(process.cwd(), "mim-index", "mod-cache.json");
const CACHE_FILE = path.join(SOURCE_BASE, ".mim-index", "mod-cache.json");

// Migrate legacy file if it exists
if (!fs.existsSync(CACHE_FILE)) {
  try {
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    if (fs.existsSync(OLD_INDEX_CACHE_FILE)) {
      fs.renameSync(OLD_INDEX_CACHE_FILE, CACHE_FILE);
      console.log("[scanner] Legacy mod cache successfully migrated from mim-index/ to SOURCE_BASE/.mim-index/");
    } else if (fs.existsSync(OLD_ROOT_CACHE_FILE)) {
      fs.renameSync(OLD_ROOT_CACHE_FILE, CACHE_FILE);
      console.log("[scanner] Legacy mod cache successfully migrated from root to SOURCE_BASE/.mim-index/");
    }
  } catch (e) {
    console.error("[scanner] Failed to migrate legacy mod cache:", e);
  }
}

const CURRENT_CACHE_VERSION = 2;

let modCache: { version: number; entries: Record<string, { mtimeMs: number; size: number; meta: ModMeta }> } | null = null;
let saveTimeout: NodeJS.Timeout | null = null;

function loadCache() {
  if (modCache) return modCache;
  if (fs.existsSync(CACHE_FILE)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
      if (parsed && parsed.version === CURRENT_CACHE_VERSION) {
        modCache = parsed;
      } else {
        console.log(`[scanner] Cache version changed (got ${parsed?.version}, expected ${CURRENT_CACHE_VERSION}), resetting cache.`);
      }
    } catch (e) {
      console.error("[scanner] Error loading cache file, resetting cache", e);
    }
  }
  if (!modCache || !modCache.entries) {
    modCache = { version: CURRENT_CACHE_VERSION, entries: {} };
  }
  
  // Janitor task: asynchronously clean up deleted files from cache 5s after first load
  setTimeout(() => {
    try {
      if (modCache) {
        let changed = false;
        const paths = Object.keys(modCache.entries);
        for (const p of paths) {
          if (!fs.existsSync(p)) {
            delete modCache.entries[p];
            changed = true;
          }
        }
        if (changed) {
          fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
          fs.writeFileSync(CACHE_FILE, JSON.stringify(modCache, null, 2), "utf-8");
          console.log("[scanner] Mod cache cleaned up from dead file paths.");
        }
      }
    } catch (e) {
      console.error("[scanner] Error running cache janitor:", e);
    }
  }, 5000);

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
      } catch (e) {
        console.error("[scanner] Error writing cache file to disk", e);
      }
    }
  }, 1000);
}

/**
 * Reads a .jar file and extracts its mod metadata with local persistent caching.
 *
 * If the file's stats (mtimeMs and size) match the cache, returns the cached metadata
 * instantly, completely avoiding slow disk I/O, zip parsing, and SHA-1 hashing.
 *
 * @param filePath  Absolute path to the .jar file.
 * @returns         Populated ModMeta.
 */
export function scanMod(filePath: string): ModMeta {
  if (!fs.existsSync(filePath)) {
    throw new Error(`[scanner] File not found: ${filePath}`);
  }

  try {
    const stat = fs.statSync(filePath);
    const mtimeMs = stat.mtimeMs;
    const size = stat.size;

    const cache = loadCache();
    const cachedEntry = cache.entries[filePath];

    if (cachedEntry && cachedEntry.mtimeMs === mtimeMs && cachedEntry.size === size) {
      return cachedEntry.meta;
    }

    // Cache miss or modified file: run actual raw scan
    const meta = scanModRaw(filePath);

    // Save to cache
    cache.entries[filePath] = {
      mtimeMs,
      size,
      meta,
    };
    queueSaveCache();

    return meta;
  } catch (e) {
    // If stats / cache reading fails, fallback to raw scanner directly to be safe
    return scanModRaw(filePath);
  }
}

/**
 * Raw non-cached mod metadata extraction.
 */
function scanModRaw(filePath: string): ModMeta {
  if (!fs.existsSync(filePath)) {
    throw new Error(`[scanner] File not found: ${filePath}`);
  }

  const fileBuffer = fs.readFileSync(filePath);
  const sha1 = crypto.createHash("sha1").update(fileBuffer).digest("hex");

  const zip = new AdmZip(fileBuffer);
  const entries = zip.getEntries();

  // Helper: find a ZIP entry by exact name (case-sensitive, as JAR requires)
  const findEntry = (name: string) =>
    entries.find((e: AdmZip.IZipEntry) => e.entryName === name);

  // ── 1. NeoForge ─────────────────────────────────────────────────────────────
  const neoforgeEntry = findEntry("META-INF/neoforge.mods.toml");
  if (neoforgeEntry) {
    const parsed = parseForgeToml(neoforgeEntry.getData().toString("utf8"));
    let iconBase64: string | undefined;
    if ((parsed as any)._logoFile) {
      const iconEntry = findEntry((parsed as any)._logoFile);
      if (iconEntry) {
        try { iconBase64 = `data:image/png;base64,${iconEntry.getData().toString("base64")}`; } catch {}
      }
      delete (parsed as any)._logoFile;
    }

    return {
      ...DEFAULT_META,
      ...parsed,
      loader: "neoforge",
      projectType: "mod",
      // If TOML didn't give us a game version, try the filename
      gameVersion:
        parsed.gameVersion ?? gameVersionFromFilename(filePath) ?? gameVersionFromPath(filePath) ?? UNKNOWN,
      ...(iconBase64 ? { iconBase64 } : {}),
      sha1,
    };
  }

  // ── 2. Forge ────────────────────────────────────────────────────────────────
  const forgeEntry = findEntry("META-INF/mods.toml");
  if (forgeEntry) {
    const parsed = parseForgeToml(forgeEntry.getData().toString("utf8"));
    let iconBase64: string | undefined;
    if ((parsed as any)._logoFile) {
      const iconEntry = findEntry((parsed as any)._logoFile);
      if (iconEntry) {
        try { iconBase64 = `data:image/png;base64,${iconEntry.getData().toString("base64")}`; } catch {}
      }
      delete (parsed as any)._logoFile;
    }

    return {
      ...DEFAULT_META,
      ...parsed,
      loader: "forge",
      projectType: "mod",
      gameVersion:
        parsed.gameVersion ?? gameVersionFromFilename(filePath) ?? gameVersionFromPath(filePath) ?? UNKNOWN,
      ...(iconBase64 ? { iconBase64 } : {}),
      sha1,
    };
  }

  // ── 3. Fabric ───────────────────────────────────────────────────────────────
  const fabricEntry = findEntry("fabric.mod.json");
  if (fabricEntry) {
    try {
      const data = JSON.parse(fabricEntry.getData().toString("utf8"));

      // Fabric expresses the minecraft dep as a version range in `depends.minecraft`
      const rawDep = data.depends?.minecraft;
      const depStr = rawDep
        ? Array.isArray(rawDep)
          ? rawDep[0]
          : String(rawDep)
        : null;
      const gv = depStr ? extractMcVersionFromRange(depStr) : null;

      let iconBase64: string | undefined;
      const iconPath = typeof data.icon === "string" ? data.icon : Array.isArray(data.icon) ? data.icon[0] : null;
      if (iconPath) {
        const iconEntry = findEntry(iconPath.replace(/^\//, ""));
        if (iconEntry) {
          try { iconBase64 = `data:image/png;base64,${iconEntry.getData().toString("base64")}`; } catch {}
        }
      }

      return {
        ...DEFAULT_META,
        loader: "fabric",
        projectType: "mod",
        modId: data.id ?? UNKNOWN,
        modName: data.name ?? UNKNOWN,
        modVersion: data.version ? normalizeModVersion(data.version) : UNKNOWN,
        gameVersion: gv ?? gameVersionFromFilename(filePath) ?? gameVersionFromPath(filePath) ?? UNKNOWN,
        // Fabric mods are candidate for Sinytra Connector usage
        isCompatibleWithConnector: true,
        ...(iconBase64 ? { iconBase64 } : {}),
        sha1,
      };
    } catch {
      // Malformed JSON — fall through with loader tag only
      return { ...DEFAULT_META, loader: "fabric", projectType: "mod", isCompatibleWithConnector: true, sha1 };
    }
  }

  // ── 4. Quilt ────────────────────────────────────────────────────────────────
  const quiltEntry = findEntry("quilt.mod.json");
  if (quiltEntry) {
    try {
      const data = JSON.parse(quiltEntry.getData().toString("utf8"));
      const ql = data.quilt_loader ?? {};
      const deps: { id?: string; versions?: string }[] = ql.depends ?? [];
      const mcDep = deps.find((d) => d.id === "minecraft");
      const gv = mcDep?.versions
        ? extractMcVersionFromRange(String(mcDep.versions))
        : gameVersionFromFilename(filePath);

      let iconBase64: string | undefined;
      const iconPath = typeof ql.metadata?.icon === "string" ? ql.metadata.icon : null;
      if (iconPath) {
        const iconEntry = findEntry(iconPath.replace(/^\//, ""));
        if (iconEntry) {
          try { iconBase64 = `data:image/png;base64,${iconEntry.getData().toString("base64")}`; } catch {}
        }
      }

      return {
        ...DEFAULT_META,
        loader: "quilt",
        projectType: "mod",
        modId: ql.id ?? UNKNOWN,
        modName: ql.metadata?.name ?? UNKNOWN,
        modVersion: ql.version ?? UNKNOWN,
        gameVersion: gv ?? UNKNOWN,
        ...(iconBase64 ? { iconBase64 } : {}),
        sha1,
      };
    } catch {
      return { ...DEFAULT_META, loader: "quilt", projectType: "mod", sha1 };
    }
  }

  // ── 5. Resourcepack / Datapack / Shaderpack ──────────────────────────────────
  const isShader = entries.some((e: AdmZip.IZipEntry) => e.entryName.startsWith("shaders/"));
  if (isShader) {
    return {
      ...DEFAULT_META,
      projectType: "shader",
      modId: path.basename(filePath, path.extname(filePath)),
      modName: path.basename(filePath, path.extname(filePath)),
      gameVersion: gameVersionFromFilename(filePath) ?? gameVersionFromPath(filePath) ?? UNKNOWN,
      sha1,
    };
  }

  const packMcmetaEntry = findEntry("pack.mcmeta");
  if (packMcmetaEntry) {
    let description = path.basename(filePath, path.extname(filePath));
    try {
      const parsed = JSON.parse(packMcmetaEntry.getData().toString("utf8"));
      if (parsed?.pack?.description) {
        description = typeof parsed.pack.description === "object"
          ? (parsed.pack.description.text || description)
          : String(parsed.pack.description);
      }
    } catch {}

    const isResourcePack = entries.some((e: AdmZip.IZipEntry) => e.entryName.startsWith("assets/"));
    const isDataPack = entries.some((e: AdmZip.IZipEntry) => e.entryName.startsWith("data/"));
    let type = UNKNOWN;
    if (isResourcePack) type = "resourcepack";
    else if (isDataPack) type = "datapack";

    let iconBase64: string | undefined;
    const packPngEntry = findEntry("pack.png");
    if (packPngEntry) {
      try {
        iconBase64 = `data:image/png;base64,${packPngEntry.getData().toString("base64")}`;
      } catch {}
    }

    return {
      ...DEFAULT_META,
      projectType: type,
      modId: path.basename(filePath, path.extname(filePath)),
      modName: description,
      gameVersion: gameVersionFromFilename(filePath) ?? gameVersionFromPath(filePath) ?? UNKNOWN,
      ...(iconBase64 ? { iconBase64 } : {}),
      sha1,
    };
  }

  // ── 6. Unknown — filename heuristic only ─────────────────────────────────────
  return {
    ...DEFAULT_META,
    projectType: UNKNOWN,
    gameVersion: gameVersionFromFilename(filePath) ?? UNKNOWN,
    sha1,
  };
}