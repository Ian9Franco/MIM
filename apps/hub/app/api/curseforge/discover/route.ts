import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiGuard } from "@/lib/apiGuard";
import { PROJECT_TYPE_TO_CLASS_ID, LOADER_TO_CF_ID, SORT_TO_CF_FIELD, CF_CATEGORY_MAPS } from "./CurseForgeMapper";

const CURSEFORGE_API = "https://api.curseforge.com/v1";

interface CurseForgeRawMod {
  id: number;
  classId: number;
  name: string;
  summary?: string;
  downloadCount: number;
  logo?: {
    thumbnailUrl?: string;
    url?: string;
  };
  authors?: Array<{ name: string }>;
  links?: {
    websiteUrl?: string;
  };
  categories?: Array<{ name: string }>;
  latestFilesIndexes?: Array<{ gameVersion: string }>;
}

interface CurseForgeSearchResponse {
  data?: CurseForgeRawMod[];
  pagination?: {
    totalCount: number;
  };
}

function parseJsonArray(value: string | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : [];
  } catch {
    return [];
  }
}

function parseLoaderFilter(value: string): string[] {
  if (!value || value === "any" || value === "all" || value === "unknown") return [];
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

const querySchema = z.object({
  loader: z.string().trim().max(100).optional().default("any"),
  page: z.coerce.number().int().min(1).max(500).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(15),
  projectType: z.string().trim().max(50).optional().default("mod"),
  q: z.string().trim().max(100).optional().default(""),
  gameVersions: z.string().trim().optional(),
  gameVersion: z.string().trim().optional().default(""),
  categories: z.string().trim().optional(),
  category: z.string().trim().optional().default(""),
  sort: z.string().trim().max(30).optional().default("newest"),
});

export const GET = withApiGuard(
  {
    rateLimit: { windowMs: 60 * 1000, maxRequests: 60 },
    querySchema,
  },
  async ({ query }) => {
    const apiKey = process.env.CURSEFORGE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "CURSEFORGE_API_KEY no está configurada en las variables de entorno de Vercel / .env.local" },
        { status: 503 }
      );
    }

    const { loader, page, pageSize, projectType, q, gameVersions, gameVersion: legacyGameVersion, categories, category: legacyCategory, sort } = query;
    const parsedGameVersions = parseJsonArray(gameVersions);
    const parsedCategories = parseJsonArray(categories);
    const selectedLoaders = parseLoaderFilter(loader);

    const index = (page - 1) * pageSize;
    const isAnyType = projectType === "any" || projectType === "all";
    const classId = !isAnyType ? (PROJECT_TYPE_TO_CLASS_ID[projectType] || 6) : null;
    const versionOptions = parsedGameVersions.length ? parsedGameVersions : legacyGameVersion ? [legacyGameVersion] : [""];
    const loaderOptions = classId === 6 && selectedLoaders.length ? selectedLoaders : [""];
    const activeCategory = parsedCategories[0] || legacyCategory;
    const hasCombinationFilters = versionOptions.length * loaderOptions.length > 1;
    const requestPageSize = hasCombinationFilters ? Math.min(50, page * pageSize) : pageSize;
    const requestIndex = hasCombinationFilters ? 0 : index;

    const buildQuery = (gVersion: string, activeLoader: string) => {
      const qParams = new URLSearchParams({
        gameId: "432",
        sortField: String(SORT_TO_CF_FIELD[sort] || SORT_TO_CF_FIELD.newest || 11),
        sortOrder: "desc",
        index: requestIndex.toString(),
        pageSize: requestPageSize.toString(),
      });

      if (classId) {
        qParams.set("classId", classId.toString());
        if (classId === 6 && activeLoader) {
          const cfLoaderId = LOADER_TO_CF_ID[activeLoader];
          if (cfLoaderId) qParams.set("modLoaderType", cfLoaderId.toString());
        }
      }

      if (q) qParams.set("searchFilter", q);
      if (gVersion) qParams.set("gameVersion", gVersion);

      if (activeCategory && !isAnyType) {
        const map = CF_CATEGORY_MAPS[projectType] || {};
        const catId = map[activeCategory.toLowerCase()];
        if (catId) qParams.set("categoryId", catId.toString());
      }

      return qParams;
    };

    const responses: CurseForgeSearchResponse[] = await Promise.all(
      versionOptions.flatMap((v) =>
        loaderOptions.map(async (activeLoader) => {
          const qParams = buildQuery(v, activeLoader);
          const res = await fetch(`${CURSEFORGE_API}/mods/search?${qParams.toString()}`, {
            headers: {
              "Accept": "application/json",
              "x-api-key": apiKey,
            },
          });

          if (!res.ok) {
            const errText = await res.text();
            throw new Error(`CurseForge API Error: ${res.status} - ${errText}`);
          }

          return res.json() as Promise<CurseForgeSearchResponse>;
        })
      )
    );

    const totalFromApi = responses.reduce((sum, data) => sum + (data.pagination?.totalCount || 0), 0);
    const rawMods = responses.flatMap((data) => data.data || []);
    const seen = new Set<number>();
    const uniqueMods = rawMods.filter((mod) => {
      if (seen.has(mod.id)) return false;
      seen.add(mod.id);
      return true;
    });
    const pagedMods = hasCombinationFilters ? uniqueMods.slice(index, index + pageSize) : uniqueMods;

    const CLASS_ID_TO_PROJECT_TYPE: Record<number, string> = {
      6: "mod",
      4471: "modpack",
      12: "resourcepack",
      6552: "shader",
      6945: "datapack"
    };

    const mods = pagedMods.map((m) => ({
      projectId: m.id.toString(),
      title: m.name,
      description: m.summary || "",
      iconUrl: m.logo?.thumbnailUrl || m.logo?.url || null,
      author: m.authors?.[0]?.name || "Desconocido",
      downloads: m.downloadCount,
      url: m.links?.websiteUrl || "",
      categories: m.categories?.map((c) => c.name) || [],
      latestVersion: m.latestFilesIndexes?.[0]?.gameVersion || null,
      projectType: CLASS_ID_TO_PROJECT_TYPE[m.classId] || projectType,
      _source: "curseforge",
    }));

    return NextResponse.json({
      mods,
      total: hasCombinationFilters ? uniqueMods.length : totalFromApi,
      page,
      pageSize,
      totalPages: Math.ceil((hasCombinationFilters ? uniqueMods.length : totalFromApi) / pageSize),
    });
  }
);
