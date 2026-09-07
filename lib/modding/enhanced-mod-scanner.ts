/**
 * Enhanced Mod Scanner - Modular Version
 *
 * Domain parsing is buffer-based so local files, SFTP downloads and provider
 * APIs can all reuse the exact same scanner. `scanModEnhanced(filePath)` is
 * retained as the local filesystem adapter for existing callers.
 */

import AdmZip from "adm-zip";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { EnhancedModMeta, UNKNOWN } from "@/lib/mod-scanner/types";
export type { EnhancedModMeta };
import { extractVersionFromFileName, extractMcVersionFromFileName, isValidImage } from "@/lib/mod-scanner/Utils";
import { parseFabricModJson, parseForgeToml, parseMcModInfo } from "@/lib/mod-scanner/Strategies";
import { extractMixinTargets } from "@/lib/modding/mixin-scanner";
import { evaluateCandidates, ScanCandidate } from "@/lib/scanner/scoring";

/**
 * Transport-agnostic scanner entrypoint. `fileName` is used only for fallback
 * metadata/scoring and never dereferenced as a local path.
 */
export async function scanModBuffer(
  fileBuffer: Buffer,
  fileName: string
): Promise<EnhancedModMeta> {
  const warnings: string[] = [];
  const displayName = path.basename(fileName);

  try {
    const sha1 = crypto.createHash("sha1").update(fileBuffer).digest("hex");
    const zip = new AdmZip(fileBuffer);
    const meta = await extractMetadata(zip, displayName, warnings);

    return { ...meta, sha1, extractionWarnings: warnings } as EnhancedModMeta;
  } catch (error) {
    warnings.push(
      `Warning: Failed to scan artifact (${error instanceof Error ? error.message : String(error)})`
    );
    return createFallback(displayName, warnings);
  }
}

/** Existing local filesystem adapter. */
export async function scanModEnhanced(filePath: string): Promise<EnhancedModMeta> {
  const warnings: string[] = [];
  try {
    const fileBuffer = fs.readFileSync(filePath);
    return await scanModBuffer(fileBuffer, path.basename(filePath));
  } catch (error) {
    warnings.push(
      `Warning: Failed to read local artifact (${error instanceof Error ? error.message : String(error)})`
    );
    return createFallback(filePath, warnings);
  }
}

async function extractMetadata(
  zip: AdmZip,
  fileName: string,
  warnings: string[]
): Promise<Partial<EnhancedModMeta>> {
  const candidates: ScanCandidate[] = [];

  const configs = [
    { file: "fabric.mod.json", parser: (content: string) => parseFabricModJson(content, "fabric") },
    { file: "quilt.mod.json", parser: (content: string) => parseFabricModJson(content, "quilt") },
    { file: "META-INF/neoforge.mods.toml", parser: (content: string) => parseForgeToml(content, true) },
    { file: "META-INF/mods.toml", parser: (content: string) => parseForgeToml(content, false) },
    { file: "mcmod.info", parser: (content: string) => parseMcModInfo(content) },
  ];

  for (const config of configs) {
    const entry = zip.getEntry(config.file);
    if (entry) {
      try {
        const parsed = config.parser(zip.readAsText(entry));
        candidates.push({ ...parsed, source: config.file } as ScanCandidate);
      } catch (err) {
        warnings.push(
          `Warning: Failed to parse ${config.file} (${err instanceof Error ? err.message : String(err)})`
        );
        console.warn(
          `[/lib/modding/enhanced-mod-scanner] Error parsing ${config.file} in ${fileName}:`,
          err
        );
      }
    }
  }

  candidates.push({
    modId: UNKNOWN,
    modName: extractVersionFromFileName(fileName).name,
    modVersion: extractVersionFromFileName(fileName).version,
    gameVersion: extractMcVersionFromFileName(fileName) || UNKNOWN,
    loader: UNKNOWN,
    source: "filename",
  } as ScanCandidate);

  const { bestMatch, confidence, warnings: scoreWarnings } = evaluateCandidates(candidates, fileName);
  warnings.push(...scoreWarnings);

  const rawDependencies = bestMatch.dependencies as unknown[] | undefined;
  const result: Partial<EnhancedModMeta> = {
    ...bestMatch,
    confidence,
    warnings: scoreWarnings,
    dependencies: rawDependencies?.map((dependency) => {
      if (typeof dependency === "string") {
        return { modId: dependency, type: "required" as const };
      }
      return dependency as NonNullable<EnhancedModMeta["dependencies"]>[number];
    }),
  };

  const iconEntry = zip.getEntry("icon.png") || zip.getEntry("logo.png");
  if (iconEntry) {
    const buffer = zip.readFile(iconEntry);
    if (buffer && isValidImage(buffer)) {
      result.iconBase64 = `data:image/png;base64,${buffer.toString("base64")}`;
    }
  }

  try {
    result.mixinTargets = await extractMixinTargets(zip);
  } catch (err) {
    warnings.push(
      `Warning: Failed to extract mixin targets (${err instanceof Error ? err.message : String(err)})`
    );
    console.warn(
      `[/lib/modding/enhanced-mod-scanner] Error extracting mixins from ${fileName}:`,
      err
    );
  }

  result.isCompatibleWithConnector = result.loader === "fabric";
  result.extractionQuality = result.modId !== UNKNOWN ? "high" : "low";

  return result;
}

function createFallback(filePath: string, warnings: string[]): EnhancedModMeta {
  const fileName = path.basename(filePath);
  const data = extractVersionFromFileName(fileName);
  return {
    modId: UNKNOWN,
    modName: data.name,
    modVersion: data.version,
    gameVersion: extractMcVersionFromFileName(fileName) || UNKNOWN,
    loader: UNKNOWN,
    projectType: "mod",
    isCompatibleWithConnector: false,
    environment: "unknown",
    clientSide: "unknown",
    serverSide: "unknown",
    extractionQuality: "low",
    extractionWarnings: [...warnings, "Fallback"],
  };
}

export { scanModEnhanced as scanMod };
