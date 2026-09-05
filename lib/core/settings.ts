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

export interface MimSettings {
  sourceBase: string;
  buildsBase: string;
  downloadsPath: string;
  minecraftPath: string;
  stagingPath: string;
  validated?: boolean;
}

export type SettingsUpdate = Partial<MimSettings> & ApiKeyUpdates;
export type PublicSettings = MimSettings & {
  apiKeysConfigured: ReturnType<typeof getApiKeyStatus>;
  secretPersistence: "safeStorage" | "session";
};

const LOCAL_SETTINGS_FILE = path.join(process.cwd(), "mim-settings.json");

/**
 * Returns the absolute path of the portable directory where settings,
 * whitelists, and other user data files are stored.
 * Priority:
 *  1. D:\.mine\source\.mim-index (for the main developer environment)
 *  2. %USERPROFILE%\.mim-index (universal portable fallback for executable/dist/host runs)
 */
export function getPortableDir(): string {
  if (process.env.MIM_PORTABLE_DIR) return path.resolve(process.env.MIM_PORTABLE_DIR);
  const dMineSource = path.join("D:", ".MIM", "source");
  if (fs.existsSync(dMineSource)) {
    return path.join(dMineSource, ".mim-index");
  }
  return path.join(os.homedir(), ".mim-index");
}

function getSettingsPath(): string {
  try {
    const portableDir = getPortableDir();
    if (!fs.existsSync(portableDir)) {
      fs.mkdirSync(portableDir, { recursive: true });
    }
    const portableFile = path.join(portableDir, "mim-settings.json");
    
    // Migrate local settings if portable doesn't exist yet but local does
    if (!fs.existsSync(portableFile) && fs.existsSync(LOCAL_SETTINGS_FILE)) {
      try {
        fs.copyFileSync(LOCAL_SETTINGS_FILE, portableFile);
        fs.unlinkSync(LOCAL_SETTINGS_FILE);
        console.log(`[Settings] Migrated local settings to portable location: ${portableFile}`);
      } catch (err) {
        console.error("[Settings] Migration failed:", err);
      }
    }
    return portableFile;
  } catch (e) {
    console.warn("[Settings] Could not access or create portable settings path:", e);
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

export function getSettings(): MimSettings {
  const settingsFile = getSettingsPath();
  const defaultMinecraft = getDefaultMinecraftPath();
  const defaultStaging = path.join(getPortableDir(), "staging");

  if (!fs.existsSync(defaultStaging)) {
    try {
      fs.mkdirSync(defaultStaging, { recursive: true });
    } catch (e) {
      console.warn("[/lib/core/settings] Could not create default staging directory:", e);
    }
  }

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
          const temporaryFile = `${settingsFile}.${process.pid}.migration.tmp`;
          fs.writeFileSync(temporaryFile, JSON.stringify(data, null, 2), { encoding: "utf-8", mode: 0o600 });
          fs.renameSync(temporaryFile, settingsFile);
        }
      }
      return {
        sourceBase: data.sourceBase || getDefaultSourceBase(),
        buildsBase: data.buildsBase || getDefaultBuildsBase(),
        downloadsPath: data.downloadsPath || path.join(os.homedir(), "Downloads"),
        minecraftPath: data.minecraftPath || defaultMinecraft,
        stagingPath: data.stagingPath || defaultStaging,
        validated: !!data.validated,
      };
    } catch (e) {
      console.warn(`[/lib/core/settings] Corrupted or unreadable settings file at ${settingsFile}, falling back to defaults:`, e);
    }
  }
  return {
    sourceBase: getDefaultSourceBase(),
    buildsBase: getDefaultBuildsBase(),
    downloadsPath: path.join(os.homedir(), "Downloads"),
    minecraftPath: defaultMinecraft,
    stagingPath: defaultStaging,
    validated: false,
  };
}

export function getPublicSettings(): PublicSettings {
  const settings = getSettings();
  const apiKeysConfigured = getApiKeyStatus();
  apiKeysConfigured.modrinthApiKey ||= Boolean(process.env.MODRINTH_API_KEY || process.env.MODRINTH_TOKEN);
  apiKeysConfigured.curseforgeApiKey ||= Boolean(process.env.CURSEFORGE_API_KEY);
  apiKeysConfigured.virusTotalApiKey ||= Boolean(process.env.VIRUSTOTAL_API_KEY);
  apiKeysConfigured.geminiApiKey ||= Boolean(process.env.GEMINI_API_KEY);
  return {
    ...settings,
    apiKeysConfigured,
    secretPersistence: typeof process.send === "function" ? "safeStorage" : "session",
  };
}

export async function saveSettings(settings: SettingsUpdate): Promise<PublicSettings> {
  const settingsFile = getSettingsPath();
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
  const temporaryFile = `${settingsFile}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryFile, JSON.stringify(next, null, 2), { encoding: "utf-8", mode: 0o600 });
  fs.renameSync(temporaryFile, settingsFile);
  return getPublicSettings();
}

export function getApiKey(keyName: "modrinth" | "curseforge" | "virustotal" | "gemini"): string {
  const fieldByName: Record<typeof keyName, ApiKeyField> = {
    modrinth: "modrinthApiKey",
    curseforge: "curseforgeApiKey",
    virustotal: "virusTotalApiKey",
    gemini: "geminiApiKey",
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
  return "";
}

export function isSettingsValid(settings: MimSettings): boolean {
  return (
    fs.existsSync(settings.sourceBase) &&
    fs.existsSync(settings.buildsBase) &&
    fs.existsSync(settings.downloadsPath) &&
    fs.existsSync(settings.minecraftPath) &&
    fs.existsSync(settings.stagingPath)
  );
}
