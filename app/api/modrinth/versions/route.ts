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

const MODRINTH_API = "https://api.modrinth.com/v2";

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface VersionFile {
  url: string;
  filename: string;
  primary: boolean;
  size: number;
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
    return NextResponse.json(
      { error: "Falta parámetro requerido: projectId" },
      { status: 400 }
    );
  }

  const headers: Record<string, string> = {
    "User-Agent": "MIM-App/1.0 (contact@mim.local)",
  };
  if (process.env.MODRINTH_API_KEY) {
    headers["Authorization"] = process.env.MODRINTH_API_KEY;
  }

  try {
    // Construir parámetros de filtro opcionales
    // Los shaders, resourcepacks y datapacks no tienen loader en Modrinth,
    // por eso solo se aplica el filtro de loader si el tipo es "mod".
    const params = new URLSearchParams();
    if (gameVersion) {
      params.set("game_versions", JSON.stringify([gameVersion]));
    }
    if (loader && projectType === "mod") {
      params.set("loaders", JSON.stringify([loader]));
    }

    const queryString = params.toString() ? `?${params.toString()}` : "";
    const url = `${MODRINTH_API}/project/${encodeURIComponent(projectId)}/version${queryString}`;

    const res = await fetch(url, { headers });

    if (res.status === 404) {
      return NextResponse.json(
        { error: `Proyecto no encontrado: "${projectId}"` },
        { status: 404 }
      );
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: `Error de Modrinth API: ${res.status} ${res.statusText}` },
        { status: 502 }
      );
    }

    const rawVersions = await res.json();

    if (!Array.isArray(rawVersions)) {
      return NextResponse.json(
        { error: "Respuesta inesperada de Modrinth: no es un array" },
        { status: 502 }
      );
    }

    // Mapear al shape limpio que necesita el cliente
    const versions: VersionEntry[] = rawVersions.map((v: any) => {
      // El archivo primario es el que tiene primary=true; si no hay uno marcado,
      // tomamos el primero de la lista (Modrinth garantiza al menos uno).
      const primaryFile: VersionFile | null =
        v.files?.find((f: any) => f.primary) ?? v.files?.[0] ?? null;

      return {
        id:            v.id,
        versionNumber: v.version_number,
        name:          v.name,
        versionType:   v.version_type ?? "release",
        gameVersions:  v.game_versions ?? [],
        loaders:       v.loaders ?? [],
        datePublished: v.date_published,
        downloads:     v.downloads ?? 0,
        primaryFile: primaryFile
          ? {
              url:      primaryFile.url,
              filename: primaryFile.filename,
              primary:  primaryFile.primary ?? false,
              size:     primaryFile.size ?? 0,
            }
          : null,
      };
    });

    return NextResponse.json({ versions });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error desconocido";
    console.error("[/api/modrinth/versions] Error no manejado:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}