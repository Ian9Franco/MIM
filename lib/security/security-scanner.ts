/**
 * MIM — Security Scanner (Threat Detection Engine)
 * Optimized for v5.9: Constants extracted to security-data.ts
 */

import AdmZip from "adm-zip";
import fs from "fs";
import crypto from "crypto";
import path from "path";
import { getApiKey } from "../core/settings";
import { scanMod } from "../scanner";
import { SUSPICIOUS_PATTERNS, OBFUSCATION_PATTERNS, KNOWN_MALWARE_HASHES, TRUSTED_MODS, checkKnownMalwareThreat } from "./security-data";
import type { SecurityScanResult, SecurityFinding, ThreatCategory } from "../core/types";

// ── Whitelist & Verification ──────────────────────────────────────────────────

function getWhitelistedMods(): Set<string> {
  const modsSet = new Set<string>(TRUSTED_MODS.map(m => m.toLowerCase()));
  try {
    const { getPortableDir } = require("../core/settings");
    const portableDir = getPortableDir();
    if (portableDir) {
      const pFile = path.join(portableDir, "data", "whitelist.json");
      if (fs.existsSync(pFile)) {
        const custom = JSON.parse(fs.readFileSync(pFile, "utf-8"));
        if (Array.isArray(custom)) custom.forEach(m => modsSet.add(String(m).toLowerCase().trim()));
      }
    }
  } catch (err) {
    console.debug("[/lib/security-scanner] Whitelist file not found or could not be parsed:", err);
  }
  return modsSet;
}

function isTrustedMod(modId: string, filename: string): boolean {
  const ws = getWhitelistedMods();
  if (ws.has(modId.toLowerCase())) return true;
  const fn = filename.toLowerCase();
  for (const t of ws) if (fn.includes(t)) return true;
  return false;
}

// ── Cloud API & Cache with Serialized Mutex / Concurrency Control ─────────
export type VirusTotalCachedEntry = NonNullable<SecurityScanResult["virusTotal"]>;
export type VirusTotalCache = Record<string, VirusTotalCachedEntry>;

const CACHE_FILE = path.join(path.dirname(path.dirname(__filename)), ".mim-index", "cache", "vt-cache.json");
let inMemoryVTCache: VirusTotalCache | null = null;
let vtWriteQueue: Promise<void> = Promise.resolve();

export function loadVTCache(): VirusTotalCache {
  if (inMemoryVTCache !== null) {
    return inMemoryVTCache;
  }
  if (fs.existsSync(CACHE_FILE)) {
    try {
      inMemoryVTCache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8")) as VirusTotalCache;
      return inMemoryVTCache || {};
    } catch (err) {
      console.warn("[/lib/security-scanner] Corrupted VT cache file, starting with empty cache:", err);
      inMemoryVTCache = {};
      return inMemoryVTCache;
    }
  }
  inMemoryVTCache = {};
  return inMemoryVTCache;
}

export function saveVTCache(newEntries: VirusTotalCache): Promise<void> {
  // 1. In-memory synchronous update: ensures concurrent reads in the same tick immediately see fresh entries
  const current = loadVTCache();
  Object.assign(current, newEntries);
  inMemoryVTCache = current;

  // 2. Serialized FIFO write queue: prevents concurrent disk write collisions and file corruption
  vtWriteQueue = vtWriteQueue.then(async () => {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // Read on-disk state to merge in case another process modified the file
    let diskData: VirusTotalCache = {};
    if (fs.existsSync(CACHE_FILE)) {
      try {
        diskData = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8")) as VirusTotalCache;
      } catch (err) {
        console.warn("[/lib/security-scanner] Failed to read existing VT cache during merge:", err);
      }
    }

    const merged: VirusTotalCache = { ...diskData, ...inMemoryVTCache };
    inMemoryVTCache = merged;

    const tempFile = `${CACHE_FILE}.tmp.${process.pid}.${Date.now()}.${crypto.randomUUID()}`;
    
    try {
      fs.writeFileSync(tempFile, JSON.stringify(merged, null, 2), "utf-8");

      // Windows-resilient atomic rename with retry on EBUSY / EPERM
      let retries = 5;
      while (retries > 0) {
        try {
          fs.renameSync(tempFile, CACHE_FILE);
          break;
        } catch (err: unknown) {
          const nodeErr = err as NodeJS.ErrnoException;
          retries--;
          if ((nodeErr?.code === "EBUSY" || nodeErr?.code === "EPERM") && retries > 0) {
            await new Promise(r => setTimeout(r, 50));
          } else if (retries === 0) {
            // Windows fallback: copy and unlink
            fs.copyFileSync(tempFile, CACHE_FILE);
            try { 
              fs.unlinkSync(tempFile); 
            } catch (unlinkErr) {
              console.debug("[/lib/security-scanner] Unable to remove temp VT cache file:", unlinkErr);
            }
            break;
          } else {
            throw err;
          }
        }
      }
    } catch (e) {
      console.warn("[/lib/security-scanner] Could not persist VT cache securely to disk:", e);
      try {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      } catch (unlinkErr) {
        console.debug("[/lib/security-scanner] Unable to cleanup temp file on error:", unlinkErr);
      }
    }
  }).catch(err => {
    console.error("[/lib/security-scanner] Unhandled error in VT cache write queue:", err);
  });

  return vtWriteQueue;
}

