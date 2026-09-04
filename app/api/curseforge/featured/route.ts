import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiGuard } from "@/lib/apiGuard";
import { getApiKey } from "@/lib/core/settings";

const CURSEFORGE_API = "https://api.curseforge.com/v1";

const querySchema = z.object({
  gameVersion: z.string().optional().default("1.20.1"),
});

export const GET = withApiGuard(
  {
    rateLimit: { windowMs: 60 * 1000, maxRequests: 60 },
    querySchema,
  },
  async () => {
    const apiKey = getApiKey("curseforge");

    if (!apiKey) {
      return NextResponse.json({ error: "CURSEFORGE_API_KEY no configurada" }, { status: 503 });
    }

    try {
      const res = await fetch(`${CURSEFORGE_API}/mods/featured`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "x-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gameId: 432,
          excludedModIds: [],
          gameVersionTypeId: null,
        }),
        cache: "no-store",
      });

      if (!res.ok) {
        return NextResponse.json({ error: "Error de CurseForge API" }, { status: res.status });
      }

      const data = await res.json();
      
      const getClassIdToProjectType = (classId: number) => {
        switch (classId) {
          case 6: return "mod";
          case 12: return "resourcepack";
          case 6552: return "shader";
          case 6945: return "datapack";
          case 4471: return "modpack";
          default: return "mod";
        }
      };

      const mapMod = (m: any) => ({
        projectId: m.id.toString(),
        slug: m.slug,
        title: m.name,
        description: m.summary,
        iconUrl: m.logo?.thumbnailUrl || m.logo?.url || null,
        author: m.authors?.[0]?.name ?? "Unknown",
        downloads: m.downloadCount,
        follows: 0,
        latestVersion: null,
        categories: m.categories?.map((c: any) => c.name) ?? [],
        dateCreated: m.dateCreated,
        url: m.links?.websiteUrl ?? "",
        projectType: getClassIdToProjectType(m.classId),
        gallery: (m.screenshots || []).map((s: any) => ({
          url: s.url,
          thumbnailUrl: s.thumbnailUrl || s.url,
          title: s.title || "",
        })),
      });

      return NextResponse.json({
        featured: (data.data?.featured ?? []).map(mapMod),
        popular: (data.data?.popular ?? []).map(mapMod),
        recentlyUpdated: (data.data?.recentlyUpdated ?? []).map(mapMod),
      });
    } catch {
      return NextResponse.json({ error: "Error de red al conectar con CurseForge" }, { status: 500 });
    }
  }
);
