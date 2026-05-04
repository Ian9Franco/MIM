/**
 * /api/curseforge/discover — GET
 * ─────────────────────────────────────────────────────────────────────────────
 * Busca mods, resourcepacks, shaders y datapacks en CurseForge (Eternal API).
 * Permite que la FOMO Sidebar alterne entre Modrinth y CurseForge.
 *
 * Requiere la variable de entorno CURSEFORGE_API_KEY.
 * Obtener una en: https://console.curseforge.com/
 *
 * Parámetros de query:
 *   loader      — "forge" | "neoforge" | "fabric" (default: "forge")
 *   gameVersion — ej: "1.20.1" (default: "1.20.1")
 *   page        — número de página 1-indexado (default: 1)
 *   pageSize    — resultados por página, max 50 (default: 20)
 *   sort        — "featured" | "popularity" | "updated" | "newest" (default: "featured")
 *   projectType — "mod" | "resourcepack" | "shader" | "datapack" (default: "mod")
 *   q           — texto de búsqueda libre (opcional)
 *
 * Respuesta:
 *   { mods: CurseForgeEntry[], total: number, page: number, totalPages: number }
 *
 * IDs de class en CurseForge (gameId=432 es Minecraft):
 *   6   = Mods
 *   12  = Resourcepacks
 *   6552 = Shaders
 *   17  = Worlds/Datapacks
 *
 * IDs de modloader en CurseForge:
 *   1 = Forge, 4 = Fabric, 6 = NeoForge
 *
 * Notas de diseño:
 *   - La API de CurseForge no permite descarga directa sin API key del usuario.
 *     Esta ruta solo hace discovery (metadatos y links a la página del mod).
 *     La descarga real requiere que el usuario abra el link en el browser.
 *   - Si CURSEFORGE_API_KEY no está configurada, la ruta retorna 503 con
 *     instrucciones claras en lugar de fallar silenciosamente.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";

const CURSEFORGE_API = "https://api.curseforge.com/v1";
const MINECRAFT_GAME_ID = 432;

// ── Mapeo de tipos de proyecto a classId de CurseForge ───────────────────────

const PROJECT_TYPE_TO_CLASS_ID: Record<string, number> = {
  mod:          6,
  resourcepack: 12,
  shader:       6552,
  datapack:     17,
};

// ── Mapeo de loaders a modLoaderType de CurseForge ───────────────────────────

const LOADER_TO_CF_ID: Record<string, number> = {
  forge:    1,
  fabric:   4,
  neoforge: 6,
};

// ── Mapeo de sort a sortField de CurseForge ───────────────────────────────────

const SORT_TO_CF_FIELD: Record<string, number> = {
  featured:   1,
  popularity: 2,
  updated:    3,
  newest:     11,
};

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface CurseForgeEntry {
  projectId:   number;
  name:        string;
  summary:     string;
  iconUrl:     string | null;
  author:      string;
  downloads:   number;
  dateCreated: string;
  dateUpdated: string;
  url:         string;
  categories:  string[];
  latestVersion: string | null;
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const apiKey = process.env.CURSEFORGE_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:         "CURSEFORGE_API_KEY no configurada",
        instrucciones: "Obtené una API key gratuita en https://console.curseforge.com/ y agregala en .env.local como CURSEFORGE_API_KEY=tu_key",
      },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(req.url);
  const loader      = searchParams.get("loader")      ?? "forge";
  const gameVersion = searchParams.get("gameVersion") ?? "1.20.1";
  const page        = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize    = Math.min(50, parseInt(searchParams.get("pageSize") ?? "20", 10));
  const sortParam   = searchParams.get("sort")        ?? "featured";
  const projectType = searchParams.get("projectType") ?? "mod";
  const q           = searchParams.get("q")?.trim()   ?? "";

  const classId    = PROJECT_TYPE_TO_CLASS_ID[projectType] ?? PROJECT_TYPE_TO_CLASS_ID.mod;
  const sortField  = SORT_TO_CF_FIELD[sortParam] ?? SORT_TO_CF_FIELD.featured;
  const cfLoaderId = LOADER_TO_CF_ID[loader];

  const headers = {
    "x-api-key":   apiKey,
    "Content-Type": "application/json",
    "User-Agent":  "MIM-App/1.0 (contact@mim.local)",
  };

  try {
    const params = new URLSearchParams({
      gameId:     String(MINECRAFT_GAME_ID),
      classId:    String(classId),
      gameVersion,
      pageSize:   String(pageSize),
      index:      String((page - 1) * pageSize),
      sortField:  String(sortField),
      sortOrder:  "desc",
    });

    // El filtro de modLoader solo aplica para mods (no para shaders/resourcepacks/datapacks)
    if (projectType === "mod" && cfLoaderId !== undefined) {
      params.set("modLoaderType", String(cfLoaderId));
    }

    if (q) {
      params.set("searchFilter", q);
    }

    const res = await fetch(`${CURSEFORGE_API}/mods/search?${params.toString()}`, { headers });

    if (!res.ok) {
      const errorText = await res.text().catch(() => res.statusText);
      console.error(`[/api/curseforge/discover] Error de CurseForge API (${res.status}):`, errorText);
      return NextResponse.json(
        { error: `Error de CurseForge API: ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();

    // Mapear al shape limpio unificado con Modrinth para intercambio transparente
    const mods: CurseForgeEntry[] = (data.data ?? []).map((m: any) => ({
      projectId:     m.id,
      name:          m.name,
      summary:       m.summary ?? "",
      iconUrl:       m.logo?.url ?? null,
      author:        m.authors?.[0]?.name ?? "Desconocido",
      downloads:     m.downloadCount ?? 0,
      dateCreated:   m.dateCreated ?? "",
      dateUpdated:   m.dateModified ?? "",
      // CurseForge retorna la URL del mod directamente
      url:           m.links?.websiteUrl ?? `https://www.curseforge.com/minecraft/${projectType === "mod" ? "mc-mods" : projectType}/${m.slug}`,
      categories:    (m.categories ?? []).map((c: any) => c.name),
      latestVersion: m.latestFilesIndexes?.[0]?.gameVersion ?? null,
    }));

    const total = data.pagination?.totalCount ?? 0;

    return NextResponse.json({
      mods,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      // Indicar la fuente para que el cliente pueda distinguirla de Modrinth
      source: "curseforge",
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error desconocido";
    console.error("[/api/curseforge/discover] Error no manejado:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}