async function checkVirusTotalHash(sha256: string): Promise<SecurityScanResult["virusTotal"]> {
  const cache = loadVTCache();
  if (cache[sha256]) {
    return { ...cache[sha256], fromCache: true };
  }

  const key = getApiKey("virustotal");
  if (!key || key.length < 16) return null;
  
  try {
    const res = await fetch(`https://www.virustotal.com/api/v3/files/${sha256}`, {
      headers: { "x-apikey": key },
      signal: AbortSignal.timeout(15_000),
    });
    if (res.status === 404) return { maliciousCount: 0, totalEngineCount: 0, fromCache: false };
    if (res.status === 429) {
      console.warn(`[/lib/security-scanner] VirusTotal rate limit hit for ${sha256}`);
      return null;
    }
    if (!res.ok) {
      console.warn(`[/lib/security-scanner] VirusTotal responded with status ${res.status}`);
      return null;
    }
    
    const json = (await res.json()) as {
      data?: {
        attributes?: {
          last_analysis_stats?: Record<string, number>;
        };
      };
    };
    const s = json?.data?.attributes?.last_analysis_stats;
    if (!s) return null;

    const statsValues = Object.values(s);
    const totalEngineCount = statsValues.reduce((acc, count) => acc + (typeof count === "number" ? count : 0), 0);
    
    const result = {
      maliciousCount: (s.malicious || 0) + (s.suspicious || 0),
      totalEngineCount,
      detailsUrl: `https://www.virustotal.com/gui/file/${sha256}`,
      fromCache: false
    };
    
    cache[sha256] = result;
    saveVTCache(cache);
    
    return result;
  } catch (err) {
    console.warn("[/lib/security-scanner] Network error during VirusTotal check:", err);
    return null;
  }
}

// ── Core Scanner ──────────────────────────────────────────────────────────────

