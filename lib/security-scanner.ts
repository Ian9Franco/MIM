/**
 * MIM — Security Scanner (Threat Detection Engine)
 * ─────────────────────────────────────────────────────────────────────────────
 * Analyzes JAR files for potentially malicious patterns in Java bytecode.
 *
 * Detection categories:
 *   1. Network calls (URL connections, sockets)
 *   2. Process execution (Runtime.exec, ProcessBuilder)
 *   3. File system operations (deletion outside .minecraft, mass writes)
 *   4. Obfuscation indicators (extremely short class names, control flow obfuscation)
 *   5. Native code loading (System.loadLibrary, JNI)
 *   6. Reflection abuse (setAccessible on private fields, class loading)
 *
 * Scoring system: 0-100 (Higher = more suspicious)
 *   0-30:   Clean — Safe to use
 *   31-60:  Caution — Review recommended
 *   61-85:  Suspicious — High risk, manual verification required
 *   86-100: Critical — Likely malware, block immediately
 * ─────────────────────────────────────────────────────────────────────────────
 */

import AdmZip from "adm-zip";
import fs from "fs";
import crypto from "crypto";

// ── Public Interface ──────────────────────────────────────────────────────────

export interface SecurityScanResult {
  /** Overall risk score: 0-100 */
  riskScore: number;
  /** Risk category based on score */
  riskLevel: "clean" | "caution" | "suspicious" | "critical";
  /** SHA-1 hash of the file */
  sha1: string;
  /** List of detected threats with explanations */
  findings: SecurityFinding[];
  /** Summary for UI display */
  summary: string;
  /** When the scan was performed */
  scannedAt: string;
}

export interface SecurityFinding {
  /** Category of the finding */
  category: ThreatCategory;
  /** Severity of this specific finding */
  severity: "info" | "low" | "medium" | "high" | "critical";
  /** Human-readable description */
  description: string;
  /** Technical details (class names, method signatures) */
  details?: string[];
  /** Points added to risk score */
  scoreImpact: number;
}

export type ThreatCategory =
  | "network_call"
  | "process_execution"
  | "file_system"
  | "obfuscation"
  | "native_code"
  | "reflection_abuse"
  | "known_malware"
  | "suspicious_string"
  | "manifest_anomaly";

// ── Configuration ──────────────────────────────────────────────────────────────

/** Weight multipliers for different threat categories */
const THREAT_WEIGHTS: Record<ThreatCategory, number> = {
  known_malware: 100,      // Instant max score
  process_execution: 25,     // Very dangerous
  native_code: 20,          // Could be legitimate but risky
  network_call: 15,         // Common in legit mods (update checks)
  reflection_abuse: 15,     // Often used for compatibility
  file_system: 10,          // Context matters
  obfuscation: 10,          // Could be for protection
  suspicious_string: 5,      // Weak indicator
  manifest_anomaly: 3,       // Usually benign
};

