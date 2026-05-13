/**
 * /api/curseforge/discover — GET
 * ─────────────────────────────────────────────────────────────────────────────
 * Busca mods, resourcepacks, shaders y datapacks en CurseForge (Eternal API).
 * Permite que la FOMO Sidebar alterne entre Modrinth y CurseForge.
 *
 * Requiere: CURSEFORGE_API_KEY en .env.local
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
 *   categories  — JSON array de categorías (opcional)
 *
 * Respuesta: { mods: CurseForgeEntry[], total: number, page: number, totalPages: number, source: "curseforge" }
 *
 * IDs de class en CurseForge (gameId=432 es Minecraft):
 *   6   = Mods
 *   12  = Resourcepacks
 *   6552 = Shaders
 *   6945 = Data Packs
 *
 * IDs de modloader en CurseForge:
 *   1 = Forge, 4 = Fabric, 6 = NeoForge
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import { getRawEnv } from "@/lib/env";
import { getApiKey } from "@/lib/settings";

const CURSEFORGE_API = "https://api.curseforge.com/v1";
const MINECRAFT_GAME_ID = 432;

// ── Mapeos de parámetros a IDs de CurseForge ──────────────────────────────────

/** Mapeo de tipo de proyecto a classId de CurseForge. */
const PROJECT_TYPE_TO_CLASS_ID: Record<string, number> = {
  mod:          6,
  modpack:      4471,
  resourcepack: 12,
  shader:       6552,
  datapack:     6945,
};

/** Mapeo de loader a modLoaderType de CurseForge. */
const LOADER_TO_CF_ID: Record<string, number> = {
  forge:    1,
  fabric:   4,
  neoforge: 6,
};

// CurseForge reutiliza slugs entre distintas clases (ej. "miscellaneous",
// "fantasy", "magic"), pero con IDs distintos. Por eso el mapeo debe ser
// por tipo de proyecto y no global.
const CF_CATEGORY_MAPS: Record<string, Record<string, number>> = {
  mod: {
    "addons": 426,
    "applied-energistics-2": 4545,
    "blood-magic": 4485,
    "buildcraft": 432,
    "crafttweaker": 4773,
    "create": 6484,
    "farmers-delight": 10754,
    "forestry": 433,
    "galacticraft": 5232,
    "industrial-craft": 429,
    "integrated-dynamics": 6954,
    "kubejs": 5314,
    "refined-storage": 9049,
    "skyblock": 6145,
    "thaumcraft": 430,
    "thermal-expansion": 427,
    "tinkers-construct": 428,
    "twilight-forest": 7669,
    "adventure-rpg": 422,
    "api-and-library": 421,
    "armor-tools-and-weapons": 434,
    "bug-fixes": 6821,
    "cosmetic": 424,
    "creativemode": 9026,
    "education": 5299,
    "food": 436,
    "horror": 10775,
    "magic": 419,
    "map-and-information": 423,
    "mcreator": 4906,
    "miscellaneous": 425,
    "modjam-2025": 8937,
    "performance": 6814,
    "redstone": 4558,
    "server-utility": 435,
    "storage": 420,
    "technology": 412,
    "twitch-integration": 4671,
    "utility-qol": 5191,
    "world-gen": 406,
    "biomes": 407,
    "dimensions": 410,
    "mobs": 411,
    "ores-and-resources": 408,
    "structures": 409,
    "automation": 4843,
    "energy": 417,
    "energy-fluid-and-item-transport": 415,
    "farming": 416,
    "genetics": 418,
    "player-transport": 414,
    "processing": 413,
    // Modrinth category aliases for hybrid search
    "adventure": 422,
    "cursed": 425,
    "decoration": 424,
    "economy": 425,
    "equipment": 434,
    "game_mechanics": 5191,
    "library": 421,
    "management": 435,
    "minigame": 425,
    "optimization": 6814,
    "social": 4671,
    "transportation": 414,
    "utility": 5191,
    "world_generation": 406,
  },
  resourcepack: {
    "16x": 393,
    "32x": 394,
    "64x": 395,
    "128x": 396,
    "256x": 397,
    "512x-and-higher": 398,
    "steampunk": 399,
    "photo-realistic": 400,
    "modern": 401,
    "medieval": 402,
    "traditional": 403,
    "animated": 404,
    "miscellaneous": 405,
    "mod-support": 4465,
    "data-packs": 5193,
    "font-packs": 5244,
    "modjam-2025": 8939,
  },
  shader: {
    "realistic": 6553,
    "fantasy": 6554,
    "vanilla": 6555,
  },
  datapack: {
    "mod-support": 6946,
    "tech": 6951,
    "magic": 6952,
    "adventure": 6948,
    "library": 6950,
    "utility": 6953,
    "miscellaneous": 6947,
    "fantasy": 6949,
    "modjam-2025": 8938,
  },
};

