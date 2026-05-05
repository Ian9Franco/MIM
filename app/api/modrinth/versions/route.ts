/**
 * /api/modrinth/versions — GET
 * ─────────────────────────────────────────────────────────────────────────────
 * Devuelve la lista de versiones disponibles de un proyecto en Modrinth.
 * Usado por el selector manual de versiones antes de descargar un archivo.
 * Especialmente útil para Datapacks y assets con versiones ambiguas.
 *
 * Parámetros de query:
 *   projectId   — ID o slug del proyecto en Modrinth (requerido)
 *   gameVersion — Filtrar por versión de juego, ej: "1.20.1" (opcional)
 *   loader      — Filtrar por loader, ej: "forge" (opcional)
 *   projectType — "mod" | "resourcepack" | "shader" | "datapack" (opcional)
 *                 Si es distinto de "mod", no se aplica el filtro de loader.
 *
 * Respuesta:
 *   { versions: VersionEntry[] }
 *
 * Notas de diseño:
 *   - Sin filtros, devuelve TODAS las versiones (útil para el selector completo).
 *   - Con filtros, reduce la lista al subconjunto compatible.
 *   - El cliente puede mostrar la lista y dejar que el usuario elija qué bajar.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const MODRINTH_API = "https://api.modrinth.com/v2";

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface VersionFile {
  url: string;
  filename: string;
  primary: boolean;
  size: number;
  hashes: Record<string, string>;
}

interface VersionEntry {
  id: string;
  versionNumber: string;
  name: string;
  versionType: "release" | "beta" | "alpha";
  gameVersions: string[];
  loaders: string[];
  datePublished: string;
  downloads: number;
  primaryFile: VersionFile | null;
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId   = searchParams.get("projectId");
  const gameVersion = searchParams.get("gameVersion");
  const loader      = searchParams.get("loader");
  const projectType = searchParams.get("projectType") ?? "mod";

  if (!projectId) {
    return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
  }

  const headers: Record<string, string> = { "User-Agent": "MIM-App/1.0 (contact@mim.local)" };
  if (process.env.MODRINTH_API_KEY) headers["Authorization"] = process.env.MODRINTH_API_KEY;

  try {
    // 1. Fetch versions with filters
    const params = new URLSearchParams();
    if (gameVersion) params.set("game_versions", JSON.stringify([gameVersion]));
    if (loader && projectType === "mod") params.set("loaders", JSON.stringify([loader]));

    let url = `${MODRINTH_API}/project/${encodeURIComponent(projectId)}/version?${params.toString()}`;
    let res = await fetch(url, { headers, cache: "no-store" });
    let rawVersions = await res.json();

    // 2. If no versions found with strict filters, fetch ALL versions to show them as "other"
    if (Array.isArray(rawVersions) && rawVersions.length === 0 && (gameVersion || loader)) {
      url = `${MODRINTH_API}/project/${encodeURIComponent(projectId)}/version`;
      res = await fetch(url, { headers, cache: "no-store" });
      rawVersions = await res.json();
    }

    if (!Array.isArray(rawVersions)) return NextResponse.json({ versions: [] });

    // 3. Collect all dependency IDs to resolve them in one batch
    const depIds = new Set<string>();
    rawVersions.forEach((v: any) => {
      v.dependencies?.forEach((d: any) => { if (d.project_id) depIds.add(d.project_id); });
    });

    const projectMeta: Record<string, { title: string; slug: string; iconUrl: string | null; projectType: string }> = {};
    if (depIds.size > 0) {
      try {
        const pRes = await fetch(`${MODRINTH_API}/projects?ids=${JSON.stringify(Array.from(depIds))}`, { headers, cache: "no-store" });
        if (pRes.ok) {
          const pData = await pRes.json();
          pData.forEach((p: any) => {
            projectMeta[p.id] = {
              title: p.title ?? p.id,
              slug: p.slug ?? p.id,
              iconUrl: p.icon_url ?? null,
              projectType: p.project_type ?? "mod",
            };
          });
        }
      } catch (e) { console.error("Error resolving dependencies:", e); }
    }

    // 4. Map versions
    const versions = rawVersions.map((v: any) => {
      const primaryFile = v.files?.find((f: any) => f.primary) ?? v.files?.[0] ?? null;
      return {
        id:            v.id,
        versionNumber: v.version_number,
        name:          v.name,
        versionType:   v.version_type ?? "release",
        gameVersions:  v.game_versions ?? [],
        loaders:       v.loaders ?? [],
        datePublished: v.date_published,
        downloads:     v.downloads ?? 0,
        changelog:     v.changelog ?? "",
        dependencies:  (v.dependencies ?? []).map((d: any) => ({
          projectId: d.project_id,
          dependencyType: d.dependency_type,
          title: projectMeta[d.project_id]?.title || d.project_id || d.file_name || "Dependencia externa",
          slug: projectMeta[d.project_id]?.slug,
          iconUrl: projectMeta[d.project_id]?.iconUrl ?? null,
          projectType: projectMeta[d.project_id]?.projectType ?? "mod",
          url: projectMeta[d.project_id]?.slug ? `https://modrinth.com/project/${projectMeta[d.project_id].slug}` : undefined,
          versionId: d.version_id,
          fileName: d.file_name ?? null,
          externalUrl: d.external_secure_url ?? null,
        })),
        primaryFile: primaryFile ? {
          url:      primaryFile.url,
          filename: primaryFile.filename,
          primary:  primaryFile.primary ?? false,
          size:     primaryFile.size ?? 0,
          hashes:   primaryFile.hashes ?? {},
        } : null,
      };
    });

    return NextResponse.json({ versions });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
