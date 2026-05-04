/**
 * MIM – Build Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Assembles the two distribution formats from the source tree:
 *
 *   buildAllUser(...)  →  [projectName]_alluser.zip   (for players)
 *   buildAllHost(...)  →  [projectName]_allhost/       (for servers)
 *
 * Both functions are pure in the sense that they:
 *   1. Clean their output path before writing.
 *   2. Collect mods in priority order (first-seen filename wins).
 *   3. Copy auxiliary assets (resourcepacks, shaderpacks, config).
 *   4. Log a warning if duplicate filenames are detected across categories.
 *
 * Neither function throws on missing optional directories — they simply skip
 * the step and log a notice.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";
import type { Loader } from "./constants";

// ── Public Interface ──────────────────────────────────────────────────────────

export interface BuildResult {
  success: boolean;
  message: string;
  modsCount: number;
  outputPath: string;
}

// ── Internal: JAR Collection ──────────────────────────────────────────────────

/**
 * Walks `loaderPath/[category]/[sub]/*.jar` for each category in order and
 * returns a flat map of  filename → absolute source path.
 *
 * Priority: the *first* category in the array that contains a given filename
 * wins.  Subsequent duplicates are skipped (and logged as warnings).
 * This means `.essential` beats `.local` when listed first.
 *
 * @param loaderPath  e.g. `D:\.mine\source\1.20.1\forge`
 * @param categories  Ordered priority list, e.g. [".essential", ".local"]
 */
function collectJars(
  loaderPath: string,
  categories: string[]
): Map<string, string> {
  // Map<filename, absoluteSourcePath>
  const collected = new Map<string, string>();

  for (const category of categories) {
    const catPath = path.join(loaderPath, category);
    if (!fs.existsSync(catPath)) continue;

    for (const sub of fs.readdirSync(catPath)) {
      const subPath = path.join(catPath, sub);
      if (!fs.statSync(subPath).isDirectory()) continue;

      for (const file of fs.readdirSync(subPath)) {
        if (!file.endsWith(".jar")) continue;

        if (collected.has(file)) {
          // Duplicate filename across categories — warn but keep the higher-priority one
          console.warn(
            `[builder] Duplicate mod filename "${file}" in ${category}/${sub} — ` +
              `keeping version from higher-priority category.`
          );
        } else {
          collected.set(file, path.join(subPath, file));
        }
      }
    }
  }

  return collected;
}

// ── Internal: ZIP Helper ──────────────────────────────────────────────────────

/**
 * Recursively adds every file inside `sourceDir` to a ZIP archive and writes
 * it to `outputZipPath`.  Directory structure is preserved relative to
 * `sourceDir` (i.e. `sourceDir/mods/foo.jar` → `mods/foo.jar` inside the ZIP).
 */
function zipFolder(sourceDir: string, outputZipPath: string): void {
  const zip = new AdmZip();

  const addDir = (dir: string, zipBase: string) => {
    for (const entry of fs.readdirSync(dir)) {
      const fullPath = path.join(dir, entry);
      // Build the in-zip path using forward slashes (ZIP spec)
      const zipPath = zipBase ? `${zipBase}/${entry}` : entry;

      if (fs.statSync(fullPath).isDirectory()) {
        addDir(fullPath, zipPath);
      } else {
        zip.addFile(zipPath, fs.readFileSync(fullPath));
      }
    }
  };

  addDir(sourceDir, "");
  zip.writeZip(outputZipPath);
}

// ── Internal: Optional Copy Helper ───────────────────────────────────────────

/**
 * Copies `src` → `dest` recursively if `src` exists.
 * Logs a notice if the source is missing so the build log is informative.
 */
function copyIfExists(src: string, dest: string, label: string): void {
  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true });
    console.log(`[builder] Copied ${label}: ${path.basename(src)}`);
  } else {
    console.log(`[builder] Skipped ${label} (not found): ${src}`);
  }
}

// ── Internal: Leak Verification ───────────────────────────────────────────────

/**
 * Sanity-checks that no .server-only mod accidentally ended up in the
 * alluser build.  Logs a warning for each offending file.
 *
 * This is a safety net — it should never trigger if categories are clean.
 *
 * @param loaderPath   Root loader path to locate the .server directory.
 * @param userJars     The set of filenames that went into the alluser build.
 */
function verifyNoServerLeak(
  loaderPath: string,
  userJars: Map<string, string>
): void {
  const serverPath = path.join(loaderPath, ".server");
  if (!fs.existsSync(serverPath)) return;

  // Collect all .jar filenames under .server (any sub-category)
  const serverJarNames = new Set<string>();

  const walkDir = (dir: string) => {
    for (const entry of fs.readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (fs.statSync(full).isDirectory()) {
        walkDir(full);
      } else if (entry.endsWith(".jar")) {
        serverJarNames.add(entry);
      }
    }
  };

  walkDir(serverPath);

  for (const fileName of userJars.keys()) {
    if (serverJarNames.has(fileName)) {
      console.warn(
        `[builder] ⚠️  "${fileName}" is in both .server and the alluser build — ` +
          `check your categories!`
      );
    }
  }
}

// ── Public: alluser Build ─────────────────────────────────────────────────────

/**
 * Builds a ZIP archive intended for players.
 *
 * Contents:
 *   mods/          ← all .jar from .essential + .local (essential has priority)
 *   resourcepacks/ ← from source/[version]/common/resourcepacks/
 *   shaderpacks/   ← from assets/shaders/  (version-agnostic)
 *   config/        ← from presets/[version]/  (optional)
 *
 * Output: `[buildPath]_alluser.zip`
 *
 * @param sourceBase  Absolute path to the root of the source tree.
 * @param buildPath   Base path for the output (projectName segment).
 * @param version     Minecraft version string, e.g. "1.20.1".
 * @param loader      One of "forge" | "neoforge" | "fabric".
 */
