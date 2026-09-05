/**
 * MIM — Modpack Third-Party License Auditor
 * ─────────────────────────────────────────────────────────────────────────────
 * Inspects mod JARs to detect, extract, and categorize embedded licenses:
 * - PERMISSIVE: MIT, Apache-2.0, BSD, CC0, Unlicense
 * - COPYLEFT: LGPL-3.0, GPL-3.0, MPL-2.0
 * - RESTRICTED: All Rights Reserved (ARR), Proprietary, No-Redistribution
 * - UNKNOWN: Missing or non-standard license declaration
 *
 * Flags redistribution risks before assembling or publishing modpack ZIPs.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";

export type LicenseCategory = "PERMISSIVE" | "COPYLEFT" | "RESTRICTED" | "UNKNOWN";

export interface ModLicenseReport {
  modId: string;
  modName: string;
  jarName: string;
  declaredLicense: string;
  category: LicenseCategory;
  redistributionRestricted: boolean;
  sourceMetadata: "fabric.mod.json" | "quilt.mod.json" | "mods.toml" | "mcmod.info" | "embedded_file" | "none";
  notes?: string;
}

export interface ModpackLicenseSummary {
  totalMods: number;
  permissiveCount: number;
  copyleftCount: number;
  restrictedCount: number;
  unknownCount: number;
  restrictedMods: ModLicenseReport[];
  reports: ModLicenseReport[];
}

/**
 * Normalizes license strings and categorizes legal risk for modpack redistribution.
 */
export function classifyLicense(rawLicense?: string | null): {
  category: LicenseCategory;
  redistributionRestricted: boolean;
  normalized: string;
} {
  if (!rawLicense || !rawLicense.trim()) {
    return { category: "UNKNOWN", redistributionRestricted: false, normalized: "Not Specified" };
  }

  const clean = rawLicense.trim();
  const lower = clean.toLowerCase();

  // All Rights Reserved / Proprietary / Restricted Redistribution
  if (
    lower.includes("all rights reserved") ||
    lower === "arr" ||
    lower.includes("proprietary") ||
    lower.includes("no redistribution") ||
    lower.includes("non-commercial") ||
    lower.includes("custom")
  ) {
    return {
      category: "RESTRICTED",
      redistributionRestricted: true,
      normalized: clean,
    };
  }

  // Permissive Licenses
  if (
    lower.includes("mit") ||
    lower.includes("apache") ||
    lower.includes("bsd") ||
    lower.includes("cc0") ||
    lower.includes("unlicense") ||
    lower.includes("public domain") ||
    lower.includes("isc")
  ) {
    return {
      category: "PERMISSIVE",
      redistributionRestricted: false,
      normalized: clean,
    };
  }

  // Copyleft Licenses
  if (
    lower.includes("lgpl") ||
    lower.includes("gpl") ||
    lower.includes("lesser general public") ||
    lower.includes("general public license") ||
    lower.includes("mpl") ||
    lower.includes("mozilla") ||
    lower.includes("agpl") ||
    lower.includes("epl")
  ) {
    return {
      category: "COPYLEFT",
      redistributionRestricted: false,
      normalized: clean,
    };
  }

  return {
    category: "UNKNOWN",
    redistributionRestricted: false,
    normalized: clean,
  };
}

/**
 * Inspects a single JAR archive and extracts mod ID and declared license.
 */
