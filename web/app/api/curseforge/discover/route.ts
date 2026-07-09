import { NextRequest, NextResponse } from "next/server";
import { PROJECT_TYPE_TO_CLASS_ID, LOADER_TO_CF_ID, SORT_TO_CF_FIELD, CF_CATEGORY_MAPS } from "./CurseForgeMapper";

const CURSEFORGE_API = "https://api.curseforge.com/v1";

function parseJsonArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string" && item.trim()) : [];
  } catch {
    return [];
  }
}

function parseLoaderFilter(value: string | null): string[] {
  if (!value || value === "any" || value === "all" || value === "unknown") return [];
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export async function GET(req: NextRequest) {
  const apiKey = process.env.CURSEFORGE_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "CURSEFORGE_API_KEY no está configurada en las variables de entorno de Vercel / .env.local" },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(req.url);
  const loader = searchParams.get("loader") || "any";
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "15");
  const projectType = searchParams.get("projectType") || "mod";
  const q = searchParams.get("q")?.trim() || "";
  const gameVersions = parseJsonArray(searchParams.get("gameVersions"));
  const legacyGameVersion = searchParams.get("gameVersion") || "";
  const categories = parseJsonArray(searchParams.get("categories"));
  const legacyCategory = searchParams.get("category") || "";
  const selectedLoaders = parseLoaderFilter(loader);
  const sort = searchParams.get("sort") || "newest";

  const index = (page - 1) * pageSize;

  const isAnyType = projectType === "any" || projectType === "all";
  const classId = !isAnyType ? (PROJECT_TYPE_TO_CLASS_ID[projectType] || 6) : null;
  const versionOptions = gameVersions.length ? gameVersions : legacyGameVersion ? [legacyGameVersion] : [""];
  const loaderOptions = classId === 6 && selectedLoaders.length ? selectedLoaders : [""];
  const category = categories[0] || legacyCategory;
  const hasCombinationFilters = versionOptions.length * loaderOptions.length > 1;
  const requestPageSize = hasCombinationFilters ? Math.min(50, page * pageSize) : pageSize;
  const requestIndex = hasCombinationFilters ? 0 : index;

  const buildQuery = (gameVersion: string, activeLoader: string) => {
    const query = new URLSearchParams({
      gameId: "432",
      sortField: String(SORT_TO_CF_FIELD[sort] || SORT_TO_CF_FIELD.newest || 11),
      sortOrder: "desc",
      index: requestIndex.toString(),
      pageSize: requestPageSize.toString(),
    });

    if (classId) {
      query.set("classId", classId.toString());

      if (classId === 6 && activeLoader) {
        const cfLoaderId = LOADER_TO_CF_ID[activeLoader];
        if (cfLoaderId) query.set("modLoaderType", cfLoaderId.toString());
      }
    }

    if (q) query.set("searchFilter", q);
    if (gameVersion) query.set("gameVersion", gameVersion);

    if (category && !isAnyType) {
      const map = CF_CATEGORY_MAPS[projectType] || {};
      const catId = map[category.toLowerCase()];
      if (catId) query.set("categoryId", catId.toString());
    }

    return query;
  };

  try {
    const responses = await Promise.all(
      versionOptions.flatMap((gameVersion) =>
        loaderOptions.map(async (activeLoader) => {
          const query = buildQuery(gameVersion, activeLoader);
          const res = await fetch(`${CURSEFORGE_API}/mods/search?${query.toString()}`, {
            headers: {
              "Accept": "application/json",
              "x-api-key": apiKey,
            },
          });

          if (!res.ok) {
            const errText = await res.text();
            throw new Error(`CurseForge API Error: ${res.status} - ${errText}`);
          }

          return res.json();
        })
      )
    );

    const totalFromApi = responses.reduce((sum, data) => sum + (data.pagination?.totalCount || 0), 0);
    const rawMods = responses.flatMap((data) => data.data || []);
    const seen = new Set<number>();
    const uniqueMods = rawMods.filter((mod: any) => {
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

    const mods = pagedMods.map((m: any) => ({
      projectId: m.id.toString(),
      title: m.name,
      description: m.summary || "",
      iconUrl: m.logo?.thumbnailUrl || m.logo?.url || null,
      author: m.authors?.[0]?.name || "Desconocido",
      downloads: m.downloadCount,
      url: m.links?.websiteUrl || "",
      categories: m.categories?.map((c: any) => c.name) || [],
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
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch from CurseForge" }, { status: 500 });
  }
}
