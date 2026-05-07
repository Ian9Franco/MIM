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
 * Respuesta: { versions: VersionEntry[] }
 *
 * Notas de diseño:
 *   - Sin filtros, devuelve TODAS las versiones (útil para el selector completo).
 *   - Con filtros, reduce la lista al subconjunto compatible.
 *   - Si no hay versiones con filtros estrictos, hace fallback a todas las versiones.
 *   - Las dependencias de cada versión se resuelven en un batch request único.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import { getApiKey } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const MODRINTH_API = "https://api.modrinth.com/v2";

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface VersionFile {
  url:      string;
  filename: string;
  primary:  boolean;
  size:     number;
  hashes:   Record<string, string>;
}

interface VersionEntry {
  id:            string;
  versionNumber: string;
  name:          string;
  versionType:   "release" | "beta" | "alpha";
  gameVersions:  string[];
  loaders:       string[];
  datePublished: string;
  downloads:     number;
  primaryFile:   VersionFile | null;
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
  const apiKey = getApiKey("modrinth");
  if (apiKey) headers["Authorization"] = apiKey;

  try {
    // 1. Fetch de versiones con filtros opcionales
    const params = new URLSearchParams();
    if (gameVersion) params.set("game_versions", JSON.stringify([gameVersion]));
    // El filtro de loader solo aplica para mods (resourcepacks/shaders no lo usan)
    if (loader && projectType === "mod") params.set("loaders", JSON.stringify([loader]));

    let url = `${MODRINTH_API}/project/${encodeURIComponent(projectId)}/version?${params.toString()}`;
    let res = await fetch(url, { headers, cache: "no-store" });
    let rawVersions = await res.json();

    // 2. Fallback: si no hay versiones con filtros estrictos, traer TODAS
    if (Array.isArray(rawVersions) && rawVersions.length === 0 && (gameVersion || loader)) {
      url        = `${MODRINTH_API}/project/${encodeURIComponent(projectId)}/version`;
      res        = await fetch(url, { headers, cache: "no-store" });
      rawVersions = await res.json();
    }

    if (!Array.isArray(rawVersions)) return NextResponse.json({ versions: [] });

    // 2.5 Filter versions based on projectType priority
    if (projectType === "datapack" || projectType === "resourcepack") {
      const isDatapack = projectType === "datapack";
      const isRp = projectType === "resourcepack";

      // Split into "matching" and "non-matching" entries
      const matching = rawVersions.filter((v: any) => {
        const nameMatch = v.name?.toLowerCase().includes(projectType) || v.version_number?.toLowerCase().includes(projectType);
        const loaderMatch = v.loaders?.includes(projectType);
        const fileMatch = v.files?.some((f: any) => f.filename.toLowerCase().endsWith(".zip"));
        return nameMatch || loaderMatch || fileMatch;
      });

      // If we have matching entries, we can either use only them or put them at the top.
      // Usually, if a user filters by "Datapack", they ONLY want datapacks.
      if (matching.length > 0) {
        rawVersions = matching;
      }
    }

    // 3. Recolectar todos los IDs de dependencias para resolverlos en un único batch
    const depIds = new Set<string>();
    rawVersions.forEach((v: any) => {
      v.dependencies?.forEach((d: any) => { if (d.project_id) depIds.add(d.project_id); });
    });

    // Mapa de project_id → metadatos del proyecto (título, slug, icon, tipo)
    const projectMeta: Record<string, { title: string; slug: string; iconUrl: string | null; projectType: string }> = {};
    if (depIds.size > 0) {
      try {
        const pRes = await fetch(
          `${MODRINTH_API}/projects?ids=${JSON.stringify(Array.from(depIds))}`,
          { headers, cache: "no-store" }
        );
        if (pRes.ok) {
          const pData = await pRes.json();
          pData.forEach((p: any) => {
            projectMeta[p.id] = {
              title:       p.title ?? p.id,
              slug:        p.slug  ?? p.id,
              iconUrl:     p.icon_url ?? null,
              projectType: p.project_type ?? "mod",
            };
          });
        }
      } catch (e) {
        console.error("[/api/modrinth/versions] Error resolving dependencies:", e);
      }
    }

    // 4. Mapear versiones al formato VersionEntry normalizado
    const versions = rawVersions.map((v: any) => {
      // Prioritize ZIP files if it's a datapack and no primary is marked, or if we need to force it
      let primaryFile = v.files?.find((f: any) => f.primary);
      if (!primaryFile && v.files?.length > 0) {
        if (projectType === "datapack") {
          primaryFile = v.files.find((f: any) => f.filename.endsWith(".zip")) ?? v.files[0];
        } else if (projectType === "resourcepack") {
          primaryFile = v.files.find((f: any) => f.filename.endsWith(".zip")) ?? v.files[0];
        } else {
          primaryFile = v.files[0];
        }
      }
      
      // Secondary safety: if it IS a datapack filter, but the primary file is a .jar, try to find a .zip fallback
      if (projectType === "datapack" && primaryFile && primaryFile.filename.endsWith(".jar")) {
        const zipFile = v.files.find((f: any) => f.filename.endsWith(".zip"));
        if (zipFile) primaryFile = zipFile;
      }
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
          projectId:      d.project_id,
          dependencyType: d.dependency_type,
          title:          projectMeta[d.project_id]?.title || d.project_id || d.file_name || "Dependencia externa",
          slug:           projectMeta[d.project_id]?.slug,
          iconUrl:        projectMeta[d.project_id]?.iconUrl ?? null,
          projectType:    projectMeta[d.project_id]?.projectType ?? "mod",
          url:            projectMeta[d.project_id]?.slug
            ? `https://modrinth.com/project/${projectMeta[d.project_id].slug}`
            : undefined,
          versionId:      d.version_id,
          fileName:       d.file_name ?? null,
          externalUrl:    d.external_secure_url ?? null,
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
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[/api/modrinth/versions] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