export async function auditJarLicense(jarPath: string): Promise<ModLicenseReport> {
  const jarName = path.basename(jarPath);
  const fallbackModId = jarName.replace(/\.jar$/i, "");

  if (!fs.existsSync(jarPath)) {
    return {
      modId: fallbackModId,
      modName: fallbackModId,
      jarName,
      declaredLicense: "File Not Found",
      category: "UNKNOWN",
      redistributionRestricted: false,
      sourceMetadata: "none",
      notes: "JAR file does not exist on disk",
    };
  }

  try {
    const zip = new AdmZip(jarPath);
    const entries = zip.getEntries();

    // 1. Check fabric.mod.json (Fabric)
    const fabricEntry = entries.find((e) => e.entryName === "fabric.mod.json");
    if (fabricEntry) {
      try {
        const text = fabricEntry.getData().toString("utf8");
        const json = JSON.parse(text);
        const modId = json.id || fallbackModId;
        const modName = json.name || modId;
        const rawLicense = Array.isArray(json.license)
          ? json.license.join(", ")
          : typeof json.license === "string"
          ? json.license
          : json.schema?.license || null;

        const classification = classifyLicense(rawLicense);
        return {
          modId,
          modName,
          jarName,
          declaredLicense: classification.normalized,
          category: classification.category,
          redistributionRestricted: classification.redistributionRestricted,
          sourceMetadata: "fabric.mod.json",
        };
      } catch {
        // Continue to fallback checks
      }
    }

    // 2. Check quilt.mod.json (Quilt)
    const quiltEntry = entries.find((e) => e.entryName === "quilt.mod.json");
    if (quiltEntry) {
      try {
        const text = quiltEntry.getData().toString("utf8");
        const json = JSON.parse(text);
        const loader = json.quilt_loader || {};
        const metadata = loader.metadata || loader;
        const modId = loader.id || fallbackModId;
        const modName = metadata.name || loader.name || modId;
        const licenseValue = metadata.license ?? loader.license ?? null;
        const rawLicense = Array.isArray(licenseValue)
          ? licenseValue.join(", ")
          : typeof licenseValue === "string"
          ? licenseValue
          : null;

        const classification = classifyLicense(rawLicense);
        return {
          modId,
          modName,
          jarName,
          declaredLicense: classification.normalized,
          category: classification.category,
          redistributionRestricted: classification.redistributionRestricted,
          sourceMetadata: "quilt.mod.json",
        };
      } catch {
        // Continue to fallback checks
      }
    }

    // 3. Check META-INF/mods.toml or META-INF/neoforge.mods.toml (Forge / NeoForge)
    const forgeEntry = entries.find(
      (e) =>
        e.entryName === "META-INF/mods.toml" ||
        e.entryName === "META-INF/neoforge.mods.toml"
    );
    if (forgeEntry) {
      try {
        const tomlText = forgeEntry.getData().toString("utf8");
        const idMatch = tomlText.match(/^modId\s*=\s*"([^"]+)"/m);
        const nameMatch = tomlText.match(/displayName\s*=\s*"([^"]+)"/);
        const licMatch =
          tomlText.match(/^license\s*=\s*"([^"]+)"/m) ||
          tomlText.match(/license\s*=\s*"([^"]+)"/);

        const modId = idMatch ? idMatch[1] : fallbackModId;
        const modName = nameMatch ? nameMatch[1] : modId;
        const rawLicense = licMatch ? licMatch[1] : null;

        const classification = classifyLicense(rawLicense);
        return {
          modId,
          modName,
          jarName,
          declaredLicense: classification.normalized,
          category: classification.category,
          redistributionRestricted: classification.redistributionRestricted,
          sourceMetadata: "mods.toml",
        };
      } catch {
        // Continue to fallback checks
      }
    }

    // 4. Check mcmod.info (Legacy Forge)
    const mcmodEntry = entries.find((e) => e.entryName === "mcmod.info");
    if (mcmodEntry) {
      try {
        const text = mcmodEntry.getData().toString("utf8");
        const json = JSON.parse(text);
        const mod = Array.isArray(json) ? json[0] : json.modList ? json.modList[0] : json;
        if (mod) {
          const modId = mod.modid || fallbackModId;
          const modName = mod.name || modId;
          const rawLicense = mod.license || null;
          const classification = classifyLicense(rawLicense);
          return {
            modId,
            modName,
            jarName,
            declaredLicense: classification.normalized,
            category: classification.category,
            redistributionRestricted: classification.redistributionRestricted,
            sourceMetadata: "mcmod.info",
          };
        }
      } catch {
        // Continue to fallback checks
      }
    }

    // 5. Check for embedded LICENSE or LICENSE.txt files
    const licenseFileEntry = entries.find(
      (e) =>
        !e.isDirectory &&
        /^(meta-inf\/)?(license|licence|copying)(\.[a-z0-9]+)?$/i.test(e.entryName)
    );
    if (licenseFileEntry) {
      const headerSnippet = licenseFileEntry
        .getData()
        .toString("utf8")
        .substring(0, 300);
      const classification = classifyLicense(headerSnippet);
      return {
        modId: fallbackModId,
        modName: fallbackModId,
        jarName,
        declaredLicense: `Embedded (${licenseFileEntry.entryName})`,
        category: classification.category,
        redistributionRestricted: classification.redistributionRestricted,
        sourceMetadata: "embedded_file",
        notes: `License detected from embedded archive file: ${licenseFileEntry.entryName}`,
      };
    }

    return {
      modId: fallbackModId,
      modName: fallbackModId,
      jarName,
      declaredLicense: "Unknown / Unspecified",
      category: "UNKNOWN",
      redistributionRestricted: false,
      sourceMetadata: "none",
      notes: "No manifest or license file detected inside archive",
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Corrupt archive";
    return {
      modId: fallbackModId,
      modName: fallbackModId,
      jarName,
      declaredLicense: "Inspection Error",
      category: "UNKNOWN",
      redistributionRestricted: false,
      sourceMetadata: "none",
      notes: `Failed to inspect archive: ${errorMsg}`,
    };
  }
}

/**
 * Audits a collection of mod JARs and produces a summary with redistribution warnings.
 */
export async function auditModpackLicenses(jarPaths: string[]): Promise<ModpackLicenseSummary> {
  const reports: ModLicenseReport[] = [];

  for (const jarPath of jarPaths) {
    const report = await auditJarLicense(jarPath);
    reports.push(report);
  }

  const permissiveCount = reports.filter((r) => r.category === "PERMISSIVE").length;
  const copyleftCount = reports.filter((r) => r.category === "COPYLEFT").length;
  const restrictedCount = reports.filter((r) => r.category === "RESTRICTED").length;
  const unknownCount = reports.filter((r) => r.category === "UNKNOWN").length;
  const restrictedMods = reports.filter((r) => r.redistributionRestricted);

  return {
    totalMods: reports.length,
    permissiveCount,
    copyleftCount,
    restrictedCount,
    unknownCount,
    restrictedMods,
    reports,
  };
}
