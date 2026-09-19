import fs from "node:fs";
import path from "node:path";
import type { Loader } from "@/lib/core/constants";

/** Resolves the mods root for a project (project-scoped or version/loader tree). */
export function resolveProjectModsRoot(
  sourceBase: string,
  projectName: string,
  version: string,
  loader: Loader
): string {
  const projectModsPath = path.join(sourceBase, "_projects", projectName, "mods");
  if (fs.existsSync(projectModsPath)) return projectModsPath;
  return path.join(sourceBase, version, loader);
}

/** Default install target for multiplayer-required mods. */
export function resolveClientModInstallPath(modsRoot: string, filename: string): string {
  return path.join(modsRoot, ".essential", "librerias", filename);
}

/** Finds and removes a mod filename anywhere under the project's mod categories. */
export function removeProjectModByFilename(modsRoot: string, filename: string): boolean {
  const categories = [".essential", ".local", ".server"];
  let removed = false;
  for (const category of categories) {
    const categoryPath = path.join(modsRoot, category);
    if (!fs.existsSync(categoryPath)) continue;
    for (const entry of fs.readdirSync(categoryPath, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const candidate = path.join(categoryPath, entry.name, filename);
      if (fs.existsSync(candidate)) {
        fs.rmSync(candidate, { force: true });
        removed = true;
      }
    }
  }
  return removed;
}
