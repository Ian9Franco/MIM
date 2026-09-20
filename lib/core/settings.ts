import fs from "fs";
import path from "path";
import os from "os";
import {
  API_KEY_FIELDS,
  type ApiKeyField,
  type ApiKeyUpdates,
  getApiKeyStatus,
  getStoredApiKey,
  hydrateSessionApiKeys,
  updateStoredApiKeys,
} from "./secretStore";
import { mimIndexLayout } from "./mimIndex/layout";

export interface MimSettings {
  sourceBase: string;
  buildsBase: string;
  downloadsPath: string;
  minecraftPath: string;
  stagingPath: string;
  mimIndexPath: string;
  validated?: boolean;
}

export type SettingsUpdate = Partial<MimSettings> & ApiKeyUpdates;
export type PublicSettings = MimSettings & {
  apiKeysConfigured: ReturnType<typeof getApiKeyStatus>;
  secretPersistence: "safeStorage" | "session";
};

const LOCAL_SETTINGS_FILE = path.join(process.cwd(), "mim-settings.json");
let cachedMimIndexPath: string | null = null;
let sinceramientoBooted = false;

/**
 * Bootstrap location of the MIM index (before settings.mimIndexPath is applied).
 * Packaged Desktop always pins MIM_PORTABLE_DIR from Electron (no silent D: switch).
 * Unpackaged: D:\.MIM\source\.mim-index if that source tree exists, else %USERPROFILE%\.mim-index.
 */
export function getPortableDir(): string {
  if (process.env.MIM_PORTABLE_DIR) return path.resolve(process.env.MIM_PORTABLE_DIR);
  if (!process.env.MIM_DESKTOP_RUNTIME) {
    const dMimSource = path.join("D:", ".MIM", "source");
    if (fs.existsSync(dMimSource)) {
      return path.join(dMimSource, ".mim-index");
    }
  }
  return path.join(os.homedir(), ".mim-index");
}

function readMimIndexPathFromFile(settingsFile: string, fallback: string): string {
  if (!fs.existsSync(settingsFile)) return fallback;
  try {
    const data = JSON.parse(fs.readFileSync(settingsFile, "utf-8"));
    if (typeof data.mimIndexPath === "string" && data.mimIndexPath.trim()) {
      return path.resolve(data.mimIndexPath.trim());
    }
  } catch {
    // ignore corrupt settings during bootstrap
  }
  return fallback;
}

/**
 * Canonical MIM index root. Prefers persisted settings.mimIndexPath after boot.
 */
export function getMimIndexPath(): string {
  if (cachedMimIndexPath) return cachedMimIndexPath;
  const bootstrap = getPortableDir();
  const resolved = readMimIndexPathFromFile(path.join(bootstrap, "mim-settings.json"), bootstrap);
  cachedMimIndexPath = resolved;
  return resolved;
}

export function setCachedMimIndexPath(next: string): void {
  cachedMimIndexPath = path.resolve(next);
}

/** Test helper — clears bootstrap cache so MIM_PORTABLE_DIR can be retargeted. */
export function _resetSettingsRuntimeForTests(): void {
  cachedMimIndexPath = null;
  sinceramientoBooted = false;
}

function bootSinceramiento(): void {
  if (sinceramientoBooted) return;
  sinceramientoBooted = true;
  try {
    // Lazy import avoids a module-init cycle with runMigrations.ts
    const { ensureSinceramiento01 } = require("./mimIndex/runMigrations") as typeof import("./mimIndex/runMigrations");
    ensureSinceramiento01();
  } catch (err) {
    console.warn("[Settings] sinceramiento_01 failed:", err);
  }
  cachedMimIndexPath = null;
}