export function buildAllUser(
  sourceBase: string,
  buildPath: string,
  version: string,
  loader: Loader
): BuildResult {
  const stagingDir = `${buildPath}_alluser_staging`;

  console.log(
    `[builder] Starting alluser build — version: ${version}, loader: ${loader}`
  );

  // ── 1. Clean staging area ───────────────────────────────────────────────────
  if (fs.existsSync(stagingDir)) {
    fs.rmSync(stagingDir, { recursive: true, force: true });
  }

  const modsDir      = path.join(stagingDir, "mods");
  const resourcesDir = path.join(stagingDir, "resourcepacks");
  const shadersDir   = path.join(stagingDir, "shaderpacks");

  fs.mkdirSync(modsDir,      { recursive: true });
  fs.mkdirSync(resourcesDir, { recursive: true });
  fs.mkdirSync(shadersDir,   { recursive: true });

  // ── 2. Collect and copy mods ────────────────────────────────────────────────
  // .essential is listed first → it wins on duplicate filenames
  const loaderPath = path.join(sourceBase, version, loader);
  const jars = collectJars(loaderPath, [".essential", ".local"]);

  for (const [file, src] of jars) {
    fs.copyFileSync(src, path.join(modsDir, file));
  }
  console.log(`[builder] Collected ${jars.size} mods.`);

  // ── 3. ResourcePacks ────────────────────────────────────────────────────────
  const srcResources = path.join(sourceBase, version, "common", "resourcepacks");
  copyIfExists(srcResources, resourcesDir, "resourcepacks");

  // ── 4. ShaderPacks (version-agnostic, lives in assets/) ────────────────────
  const srcShaders = path.join(sourceBase, "..", "assets", "shaders");
  copyIfExists(srcShaders, shadersDir, "shaderpacks");

  // ── 5. Config Presets ────────────────────────────────────────────────────────
  const srcConfig = path.join(sourceBase, "..", "presets", version);
  copyIfExists(srcConfig, path.join(stagingDir, "config"), "config presets");

  // ── 6. Safety: verify no server-only mods leaked into the player build ───────
  verifyNoServerLeak(loaderPath, jars);

  // ── 7. Compress staging → ZIP and clean up ───────────────────────────────────
  const outputZip = `${buildPath}_alluser.zip`;
  if (fs.existsSync(outputZip)) fs.rmSync(outputZip);

  zipFolder(stagingDir, outputZip);
  fs.rmSync(stagingDir, { recursive: true, force: true });

  const message =
    `alluser build complete — ${jars.size} mods → ${path.basename(outputZip)}`;
  console.log(`[builder] ✅ ${message}`);

  return {
    success: true,
    message,
    modsCount: jars.size,
    outputPath: outputZip,
  };
}

// ── Public: allhost Build ─────────────────────────────────────────────────────

/**
 * Builds a folder ready to upload to a Minecraft hosting service.
 *
 * Contents:
 *   mods/                ← all .jar from .essential + .server (essential first)
 *   world/datapacks/     ← from source/[version]/common/datapacks/
 *   config/              ← from presets/[version]/  (optional)
 *
 * Output: `[buildPath]_allhost/`  (folder, not zipped — ready to rsync/upload)
 *
 * @param sourceBase  Absolute path to the root of the source tree.
 * @param buildPath   Base path for the output.
 * @param version     Minecraft version string, e.g. "1.20.1".
 * @param loader      One of "forge" | "neoforge" | "fabric".
 */
export function buildAllHost(
  sourceBase: string,
  buildPath: string,
  version: string,
  loader: Loader
): BuildResult {
  const outputDir = `${buildPath}_allhost`;

  console.log(
    `[builder] Starting allhost build — version: ${version}, loader: ${loader}`
  );

  // ── 1. Clean output directory ───────────────────────────────────────────────
  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true, force: true });
  }

  const modsDir      = path.join(outputDir, "mods");
  const datapacksDir = path.join(outputDir, "world", "datapacks");

  fs.mkdirSync(modsDir,      { recursive: true });
  fs.mkdirSync(datapacksDir, { recursive: true });

  // ── 2. Collect and copy mods ────────────────────────────────────────────────
  // .essential is listed first → wins on duplicate filenames
  const loaderPath = path.join(sourceBase, version, loader);
  const jars = collectJars(loaderPath, [".essential", ".server"]);

  for (const [file, src] of jars) {
    fs.copyFileSync(src, path.join(modsDir, file));
  }
  console.log(`[builder] Collected ${jars.size} mods.`);

  // ── 3. Datapacks ────────────────────────────────────────────────────────────
  const srcDatapacks = path.join(sourceBase, version, "common", "datapacks");
  copyIfExists(srcDatapacks, datapacksDir, "datapacks");

  // ── 4. Config Presets ────────────────────────────────────────────────────────
  const srcConfig = path.join(sourceBase, "..", "presets", version);
  copyIfExists(srcConfig, path.join(outputDir, "config"), "config presets");

  const message =
    `allhost build complete — ${jars.size} mods → ${path.basename(outputDir)}/`;
  console.log(`[builder] ✅ ${message}`);

  return {
    success: true,
    message,
    modsCount: jars.size,
    outputPath: outputDir,
  };
}