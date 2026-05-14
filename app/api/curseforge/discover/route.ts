import { NextRequest, NextResponse } from "next/server";
import { getApiKey } from "@/lib/settings";
import { CurseForgeService } from "@/services/curseforge/CurseForgeService";

/**
 * Endpoint de descubrimiento para CurseForge.
 * Delega la lógica de búsqueda y normalización al CurseForgeService.
 */
export async function GET(req: NextRequest) {
  const apiKey = getApiKey("curseforge");

  if (!apiKey) {
    return NextResponse.json({ error: "API key de CurseForge no configurada" }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const params = {
    loader: searchParams.get("loader") || "forge",
    page: parseInt(searchParams.get("page") || "1"),
    pageSize: parseInt(searchParams.get("pageSize") || "20"),
    sort: searchParams.get("sort") || "featured",
    projectType: searchParams.get("projectType") || "mod",
    q: searchParams.get("q")?.trim() || "",
    gameVersions: searchParams.get("gameVersions") ? JSON.parse(searchParams.get("gameVersions")!) : []
  };

  try {
    const result = await CurseForgeService.search(params, apiKey);
    return NextResponse.json({
      ...result,
      page: params.page,
      totalPages: Math.ceil(result.total / params.pageSize),
      source: "curseforge"
    });
  } catch (e: any) {
    console.error("[CF Discover] Error:", e.message);
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