export async function scanSecurity(filePath: string, localOnly = false): Promise<SecurityScanResult> {
  const stats = fs.statSync(filePath);
  const sha1 = crypto.createHash("sha1").update(fs.readFileSync(filePath)).digest("hex");
  const sha256 = crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
  const scannedAt = new Date().toISOString();

  // Verificación rápida contra firmas conocidas de malware (Fracturiser, Stealers, RATs)
  const knownThreat = checkKnownMalwareThreat(sha1, sha256);
  if (knownThreat) {
    return buildResult(
      100,
      [{
        category: "known_malware",
        severity: "critical",
        description: `🚨 Malware Confirmado: ${knownThreat.name}`,
        details: [
          knownThreat.description,
          `Firma / IOC coincidente: ${knownThreat.hash}`,
          `Referencia de seguridad: ${knownThreat.reference}`
        ],
        scoreImpact: 100
      }],
      sha1,
      scannedAt,
      sha256,
      null
    );
  }

  let meta; 
  try { 
    meta = scanMod(filePath); 
  } catch (metaErr) {
    meta = { modId: "" }; 
  }

  const isTrusted = isTrustedMod(meta.modId, path.basename(filePath));
  if (isTrusted) {
    return buildResult(
      0,
      [{ 
        category: "manifest_anomaly", 
        severity: "info", 
        description: `🛡️ Mod Confiable (${meta.modId || "Verificado"})`, 
        details: ["Popular y verificado por la comunidad."], 
        scoreImpact: 0 
      }],
      sha1,
      scannedAt,
      sha256,
      null,
      true
    );
  }

  const findings: SecurityFinding[] = [];
  const vt = localOnly ? null : await checkVirusTotalHash(sha256);
  if (vt) {
    if (vt.maliciousCount > 0) {
      findings.push({ 
        category: "known_malware", 
        severity: "critical", 
        description: `🚨 VirusTotal: ${vt.maliciousCount} detecciones`, 
        details: vt.detailsUrl ? [vt.detailsUrl] : [], 
        scoreImpact: Math.min(100, vt.maliciousCount * 30) 
      });
    } else if (vt.totalEngineCount > 0) {
      findings.push({ 
        category: "manifest_anomaly", 
        severity: "info", 
        description: `✅ VirusTotal Limpio (0/${vt.totalEngineCount})`,
        scoreImpact: 0 
      });
    }
  }

  try {
    const zip = new AdmZip(filePath);
    const entries = zip.getEntries();
    const findingsMap = new Map<string, SecurityFinding>();
    let classCount = 0, obfuscatedCount = 0;

    for (const entry of entries) {
      if (entry.entryName.endsWith(".class")) {
        classCount++;
        const sName = entry.entryName.split("/").pop() || "";
        if (OBFUSCATION_PATTERNS.obfuscatedClassName.test(sName)) obfuscatedCount++;
        
        const data = entry.getData().toString("binary");
        SUSPICIOUS_PATTERNS.forEach(p => {
          if (p?.pattern && p.pattern.test(data)) {
            const k = `${p.category}:${p.description}`;
            if (!findingsMap.has(k)) findingsMap.set(k, { ...p, scoreImpact: p.score, details: [entry.entryName] });
            else if (findingsMap.get(k)!.details!.length < 5) findingsMap.get(k)!.details!.push(entry.entryName);
          }
        });
      }
    }
    findings.push(...Array.from(findingsMap.values()));
    if (classCount > 5 && obfuscatedCount / classCount > 0.5) {
      findings.push({ category: "obfuscation", severity: "high", description: "Heavy obfuscation", scoreImpact: 20 });
    }
  } catch (zipErr: unknown) {
    const zipErrMsg = zipErr instanceof Error ? zipErr.message : String(zipErr);
    console.warn(`[/lib/security-scanner] AdmZip failed to inspect archive ${filePath}:`, zipErrMsg);
    findings.push({
      category: "manifest_anomaly",
      severity: "high",
      description: "⚠️ Archivo corrupto o no inspeccionable",
      details: ["El motor estático no pudo descomprimir o validar las clases Java del paquete."],
      scoreImpact: 25
    });
  }

  let score = findings.reduce((s, f) => s + f.scoreImpact, 0);
  if (score > 0 && score < 40 && vt?.maliciousCount === 0) score = Math.max(0, score - 15);
  
  return buildResult(score, findings, sha1, scannedAt, sha256, vt);
}

function buildResult(
  score: number,
  findings: SecurityFinding[],
  sha1: string,
  scannedAt: string,
  sha256: string,
  vt: SecurityScanResult["virusTotal"],
  whitelisted?: boolean
): SecurityScanResult {
  const level: SecurityScanResult["riskLevel"] = score <= 30 ? "clean" : score <= 60 ? "caution" : score <= 85 ? "suspicious" : "critical";
  const sevOrder = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
  return {
    riskScore: score,
    riskLevel: level,
    sha1, sha256, virusTotal: vt,
    findings: findings.sort((a, b) => sevOrder[b.severity] - sevOrder[a.severity]),
    summary: level === "clean" ? "File appears safe." : `${level.toUpperCase()}: ${findings.length} findings.`,
    scannedAt,
    scannedLocally: true,
    scannedVirusTotal: vt !== null,
    whitelisted
  };
}

/**
 * Performs security scans on multiple files in parallel with a concurrency limit.
 */
export async function scanSecurityBatch(filePaths: string[], localOnly = false): Promise<Record<string, SecurityScanResult>> {
  const results: Record<string, SecurityScanResult> = {};
  const limit = 5; // Scan 5 files at a time to not overwhelm CPU/Disk and VirusTotal
  
  for (let i = 0; i < filePaths.length; i += limit) {
    const chunk = filePaths.slice(i, i + limit);
    console.log(`[/lib/security-scanner] Scanning chunk ${Math.floor(i / limit) + 1}/${Math.ceil(filePaths.length / limit)} (${chunk.length} files)`);
    
    await Promise.all(chunk.map(async (path) => {
      try { 
        results[path] = await scanSecurity(path, localOnly); 
      } catch (err) {
        console.error(`[/lib/security-scanner] Error scanning ${path}:`, err);
        results[path] = buildResult(
          40,
          [{
            category: "manifest_anomaly",
            severity: "high",
            description: "⚠️ Error durante escaneo de seguridad",
            details: [err instanceof Error ? err.message : String(err)],
            scoreImpact: 40
          }],
          "",
          new Date().toISOString(),
          "",
          null,
          false
        );
      }
    }));
    
    // Si no es el último chunk, esperamos un segundo para no quemar la API de VT tan rápido
    if (i + limit < filePaths.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  return results;
}