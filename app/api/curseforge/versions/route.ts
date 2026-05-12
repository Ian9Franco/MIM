/**
 * /api/curseforge/versions — GET
 * ─────────────────────────────────────────────────────────────────────────────
 * Obtiene las versiones de un proyecto en CurseForge filtradas por juego y loader.
 */

import { NextRequest, NextResponse } from "next/server";
import { getRawEnv } from "@/lib/env";
import { getApiKey, getPortableDir } from "@/lib/settings";
import path from "path";
import fs from "fs";
import AdmZip from "adm-zip";

const CACHE_FILE = path.join(getPortableDir(), "fomo_modpack_dependencies_cache.json");

function getModpackCache(): Record<string, any[]> {
  if (fs.existsSync(CACHE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
    } catch (e) {
      return {};
    }
  }
  return {};
}

function saveModpackCache(cache: Record<string, any[]>) {
  try {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to save modpack cache:", e);
  }
}

async function fetchModpackDependencies(projectId: string, fileId: string, fileName: string): Promise<any[]> {
  const cache = getModpackCache();
  const cacheKey = `${projectId}_${fileId}`;
  if (cache[cacheKey]) {
    return cache[cacheKey];
  }

  console.log(`[ModpackParser] Cache miss for ${cacheKey}. Reconstructing Edge CDN download URL...`);
  const fileIdNum = Number(fileId);
  const prefix = Math.floor(fileIdNum / 1000);
  const suffix = fileIdNum % 1000;
  const url = `https://edge.forgecdn.net/files/${prefix}/${suffix}/${encodeURIComponent(fileName)}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to download modpack ZIP from Edge CDN: ${res.statusText}`);
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    const zip = new AdmZip(buffer);
    const manifestEntry = zip.getEntry("manifest.json");
    if (!manifestEntry) {
      throw new Error("manifest.json not found in modpack ZIP");
    }
    const manifestText = manifestEntry.getData().toString("utf-8");
    const manifest = JSON.parse(manifestText);
    const files = manifest.files || [];

    const dependencies = files.map((f: any) => ({
      projectId: String(f.projectID),
      dependencyType: "embedded",
    }));

    cache[cacheKey] = dependencies;
    saveModpackCache(cache);
    console.log(`[ModpackParser] Successfully parsed ${dependencies.length} dependencies for modpack ${cacheKey}`);
    return dependencies;
  } catch (err) {
    console.error(`[ModpackParser] Error parsing modpack ${cacheKey}:`, err);
    return [];
  }
}

const CURSEFORGE_API = "https://api.curseforge.com/v1";