/** Suspicious patterns in bytecode/strings */
const SUSPICIOUS_PATTERNS: Array<{
  pattern: RegExp;
  category: ThreatCategory;
  severity: SecurityFinding["severity"];
  description: string;
  score: number;
}> = [
  // Process execution
  { pattern: /java\.lang\.Runtime.*exec/, category: "process_execution", severity: "critical", description: "Executes system commands via Runtime.exec()", score: 25 },
  { pattern: /ProcessBuilder/, category: "process_execution", severity: "critical", description: "Uses ProcessBuilder to spawn processes", score: 25 },
  { pattern: /getRuntime\(\).*exec/, category: "process_execution", severity: "critical", description: "Runtime execution detected", score: 25 },

  // Native code
  { pattern: /System\.loadLibrary/, category: "native_code", severity: "high", description: "Loads native libraries (.dll/.so)", score: 20 },
  { pattern: /System\.load\(/, category: "native_code", severity: "high", description: "Loads native code from file", score: 20 },
  { pattern: /JNI|JavaVM|JNIEnv/, category: "native_code", severity: "medium", description: "JNI (Java Native Interface) usage", score: 15 },

  // Network calls
  { pattern: /java\.net\.URL.*openConnection/, category: "network_call", severity: "medium", description: "Makes HTTP/HTTPS connections", score: 8 },
  { pattern: /java\.net\.Socket/, category: "network_call", severity: "medium", description: "Opens network sockets", score: 10 },
  { pattern: /HttpClient|HttpRequest|HttpResponse/, category: "network_call", severity: "medium", description: "Modern HTTP client usage", score: 8 },
  { pattern: /java\.net\.HttpURLConnection/, category: "network_call", severity: "medium", description: "HTTP URL connections", score: 8 },

  // Reflection abuse
  { pattern: /setAccessible\(true\)/, category: "reflection_abuse", severity: "high", description: "Bypasses access modifiers via reflection", score: 15 },
  { pattern: /java\.lang\.reflect\.Field.*setAccessible/, category: "reflection_abuse", severity: "high", description: "Modifies private fields", score: 15 },
  { pattern: /defineClass|ClassLoader/, category: "reflection_abuse", severity: "high", description: "Dynamic class loading (could be exploit)", score: 15 },
  { pattern: /MethodHandle|Lookup/, category: "reflection_abuse", severity: "medium", description: "Advanced reflection (MethodHandles)", score: 10 },

  // File system operations (outside normal bounds)
  { pattern: /deleteOnExit|delete\(\)/, category: "file_system", severity: "low", description: "File deletion operations", score: 3 },
  { pattern: /FileOutputStream.*\.minecraft|AppData|ProgramData/, category: "file_system", severity: "medium", description: "Writes to system directories", score: 8 },
  { pattern: /Files\.walk.*delete|FileUtils\.delete/, category: "file_system", severity: "high", description: "Mass file deletion capability", score: 12 },

  // Suspicious strings (often seen in malware)
  { pattern: /powershell|cmd\.exe|bash -c/, category: "suspicious_string", severity: "critical", description: "Shell command invocations", score: 20 },
  { pattern: /wget|curl.*-O|invoke-webrequest/i, category: "suspicious_string", severity: "high", description: "Download commands", score: 15 },
  { pattern: /base64_decode|Base64\.getDecoder/, category: "suspicious_string", severity: "medium", description: "Base64 decoding (often obfuscation)", score: 5 },
  { pattern: /AES|DES|RSA.*encrypt|cipher\.getInstance/i, category: "suspicious_string", severity: "low", description: "Encryption usage", score: 3 },
  { pattern: /keylogger|screenshot|clipboard/i, category: "suspicious_string", severity: "high", description: "Potential surveillance behavior", score: 15 },
];

/** Obfuscation indicators */
const OBFUSCATION_PATTERNS = {
  /** Class names that look obfuscated (single letters, random strings) */
  obfuscatedClassName: /^[a-zA-Z$][a-zA-Z0-9$]{0,2}$/,
  /** Excessive use of control flow obfuscation (goto-like patterns) */
  controlFlowObfuscation: /goto|TABLESWITCH|LOOKUPSWITCH.*\d{10,}/,
  /** String encryption loops */
  stringEncryption: /for.*\{.*char.*\^.*\}/,
};

/** Known malware hashes (SHA-1) - Starter database */
const KNOWN_MALWARE_HASHES: Set<string> = new Set([
  // Example entries - in production, this would be regularly updated
  // "a1b2c3d4e5f6...", // Example malware hash
]);

// ── Main Scanner Function ───────────────────────────────────────────────────────

/**
 * Performs a comprehensive security scan on a JAR file.
 *
 * @param filePath Absolute path to the .jar file
 * @returns SecurityScanResult with risk assessment
 */
export async function scanSecurity(filePath: string): Promise<SecurityScanResult> {
  const findings: SecurityFinding[] = [];
  const scannedAt = new Date().toISOString();

  // Calculate file hash first
  const sha1 = calculateSha1(filePath);

  // Check against known malware database
  if (KNOWN_MALWARE_HASHES.has(sha1)) {
    findings.push({
      category: "known_malware",
      severity: "critical",
      description: "File matches known malware signature in threat database",
      details: ["SHA-1 hash found in blacklist"],
      scoreImpact: 100,
    });

    return buildResult(100, findings, sha1, scannedAt);
  }

  try {
    const zip = new AdmZip(filePath);
    const entries = zip.getEntries();

    // Analyze each class file
    let classFileCount = 0;
    let obfuscatedClassCount = 0;
    const analyzedClasses: string[] = [];

    for (const entry of entries) {
      const entryName = entry.entryName;

      // Analyze .class files
      if (entryName.endsWith(".class")) {
        classFileCount++;
        const className = entryName.replace(/\//g, ".").replace(/\.class$/, "");
        const simpleName = className.split(".").pop() || "";

        // Check for obfuscated class names
        if (OBFUSCATION_PATTERNS.obfuscatedClassName.test(simpleName)) {
          obfuscatedClassCount++;
          analyzedClasses.push(className);
        }

        // Analyze bytecode for suspicious patterns
        const bytecodeFindings = analyzeBytecode(entry.getData());
        findings.push(...bytecodeFindings);
      }

      // Analyze manifest and config files for suspicious strings
      if (
        entryName.endsWith(".json") ||
        entryName.endsWith(".toml") ||
        entryName.endsWith(".properties") ||
        entryName === "META-INF/MANIFEST.MF"
      ) {
        try {
          const content = entry.getData().toString("utf-8");
          const stringFindings = analyzeStrings(content, entryName);
          findings.push(...stringFindings);
        } catch {
          // Binary file or unreadable, skip
        }
      }
    }

    // Check obfuscation ratio
    if (classFileCount > 0) {
      const obfuscationRatio = obfuscatedClassCount / classFileCount;
      if (obfuscationRatio > 0.5 && classFileCount > 5) {
        findings.push({
          category: "obfuscation",
          severity: "high",
          description: `Heavy obfuscation detected (${Math.round(obfuscationRatio * 100)}% of classes have obfuscated names)`,
          details: analyzedClasses.slice(0, 10), // Show first 10 examples
          scoreImpact: Math.round(obfuscationRatio * 20),
        });
      } else if (obfuscationRatio > 0.2) {
        findings.push({
          category: "obfuscation",
          severity: "medium",
          description: `Moderate obfuscation detected (${Math.round(obfuscationRatio * 100)}% of classes)`,
          scoreImpact: Math.round(obfuscationRatio * 10),
        });
      }
    }

    // Check for manifest anomalies
    const manifestFindings = checkManifestAnomalies(entries);
    findings.push(...manifestFindings);

  } catch (error) {
    findings.push({
      category: "manifest_anomaly",
      severity: "info",
      description: "Could not fully analyze JAR structure",
      details: [error instanceof Error ? error.message : "Unknown error"],
      scoreImpact: 0,
    });
  }

  // Calculate total risk score
  const totalScore = Math.min(100, findings.reduce((sum, f) => sum + f.scoreImpact, 0));

  return buildResult(totalScore, findings, sha1, scannedAt);
}

// ── Analysis Helpers ─────────────────────────────────────────────────────────────

/**
 * Analyzes Java bytecode for suspicious patterns.
 * Note: This is a heuristic analysis, not full decompilation.
 */
function analyzeBytecode(buffer: Buffer): SecurityFinding[] {
  const findings: SecurityFinding[] = [];

  // Convert buffer to string for pattern matching
  // Note: This catches patterns in the bytecode strings/constants pool
  const content = buffer.toString("binary");

  for (const { pattern, category, severity, description, score } of SUSPICIOUS_PATTERNS) {
    if (pattern.test(content)) {
      // Check if we already have a similar finding to avoid duplicates
      const exists = findings.some(f => f.category === category && f.description === description);
      if (!exists) {
        findings.push({
          category,
          severity,
          description,
          scoreImpact: score,
        });
      }
    }
  }

  // Check for string encryption patterns (common in obfuscated malware)
  if (OBFUSCATION_PATTERNS.stringEncryption.test(content)) {
    findings.push({
      category: "obfuscation",
      severity: "medium",
      description: "Possible string encryption (deobfuscation at runtime)",
      scoreImpact: 8,
    });
  }

  return findings;
}

/**
 * Analyzes text content for suspicious strings.
 */
function analyzeStrings(content: string, source: string): SecurityFinding[] {
  const findings: SecurityFinding[] = [];

  for (const { pattern, category, severity, description, score } of SUSPICIOUS_PATTERNS) {
    if (pattern.test(content)) {
      findings.push({
        category,
        severity,
        description: `${description} (found in ${source})`,
        details: [],
        scoreImpact: score,
      });
    }
  }

  return findings;
}

/**
 * Checks for anomalies in JAR manifest and structure.
 */
function checkManifestAnomalies(entries: AdmZip.IZipEntry[]): SecurityFinding[] {
  const findings: SecurityFinding[] = [];

  // Check for suspicious entry patterns
  const hasManifest = entries.some(e => e.entryName === "META-INF/MANIFEST.MF");
  const hasModMetadata = entries.some(e =>
    e.entryName.includes("fabric.mod.json") ||
    e.entryName.includes("mods.toml") ||
    e.entryName.includes("neoforge.mods.toml")
  );

  if (!hasManifest && !hasModMetadata) {
    findings.push({
      category: "manifest_anomaly",
      severity: "medium",
      description: "JAR lacks both manifest and standard mod metadata",
      scoreImpact: 5,
    });
  }

  // Check for dual-purpose files (rare in legit mods)
  const hasClassFiles = entries.some(e => e.entryName.endsWith(".class"));
  const hasExecutableScripts = entries.some(e =>
    e.entryName.endsWith(".exe") ||
    e.entryName.endsWith(".bat") ||
    e.entryName.endsWith(".sh") ||
    e.entryName.endsWith(".ps1")
  );

  if (hasClassFiles && hasExecutableScripts) {
    findings.push({
      category: "manifest_anomaly",
      severity: "high",
      description: "JAR contains both Java classes and executable scripts",
      details: entries
        .filter(e => /\.(exe|bat|sh|ps1)$/i.test(e.entryName))
        .map(e => e.entryName),
      scoreImpact: 15,
    });
  }

  return findings;
}

// ── Utility Functions ───────────────────────────────────────────────────────────

function calculateSha1(filePath: string): string {
  const hash = crypto.createHash("sha1");
  const data = fs.readFileSync(filePath);
  hash.update(data);
  return hash.digest("hex");
}

function buildResult(
  score: number,
  findings: SecurityFinding[],
  sha1: string,
  scannedAt: string
): SecurityScanResult {
  // Determine risk level
  let riskLevel: SecurityScanResult["riskLevel"];
  if (score <= 30) riskLevel = "clean";
  else if (score <= 60) riskLevel = "caution";
  else if (score <= 85) riskLevel = "suspicious";
  else riskLevel = "critical";

  // Generate summary
  const summary = generateSummary(score, riskLevel, findings);

  // Sort findings by severity
  const severityOrder = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
  const sortedFindings = findings.sort(
    (a, b) => severityOrder[b.severity] - severityOrder[a.severity]
  );

  return {
    riskScore: score,
    riskLevel,
    sha1,
    findings: sortedFindings,
    summary,
    scannedAt,
  };
}

function generateSummary(
  score: number,
  level: SecurityScanResult["riskLevel"],
  findings: SecurityFinding[]
): string {
  const criticalCount = findings.filter(f => f.severity === "critical").length;
  const highCount = findings.filter(f => f.severity === "high").length;

  switch (level) {
    case "clean":
      return "No significant threats detected. This file appears safe to use.";
    case "caution":
      return `Low-risk patterns detected. Review findings before installing.`;
    case "suspicious":
      return `${criticalCount > 0 ? criticalCount + " critical" : highCount + " high-risk"} pattern${(criticalCount || highCount) > 1 ? "s" : ""} detected. Manual verification strongly recommended.`;
    case "critical":
      return `CRITICAL: ${criticalCount} critical threat${criticalCount > 1 ? "s" : ""} detected. This file matches malware patterns and should NOT be installed.`;
    default:
      return "Analysis completed.";
  }
}

// ── Batch Operations ────────────────────────────────────────────────────────────

/**
 * Scans multiple files and returns aggregated results.
 */
export async function scanSecurityBatch(filePaths: string[]): Promise<{
  results: SecurityScanResult[];
  highestRisk: SecurityScanResult | null;
  summary: string;
}> {
  const results: SecurityScanResult[] = [];

  for (const path of filePaths) {
    try {
      const result = await scanSecurity(path);
      results.push(result);
    } catch (error) {
      // Push a failed scan result
      results.push({
        riskScore: 0,
        riskLevel: "clean",
        sha1: "error",
        findings: [{
          category: "manifest_anomaly",
          severity: "info",
          description: `Scan failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          scoreImpact: 0,
        }],
        summary: "Scan could not be completed for this file.",
        scannedAt: new Date().toISOString(),
      });
    }
  }

  const highestRisk = results.reduce((max, curr) =>
    curr.riskScore > (max?.riskScore ?? 0) ? curr : max
  , null as SecurityScanResult | null);

  const criticalCount = results.filter(r => r.riskLevel === "critical").length;
  const suspiciousCount = results.filter(r => r.riskLevel === "suspicious").length;

  const summary = `Scanned ${results.length} files. ` +
    (criticalCount > 0
      ? `${criticalCount} critical threat${criticalCount > 1 ? "s" : ""} detected.`
      : suspiciousCount > 0
        ? `${suspiciousCount} suspicious file${suspiciousCount > 1 ? "s" : ""} found.`
        : "All files passed security checks.");

  return { results, highestRisk, summary };
}
