#!/usr/bin/env node

/**
 * MIM — Modpack License Audit CLI Tool
 * ─────────────────────────────────────────────────────────────────────────────
 * Usage:
 *   npx ts-node -r tsconfig-paths/register --project tsconfig.scripts.json scripts/audit-licenses.ts <path-to-mods-folder-or-zip>
 * ─────────────────────────────────────────────────────────────────────────────
 */

import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";
import { auditModpackLicenses } from "../lib/modding/licenseAuditor";

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

async function main() {
  const targetPath = process.argv[2];

  if (!targetPath) {
    console.log(`${colors.cyan}Usage:${colors.reset} node scripts/audit-licenses.ts <path-to-mods-dir-or-zip>`);
    process.exit(0);
  }

  const resolved = path.resolve(targetPath);
  if (!fs.existsSync(resolved)) {
    console.error(`${colors.red}Target path does not exist:${colors.reset} ${resolved}`);
    process.exit(1);
  }

  let jarPaths: string[] = [];
  const stat = fs.statSync(resolved);

  if (stat.isDirectory()) {
    jarPaths = fs
      .readdirSync(resolved)
      .filter((f) => f.endsWith(".jar"))
      .map((f) => path.join(resolved, f));
  } else if (resolved.endsWith(".jar")) {
    jarPaths = [resolved];
  } else if (resolved.endsWith(".zip")) {
    console.log(`${colors.cyan}Extracting modpack ZIP to temporary inspection directory...${colors.reset}`);
    const tempDir = path.join(__dirname, "scratch", `zip-audit-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    const zip = new AdmZip(resolved);
    zip.extractAllTo(tempDir, true);

    const findJars = (dir: string): string[] => {
      let results: string[] = [];
      for (const item of fs.readdirSync(dir)) {
        const full = path.join(dir, item);
        if (fs.statSync(full).isDirectory()) {
          results = results.concat(findJars(full));
        } else if (full.endsWith(".jar")) {
          results.push(full);
        }
      }
      return results;
    };
    jarPaths = findJars(tempDir);
  }

  console.log(`\n${colors.bold}${colors.cyan}=== MIM Third-Party Mod License Audit ===${colors.reset}`);
  console.log(`Target: ${resolved}`);
  console.log(`Found: ${jarPaths.length} JAR archives\n`);

  const summary = await auditModpackLicenses(jarPaths);

  console.log(`Summary:`);
  console.log(`  • Total Mods:       ${summary.totalMods}`);
  console.log(`  • ${colors.green}Permissive (MIT/Apache/BSD):${colors.reset} ${summary.permissiveCount}`);
  console.log(`  • ${colors.cyan}Copyleft (LGPL/GPL/MPL):    ${colors.reset} ${summary.copyleftCount}`);
  console.log(`  • ${colors.yellow}Unknown / Unspecified:       ${colors.reset} ${summary.unknownCount}`);
  console.log(`  • ${colors.red}Restricted (ARR/No-Redist):  ${colors.reset} ${summary.restrictedCount}\n`);

  if (summary.restrictedMods.length > 0) {
    console.log(`${colors.bold}${colors.red}⚠️  REDISTRIBUTION WARNINGS DETECTED:${colors.reset}`);
    for (const r of summary.restrictedMods) {
      console.log(`  - [${r.category}] ${r.modName} (${r.jarName}): declared "${r.declaredLicense}" (${r.sourceMetadata})`);
    }
    console.log(`\n${colors.yellow}Ensure permissions or dynamic downloads are used before distributing these mods in public packs.${colors.reset}\n`);
  } else {
    console.log(`${colors.green}✓ Zero restricted (All Rights Reserved) licenses detected in inspected set.${colors.reset}\n`);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
