/**
 * Security Scanner Unit Test Suite
 * ─────────────────────────────────────────────────────────────────────────────
 * Tests lib/security/security-scanner.ts:
 * 1. Clean synthetic JAR -> riskLevel === "clean", score <= 30
 * 2. Malicious bytecode / command execution JAR -> riskLevel >= "suspicious", process_execution finding
 * 3. Corrupt archive handling -> manifest_anomaly finding, no unhandled exceptions
 * 4. VirusTotal cache serialization & retrieval
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import AdmZip from "adm-zip";
import { scanSecurity, loadVTCache, saveVTCache } from "../../lib/security/security-scanner";

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m"
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

async function run() {
  console.log(`\n${colors.bold}${colors.cyan}▶ Executing Security Scanner Unit Test Suite...${colors.reset}\n`);

  const tempDir = path.join(os.tmpdir(), `mim-sec-test-${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    // ─────────────────────────────────────────────────────────────────────────
    // 1. Clean Synthetic JAR
    // ─────────────────────────────────────────────────────────────────────────
    console.log(`${colors.bold}1. Clean Synthetic JAR Verification${colors.reset}`);
    const cleanJarPath = path.join(tempDir, "clean-mod.jar");
    const cleanZip = new AdmZip();
    cleanZip.addFile("pack.mcmeta", Buffer.from(JSON.stringify({ pack: { description: "Clean Test Mod", pack_format: 15 } })));
    cleanZip.addFile("com/example/cleanmod/CleanMod.class", Buffer.from("public class CleanMod { public void init() { System.out.println(\"Hello MIM\"); } }"));
    cleanZip.writeZip(cleanJarPath);

    const cleanResult = await scanSecurity(cleanJarPath, true);
    assert(cleanResult.riskLevel === "clean", `Clean JAR riskLevel is 'clean' (got '${cleanResult.riskLevel}')`);
    assert(cleanResult.riskScore <= 30, `Clean JAR riskScore <= 30 (got ${cleanResult.riskScore})`);
    assert(cleanResult.scannedLocally === true, "Marked as scanned locally");

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Suspicious / Threat Signature JAR
    // ─────────────────────────────────────────────────────────────────────────
    console.log(`\n${colors.bold}2. Malicious Command Execution Detection${colors.reset}`);
    const threatJarPath = path.join(tempDir, "threat-mod.jar");
    const threatZip = new AdmZip();
    const maliciousBytecodeSample = Buffer.from(`
      package com.malicious.payload;
      public class Dropper {
        public static void run() {
          java.lang.Runtime.getRuntime().exec("powershell.exe -enc AAAAA");
          new java.lang.ProcessBuilder("cmd.exe", "/c", "calc.exe").start();
        }
      }
    `);
    threatZip.addFile("com/malicious/payload/Dropper.class", maliciousBytecodeSample);
    threatZip.writeZip(threatJarPath);

    const threatResult = await scanSecurity(threatJarPath, true);
    assert(threatResult.riskScore >= 40, `Threat JAR received elevated score (got ${threatResult.riskScore})`);
    assert(
      threatResult.riskLevel === "suspicious" || threatResult.riskLevel === "critical",
      `Threat JAR marked as suspicious or critical (got '${threatResult.riskLevel}')`
    );

    const categories = threatResult.findings.map(f => f.category);
    assert(categories.includes("process_execution"), "Detected 'process_execution' category");
    assert(categories.includes("suspicious_string"), "Detected 'suspicious_string' category");

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Corrupt Archive Handling
    // ─────────────────────────────────────────────────────────────────────────
    console.log(`\n${colors.bold}3. Corrupt / Non-Inspectable Archive Handling${colors.reset}`);
    const corruptPath = path.join(tempDir, "corrupt-file.jar");
    fs.writeFileSync(corruptPath, Buffer.from("THIS_IS_NOT_A_VALID_ZIP_ARCHIVE_DATA_123456789"));

    const corruptResult = await scanSecurity(corruptPath, true);
    assert(corruptResult.findings.some(f => f.category === "manifest_anomaly"), "Identified corrupt archive as 'manifest_anomaly'");
    assert(corruptResult.riskScore >= 20, `Corrupt archive given non-zero safety penalty (got ${corruptResult.riskScore})`);

    // ─────────────────────────────────────────────────────────────────────────
    // 4. VirusTotal Cache Serialization & Retrieval
    // ─────────────────────────────────────────────────────────────────────────
    console.log(`\n${colors.bold}4. VirusTotal Cache Integrity${colors.reset}`);
    const testHash = "deadbeefcafebabe0123456789abcdef0123456789abcdef0123456789abcdef";
    await saveVTCache({
      [testHash]: {
        maliciousCount: 0,
        totalEngineCount: 72,
        detailsUrl: `https://virustotal.com/gui/file/${testHash}`,
        fromCache: false
      }
    });

    const cache = loadVTCache();
    assert(cache[testHash] !== undefined, "Cached entry exists in loaded cache");
    assert(cache[testHash].maliciousCount === 0, "Cached entry maliciousCount matches (0)");
    assert(cache[testHash].totalEngineCount === 72, "Cached entry totalEngineCount matches (72)");

    console.log(`\n${colors.green}${colors.bold}✓ All Security Scanner unit tests passed successfully!${colors.reset}\n`);
  } finally {
    // Cleanup temporary files
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore temp dir cleanup errors on Windows
    }
  }
}

run().catch(err => {
  fail("Unhandled exception in Security Scanner tests", err);
});
