import fs from "fs";
import path from "path";
import { SOURCE_BASE } from "./constants";

export interface ModOverride {
  clientSide?: "required" | "optional" | "unsupported";
  serverSide?: "required" | "optional" | "unsupported";
  gameVersion?: string;
  loader?: string;
  ignoreDependencies?: string[]; // IDs to ignore if missing
}

export interface ProjectOverrides {
  mods: Record<string, ModOverride>; // key is fileName
}

export function getProjectOverridesPath(projectName: string): string {
  const safeName = projectName.replace(/[<>:"/\\|?*]/g, "_").trim();
  return path.join(SOURCE_BASE, "_projects", safeName, "metadata-overrides.json");
}

export function getProjectOverrides(projectName: string): ProjectOverrides {
  const p = getProjectOverridesPath(projectName);
  if (fs.existsSync(p)) {
    try {
      return JSON.parse(fs.readFileSync(p, "utf-8"));
    } catch (e) {
      console.warn("Failed to parse metadata-overrides.json", e);
    }
  }
  return { mods: {} };
}

export function saveProjectOverride(projectName: string, fileName: string, override: Partial<ModOverride>) {
  const p = getProjectOverridesPath(projectName);
  const overrides = getProjectOverrides(projectName);
  
  if (!overrides.mods[fileName]) {
    overrides.mods[fileName] = {};
  }
  
  overrides.mods[fileName] = { ...overrides.mods[fileName], ...override };
  
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(overrides, null, 2), "utf-8");
}