// Mapeo de ordenamiento MIM -> CurseForge sortField
// 1=Featured, 2=Popularity, 3=Last Updated, 4=Name, 5=Author, 6=Total Downloads
const SORT_TO_CF_FIELD: Record<string, number> = {
  relevance: 1,
  downloads: 2,
  updated:   3,
  newest:    11, // Date Created
  follows:   2,  // Fallback elegante a Popularidad
};

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface CurseForgeEntry {
  projectId:     string;
  title:         string;
  description:   string;
  iconUrl:       string | null;
  author:        string;
  downloads:     number;
  dateCreated:   string;
  dateUpdated:   string;
  url:           string;
  categories:    string[];
  latestVersion: string | null;
  projectType:   string;
  allowModDistribution: boolean;
}

/** Shape crudo de la API de CurseForge para tipado interno. */
interface RawCFMod {
  id: number;
  classId: number;
  name: string;
  summary: string;
  logo?: { url: string };
  authors?: { name: string }[];
  downloadCount: number;
  dateCreated: string;
  dateModified: string;
  links?: { websiteUrl: string };
  slug: string;
  categories?: { name: string }[];
  latestFilesIndexes?: { gameVersion: string }[];
  allowModDistribution: boolean;
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // 1. Carga Manual (Bypass Next.js): 
  // Leemos directamente el archivo .env.local para evitar que Next.js trunque la key
  // o intente interpolar los símbolos "$" (bug conocido de Next.js/Turbopack).
  const apiKey = getApiKey("curseforge");

  // Log de diagnóstico en el servidor (no visible para el cliente)
  console.log(`[/api/curseforge/discover] Diagnóstico API Key (Raw):`, {
    length: apiKey.length,
    prefix: apiKey.substring(0, 5) + "...",
    suffix: "..." + apiKey.substring(apiKey.length - 5),
    hasDollars: apiKey.includes("$")
  });

