import { NextRequest, NextResponse } from "next/server";
import { PROJECT_TYPE_TO_CLASS_ID, LOADER_TO_CF_ID, CF_CATEGORY_MAPS } from "./CurseForgeMapper";

const CURSEFORGE_API = "https://api.curseforge.com/v1";

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
  const gameVersion = searchParams.get("gameVersion") || "";
  const category = searchParams.get("category") || "";

  const index = (page - 1) * pageSize;

  const query = new URLSearchParams({
    gameId: "432",
    sortField: "2", // Popularity (downloads)
    sortOrder: "desc",
    index: index.toString(),
    pageSize: pageSize.toString(),
  });

  const isAnyType = projectType === "any" || projectType === "all";
  if (!isAnyType) {
    const classId = PROJECT_TYPE_TO_CLASS_ID[projectType] || 6;
    query.set("classId", classId.toString());
    
    if (classId === 6 && loader && loader !== "any") {
      // 1: Forge, 4: Fabric, 6: NeoForge
      query.set("modLoaderType", (LOADER_TO_CF_ID[loader] || 1).toString());
    }
  }

  if (q) query.set("searchFilter", q);
  if (gameVersion) query.set("gameVersion", gameVersion);

  if (category && !isAnyType) {
    const map = CF_CATEGORY_MAPS[projectType] || {};
    const catId = map[category.toLowerCase()];
    if (catId) {
      query.set("categoryId", catId.toString());
    }
  }

  try {
    const res = await fetch(`${CURSEFORGE_API}/mods/search?${query.toString()}`, {
      headers: {
        "Accept": "application/json",
        "x-api-key": apiKey,
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: `CurseForge API Error: ${res.status} - ${errText}` }, { status: res.status });
    }

    const data = await res.json();

    const CLASS_ID_TO_PROJECT_TYPE: Record<number, string> = {
      6: "mod",
      4471: "modpack",
      12: "resourcepack",
      6552: "shader",
      6945: "datapack"
    };

    const mods = (data.data || []).map((m: any) => ({
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
      total: data.pagination?.totalCount || 0,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch from CurseForge" }, { status: 500 });
  }
}