const LOADER_TO_CF_ID: Record<string, number> = {
  forge: 1,
  fabric: 4,
  neoforge: 6,
  quilt: 5,
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const gameVersion = searchParams.get("gameVersion");
  const loader = searchParams.get("loader") ?? "forge";
  // Carga Manual (Bypass Next.js)
  const apiKey = getApiKey("curseforge");

  if (!projectId) {
    return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
  }

  // CurseForge IDs are strictly numeric. If a non-numeric ID is passed, return empty versions list gracefully
  if (!/^\d+$/.test(projectId)) {
    return NextResponse.json({ versions: [] });
  }

  if (!apiKey) {
    return NextResponse.json({ error: "CURSEFORGE_API_KEY not set" }, { status: 503 });
  }

  const headers = {
    "x-api-key": apiKey,
    "Accept": "application/json",
  };

  try {
    const res = await fetch(`${CURSEFORGE_API}/mods/${projectId}/files`, { headers });
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch versions" }, { status: 500 });
    }
    const data = await res.json();
    const cfLoaderId = LOADER_TO_CF_ID[loader];

    const projectType = searchParams.get("projectType") ?? "mod";

    // Mapear al formato VersionEntry unificado
    let versions = (data.data || []).map((v: any) => ({
      id: String(v.id),
      versionNumber: v.displayName,
      name: v.fileName,
      versionType: v.releaseType === 1 ? "release" : v.releaseType === 2 ? "beta" : "alpha",
      gameVersions: v.gameVersions,
      loaders: v.gameVersions.filter((gv: string) => ["Forge", "Fabric", "NeoForge", "Quilt"].includes(gv)),
      datePublished: v.fileDate,
      downloads: v.downloadCount || 0,
      primaryFile: {
        url: v.downloadUrl,
        filename: v.fileName,
        primary: true,
        size: v.fileLength,
        hashes: v.hashes?.reduce((acc: any, h: any) => ({ ...acc, [h.algo === 1 ? "sha1" : "md5"]: h.value }), {}),
      },
      dependencies: (v.dependencies || []).map((d: any) => ({
        projectId: String(d.modId),
        dependencyType: d.relationType === 3 ? "required" : 
                       (d.relationType === 1 || d.relationType === 6) ? "embedded" : 
                       d.relationType === 5 ? "incompatible" : "optional",
      })),
    }));

    // Filtrar por versión y loader si se proveen
    let filtered = versions;
    if (gameVersion) {
      filtered = filtered.filter((v: any) => v.gameVersions.includes(gameVersion));
    }
    
    // El filtro de loader solo aplica para mods
    if (cfLoaderId && projectType === "mod") {
      const loaderName = Object.keys(LOADER_TO_CF_ID).find(k => LOADER_TO_CF_ID[k] === cfLoaderId);
      if (loaderName) {
        filtered = filtered.filter((v: any) => 
          v.gameVersions.some((gv: string) => gv.toLowerCase() === loaderName.toLowerCase())
        );
      }
    }

    // Si es un modpack en CurseForge, resolvemos dinámicamente sus dependencias desde el manifest.json interno
    if (projectType === "modpack") {
      const cache = getModpackCache();
      let missCount = 0;
      for (const v of filtered) {
        const cacheKey = `${projectId}_${v.id}`;
        const isCached = !!cache[cacheKey];
        // Parsear si ya está en caché, o si es la primera versión (para limitar a un solo cache-miss/descarga por llamada de API)
        if (isCached || missCount < 1) {
          if (!isCached) missCount++;
          const parsedDeps = await fetchModpackDependencies(projectId, v.id, v.name);
          if (parsedDeps.length > 0) {
            v.dependencies = parsedDeps.map((d: any) => ({
              projectId: d.projectId,
              dependencyType: d.dependencyType,
            }));
          }
        }
      }
    }

    // Resolver nombres de dependencias
    const depIds = new Set<number>();
    filtered.forEach((v: any) => {
      v.dependencies?.forEach((d: any) => { depIds.add(Number(d.projectId)); });
    });

    const projectMeta: Record<string, { title: string; url: string }> = {};
    const depIdsArray = Array.from(depIds);
    if (depIdsArray.length > 0) {
      try {
        const idsToFetch = depIdsArray.slice(0, 400); // Batch de hasta 400
        const pRes = await fetch(`${CURSEFORGE_API}/mods`, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ modIds: idsToFetch }),
          cache: "no-store"
        });
        if (pRes.ok) {
          const pData = await pRes.json();
          (pData.data || []).forEach((p: any) => {
            projectMeta[p.id.toString()] = { title: p.name, url: p.links?.websiteUrl };
          });
        }
      } catch (e) {
        console.error("Error fetching CF dependency info", e);
      }
    }

    // Aplicar títulos y urls
    filtered.forEach((v: any) => {
      v.dependencies.forEach((d: any) => {
        const meta = projectMeta[d.projectId];
        if (meta) {
          d.title = meta.title;
          d.url = meta.url;
        } else {
          d.title = d.projectId;
        }
      });
    });

    // Priorizar ZIPs y entradas que coincidan con el tipo para datapacks/resourcepacks
    if (projectType === "datapack" || projectType === "resourcepack") {
      const matching = filtered.filter((v: any) => {
        const nameMatch = v.name?.toLowerCase().includes(projectType) || v.versionNumber?.toLowerCase().includes(projectType);
        const fileMatch = v.primaryFile.filename.toLowerCase().endsWith(".zip");
        const loaderMatch = v.gameVersions.some((gv: string) => gv.toLowerCase() === projectType.toLowerCase());
        return nameMatch || fileMatch || loaderMatch;
      });
      if (matching.length > 0) filtered = matching;
    }

    return NextResponse.json({ versions: filtered });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[/api/curseforge/versions] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
