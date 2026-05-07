/**
 * /api/modrinth/check-updates — POST
 * ─────────────────────────────────────────────────────────────────────────────
 * Compara una lista de mods instalados contra Modrinth para detectar actualizaciones.
 * Utiliza una caché local persistente con TTL de 12 horas para evitar spam a la API.
 *
 * Body: { mods: ModCheckInput[], loader: string, gameVersion: string, forceRefresh?: boolean }
 * Respuesta: { updates: Record<filePath, ModCheckResult> }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import * as fsSync from "fs";
import path from "path";
import { SOURCE_BASE } from "@/lib/constants";
import { smartCache } from "@/lib/smart-cache";
import { getApiKey } from "@/lib/settings";

const MODRINTH_API = "https://api.modrinth.com/v2";

/** Maximum number of mods to check in parallel per batch. */
const CONCURRENCY_LIMIT = 5;

/** Cache TTL: 12 Hours (in milliseconds) */
const TTL_MS = 12 * 60 * 60 * 1000;

// ── Types ─────────────────────────────────────────────────────────────────────

interface ModCheckInput {
  path: string;
  fileName: string;
  meta?: {
    modName?: string;
    modId?: string;
    modVersion?: string;
    projectType?: string;
    sha1?: string;
  };
}

interface ModCheckResult {
  path: string;
  status: "updated" | "update_available" | "unknown" | "error" | "updated_downloaded";
  latestVersion?: string;
  downloadUrl?: string;
  projectId?: string;
  slug?: string;
  changelog?: string;
  categories?: string[];
}

interface ModrinthHit {
  title: string;
  project_id: string;
  slug: string;
}

interface ModrinthVersionObj {
  version_number: string;
  changelog?: string;
  files?: { url: string, primary?: boolean }[];
}

// ── Persistent Remote Cache ───────────────────────────────────────────────────

const OLD_ROOT_REMOTE_CACHE_FILE = path.join(process.cwd(), "mim-remote-cache.json");
const OLD_INDEX_REMOTE_CACHE_FILE = path.join(process.cwd(), "mim-index", "remote-cache.json");
const REMOTE_CACHE_FILE = path.join(SOURCE_BASE, ".mim-index", "remote-cache.json");

// Migrate legacy file if it exists
if (!fsSync.existsSync(REMOTE_CACHE_FILE)) {
  try {
    fsSync.mkdirSync(path.dirname(REMOTE_CACHE_FILE), { recursive: true });
    if (fsSync.existsSync(OLD_INDEX_REMOTE_CACHE_FILE)) {
      fsSync.renameSync(OLD_INDEX_REMOTE_CACHE_FILE, REMOTE_CACHE_FILE);
      console.log("[updates-cache] Legacy remote cache successfully migrated from mim-index/ to SOURCE_BASE/.mim-index/");
    } else if (fsSync.existsSync(OLD_ROOT_REMOTE_CACHE_FILE)) {
      fsSync.renameSync(OLD_ROOT_REMOTE_CACHE_FILE, REMOTE_CACHE_FILE);
      console.log("[updates-cache] Legacy remote cache successfully migrated from root to SOURCE_BASE/.mim-index/");
    }
  } catch (e) {
    console.error("[updates-cache] Failed to migrate legacy remote cache:", e);
  }
}

let remoteCache: { version: number; entries: Record<string, { cachedAt: number; result: ModCheckResult }> } | null = null;
let saveRemoteTimeout: NodeJS.Timeout | null = null;

function loadRemoteCache() {
  if (remoteCache) return remoteCache;
  if (fsSync.existsSync(REMOTE_CACHE_FILE)) {
    try {
      remoteCache = JSON.parse(fsSync.readFileSync(REMOTE_CACHE_FILE, "utf-8"));
    } catch (e) {
      console.error("[updates-cache] Error loading remote cache file, resetting cache", e);
    }
  }
  if (!remoteCache || !remoteCache.entries) {
    remoteCache = { version: 1, entries: {} };
  }
  return remoteCache;
}

function queueSaveRemoteCache() {
  if (saveRemoteTimeout) return;
  saveRemoteTimeout = setTimeout(() => {
    saveRemoteTimeout = null;
    if (remoteCache) {
      try {
        fsSync.mkdirSync(path.dirname(REMOTE_CACHE_FILE), { recursive: true });
        fsSync.writeFileSync(REMOTE_CACHE_FILE, JSON.stringify(remoteCache, null, 2), "utf-8");
      } catch (e) {
        console.error("[updates-cache] Error writing remote cache to disk", e);
      }
    }
  }, 1000);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function chunkArray<T>(arr: T[], n: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += n) chunks.push(arr.slice(i, i + n));
  return chunks;
}

/**
 * Normaliza un string de versión para comparar solo los números significativos.
 * Elimina v, mcX.Y.Z, -fabric, -forge, etc.
 */