function getSettingsPath(): string {
  bootSinceramiento();
  try {
    const indexDir = getMimIndexPath();
    const portableFile = path.join(indexDir, "mim-settings.json");
    if (!fs.existsSync(portableFile) && fs.existsSync(LOCAL_SETTINGS_FILE)) {
      try {
        if (!fs.existsSync(indexDir)) fs.mkdirSync(indexDir, { recursive: true });
        fs.copyFileSync(LOCAL_SETTINGS_FILE, portableFile);
        fs.unlinkSync(LOCAL_SETTINGS_FILE);
        console.log(`[Settings] Migrated local settings to portable location: ${portableFile}`);
      } catch (err) {
        console.error("[Settings] Migration failed:", err);
      }
    }
    return portableFile;
  } catch (e) {
    console.warn("[Settings] Could not access portable settings path:", e);
  }
  return LOCAL_SETTINGS_FILE;
}

/**
 * Returns the default source base directory.
 * Priority:
 *  1. MIM_SOURCE_BASE environment variable
 *  2. D:\.MIM\source (if it exists on the host system)
 *  3. %USERPROFILE%\.mim\source (universal fallback)
 */
export function getDefaultSourceBase(): string {
  if (process.env.MIM_SOURCE_BASE) return path.resolve(process.env.MIM_SOURCE_BASE);
  const devSource = path.join("D:", ".MIM", "source");
  if (fs.existsSync(devSource)) return devSource;
  return path.join(os.homedir(), ".mim", "source");
}

/**
 * Returns the default builds base directory.
 * Priority:
 *  1. MIM_BUILDS_BASE environment variable
 *  2. D:\.MIM\builds (if it exists on the host system)
 *  3. %USERPROFILE%\.mim\builds (universal fallback)
 */
export function getDefaultBuildsBase(): string {
  if (process.env.MIM_BUILDS_BASE) return path.resolve(process.env.MIM_BUILDS_BASE);
  const devBuilds = path.join("D:", ".MIM", "builds");
  if (fs.existsSync(devBuilds)) return devBuilds;
  return path.join(os.homedir(), ".mim", "builds");
}

/**
 * Returns the default Minecraft directory according to host platform.
 */
export function getDefaultMinecraftPath(): string {
  if (process.env.MINECRAFT_PATH) return path.resolve(process.env.MINECRAFT_PATH);
  if (process.platform === "win32") {
    return path.join(os.homedir(), "AppData", "Roaming", ".minecraft");
  }
  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support", "minecraft");
  }
  return path.join(os.homedir(), ".minecraft");
}

function defaultStagingPath(indexPath: string): string {
  return mimIndexLayout(indexPath).staging;
}

function hydrateSettings(data: Record<string, unknown>, indexPath: string): MimSettings {
  const defaultMinecraft = getDefaultMinecraftPath();
  const mimIndexPath =
    typeof data.mimIndexPath === "string" && data.mimIndexPath.trim()
      ? path.resolve(data.mimIndexPath.trim())
      : indexPath;
  return {
    sourceBase: (typeof data.sourceBase === "string" && data.sourceBase) || getDefaultSourceBase(),
    buildsBase: (typeof data.buildsBase === "string" && data.buildsBase) || getDefaultBuildsBase(),
    downloadsPath: (typeof data.downloadsPath === "string" && data.downloadsPath) || path.join(os.homedir(), "Downloads"),
    minecraftPath: (typeof data.minecraftPath === "string" && data.minecraftPath) || defaultMinecraft,
    stagingPath: (typeof data.stagingPath === "string" && data.stagingPath) || defaultStagingPath(mimIndexPath),
    mimIndexPath,
    validated: !!data.validated,
  };
}

export function getSettings(): MimSettings {
  const settingsFile = getSettingsPath();
  const indexPath = getMimIndexPath();

  if (fs.existsSync(settingsFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(settingsFile, "utf-8"));
      if (typeof process.send !== "function") {
        const legacySecrets: ApiKeyUpdates = {};
        let hasLegacySecrets = false;
        for (const field of API_KEY_FIELDS) {
          if (typeof data[field] === "string" && data[field].trim()) {
            legacySecrets[field] = data[field].trim();
            delete data[field];
            hasLegacySecrets = true;
          }
        }
        if (hasLegacySecrets) {
          hydrateSessionApiKeys(legacySecrets);
          const dir = path.dirname(settingsFile);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          const temporaryFile = `${settingsFile}.${process.pid}.migration.tmp`;
          fs.writeFileSync(temporaryFile, JSON.stringify(data, null, 2), { encoding: "utf-8", mode: 0o600 });
          fs.renameSync(temporaryFile, settingsFile);
        }
      }
      const settings = hydrateSettings(data, indexPath);
      cachedMimIndexPath = settings.mimIndexPath;
      return settings;
    } catch (e) {
      console.warn(`[/lib/core/settings] Corrupted or unreadable settings file at ${settingsFile}, falling back to defaults:`, e);
    }
  }
  return hydrateSettings({}, indexPath);
}