  if (!apiKey) {
    return NextResponse.json(
      {
        error:         "API key de CurseForge no configurada",
        instrucciones: "Andá a los Ajustes de la aplicación (Configuración) y agregá tu API key de CurseForge para habilitar la búsqueda.",
      },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(req.url);
  const loader      = searchParams.get("loader")      ?? "forge";
  const gameVersionsJson = searchParams.get("gameVersions");
  
  // Extraer el array de versiones para CurseForge
  let gameVersions: string[] = [];
  try {
    if (gameVersionsJson) {
      gameVersions = JSON.parse(gameVersionsJson);
    }
  } catch {}

  const page        = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize    = Math.min(50, parseInt(searchParams.get("pageSize") ?? "20", 10));
  const sortParam   = searchParams.get("sort")        ?? "featured";
  const projectType = searchParams.get("projectType") ?? "mod";
  const q           = searchParams.get("q")?.trim()   ?? "";
  const categories  = searchParams.get("categories") ? JSON.parse(searchParams.get("categories")!) : [];

  let searchFilter = q;
  let filterByAuthor: string | null = null;
  if (q.startsWith("author:")) {
    const authorName = q.replace(/^author:/i, "").trim();
    if (authorName) {
      searchFilter = authorName;
      filterByAuthor = authorName.toLowerCase();
    }
  }

  const classId    = PROJECT_TYPE_TO_CLASS_ID[projectType] ?? PROJECT_TYPE_TO_CLASS_ID.mod;
  const sortField  = SORT_TO_CF_FIELD[sortParam] ?? 1; // Default to 1 (Featured)

  try {
    const headers = {
      "Accept":     "application/json",
      "x-api-key":  apiKey,
    };

    const params = new URLSearchParams({
      gameId:    MINECRAFT_GAME_ID.toString(),
      sortField: sortField.toString(),
      sortOrder: "desc",
      index:     ((page - 1) * pageSize).toString(),
      pageSize:  pageSize.toString(),
    });

    if (!filterByAuthor) {
      params.set("classId", classId.toString());
      
      // Filtros de Versión y Loader
      if (gameVersions.length > 0) {
        params.set("gameVersions", JSON.stringify(gameVersions));
      }
      
      // Solo aplicar modLoaderType si es un MOD (classId 6)
      if (classId === 6) {
        const loaderId = LOADER_TO_CF_ID[loader.toLowerCase()];
        if (loaderId) params.set("modLoaderType", loaderId.toString());
      }

      // Soporte para múltiples categorías en CurseForge
      if (categories.length > 0) {
        const categoryMap = CF_CATEGORY_MAPS[projectType] ?? {};
        const catIds = (categories as string[])
          .map((cat: string) => categoryMap[cat] || (isNaN(Number(cat)) ? null : Number(cat)))
          .filter((id): id is number => id !== null);

        if (catIds.length > 0) {
          params.set("categoryIds", catIds.join(","));
        }
      }
    }

    // Búsqueda por texto (searchFilter)
    if (searchFilter) {
      params.set("searchFilter", searchFilter);
    }

    const res = await fetch(`${CURSEFORGE_API}/mods/search?${params.toString()}`, { headers });

    if (!res.ok) {
      const errorText = await res.text().catch(() => res.statusText);
      console.error(`[/api/curseforge/discover] CurseForge API error (${res.status}):`, errorText);

      if (res.status === 403) {
        return NextResponse.json(
          {
            error:   "API key de CurseForge rechazada (403 Forbidden)",
            details: "Tu API key de CurseForge es inválida o expiró. Por favor, andá a los Ajustes de la aplicación (Configuración) y verificá la key ingresada.",
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { error: `CurseForge API error: ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();

    // Mapear al shape unificado con Modrinth para intercambio transparente
    let mods: CurseForgeEntry[] = (data.data ?? []).map((m: RawCFMod) => {
      // Buscar la mejor versión que coincida con los filtros del usuario
      let matchedVersion = null;
      if (gameVersions.length > 0 && m.latestFilesIndexes) {
        // Intentar encontrar una versión que esté en el filtro del usuario
        const bestMatch = m.latestFilesIndexes.find(idx => gameVersions.includes(idx.gameVersion));
        matchedVersion = bestMatch?.gameVersion ?? m.latestFilesIndexes[0]?.gameVersion;
      } else {
        matchedVersion = m.latestFilesIndexes?.[0]?.gameVersion ?? null;
      }

      let mappedType = projectType;
      if (m.classId === 12) mappedType = "resourcepack";
      else if (m.classId === 6) mappedType = "mod";
      else if (m.classId === 6552) mappedType = "shader";
      else if (m.classId === 4471) mappedType = "modpack";

      return {
        projectId:     m.id.toString(),
        slug:          m.slug,
        title:         m.name,
        description:   m.summary ?? "",
        iconUrl:       m.logo?.url ?? null,
        author:        m.authors?.[0]?.name ?? "Desconocido",
        downloads:     m.downloadCount ?? 0,
        dateCreated:   m.dateCreated ?? "",
        dateUpdated:   m.dateModified ?? "",
        url:           m.links?.websiteUrl ?? `https://www.curseforge.com/minecraft/${mappedType === "mod" ? "mc-mods" : mappedType}/${m.slug}`,
        categories:    (m.categories ?? []).map((c: { name: string }) => c.name),
        latestVersion: matchedVersion,
        projectType:   mappedType,
        allowModDistribution: m.allowModDistribution ?? true,
      };
    });

    if (filterByAuthor) {
      mods = mods.filter(m => m.author.toLowerCase() === filterByAuthor);
    }

    let total = data.pagination?.totalCount ?? 0;
    if (filterByAuthor) {
      total = mods.length;
    }

    return NextResponse.json({
      mods,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      source: "curseforge",
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error desconocido";
    console.error("[/api/curseforge/discover] Error no manejado:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
