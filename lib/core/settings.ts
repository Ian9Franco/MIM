import fs from "fs";
import path from "path";
import os from "os";

export interface MimSettings {
  sourceBase: string;
  buildsBase: string;
  downloadsPath: string;
  minecraftPath: string;
  stagingPath: string;
  validated?: boolean;
  modrinthApiKey?: string;
  curseforgeApiKey?: string;
  virusTotalApiKey?: string;
  geminiApiKey?: string;
}

const LOCAL_SETTINGS_FILE = path.join(process.cwd(), "mim-settings.json");

/**
 * Returns the absolute path of the portable directory where settings,
 * whitelists, and other user data files are stored.
 * Priority:
 *  1. D:\.mine\source\.mim-index (for the main developer environment)
 *  2. %USERPROFILE%\.mim-index (universal portable fallback for executable/dist/host runs)
 */
export function getPortableDir(): string {
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

export function getSettings(): MimSettings {
  const settingsFile = getSettingsPath();
  const defaultMinecraft = path.join(os.homedir(), "AppData", "Roaming", ".minecraft");
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
      return {
        sourceBase: data.sourceBase || path.join("D:", ".MIM", "source"),
        buildsBase: data.buildsBase || path.join("D:", ".MIM", "builds"),
        downloadsPath: data.downloadsPath || path.join(os.homedir(), "Downloads"),
        minecraftPath: data.minecraftPath || defaultMinecraft,
        stagingPath: data.stagingPath || defaultStaging,
        validated: !!data.validated,
        modrinthApiKey: data.modrinthApiKey || "",
        curseforgeApiKey: data.curseforgeApiKey || "",
        virusTotalApiKey: data.virusTotalApiKey || ""
      };
    } catch (e) {
      console.warn(`[/lib/core/settings] Corrupted or unreadable settings file at ${settingsFile}, falling back to defaults:`, e);
    }
  }
  return {
    sourceBase: process.env.MIM_SOURCE_BASE || path.join("D:", ".MIM", "source"),
    buildsBase: process.env.MIM_BUILDS_BASE || path.join("D:", ".MIM", "builds"),
    downloadsPath: path.join(os.homedir(), "Downloads"),
    minecraftPath: defaultMinecraft,
    stagingPath: defaultStaging,
    validated: false,
    modrinthApiKey: "",
    curseforgeApiKey: "",
    virusTotalApiKey: "",
    geminiApiKey: ""
  };
}

export function saveSettings(settings: Partial<MimSettings>) {
  const settingsFile = getSettingsPath();
  const current = getSettings();
  const next = { ...current, ...settings };
  fs.writeFileSync(settingsFile, JSON.stringify(next, null, 2), "utf-8");
  return next;
}

export function getApiKey(keyName: "modrinth" | "curseforge" | "virustotal" | "gemini"): string {
  const settings = getSettings();
  if (keyName === "modrinth") {
    return settings.modrinthApiKey || process.env.MODRINTH_API_KEY || process.env.MODRINTH_TOKEN || "";
  }
  if (keyName === "curseforge") {
    return settings.curseforgeApiKey || process.env.CURSEFORGE_API_KEY || "";
  }
  if (keyName === "virustotal") {
    return settings.virusTotalApiKey || process.env.VIRUSTOTAL_API_KEY || "";
  }
  if (keyName === "gemini") {
    return settings.geminiApiKey || process.env.GEMINI_API_KEY || "";
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
