/**
 * Enhanced Mod Scanner - Modular Version
 */

import AdmZip from "adm-zip";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { EnhancedModMeta, UNKNOWN } from "./mod-scanner/types";
import { normalizeVersion, extractVersionFromFileName, isValidImage } from "./mod-scanner/Utils";
import { parseFabricModJson, parseForgeToml, parseMcModInfo } from "./mod-scanner/Strategies";
import { extractMixinTargets } from "./mixin-scanner";

export async function scanModEnhanced(filePath: string): Promise<EnhancedModMeta> {
  const warnings: string[] = [];
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const sha1 = crypto.createHash("sha1").update(fileBuffer).digest("hex");
    
    const zip = new AdmZip(filePath);
    const meta = await extractMetadata(zip, filePath, warnings);
    
    return { ...meta, sha1, extractionWarnings: warnings } as EnhancedModMeta;
  } catch (error) {
    return createFallback(filePath, warnings);
  }
}

async function extractMetadata(zip: AdmZip, filePath: string, warnings: string[]): Promise<Partial<EnhancedModMeta>> {
  const result: Partial<EnhancedModMeta> = { modId: UNKNOWN, modName: UNKNOWN, modVersion: UNKNOWN, loader: UNKNOWN, projectType: "mod", isCompatibleWithConnector: false };

  const configs = [
    { file: "fabric.mod.json", parser: (c: string) => parseFabricModJson(c, "fabric") },
    { file: "quilt.mod.json", parser: (c: string) => parseFabricModJson(c, "quilt") },
    { file: "META-INF/neoforge.mods.toml", parser: (c: string) => parseForgeToml(c, true) },
    { file: "META-INF/mods.toml", parser: (c: string) => parseForgeToml(c, false) },
    { file: "mcmod.info", parser: parseMcModInfo }
  ];

  for (const config of configs) {
    const entry = zip.getEntry(config.file);
    if (entry) {
      const parsed = config.parser(zip.readAsText(entry));
      Object.assign(result, parsed);
      break;
    }
  }

  // Icon extraction
  const iconEntry = zip.getEntry("icon.png") || zip.getEntry("logo.png");
  if (iconEntry) {
    const buf = zip.readFile(iconEntry);
    if (buf && isValidImage(buf)) result.iconBase64 = `data:image/png;base64,${buf.toString("base64")}`;
  }

  // Mixin extraction
  try { result.mixinTargets = await extractMixinTargets(zip); } catch {}

  result.isCompatibleWithConnector = result.loader === "fabric";
  result.extractionQuality = result.modId !== UNKNOWN ? "high" : "low";
  
  return result;
}

function createFallback(filePath: string, warnings: string[]): EnhancedModMeta {
  const data = extractVersionFromFileName(path.basename(filePath));
  return {
    modId: UNKNOWN, modName: data.name, modVersion: data.version, gameVersion: UNKNOWN, loader: UNKNOWN,
    projectType: "mod", isCompatibleWithConnector: false, extractionQuality: "low", extractionWarnings: [...warnings, "Fallback"]
  };
}

export { scanModEnhanced as scanMod };
