/**
 * Third-Party Mod License Auditor Test Suite
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates license normalization, category classification (Permissive,
 * Copyleft, Restricted ARR, Unknown), and archive inspection logic.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";
import {
  classifyLicense,
  auditJarLicense,
  auditModpackLicenses,
} from "../../lib/modding/licenseAuditor";

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

function pass(msg: string) {
  console.log(`  ${colors.green}✓${colors.reset} ${msg}`);
}

function fail(msg: string, details?: unknown) {
  console.error(`  ${colors.red}✗${colors.reset} ${msg}`);
  if (details) console.error("    Details:", details);
  process.exit(1);
}

function assert(condition: boolean, msg: string, details?: unknown) {
  if (!condition) {
    fail(msg, details);
  } else {
    pass(msg);
  }
}

export async function runLicenseAuditorTests() {
  console.log(`\n${colors.bold}${colors.cyan}=== Third-Party Mod License Auditor Tests ===${colors.reset}`);

  // Test 1: Classification Rules
  console.log(`\n${colors.cyan}[1. Classification & Normalization Engine]${colors.reset}`);
  
  const mit = classifyLicense("MIT");
  assert(mit.category === "PERMISSIVE" && !mit.redistributionRestricted, "MIT is PERMISSIVE and unrestricted");

  const apache = classifyLicense("Apache-2.0");
  assert(apache.category === "PERMISSIVE" && !apache.redistributionRestricted, "Apache-2.0 is PERMISSIVE and unrestricted");

  const lgpl = classifyLicense("LGPL-3.0-or-later");
  assert(lgpl.category === "COPYLEFT" && !lgpl.redistributionRestricted, "LGPL-3.0 is COPYLEFT and unrestricted");

  const gpl = classifyLicense("GPLv3");
  assert(gpl.category === "COPYLEFT" && !gpl.redistributionRestricted, "GPLv3 is COPYLEFT and unrestricted");

  const arr = classifyLicense("All Rights Reserved");
  assert(arr.category === "RESTRICTED" && arr.redistributionRestricted, "All Rights Reserved is RESTRICTED with redistribution warning");

  const customArr = classifyLicense("Custom ARR - No Redistribution");
  assert(customArr.category === "RESTRICTED" && customArr.redistributionRestricted, "Custom No Redistribution is RESTRICTED");

  const unk = classifyLicense("");
  assert(unk.category === "UNKNOWN" && !unk.redistributionRestricted, "Empty license defaults to UNKNOWN");

  // Test 2: Archive Inspection with Synthetic JARs
  console.log(`\n${colors.cyan}[2. Synthetic Archive Inspection]${colors.reset}`);
  const scratchDir = path.join(__dirname, "scratch", `lic-test-${Date.now()}`);
  fs.mkdirSync(scratchDir, { recursive: true });

  // Fabric MIT Mod
  const fabricJarPath = path.join(scratchDir, "fabric-sample-mod.jar");
  const fabricZip = new AdmZip();
  fabricZip.addFile(
    "fabric.mod.json",
    Buffer.from(
      JSON.stringify({
        id: "sample_fabric",
        name: "Sample Fabric Mod",
        version: "1.0.0",
        license: "MIT",
      })
    )
  );
  fabricZip.writeZip(fabricJarPath);

  const fabricReport = await auditJarLicense(fabricJarPath);
  assert(fabricReport.modId === "sample_fabric", "Extracted modId from fabric.mod.json");
  assert(fabricReport.category === "PERMISSIVE", "Correctly categorized as PERMISSIVE");
  assert(!fabricReport.redistributionRestricted, "Fabric MIT is not redistribution restricted");
  assert(fabricReport.sourceMetadata === "fabric.mod.json", "Identified sourceMetadata as fabric.mod.json");

  // Quilt Apache-2.0 Mod
  const quiltJarPath = path.join(scratchDir, "quilt-sample-mod.jar");
  const quiltZip = new AdmZip();
  quiltZip.addFile(
    "quilt.mod.json",
    Buffer.from(
      JSON.stringify({
        schema_version: 1,
        quilt_loader: {
          id: "sample_quilt",
          version: "1.0.0",
          metadata: {
            name: "Sample Quilt Mod",
            license: "Apache-2.0",
          },
        },
      })
    )
  );
  quiltZip.writeZip(quiltJarPath);

  const quiltReport = await auditJarLicense(quiltJarPath);
  assert(quiltReport.modId === "sample_quilt", "Extracted modId from quilt.mod.json");
  assert(quiltReport.modName === "Sample Quilt Mod", "Extracted modName from Quilt metadata");
  assert(quiltReport.category === "PERMISSIVE", "Correctly categorized Quilt Apache-2.0 as PERMISSIVE");
  assert(!quiltReport.redistributionRestricted, "Quilt Apache-2.0 is not redistribution restricted");
  assert(quiltReport.sourceMetadata === "quilt.mod.json", "Identified sourceMetadata as quilt.mod.json");

  // Forge All Rights Reserved Mod
  const forgeJarPath = path.join(scratchDir, "forge-sample-mod.jar");
  const forgeZip = new AdmZip();
  forgeZip.addFile(
    "META-INF/mods.toml",
    Buffer.from(`
modId="restricted_forge"
version="2.0.0"
displayName="Restricted Forge Mod"
license="All Rights Reserved"
`)
  );
  forgeZip.writeZip(forgeJarPath);

  const forgeReport = await auditJarLicense(forgeJarPath);
  assert(forgeReport.modId === "restricted_forge", "Extracted modId from META-INF/mods.toml");
  assert(forgeReport.category === "RESTRICTED", "Correctly categorized as RESTRICTED");
  assert(forgeReport.redistributionRestricted, "Flagged redistributionRestricted = true");
  assert(forgeReport.sourceMetadata === "mods.toml", "Identified sourceMetadata as mods.toml");

  // Mod with embedded LICENSE file
  const embeddedJarPath = path.join(scratchDir, "embedded-lic-mod.jar");
  const embeddedZip = new AdmZip();
  embeddedZip.addFile(
    "LICENSE.txt",
    Buffer.from("GNU LESSER GENERAL PUBLIC LICENSE Version 3, 29 June 2007")
  );
  embeddedZip.writeZip(embeddedJarPath);

  const embeddedReport = await auditJarLicense(embeddedJarPath);
  assert(embeddedReport.category === "COPYLEFT", "Categorized embedded LGPL as COPYLEFT");
  assert(embeddedReport.sourceMetadata === "embedded_file", "Identified embedded_file metadata");

  // Missing file resilience
  const missingReport = await auditJarLicense(path.join(scratchDir, "non-existent.jar"));
  assert(missingReport.category === "UNKNOWN", "Missing file safely returns UNKNOWN without throwing");

  // Test 3: Modpack Collection Summary
  console.log(`\n${colors.cyan}[3. Modpack Collection Summary & Redistribution Warnings]${colors.reset}`);
  const summary = await auditModpackLicenses([fabricJarPath, forgeJarPath, embeddedJarPath]);
  assert(summary.totalMods === 3, "Total mods counted correctly (3)");
  assert(summary.permissiveCount === 1, "Permissive mods count is 1");
  assert(summary.restrictedCount === 1, "Restricted mods count is 1");
  assert(summary.copyleftCount === 1, "Copyleft mods count is 1");
  assert(summary.restrictedMods.length === 1, "Restricted mods list has 1 item");
  assert(summary.restrictedMods[0].modId === "restricted_forge", "Accurately isolated restricted modId");

  // Cleanup scratch files
  try {
    fs.rmSync(scratchDir, { recursive: true, force: true });
  } catch {}

  console.log(`\n${colors.green}${colors.bold}✓ All License Auditor tests passed!${colors.reset}\n`);
}

if (require.main === module) {
  runLicenseAuditorTests().catch((err) => {
    console.error("Test suite fatal error:", err);
    process.exit(1);
  });
}