function normalizeVersion(v: string): string {
  if (!v) return "";
  // 1. Minúsculas y quitar prefijo 'v'
  let clean = v.toLowerCase().replace(/^v/, "");

  // 2. Quitar metadatos de loader y estados (fabric, forge, snapshot, etc.)
  clean = clean.replace(/[-+](fabric|forge|neoforge|quilt|snapshot|alpha|beta|dev|local|all)/gi, "");
  
  // 3. Quitar versiones de Minecraft incrustadas (mc1.21.1, 1.21, etc.)
  clean = clean.replace(/[-+](mc)?1\.(1[6-9]|2\d)(\.\d+)?/gi, "");
  
  // 4. Estandarizar separadores a puntos y quitar todo lo que no sea número o punto
  clean = clean.replace(/[_-]/g, ".").replace(/[^0-9.]/g, "");
  
  // 5. Limpiar puntos extra
  clean = clean.replace(/^\.+|\.+$/g, "").replace(/\.{2,}/g, ".");
  
  return clean;
}

/**
 * Compara si la versión 'latest' es realmente superior a 'current'.
 */
function hasRealUpdate(latest: string, current: string): boolean {
  const nL = normalizeVersion(latest);
  const nC = normalizeVersion(current);

  if (!nL || !nC) return latest !== current;
  if (nL === nC) return false;

  // Comparación numérica por componentes
  const pL = nL.split(".").map(Number);
  const pC = nC.split(".").map(Number);

  for (let i = 0; i < Math.max(pL.length, pC.length); i++) {
    const vL = pL[i] || 0;
    const vC = pC[i] || 0;
    if (vL > vC) return true;
    if (vL < vC) return false;
  }

  return false;
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { mods, loader, gameVersion, forceRefresh = false } = await req.json();

    // ── Validate ───────────────────────────────────────────────────────────────
    if (!mods || !Array.isArray(mods) || mods.length === 0) {
      return NextResponse.json(
        { error: "Missing or empty mods array" },
        { status: 400 }
      );
    }
    if (!loader || !gameVersion) {
      return NextResponse.json(
        { error: "Missing required fields: loader, gameVersion" },
        { status: 400 }
      );
    }

    // ── Load Cache and Filter Mods ─────────────────────────────────────────────
    const cache = loadRemoteCache();
    const now = Date.now();

    const cachedResults: ModCheckResult[] = [];
    const modsToCheck: ModCheckInput[] = [];

    for (const mod of mods) {
      const cacheKey = `${mod.meta?.sha1 || mod.path}-${loader}-${gameVersion}`;
      const cached = cache.entries[cacheKey];

      if (!forceRefresh && cached && (now - cached.cachedAt < TTL_MS)) {
        // Cache hit! Use cached results (update the file path to match current value)
        cachedResults.push({ ...cached.result, path: mod.path });
      } else {
        // Cache miss or force refreshed: check remote
        modsToCheck.push(mod);
      }
    }

    // If everything is cached, return immediately! Saves bandwidth, time, and CPU.
    if (modsToCheck.length === 0) {
      const updatesByPath: Record<string, ModCheckResult> = {};
      for (const result of cachedResults) {
        updatesByPath[result.path] = result;
      }
      return NextResponse.json({ updates: updatesByPath, cachedCount: cachedResults.length });
    }

    // ── Build request headers ──────────────────────────────────────────────────
    const headers: Record<string, string> = {
      "User-Agent": "MIM-App/1.0 (contact@mim.local)",
    };
    const apiKey = getApiKey("modrinth");
    if (apiKey) {
      headers["Authorization"] = apiKey;
    }

    // ── Bulk Hash Resolution for Uncached Mods ─────────────────────────────────
    const hashToProject: Record<string, string> = {};
    const validHashes = modsToCheck.map(m => m.meta?.sha1).filter(Boolean) as string[];
    
    if (validHashes.length > 0) {
      try {
        const hashRes = await fetch(`${MODRINTH_API}/version_files`, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ hashes: validHashes, algorithm: "sha1" })
        });
        if (hashRes.ok) {
          const hashData = await hashRes.json();
          for (const [hash, versionObj] of Object.entries(hashData)) {
            if ((versionObj as any).project_id) {
              hashToProject[hash] = (versionObj as any).project_id;
            }
          }
        }
      } catch (err) {
        console.error("[/api/modrinth/check-updates] Bulk hash resolution failed:", err);
      }
    }

    // ── Per-mod check for Uncached Mods ────────────────────────────────────────
    const checkMod = async (mod: ModCheckInput): Promise<ModCheckResult> => {
      const nameToSearch =
        mod.meta?.modName && mod.meta.modName !== "unknown"
          ? mod.meta.modName
          : mod.fileName.replace(".jar", "");

      const currentVersion = mod.meta?.modVersion ?? "0.0.0";

      try {
        let projectId: string | null = null;

        // Step 1 — Direct lookup by SHA1 hash
        if (mod.meta?.sha1 && hashToProject[mod.meta.sha1]) {
          projectId = hashToProject[mod.meta.sha1];
        }

        let slug: string | null = null;

        // Step 2 — Direct lookup by modId
        if (!projectId && mod.meta?.modId && mod.meta.modId !== "unknown") {
          const res = await fetch(
            `${MODRINTH_API}/project/${encodeURIComponent(mod.meta.modId)}`,
            { headers }
          );
          if (res.ok) {
            const data = await res.json();
            projectId = data.id;
            slug = data.slug;
          }
        }

        // Step 3 — Fallback: name-based search
        if (!projectId) {
          const projectType = mod.meta?.projectType && mod.meta.projectType !== "unknown" 
            ? mod.meta.projectType 
            : "mod";
            
          const facets: string[][] = [
            [`versions:${gameVersion}`],
            [`project_type:${projectType}`]
          ];
          
          if (projectType === "mod") {
            facets.push([`categories:${loader}`]);
          }

          const res = await fetch(
            `${MODRINTH_API}/search` +
              `?query=${encodeURIComponent(nameToSearch)}` +
              `&facets=${encodeURIComponent(JSON.stringify(facets))}&limit=3`,
            { headers }
          );
          if (res.ok) {
            const data = await res.json();
            if (data.hits?.length > 0) {
              const hit = (data.hits as ModrinthHit[]).find(
                (h) => 
                  h.title.toLowerCase() === nameToSearch.toLowerCase() ||
                  h.slug.toLowerCase() === nameToSearch.toLowerCase()
              );
              if (hit) {
                projectId = hit.project_id;
                slug = hit.slug;
              }
            }
          }
        }

        if (!projectId) {
          const result: ModCheckResult = { path: mod.path, status: "unknown" };
          const cacheKey = `${mod.meta?.sha1 || mod.path}-${loader}-${gameVersion}`;
          cache.entries[cacheKey] = { cachedAt: now, result };
          queueSaveRemoteCache();
          return result;
        }

        // Step 4 — Fetch version list
        const projectType = mod.meta?.projectType && mod.meta.projectType !== "unknown" ? mod.meta.projectType : "mod";
        const loadersParam = projectType === "mod" ? `&loaders=${encodeURIComponent(JSON.stringify([loader]))}` : "";
        const versionsRes = await fetch(
          `${MODRINTH_API}/project/${projectId}/version` +
            `?game_versions=${encodeURIComponent(JSON.stringify([gameVersion]))}${loadersParam}`,
          { headers }
        );
        if (!versionsRes.ok) return { path: mod.path, status: "error" };

        const versions = (await versionsRes.json()) as ModrinthVersionObj[];
        if (!Array.isArray(versions) || versions.length === 0) {
          const result: ModCheckResult = { path: mod.path, status: "unknown" };
          const cacheKey = `${mod.meta?.sha1 || mod.path}-${loader}-${gameVersion}`;
          cache.entries[cacheKey] = { cachedAt: now, result };
          queueSaveRemoteCache();
          return result;
        }

        const latest = versions[0];
        const latestVersion = latest.version_number;

        // Use the new robust comparison logic
        const hasUpdate = hasRealUpdate(latestVersion, currentVersion);

        const primaryFile = latest.files?.find(f => f.primary) || latest.files?.[0];
        const status = hasUpdate ? "update_available" : "updated";

        const result: ModCheckResult = {
          path: mod.path,
          status,
          latestVersion,
          downloadUrl: primaryFile?.url,
          projectId,
          slug: slug || projectId,
          changelog: latest.changelog || "No hay información de cambios disponible.",
        };

        // Cache the parsed result
        const cacheKey = `${mod.meta?.sha1 || mod.path}-${loader}-${gameVersion}`;
        cache.entries[cacheKey] = { cachedAt: now, result };
        queueSaveRemoteCache();

        return result;
      } catch {
        return { path: mod.path, status: "error" };
      }
    };

    // ── Throttled Execution for Uncached Mods ──────────────────────────────────
    const freshResults: ModCheckResult[] = [];
    for (const batch of chunkArray(modsToCheck, CONCURRENCY_LIMIT)) {
      const batchResults = await Promise.all(batch.map(checkMod));
      freshResults.push(...batchResults);
    }

    // Combine cached and fresh results
    const allResults = [...cachedResults, ...freshResults];

    // ── Bulk Project Enrichment (Categories) ───────────────────────────────────
    const projectIdsToEnrich = [...new Set(allResults.map(r => r.projectId).filter(Boolean))] as string[];
    const categoryMap: Record<string, string[]> = {};

    if (projectIdsToEnrich.length > 0) {
      try {
        const projectsRes = await fetch(`${MODRINTH_API}/projects?ids=${JSON.stringify(projectIdsToEnrich)}`, { headers });
        if (projectsRes.ok) {
          const projectsData = await projectsRes.json();
          for (const p of projectsData) {
            categoryMap[p.id] = p.categories || [];
          }
        }
      } catch (err) {
        console.error("[/api/modrinth/check-updates] Bulk project lookup failed:", err);
      }
    }

    // Convert to map and attach categories
    const updatesByPath: Record<string, ModCheckResult> = {};
    for (const result of allResults) {
      if (result.projectId && categoryMap[result.projectId]) {
        result.categories = categoryMap[result.projectId];
      }
      updatesByPath[result.path] = result;
    }

    return NextResponse.json({ 
      updates: updatesByPath, 
      cachedCount: cachedResults.length, 
      freshCount: freshResults.length 
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[/api/modrinth/check-updates] Unhandled error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}