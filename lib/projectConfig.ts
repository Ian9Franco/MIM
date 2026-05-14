import fs from "fs";
import path from "path";
import { SOURCE_BASE } from "./constants";

/**
 * MIM – Project Configuration Manager
 * ─────────────────────────────────────────────────────────────────────────────
 * Manages persistent metadata for each project, such as mod overrides,
 * environment assignments, and custom tags.
 * 
 * Config files are stored at: [sourceBase]/_projects/[projectName]/mim-project.json
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface ModOverride {
  environment?: "client" | "server" | "both";
  projectType?: "mod" | "library" | "resourcepack" | "shader";
  tags?: string[];
  notes?: string;
  customName?: string;
  /** Manually marked as a dependency of another mod */
  isDependencyOf?: string[];
  
  // From old overrides.ts
  clientSide?: "required" | "optional" | "unsupported";
  serverSide?: "required" | "optional" | "unsupported";
  gameVersion?: string;
  loader?: string;
  ignoreDependencies?: string[]; // IDs to ignore if missing
}

export interface ProjectConfig {
  name: string;
  version: string;
  loader: string;
  lastBuild?: string;
  /** 
   * Mod overrides indexed by their primary identifier.
   * Identifier priority: Modrinth ProjectID > CurseForge ID > ModID (JAR) > Filename
   */
  mods: Record<string, ModOverride>;
}

export function getProjectConfigPath(projectName: string): string {
  const safeName = projectName.replace(/[<>:"/\\|?*]/g, "_").trim();
  return path.join(SOURCE_BASE, "_projects", safeName, "mim-project.json");
}

export function loadProjectConfig(projectName: string): ProjectConfig {
  const configPath = getProjectConfigPath(projectName);
  if (fs.existsSync(configPath)) {
    try {
      const content = fs.readFileSync(configPath, "utf-8");
      return JSON.parse(content);
    } catch (e) {
      console.error(`[projectConfig] Error reading config for ${projectName}:`, e);
    }
  }
  
  // Default skeleton if not found
  return {
    name: projectName,
    version: "unknown",
    loader: "unknown",
    mods: {}
  };
}

export function saveProjectConfig(projectName: string, config: ProjectConfig): void {
  const configPath = getProjectConfigPath(projectName);
  const dir = path.dirname(configPath);
  
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
  } catch (e) {
    console.error(`[projectConfig] Error saving config for ${projectName}:`, e);
  }
}

/**
 * Updates or creates an override for a specific mod in a project.
 */
export function updateModOverride(projectName: string, modIdOrFileName: string, override: Partial<ModOverride>): void {
  const config = loadProjectConfig(projectName);
  
  if (!config.mods) config.mods = {};
  
  config.mods[modIdOrFileName] = {
    ...(config.mods[modIdOrFileName] || {}),
    ...override
  };
  
  saveProjectConfig(projectName, config);
}

/**
 * Retrieves specific metadata for a mod, merging scan data with project overrides.
 */
export function getModEffectiveMetadata(projectName: string, modId: string, scannedMeta: any) {
  const config = loadProjectConfig(projectName);
  const override = config.mods[modId] || {};
  
  return {
    ...scannedMeta,
    environment: override.environment || (scannedMeta.clientSide === "none" ? "server" : scannedMeta.serverSide === "none" ? "client" : "both"),
    projectType: override.projectType || scannedMeta.projectType,
    tags: override.tags || scannedMeta.categories || [],
    customName: override.customName || scannedMeta.modName,
    notes: override.notes || ""
  };
}
