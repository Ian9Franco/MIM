/**
 * MIM — Security Scanner (Threat Detection Engine)
 * Optimized for v5.9: Constants extracted to security-data.ts
 */

import AdmZip from "adm-zip";
import fs from "fs";
import crypto from "crypto";
import path from "path";
import { getApiKey } from "./settings";
import { scanMod } from "./scanner";
import { SUSPICIOUS_PATTERNS, OBFUSCATION_PATTERNS, KNOWN_MALWARE_HASHES, TRUSTED_MODS } from "./security-data";
import type { SecurityScanResult, SecurityFinding, ThreatCategory } from "./types";

// ── Whitelist & Verification ──────────────────────────────────────────────────

function getWhitelistedMods(): Set<string> {
  const modsSet = new Set<string>(TRUSTED_MODS.map(m => m.toLowerCase()));
  try {
    const { getPortableDir } = require("./settings");
    const portableDir = getPortableDir();
    if (portableDir) {
      const pFile = path.join(portableDir, "data", "whitelist.json");
      if (fs.existsSync(pFile)) {
        const custom = JSON.parse(fs.readFileSync(pFile, "utf-8"));
        if (Array.isArray(custom)) custom.forEach(m => modsSet.add(String(m).toLowerCase().trim()));
      }
    }
  } catch {}
  return modsSet;
}

function isTrustedMod(modId: string, filename: string): boolean {
  const ws = getWhitelistedMods();
  if (ws.has(modId.toLowerCase())) return true;
  const fn = filename.toLowerCase();
  for (const t of ws) if (fn.includes(t)) return true;
  return false;
}

// ── Cloud API & Cache ──────────────────────────────────────────────────────────────
const CACHE_FILE = path.join(path.dirname(path.dirname(__filename)), ".mim-index", "cache", "vt-cache.json");

function loadVTCache(): Record<string, any> {
  if (fs.existsSync(CACHE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
    } catch { return {}; }
  }
  return {};
}

function saveVTCache(cache: Record<string, any>) {
  try {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
  } catch (e) {
    console.warn("[/lib/security-scanner] Could not save VT cache:", e);
  }
}

async function checkVirusTotalHash(sha256: string): Promise<SecurityScanResult["virusTotal"]> {
  const cache = loadVTCache();
  if (cache[sha256]) {
    return { ...cache[sha256], fromCache: true };
  }

  const key = getApiKey("virustotal");
  if (!key || key.length < 16) return null;
  
  try {
    const res = await fetch(`https://www.virustotal.com/api/v3/files/${sha256}`, { headers: { "x-apikey": key } });
    if (res.status === 404) return { maliciousCount: 0, totalEngineCount: 0, fromCache: false };
    if (res.status === 429) {
      console.warn(`[/lib/security-scanner] VirusTotal rate limit hit for ${sha256}`);
      return null;
    }
    if (!res.ok) return null;
    
    const json = await res.json();
    const s = json?.data?.attributes?.last_analysis_stats;
    if (!s) return null;
    
    const result = {
      maliciousCount: (s.malicious || 0) + (s.suspicious || 0),
      totalEngineCount: Object.values(s).reduce((a: any, b: any) => a + b, 0) as number,
      detailsUrl: `https://www.virustotal.com/gui/file/${sha256}`,
      fromCache: false
    };
    
    cache[sha256] = result;
    saveVTCache(cache);
    
    return result;
  } catch { return null; }
}

// ── Core Scanner ──────────────────────────────────────────────────────────────

export async function scanSecurity(filePath: string, localOnly = false): Promise<SecurityScanResult> {
  const stats = fs.statSync(filePath);
  const sha1 = crypto.createHash("sha1").update(fs.readFileSync(filePath)).digest("hex");
  const sha256 = crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
  const scannedAt = new Date().toISOString();

  if (KNOWN_MALWARE_HASHES.has(sha1)) return buildResult(100, [{ category: "known_malware", severity: "critical", description: "Blacklisted hash", scoreImpact: 100 }], sha1, scannedAt, sha256, null);

  let meta; try { meta = scanMod(filePath); } catch { meta = { modId: "" }; }
  const isTrusted = isTrustedMod(meta.modId, path.basename(filePath));
  if (isTrusted) return buildResult(0, [{ category: "manifest_anomaly", severity: "info", description: `🛡️ Mod Confiable (${meta.modId || "Verificado"})`, details: ["Popular y verificado por la comunidad."], scoreImpact: 0 }], sha1, scannedAt, sha256, null, true);

  const findings: SecurityFinding[] = [];
  const vt = localOnly ? null : await checkVirusTotalHash(sha256);
  if (vt) {
    if (vt.maliciousCount > 0) findings.push({ category: "known_malware", severity: "critical", description: `🚨 VirusTotal: ${vt.maliciousCount} detecciones`, details: vt.detailsUrl ? [vt.detailsUrl] : [], scoreImpact: Math.min(100, vt.maliciousCount * 30) });
    else if (vt.totalEngineCount > 0) findings.push({ category: "manifest_anomaly", severity: "info", description: `✅ VirusTotal Limpio (0/${vt.totalEngineCount})`, scoreImpact: 0 });
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
    if (classCount > 5 && obfuscatedCount / classCount > 0.5) findings.push({ category: "obfuscation", severity: "high", description: "Heavy obfuscation", scoreImpact: 20 });
  } catch {}

  let score = findings.reduce((s, f) => s + f.scoreImpact, 0);
  if (score > 0 && score < 40 && vt?.maliciousCount === 0) score = Math.max(0, score - 15);
  
  return buildResult(score, findings, sha1, scannedAt, sha256, vt);
}

function buildResult(score: number, findings: SecurityFinding[], sha1: string, scannedAt: string, sha256: string, vt: any, whitelisted?: boolean): SecurityScanResult {
  const level = score <= 30 ? "clean" : score <= 60 ? "caution" : score <= 85 ? "suspicious" : "critical";
  const sevOrder = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
  return {
    riskScore: score,
    riskLevel: level as any,
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
      }
    }));
    
    // Si no es el último chunk, esperamos un segundo para no quemar la API de VT tan rápido
    if (i + limit < filePaths.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  return results;
}