export function getSourceBase(): string {
  return getSettings().sourceBase;
}

export function getBuildsBase(): string {
  return getSettings().buildsBase;
}

export function getPublicSettings(): PublicSettings {
  const settings = getSettings();
  const apiKeysConfigured = getApiKeyStatus();
  apiKeysConfigured.modrinthApiKey ||= Boolean(process.env.MODRINTH_API_KEY || process.env.MODRINTH_TOKEN);
  apiKeysConfigured.curseforgeApiKey ||= Boolean(process.env.CURSEFORGE_API_KEY);
  apiKeysConfigured.virusTotalApiKey ||= Boolean(process.env.VIRUSTOTAL_API_KEY);
  apiKeysConfigured.geminiApiKey ||= Boolean(process.env.GEMINI_API_KEY);
  apiKeysConfigured.openrouterApiKey ||= Boolean(process.env.OPENROUTER_API_KEY);
  return {
    ...settings,
    apiKeysConfigured,
    secretPersistence: typeof process.send === "function" ? "safeStorage" : "session",
  };
}

export async function saveSettings(settings: SettingsUpdate): Promise<PublicSettings> {
  const current = getSettings();
  const secrets: ApiKeyUpdates = {};
  for (const field of API_KEY_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(settings, field)) secrets[field] = settings[field];
  }

  const publicSettings = { ...settings } as Record<string, unknown>;
  for (const field of API_KEY_FIELDS) delete publicSettings[field];
  const next = { ...current, ...publicSettings } as MimSettings;

  // The encrypted write succeeds before public settings are committed. A
  // failed safeStorage operation therefore cannot fall back to plaintext.
  await updateStoredApiKeys(secrets);
  if (next.mimIndexPath) {
    cachedMimIndexPath = path.resolve(next.mimIndexPath);
    next.mimIndexPath = cachedMimIndexPath;
  }
  const targetFile = path.join(next.mimIndexPath, "mim-settings.json");
  const dir = path.dirname(targetFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const temporaryFile = `${targetFile}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryFile, JSON.stringify(next, null, 2), { encoding: "utf-8", mode: 0o600 });
  fs.renameSync(temporaryFile, targetFile);
  return getPublicSettings();
}

export function getApiKey(keyName: "modrinth" | "curseforge" | "virustotal" | "gemini" | "openrouter"): string {
  const fieldByName: Record<typeof keyName, ApiKeyField> = {
    modrinth: "modrinthApiKey",
    curseforge: "curseforgeApiKey",
    virustotal: "virusTotalApiKey",
    gemini: "geminiApiKey",
    openrouter: "openrouterApiKey",
  };
  const stored = getStoredApiKey(fieldByName[keyName]);
  if (stored) return stored;
  if (keyName === "modrinth") {
    return process.env.MODRINTH_API_KEY || process.env.MODRINTH_TOKEN || "";
  }
  if (keyName === "curseforge") {
    return process.env.CURSEFORGE_API_KEY || "";
  }
  if (keyName === "virustotal") {
    return process.env.VIRUSTOTAL_API_KEY || "";
  }
  if (keyName === "gemini") {
    return process.env.GEMINI_API_KEY || "";
  }
  if (keyName === "openrouter") {
    return process.env.OPENROUTER_API_KEY || "";
  }
  return "";
}

export function isSettingsValid(settings: MimSettings): boolean {
  return (
    fs.existsSync(settings.sourceBase) &&
    fs.existsSync(settings.buildsBase) &&
    fs.existsSync(settings.downloadsPath) &&
    fs.existsSync(settings.minecraftPath)
  );
}
