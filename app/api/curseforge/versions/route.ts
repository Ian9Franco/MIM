/**
 * /api/curseforge/versions — GET
 * ─────────────────────────────────────────────────────────────────────────────
 * Obtiene las versiones de un proyecto en CurseForge filtradas por juego y loader.
 */

import { NextRequest, NextResponse } from "next/server";
import { getRawEnv } from "@/lib/env";

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
  const apiKey = getRawEnv("CURSEFORGE_API_KEY") || "";

  if (!projectId) {
    return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
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

    // Mapear al formato VersionEntry unificado
    const versions = (data.data || []).map((v: any) => ({
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
        dependencyType: d.relationType === 3 ? "required" : "optional",
      })),
    }));

    // Filtrar por versión y loader si se proveen
    let filtered = versions;
    if (gameVersion) {
      filtered = filtered.filter((v: any) => v.gameVersions.includes(gameVersion));
    }
    if (cfLoaderId) {
      const loaderName = Object.keys(LOADER_TO_CF_ID).find(k => LOADER_TO_CF_ID[k] === cfLoaderId);
      if (loaderName) {
        filtered = filtered.filter((v: any) => 
          v.gameVersions.some((gv: string) => gv.toLowerCase() === loaderName.toLowerCase())
        );
      }
    }

    return NextResponse.json({ versions: filtered });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[/api/curseforge/versions] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
