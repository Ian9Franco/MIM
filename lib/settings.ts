import fs from "fs";
import path from "path";
import os from "os";

export interface MimSettings {
  sourceBase: string;
  buildsBase: string;
  downloadsPath: string;
}

const SETTINGS_FILE = path.join(process.cwd(), "mim-settings.json");

export function getSettings(): MimSettings {
  if (fs.existsSync(SETTINGS_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
      return {
        sourceBase: data.sourceBase || path.join("D:", "\\.mine", "source"),
        buildsBase: data.buildsBase || path.join("D:", "\\.mine", "builds"),
        downloadsPath: data.downloadsPath || path.join(os.homedir(), "Downloads")
      };
    } catch (e) {}
  }
  return {
    sourceBase: process.env.MIM_SOURCE_BASE || path.join("D:", "\\.mine", "source"),
    buildsBase: process.env.MIM_BUILDS_BASE || path.join("D:", "\\.mine", "builds"),
    downloadsPath: path.join(os.homedir(), "Downloads")
  };
}

export function saveSettings(settings: Partial<MimSettings>) {
  const current = getSettings();
  const next = { ...current, ...settings };
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(next, null, 2), "utf-8");
  return next;
}
