/**
 * MIM – Categorization Manifest
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for all mod categories, sub-categories, and paths.
 *
 * Both the frontend (components) and the backend (API routes) import from here
 * so that category names are never hard-coded in more than one place.
 *
 * PATHS: Resolved from environment variables first, falling back to the
 * hard-coded Windows defaults.  Set MIM_SOURCE_BASE / MIM_BUILDS_BASE in a
 * .env.local file to override without touching source code.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import path from "path";

// ── Mod Categories ────────────────────────────────────────────────────────────

export const SUBCATEGORIES: Record<string, string[]> = {
  /** Client-side mods: visuals, audio, QoL, performance tweaks. */
  ".local": ["animaciones", "sonidos", "rendimiento", "qol", "particulas"],

  /** Server-side mods: terrain, structures, server QoL, performance. */
  ".server": ["estructuras", "qol", "rendimiento", "terreno"],

  /**
   * Core content mods: always included in both alluser and allhost builds.
   * Think of this as the "required" layer that every player and server needs.
   */
  ".essential": [
    "fauna",
    "hostiles",
    "estructuras y mazmorras",
    "arsenal",
    "bosses",
    "vanilla + & qol",
    "dimensiones",
    "progreso y rpg",
    "comidas",
    "librerias",
    "tecnologia",
    "combate avanzado",
  ],
};

/** Ordered array of category keys — used for filesystem iteration. */
export const CATEGORIES = Object.keys(SUBCATEGORIES) as Array<
  keyof typeof SUBCATEGORIES
>;

// ── Loaders ───────────────────────────────────────────────────────────────────

export const LOADERS = ["forge", "neoforge", "fabric"] as const;
export type Loader = (typeof LOADERS)[number];

// ── Filesystem Paths ──────────────────────────────────────────────────────────

/**
 * Root of the versioned mod store.
 * Structure: SOURCE_BASE / [version] / [loader] / [category] / [sub] / *.jar
 *
 * Override via MIM_SOURCE_BASE env var:
 *   MIM_SOURCE_BASE=D:\.mine\source   (Windows default)
 *   MIM_SOURCE_BASE=/mnt/mine/source  (Linux / WSL)
 */
export const SOURCE_BASE: string =
  process.env.MIM_SOURCE_BASE ?? path.join("D:", "\\.mine", "source");

/**
 * Root where finished builds are written.
 * Override via MIM_BUILDS_BASE env var.
 */
export const BUILDS_BASE: string =
  process.env.MIM_BUILDS_BASE ?? path.join("D:", "\\.mine", "builds");

/**
 * Marker used internally — the actual Downloads path is resolved at runtime
 * via os.homedir() so it works on any OS / user account.
 */
export const DOWNLOADS_PATH_KEY = "HOMEDIR_DOWNLOADS";

// ── Validation Helpers ────────────────────────────────────────────────────────

/**
 * Returns true when `category` and `sub` are a valid combination according
 * to the SUBCATEGORIES manifest.  Use this instead of ad-hoc split + check.
 *
 * @example
 *   isValidCategory(".essential", "fauna")  // → true
 *   isValidCategory(".local", "fauna")      // → false
 */
export function isValidCategory(category: string, sub: string): boolean {
  return SUBCATEGORIES[category]?.includes(sub) ?? false;
}

/**
 * Returns true when `loader` is one of the supported mod loaders.
 * Useful for type-guarding user input before casting to `Loader`.
 */
export function isValidLoader(loader: string): loader is Loader {
  return (LOADERS as readonly string[]).includes(loader);
}