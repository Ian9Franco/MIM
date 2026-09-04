import { NextResponse } from "next/server";
import { withApiGuard } from "@/lib/apiGuard";

const CURSEFORGE_API = "https://api.curseforge.com/v1";
const MINECRAFT_GAME_ID = "432";
const CURSEFORGE_PICKS_CACHE_TTL_MS = 1000 * 60 * 60 * 6;

interface ModItem {
  projectId: string;
  title: string;
  description: string;
  iconUrl: string;
  author: string;
  projectType: string;
  categories: string[];
  url: string;
  dateCreated?: string;
  dateModified?: string;
  _source: string;
}

interface PickCollection {
  id: string;
  name: string;
  description: string;
  iconUrl?: string;
  source: string;
  projectCount: number;
  previewIcons: string[];
  mods: ModItem[];
}

interface PicksPayload {
  picks: PickCollection[];
  collections: PickCollection[];
  source: string;
  cached?: boolean;
  stale?: boolean;
  error?: string;
  cacheAgeMs?: number;
  generatedAt?: string;
}

let memoryCache: { timestamp: number; payload: PicksPayload } | null = null;

const CLASS_ID_TO_PROJECT_TYPE: Record<number, string> = {
  6: "mod",
  4471: "modpack",
  12: "resourcepack",
  6552: "shader",
  6945: "datapack",
};

const FALLBACK_PICKS: PickCollection[] = [
  {
    id: "curseforge-fallback-monthly",
    name: "CurseForge Monthly Picks",
    description: "Selección dinámica de proyectos destacados de CurseForge.",
    iconUrl: "https://media.forgecdn.net/avatars/583/94/637962453676839352.png",
    source: "curseforge",
    projectCount: 3,
    previewIcons: [
      "https://media.forgecdn.net/avatars/583/94/637962453676839352.png",
      "https://media.forgecdn.net/avatars/412/120/637628373672909439.png",
      "https://media.forgecdn.net/avatars/615/340/637996373672809439.png",
    ],
    mods: [
      {
        projectId: "waystones",
        title: "Waystones",
        description: "Bloques de teletransporte para viajar rápido por el mundo.",
        iconUrl: "https://media.forgecdn.net/avatars/583/94/637962453676839352.png",
        author: "Balm",
        projectType: "mod",
        categories: ["Utility"],
        url: "https://www.curseforge.com/minecraft/mc-mods/waystones",
        _source: "curseforge",
      },
      {
        projectId: "xaeros-minimap",
        title: "Xaero's Minimap",
        description: "Minimapa personalizable con waypoints y detalles del mapa.",
        iconUrl: "https://media.forgecdn.net/avatars/412/120/637628373672909439.png",
        author: "Xaero",
        projectType: "mod",
        categories: ["Map and Information"],
        url: "https://www.curseforge.com/minecraft/mc-mods/xaeros-minimap",
        _source: "curseforge",
      },
      {
        projectId: "natures-compass",
        title: "Nature's Compass",
        description: "Brujula especial para localizar biomas.",
        iconUrl: "https://media.forgecdn.net/avatars/615/340/637996373672809439.png",
        author: "Chaosyr",
        projectType: "mod",
        categories: ["Biomes"],
        url: "https://www.curseforge.com/minecraft/mc-mods/natures-compass",
        _source: "curseforge",
      },
    ],
  },
];

function currentMonthLabel() {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const now = new Date();
  return `${months[now.getUTCMonth()]} ${now.getUTCFullYear()}`;
}

function monthStartTimestamp() {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0);
}

function mapMod(m: {
  id: number;
  name: string;
  summary?: string;
  logo?: { thumbnailUrl?: string; url?: string };
  authors?: Array<{ name: string }>;
  links?: { websiteUrl?: string };
  categories?: Array<{ name: string }>;
  classId: number;
  dateCreated?: string;
  dateReleased?: string;
  dateModified?: string;
}): ModItem {
  const projectType = CLASS_ID_TO_PROJECT_TYPE[m.classId] || "mod";
  return {
    projectId: String(m.id),
    title: m.name,
    description: m.summary || "",
    iconUrl: m.logo?.thumbnailUrl || m.logo?.url || "",
    author: m.authors?.[0]?.name || "Unknown",
    url: m.links?.websiteUrl || `https://www.curseforge.com/minecraft/mc-mods/${m.id}`,
    categories: m.categories?.map((c) => c.name) || [],
    projectType,
    dateCreated: m.dateCreated || m.dateReleased || "",
    dateModified: m.dateModified || "",
    _source: "curseforge",
  };
}

function uniqueMods(mods: ModItem[]) {
  const seen = new Set<string>();
  return mods.filter((mod) => {
    if (!mod?.projectId || seen.has(mod.projectId)) return false;
    seen.add(mod.projectId);
    return true;
  });
}

function toCollection(id: string, name: string, description: string, mods: ModItem[]): PickCollection {
  const cleanMods = uniqueMods(mods).slice(0, 18);

  return {
    id,
    name,
    description,
    iconUrl: cleanMods.find((mod) => mod.iconUrl)?.iconUrl,
    source: "curseforge",
    projectCount: cleanMods.length,
    previewIcons: cleanMods.map((mod) => mod.iconUrl).filter(Boolean).slice(0, 8),
    mods: cleanMods,
  };
}

