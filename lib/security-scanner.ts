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
import path from "path";
import { getApiKey } from "./settings";
import { scanMod } from "./scanner";

// ── Public Interface ──────────────────────────────────────────────────────────

export interface SecurityScanResult {
  /** Overall risk score: 0-100 */
  riskScore: number;
  /** Risk category based on score */
  riskLevel: "clean" | "caution" | "suspicious" | "critical";
  /** SHA-1 hash of the file */
  sha1: string;
  /** SHA-256 hash of the file */
  sha256?: string;
  /** VirusTotal analysis stats if available */
  virusTotal?: {
    maliciousCount: number;
    totalEngineCount: number;
    detailsUrl?: string;
  } | null;
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
  network_call: 8,          // Common in legit mods (update checks) - REDUCED
  reflection_abuse: 8,      // Often used for compatibility - REDUCED
  file_system: 5,           // Context matters - REDUCED
  obfuscation: 5,           // Could be for protection - REDUCED
  suspicious_string: 3,      // Weak indicator - REDUCED
  manifest_anomaly: 2,       // Usually benign - REDUCED
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
  { pattern: /\b(AES|DES|RSA)\b|cipher\.getInstance/i, category: "suspicious_string", severity: "low", description: "Encryption usage", score: 3 },
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

/** Known malware hashes (SHA-1) - Local threat database */
const KNOWN_MALWARE_HASHES: Set<string> = new Set([
  // Add known malicious hashes here
]);

/** Popular and trusted mods - Whitelist to reduce false positives */
const TRUSTED_MODS: Set<string> = new Set([
  // Essential utility mods
  "fabric-api", "fabricloader", "forge", "neoforge", "connector", "sinytra-connector",
  // Performance mods
  "sodium", "lithium", "phosphor", "starlight", "rubidium", "krypton", "hydrogen",
  "optifine", "iris", "oculus", "embeddium", "continuity",
  // Popular content mods
  "jei", "jade", "jade-addons", "roughly-enough-items", "roughly-enough-resources",
  "rei", "hwyla", "wthit", "jade",
  // Configuration mods
  "modmenu", "cloth-config", "cloth-config2", "architectury-api", "cardinal-components-api",
  "mafgs", "mod-fabric-gui-screenshots", "modmenu",
  // Popular gameplay mods
  "tweakeroo", "itemscroller", "litematica", "minihud", "replay-mod", "worldedit",
  "journeymap", "xaeros-minimap", "xaeros-world-map", "ftb-chunks", "ftb-quests",
  "ftb-library", "ftb-teams", "ftb-backups",
  // Shader and graphics
  "complementary-reimagined", "complementary-unbound", "seus", "sildurs-vibrations",
  "bsl-shaders", "continuity", "distant-horizons", "distant-horizons-fabric",
  // Technology and automation
  "techreborn", "applied-energistics-2", "thermal-series", "mekanism", "immersive-engineering",
  "botania", "create", "refined-storage", "rftools", "industrial-foregoing",
  // Magic and adventure
  "botania", "thaumcraft", "blood-magic", "astral-sorcery", "twilight-forest",
  "the-betweenlands", "aether", "undergarden", "blue-skies",
  // Multiplayer and utilities
  "voice-chat", "plasmovoice", "simple-voice-chat", "ferritecore", "memoryleakfix",
  "krypton", "lazydfu", "entityculling", "no-chat-reports", "no-telemetry",
  // Building and decoration
  "chisel", "bibliocraft", "storage-drawers", "quark", "botania", "malisis-doors",
  "decorative-blocks", "block-carpentry", "little-tiles", "chisels-bits",
]);

// ── Whitelist & Cloud Verification Helpers ─────────────────────────────────────

function getWhitelistedMods(): Set<string> {
  const modsSet = new Set<string>(TRUSTED_MODS); // Start with trusted mods
  
  // Add local whitelist if exists
  try {
    const localWhitelist = require("./data/whitelist.json") as string[];
    localWhitelist.forEach(m => modsSet.add(m.toLowerCase().trim()));
  } catch {
    // Local whitelist doesn't exist, continue with trusted mods only
  }

  try {
    const { getPortableDir } = require("./settings");
    const portableDir = getPortableDir();
    
    if (portableDir) {
      if (!fs.existsSync(portableDir)) {
        fs.mkdirSync(portableDir, { recursive: true });
      }
      const portableFile = path.join(portableDir, "whitelist.json");
      
      // If portable whitelist does not exist, initialize it with trusted mods
      if (!fs.existsSync(portableFile)) {
        try {
          fs.writeFileSync(portableFile, JSON.stringify(Array.from(TRUSTED_MODS), null, 2), "utf-8");
          console.log(`[Security] Initialized portable whitelist file at: ${portableFile}`);
        } catch (err) {
          console.error("[Security] Failed to initialize portable whitelist:", err);
        }
      } else {
        // Load custom portable whitelist
        try {
          const customList = JSON.parse(fs.readFileSync(portableFile, "utf-8")) as string[];
          if (Array.isArray(customList)) {
            customList.forEach(m => {
              if (typeof m === "string") {
                modsSet.add(m.toLowerCase().trim());
              }
            });
          }
        } catch (e) {
          console.warn("[Security] Could not parse custom portable whitelist:", e);
        }
      }
    }
  } catch (e) {
    console.warn("[Security] Could not access or load portable whitelist:", e);
  }

  return modsSet;
}

function isTrustedMod(modId: string, filename: string): boolean {
  const whitelistSet = getWhitelistedMods();
  
  // Check exact mod ID match
  if (whitelistSet.has(modId.toLowerCase())) {
    return true;
  }
  
  // Check filename contains trusted mod name
  const filenameLower = filename.toLowerCase();
  for (const trustedMod of whitelistSet) {
    if (filenameLower.includes(trustedMod)) {
      return true;
    }
  }
  
  return false;
}

function calculateSha256(filePath: string): string {
  const hash = crypto.createHash("sha256");
  const data = fs.readFileSync(filePath);
  hash.update(data);
  return hash.digest("hex");
}

async function checkVirusTotalHash(sha256: string): Promise<{ maliciousCount: number; totalEngineCount: number; detailsUrl?: string } | null> {
  const apiKey = getApiKey("virustotal");
  if (!apiKey || apiKey.includes("...") || apiKey.trim().length < 16) {
    return null;
  }

  try {
    const res = await fetch(`https://www.virustotal.com/api/v3/files/${sha256}`, {
      headers: {
        "x-apikey": apiKey,
      },
    });

    if (res.status === 404) {
      // Not found on VirusTotal is clean/undetected
      return { maliciousCount: 0, totalEngineCount: 0 };
    }

    if (!res.ok) {
      console.warn(`[VirusTotal API] Error ${res.status}: ${res.statusText}`);
      return null;
    }

    const json = await res.json();
    const stats = json?.data?.attributes?.last_analysis_stats;
    if (stats) {
      const malicious = stats.malicious || 0;
      const suspicious = stats.suspicious || 0;
      const total = (stats.harmless || 0) + (stats.type_unsupported || 0) + (stats.suspicious || 0) + (stats.confirmed_timeout || 0) + (stats.timeout || 0) + (stats.failure || 0) + (stats.malicious || 0) + (stats.undetected || 0);
      const permalink = json?.data?.links?.self ? `https://www.virustotal.com/gui/file/${sha256}` : undefined;
      return {
        maliciousCount: malicious + suspicious,
        totalEngineCount: total,
        detailsUrl: permalink,
      };
    }
  } catch (err) {
    console.error("[VirusTotal API] Unhandled error querying hash:", err);
  }

  return null;
}


// ── Security Cache ──────────────────────────────────────────────────────────────

interface SecurityCacheEntry {
  mtime: number;
  size: number;
  result: SecurityScanResult;
}

interface SecurityCache {
  version: number;
  entries: Record<string, SecurityCacheEntry>;
}

let securityCache: SecurityCache | null = null;

function getCacheFilePath(): string {
  try {
    const { SOURCE_BASE } = require("./constants");
    return path.join(SOURCE_BASE, ".mim-index", "security-cache.json");
  } catch {
    return path.join(process.cwd(), ".mim-index", "security-cache.json");
  }
}

function loadSecurityCache(): SecurityCache {
  if (securityCache) return securityCache;
  
  securityCache = { version: 2, entries: {} };
  try {
    const cacheFile = getCacheFilePath();
    if (fs.existsSync(cacheFile)) {
      const content = fs.readFileSync(cacheFile, "utf-8");
      securityCache = JSON.parse(content);
    }
  } catch (error) {
    console.error("[Security Cache] Error loading cache file, resetting cache:", error);
  }
  return securityCache!;
}

function saveSecurityCache() {
  if (!securityCache) return;
  try {
    const cacheFile = getCacheFilePath();
    const dir = path.dirname(cacheFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(cacheFile, JSON.stringify(securityCache, null, 2), "utf-8");
  } catch (error) {
    console.error("[Security Cache] Error writing cache to disk:", error);
  }
}

// ── Main Scanner Function ───────────────────────────────────────────────────────

/**
 * Performs a comprehensive security scan on a JAR file.
 *
 * @param filePath Absolute path to the .jar file
 * @returns SecurityScanResult with risk assessment
 */
export async function scanSecurity(filePath: string): Promise<SecurityScanResult> {
  // Check cache first!
  try {
    const stats = fs.statSync(filePath);
    const cache = loadSecurityCache();
    const cached = cache.entries[filePath];
    if (cached && cached.mtime === stats.mtimeMs && cached.size === stats.size) {
      return cached.result;
    }
  } catch (_) {}

  const findings: SecurityFinding[] = [];
  const scannedAt = new Date().toISOString();

  // Calculate file hashes first
  const sha1 = calculateSha1(filePath);
  const sha256 = calculateSha256(filePath);

  // Check against known malware database (Local Blacklist)
  if (KNOWN_MALWARE_HASHES.has(sha1)) {
    findings.push({
      category: "known_malware",
      severity: "critical",
      description: "File matches known malware signature in threat database",
      details: ["SHA-1 hash found in blacklist"],
      scoreImpact: 100,
    });

    return buildResult(100, findings, sha1, scannedAt, sha256, null);
  }

  // ── Enhanced Whitelist & Verification Check ───────────────────────────────
  let modId = "";
  let isTrusted = false;
  
  try {
    const meta = scanMod(filePath);
    modId = meta.modId;
    isTrusted = isTrustedMod(meta.modId, path.basename(filePath));
  } catch {
    // If scanning metadata fails, fall back to filename checking
    const filename = path.basename(filePath);
    isTrusted = isTrustedMod("", filename);
  }

  // ── VirusTotal Reputation Check (Cloud Threat DB) ───────────────────────────
  let vtResult = null;

  if (isTrusted) {
    findings.push({
      category: "manifest_anomaly",
      severity: "info",
      description: `🛡️ Mod Coliable (${modId || "Reconocido"})`,
      details: ["Este mod es popular y verificado por la comunidad. Las advertencias de bytecode se marcan como seguras."],
      scoreImpact: 0,
    });
    
    // Para mods coliables, reducir drásticamente el impacto de otros findings
    const originalFindings = [...findings];
    findings.length = 0; // Limpiar findings anteriores
    findings.push(originalFindings[originalFindings.length - 1]); // Mantener solo el mensaje de confianza
    
    return buildResult(0, findings, sha1, scannedAt, sha256, vtResult);
  }
  try {
    vtResult = await checkVirusTotalHash(sha256);
    if (vtResult) {
      if (vtResult.maliciousCount > 0) {
        findings.push({
          category: "known_malware",
          severity: "critical",
          description: `🚨 VirusTotal: ${vtResult.maliciousCount} motor(es) detectaron malware en este archivo`,
          details: vtResult.detailsUrl ? [`Ver reporte completo: ${vtResult.detailsUrl}`] : [],
          scoreImpact: vtResult.maliciousCount >= 3 ? 100 : vtResult.maliciousCount * 30, // 1 detección = +30, 2 = +60, 3+ = +100 (Critical)
        });
      } else if (vtResult.totalEngineCount > 0) {
        findings.push({
          category: "manifest_anomaly",
          severity: "info",
          description: `✅ Verificado por VirusTotal (0/${vtResult.totalEngineCount} motores maliciosos)`,
          details: vtResult.detailsUrl ? [`Ver análisis: ${vtResult.detailsUrl}`] : [],
          scoreImpact: 0,
        });
      }
    }
  } catch (vtErr) {
    console.error("[Security Scanner] Failed VirusTotal query:", vtErr);
  }

  try {
    const zip = new AdmZip(filePath);
    const entries = zip.getEntries();

    const globalFindingsMap = new Map<string, SecurityFinding>();
    
    // Add existing findings (like blacklist, trusted status, or VirusTotal results) to the map
    for (const f of findings) {
      const key = `${f.category}:${f.description}`;
      globalFindingsMap.set(key, { ...f, details: f.details ? [...f.details] : [] });
    }

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
        for (const bf of bytecodeFindings) {
          const key = `${bf.category}:${bf.description}`;
          if (globalFindingsMap.has(key)) {
            const existing = globalFindingsMap.get(key)!;
            if (existing.details && !existing.details.includes(className)) {
              if (existing.details.length < 5) {
                existing.details.push(className);
              } else if (existing.details.length === 5) {
                existing.details.push("... y más clases");
              }
            }
          } else {
            globalFindingsMap.set(key, {
              ...bf,
              details: [className]
            });
          }
        }
      }

      // Analyze manifest, metadata and config files for suspicious strings
      if (
        entryName.endsWith(".json") ||
        entryName.endsWith(".toml") ||
        entryName.endsWith(".properties") ||
        entryName.endsWith(".mcmeta") ||
        entryName === "META-INF/MANIFEST.MF"
      ) {
        try {
          const content = entry.getData().toString("utf-8");
          const stringFindings = analyzeStrings(content, entryName);
          for (const sf of stringFindings) {
            const key = `${sf.category}:${sf.description}`;
            if (!globalFindingsMap.has(key)) {
              globalFindingsMap.set(key, {
                ...sf,
                details: [`Encontrado en ${entryName}`]
              });
            }
          }
        } catch {
          // Binary file or unreadable, skip
        }
      }
    }

    // Rebuild findings array from our deduplicated map
    findings.length = 0;
    findings.push(...Array.from(globalFindingsMap.values()));

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

  // Calculate total risk score with optimized scoring
  let totalScore = findings.reduce((sum, f) => sum + f.scoreImpact, 0);

  // Apply scoring optimizations for common false positives
    if (totalScore > 0 && totalScore < 40) {
      // Para scores bajos, reducir aún más si hay VirusTotal limpio
      if (vtResult && vtResult.maliciousCount === 0 && vtResult.totalEngineCount > 0) {
        totalScore = Math.max(0, totalScore - 10); // Reducir score si VT confirma que es limpio
      }
      
      // Si solo hay findings de bajo riesgo, marcar como limpio
      const hasOnlyLowRiskFindings = findings.every(f => 
        f.category === "network_call" || 
        f.category === "reflection_abuse" || 
        f.category === "manifest_anomaly"
      );
      
      if (hasOnlyLowRiskFindings && totalScore < 25) {
        totalScore = 0; // Marcar como completamente limpio
      }
    }

    // Whitelist for Sinytra Connector (False positives due to bridge logic & bytecode manipulation)
    const fileName = path.basename(filePath).toLowerCase();
    const isSinytra = fileName.includes("connector") && (fileName.includes("sinytra") || fileName.includes("forgified"));
    if (isSinytra && totalScore < 95) {
      totalScore = Math.min(totalScore, 10); // Downgrade to "Clean" (Score < 31)
    }


  const finalResult = buildResult(totalScore, findings, sha1, scannedAt, sha256, vtResult);

  // Save to cache
  try {
    const stats = fs.statSync(filePath);
    const cache = loadSecurityCache();
    cache.entries[filePath] = {
      mtime: stats.mtimeMs,
      size: stats.size,
      result: finalResult
    };
    saveSecurityCache();
  } catch (err) {
    console.error("[Security Scanner] Failed to write cache entry:", err);
  }

  return finalResult;
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
  scannedAt: string,
  sha256?: string,
  virusTotal?: SecurityScanResult["virusTotal"]
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
    sha256,
    virusTotal,
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
 * Each result includes the source `filePath` so the UI can correlate
 * results with their original scannable entries.
 */
export async function scanSecurityBatch(filePaths: string[]): Promise<{
  results: (SecurityScanResult & { filePath: string })[];
  highestRisk: SecurityScanResult | null;
  summary: string;
}> {
  const results: (SecurityScanResult & { filePath: string })[] = [];

  for (const fp of filePaths) {
    try {
      const result = await scanSecurity(fp);
      results.push({ ...result, filePath: fp });
    } catch (error) {
      // Push a failed-scan placeholder so the UI sees it (filtered out client-side)
      results.push({
        filePath: fp,
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

  const criticalCount   = results.filter(r => r.riskLevel === "critical").length;
  const suspiciousCount = results.filter(r => r.riskLevel === "suspicious").length;

  const summary = `Scanned ${results.length} files. ` +
    (criticalCount > 0
      ? `${criticalCount} critical threat${criticalCount > 1 ? "s" : ""} detected.`
      : suspiciousCount > 0
        ? `${suspiciousCount} suspicious file${suspiciousCount > 1 ? "s" : ""} found.`
        : "All files passed security checks.");

  return { results, highestRisk, summary };
}
