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
  // Match patterns like 1.16, 1.20, 1.20.1, 1.21.4
  const match = range.match(/1\.(1[6-9]|2\d)(?:\.\d+)?/);
  return match ? match[0] : null;
}

/**
 * Last-resort fallback: scrape the game version from the filename itself.
 *
 * Examples:
 *   "sodium-fabric-mc1.20.1-0.5.3.jar"  →  "1.20.1"
 *   "primal-1.1.6+1.20.1.jar"           →  "1.20.1"
 *
 * When multiple MC-like strings appear (e.g. "1.20-1.20.1"), we pick the
 * last one because filenames typically end with the MC version.
 */
function gameVersionFromFilename(filePath: string): string | null {
  const base = path.basename(filePath, ".jar");
  const matches = [...base.matchAll(/1\.(1[6-9]|2\d)(?:\.\d+)?/g)];
  if (matches.length === 0) return null;
  return matches[matches.length - 1][0];
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
  if (verMatch) result.modVersion = verMatch[1];

  // authors fallback
  const authorMatch = content.match(/authors?\s*=\s*"([^"]+)"/i);
  if (authorMatch) (result as any).author = authorMatch[1];

  // minecraft dependency version range
  // Split on [[dependencies so each chunk is one dependency block
  const sections = content.split(/\[\[dependencies/i);
  for (const section of sections) {
    if (/modId\s*=\s*["']minecraft["']/i.test(section)) {
      const rangeMatch = section.match(/versionRange\s*=\s*"([^"]+)"/);
      if (rangeMatch) {
        const isPlus = rangeMatch[1].includes(",)") || rangeMatch[1].includes(">=");
        const gv = extractMcVersionFromRange(rangeMatch[1]);
        if (gv) result.gameVersion = isPlus ? `${gv}+` : gv;
      }
      break; // Only one minecraft dep block expected
    }
  }

  // logoFile
  const logoMatch = content.match(/logoFile\s*=\s*"([^"]+)"/);
  if (logoMatch) {
    // We attach it temporarily to result to pick it up later in scanMod
    (result as any)._logoFile = logoMatch[1];
  }

  return result;
}

// ── Main Export ───────────────────────────────────────────────────────────────

/**
 * Reads a .jar file and extracts its mod metadata without extracting to disk.
 *
 * Throws if the file does not exist or cannot be opened as a ZIP archive.
 * Individual field parsing errors are silently swallowed — the field falls
 * back to "unknown" so the rest of the metadata is still usable.
 *
 * @param filePath  Absolute path to the .jar file.
 * @returns         Populated ModMeta (partial fields may be "unknown").
 */
export function scanMod(filePath: string): ModMeta {
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

  // ── 1. Fabric ───────────────────────────────────────────────────────────────
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
        modVersion: data.version ?? UNKNOWN,
        gameVersion: gv ?? gameVersionFromFilename(filePath) ?? UNKNOWN,
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

  // ── 2. Quilt ────────────────────────────────────────────────────────────────
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

  // ── 3. NeoForge ─────────────────────────────────────────────────────────────
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
        parsed.gameVersion ?? gameVersionFromFilename(filePath) ?? UNKNOWN,
      ...(iconBase64 ? { iconBase64 } : {}),
      sha1,
    };
  }

  // ── 4. Forge ────────────────────────────────────────────────────────────────
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
        parsed.gameVersion ?? gameVersionFromFilename(filePath) ?? UNKNOWN,
      ...(iconBase64 ? { iconBase64 } : {}),
      sha1,
    };
  }

  // ── 5. Resourcepack / Datapack / Shaderpack ──────────────────────────────────
  const isShader = entries.some((e: AdmZip.IZipEntry) => e.entryName.startsWith("shaders/"));
  if (isShader) {
    return {
      ...DEFAULT_META,
      projectType: "shader",
      modId: path.basename(filePath, path.extname(filePath)),
      modName: path.basename(filePath, path.extname(filePath)),
      gameVersion: gameVersionFromFilename(filePath) ?? UNKNOWN,
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
      gameVersion: gameVersionFromFilename(filePath) ?? UNKNOWN,
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