async function searchCurseForge(
  headers: HeadersInit,
  options: {
    classId?: number;
    query?: string;
    sortField?: number;
    pageSize?: number;
  }
) {
  const params = new URLSearchParams({
    gameId: MINECRAFT_GAME_ID,
    sortField: String(options.sortField ?? 3),
    sortOrder: "desc",
    index: "0",
    pageSize: String(options.pageSize ?? 24),
  });

  if (options.classId) params.set("classId", String(options.classId));
  if (options.query) params.set("searchFilter", options.query);

  const res = await fetch(`${CURSEFORGE_API}/mods/search?${params.toString()}`, {
    headers,
    next: { revalidate: 60 * 60 },
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(`CurseForge API ${res.status}: ${errorText.slice(0, 160)}`);
  }

  const data = await res.json();
  return (data.data || []).map(mapMod);
}

export const GET = withApiGuard(
  {
    rateLimit: { windowMs: 60 * 1000, maxRequests: 60 },
  },
  async () => {
    const now = Date.now();
    if (memoryCache && now - memoryCache.timestamp < CURSEFORGE_PICKS_CACHE_TTL_MS) {
      return NextResponse.json(
        { ...memoryCache.payload, cached: true, cacheAgeMs: now - memoryCache.timestamp },
        {
          headers: {
            "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
          },
        }
      );
    }

    const apiKey = process.env.CURSEFORGE_API_KEY;
    if (!apiKey) {
      console.warn("[CurseForge Picks] CURSEFORGE_API_KEY is not defined, returning fallback.");
      return NextResponse.json(
        {
          picks: FALLBACK_PICKS,
          collections: FALLBACK_PICKS,
          source: "fallback-no-api-key",
          cached: false,
        },
        {
          headers: {
            "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
          },
        }
      );
    }

    const headers = {
      Accept: "application/json",
      "x-api-key": apiKey,
    };

    try {
      const [
        newestMods,
        popularMods,
        updatedMods,
        endThemeMods,
        latestResourcePacks,
        latestShaders,
        latestModpacks,
      ] = await Promise.all([
        searchCurseForge(headers, { classId: 6, sortField: 11, pageSize: 30 }),
        searchCurseForge(headers, { classId: 6, sortField: 3, pageSize: 30 }),
        searchCurseForge(headers, { classId: 6, sortField: 2, pageSize: 18 }),
        searchCurseForge(headers, { query: "end", sortField: 3, pageSize: 24 }),
        searchCurseForge(headers, { classId: 12, sortField: 11, pageSize: 18 }),
        searchCurseForge(headers, { classId: 6552, sortField: 11, pageSize: 18 }),
        searchCurseForge(headers, { classId: 4471, sortField: 11, pageSize: 18 }),
      ]);

      const startOfMonth = monthStartTimestamp();
      const monthlyMods = uniqueMods([...newestMods, ...updatedMods])
        .filter((mod) => {
          const date = new Date(mod.dateCreated || mod.dateModified || 0).getTime();
          return Number.isFinite(date) && date >= startOfMonth;
        })
        .slice(0, 18);

      const month = currentMonthLabel();
      const picks = [
        toCollection(
          `curseforge-monthly-${month.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
          `CurseForge Monthly Picks - ${month}`,
          "Proyectos recientes y actualizados este mes desde la API oficial de CurseForge.",
          monthlyMods.length ? monthlyMods : uniqueMods([...newestMods, ...updatedMods]).slice(0, 18)
        ),
      ];

      const collections = [
        toCollection("curseforge-from-top-authors", "From Top Authors", "Proyectos populares de autores destacados en CurseForge.", popularMods),
        toCollection("curseforge-monthly-theme-end", "Monthly Theme - The End Update", "Selección dinámica relacionada con The End.", endThemeMods),
        toCollection("curseforge-latest-mods", "Latest Mods", "Mods publicados recientemente en CurseForge.", newestMods),
        toCollection("curseforge-latest-resource-packs", "Latest Resource Packs", "Resource packs publicados recientemente en CurseForge.", latestResourcePacks),
        toCollection("curseforge-latest-shaders", "Latest Shaders", "Shaders publicados recientemente en CurseForge.", latestShaders),
        toCollection("curseforge-latest-modpacks", "Latest Modpacks", "Modpacks publicados recientemente en CurseForge.", latestModpacks),
      ].filter((collection) => collection.mods.length > 0);

      const payload: PicksPayload = {
        picks: picks[0].mods.length ? picks : FALLBACK_PICKS,
        collections: collections.length ? collections : FALLBACK_PICKS,
        source: "curseforge-api",
        cached: false,
        generatedAt: new Date().toISOString(),
      };

      memoryCache = { timestamp: now, payload };

      return NextResponse.json(payload, {
        headers: {
          "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
        },
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("[CurseForge Picks] API failed:", errMsg);
      if (memoryCache?.payload) {
        return NextResponse.json(
          { ...memoryCache.payload, cached: true, stale: true, error: errMsg },
          {
            headers: {
              "Cache-Control": "public, s-maxage=300, stale-while-revalidate=86400",
            },
          }
        );
      }

      return NextResponse.json({
        picks: FALLBACK_PICKS,
        collections: FALLBACK_PICKS,
        source: "fallback-api-error",
        error: errMsg,
      });
    }
  }
);
