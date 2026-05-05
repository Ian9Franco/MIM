/**
 * /api/modrinth/check-updates — POST
 * ─────────────────────────────────────────────────────────────────────────────
 * Checks a list of installed mods against Modrinth for available updates.
 *
 * Body: { mods: ModCheckInput[], loader: string, gameVersion: string }
 *
 * Strategy per mod:
 *   1. Direct project lookup by modId (fast, most accurate).
 *   2. Name-based search with loader+version facets as fallback.
 *   3. Version list fetch → compare installed vs latest.
 *
 * Changes from original:
 *   - CRITICAL BUG FIX: Promise.all(mods.map(...)) executed all requests in
 *     parallel with no limit. With 50+ mods this produces 50+ simultaneous
 *     requests, triggering Modrinth rate limiting (HTTP 429).
 *     Fixed with chunkArray() + sequential batch processing (CONCURRENCY_LIMIT = 5).
 *   - loader and gameVersion validated before processing mods.
 *   - `any` replaced with explicit ModCheckInput / ModCheckResult interfaces.
 *   - searchData.hits.find() type-annotated correctly.
 *   - latestVersionObj.files guarded with optional chaining.
 *   - Structured console.error with route prefix on catch.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";

const MODRINTH_API = "https://api.modrinth.com/v2";

/**
 * Maximum number of mods to check in parallel per batch.
 * Modrinth's documented rate limit is 300 req/min (~5 req/s).
 * Keeping batches small ensures we stay well within that budget.
 */
const CONCURRENCY_LIMIT = 5;

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
  status: "updated" | "update_available" | "unknown" | "error";
  latestVersion?: string;
  downloadUrl?: string;
  projectId?: string;
}

interface ModrinthHit {
  title: string;
  project_id: string;
  slug: string;
}

interface ModrinthVersionObj {
  version_number: string;
  files?: { url: string, primary?: boolean }[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Splits an array into sequential chunks of size n. */
function chunkArray<T>(arr: T[], n: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += n) chunks.push(arr.slice(i, i + n));
  return chunks;
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { mods, loader, gameVersion } = await req.json();

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

    // ── Build request headers ──────────────────────────────────────────────────
    const headers: Record<string, string> = {
      // Modrinth requires a descriptive User-Agent; anonymous requests are lower priority
      "User-Agent": "MIM-App/1.0 (contact@mim.local)",
    };
    if (process.env.MODRINTH_API_KEY) {
      // API key grants higher rate limits — set MODRINTH_API_KEY in .env.local
      headers["Authorization"] = process.env.MODRINTH_API_KEY;
    }

    // ── Bulk Hash Resolution ───────────────────────────────────────────────────
    // If the backend provided SHA1 hashes, we resolve them all in a single request.
    const hashToProject: Record<string, string> = {};
    const validHashes = mods.map(m => m.meta?.sha1).filter(Boolean) as string[];
    
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

    // ── Per-mod check ──────────────────────────────────────────────────────────
    const checkMod = async (mod: ModCheckInput): Promise<ModCheckResult> => {
      // Prefer modName from metadata; fall back to stripping ".jar" from filename
      const nameToSearch =
        mod.meta?.modName && mod.meta.modName !== "unknown"
          ? mod.meta.modName
          : mod.fileName.replace(".jar", "");

      const currentVersion = mod.meta?.modVersion ?? "0.0.0";

      try {
        let projectId: string | null = null;

        // Step 1 — Direct lookup by SHA1 hash (Absolute precision)
        if (mod.meta?.sha1 && hashToProject[mod.meta.sha1]) {
          projectId = hashToProject[mod.meta.sha1];
        }

        // Step 2 — Direct lookup by modId (Fast, no search ambiguity)
        if (!projectId && mod.meta?.modId && mod.meta.modId !== "unknown") {
          const res = await fetch(
            `${MODRINTH_API}/project/${encodeURIComponent(mod.meta.modId)}`,
            { headers }
          );
          if (res.ok) {
            const data = await res.json();
            projectId = data.id;
          }
        }

        // Step 3 — Fallback: name-based search filtered by game version and type
        if (!projectId) {
          const projectType = mod.meta?.projectType && mod.meta.projectType !== "unknown" 
            ? mod.meta.projectType 
            : "mod";
            
          const facets: string[][] = [
            [`versions:${gameVersion}`],
            [`project_type:${projectType}`]
          ];
          
          // Only enforce the modloader if it's a mod. Resourcepacks/shaders often don't tag a loader.
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
              // Strictly look for exact title match OR slug match.
              // This prevents "Primal" matching "Primal Winter" just because it's the first result.
              const hit = (data.hits as ModrinthHit[]).find(
                (h) => 
                  h.title.toLowerCase() === nameToSearch.toLowerCase() ||
                  h.slug.toLowerCase() === nameToSearch.toLowerCase()
              );
              if (hit) projectId = hit.project_id;
            }
          }
        }

        if (!projectId) return { path: mod.path, status: "unknown" };

        // Step 3 — Fetch version list filtered by game version (and loader if it's a mod)
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
          return { path: mod.path, status: "unknown" };
        }

        // Modrinth returns versions newest-first — index 0 is the latest release
        const latest = versions[0];
        const latestVersion = latest.version_number;

        // Update is available when the strings differ AND the current version
        // doesn't already contain the latest string (handles suffixes like "+build.1")
        const hasUpdate =
          latestVersion !== currentVersion &&
          !currentVersion.includes(latestVersion);

        if (hasUpdate) {
          const primaryFile = latest.files?.find(f => f.primary) || latest.files?.[0];
          return {
            path: mod.path,
            status: "update_available",
            latestVersion,
            downloadUrl: primaryFile?.url,
            projectId,
          };
        }

        return { path: mod.path, status: "updated" };
      } catch {
        return { path: mod.path, status: "error" };
      }
    };

    // ── Throttled execution — process in batches of CONCURRENCY_LIMIT ──────────
    // Running all mods in parallel (Promise.all) would flood Modrinth with 50+
    // simultaneous requests and trigger rate limiting. Batching keeps us safe.
    const allResults: ModCheckResult[] = [];
    for (const batch of chunkArray(mods as ModCheckInput[], CONCURRENCY_LIMIT)) {
      const batchResults = await Promise.all(batch.map(checkMod));
      allResults.push(...batchResults);
    }

    // Convert to a map keyed by file path for O(1) frontend lookups
    const updatesByPath: Record<string, ModCheckResult> = {};
    for (const result of allResults) {
      updatesByPath[result.path] = result;
    }

    return NextResponse.json({ updates: updatesByPath });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[/api/modrinth/check-updates] Unhandled error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}