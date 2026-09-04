import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiGuard } from "@/lib/apiGuard";
import { getApiKey } from "@/lib/core/settings";
import { CurseForgeService } from "@/services/curseforge/CurseForgeService";

const querySchema = z.object({
  loader: z.string().optional().default("forge"),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(21),
  sort: z.string().optional().default("featured"),
  projectType: z.string().optional().default("mod"),
  q: z.string().optional().default(""),
  gameVersions: z.string().optional(),
  categories: z.string().optional(),
  environments: z.string().optional(),
});

/**
 * Endpoint de descubrimiento para CurseForge.
 * Delega la lógica de búsqueda y normalización al CurseForgeService.
 */
export const GET = withApiGuard(
  {
    rateLimit: { windowMs: 60 * 1000, maxRequests: 60 },
    querySchema,
  },
  async ({ query }) => {
    const apiKey = getApiKey("curseforge");

    if (!apiKey) {
      return NextResponse.json({ error: "API key de CurseForge no configurada" }, { status: 503 });
    }

    const { loader, page, pageSize, sort, projectType, q, gameVersions: gameVersionsStr, categories: categoriesStr, environments: environmentsStr } = query;

    const params = {
      loader,
      page,
      pageSize,
      sort,
      projectType,
      q: q.trim(),
      gameVersions: gameVersionsStr ? JSON.parse(gameVersionsStr) : [],
      categories: categoriesStr ? JSON.parse(categoriesStr) : [],
      environments: environmentsStr ? JSON.parse(environmentsStr) : [],
    };

    try {
      const result = await CurseForgeService.search(params, apiKey);
      return NextResponse.json({
        ...result,
        page: params.page,
        totalPages: Math.ceil(result.total / params.pageSize),
        source: "curseforge",
      });
    } catch (e: any) {
      console.error("[CF Discover] Error:", e.message);
      return NextResponse.json({ error: e.message }, { status: 502 });
    }
  }
);
