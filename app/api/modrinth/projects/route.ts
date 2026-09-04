import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiGuard } from "@/lib/apiGuard";
import { buildHeaders, getAuthorName } from "@/services/modrinth/CollectionService";

const MODRINTH_API = "https://api.modrinth.com/v2";

const querySchema = z.object({
  ids: z.string().trim().min(1, "Missing or empty ids parameter"),
});

export const GET = withApiGuard(
  {
    rateLimit: { windowMs: 60 * 1000, maxRequests: 60 },
    querySchema,
  },
  async ({ query: { ids } }) => {
    const headers = buildHeaders() || { "User-Agent": "MIM-App/1.0" };

    try {
      const pRes = await fetch(`${MODRINTH_API}/projects?ids=${encodeURIComponent(ids)}`, { headers });
      if (!pRes.ok) return NextResponse.json({ error: "No se pudieron cargar los proyectos" }, { status: pRes.status });
      
      const projects = await pRes.json();
      const mods = await Promise.all(projects.map(async (m: any) => ({
        projectId: m.id,
        slug: m.slug,
        title: m.title,
        description: m.description,
        iconUrl: m.icon_url,
        author: await getAuthorName(m.id, headers),
        downloads: m.downloads,
        follows: m.followers,
        categories: m.categories,
        url: `https://modrinth.com/project/${m.slug}`,
        projectType: m.project_type,
        gallery: [
          ...(m.featured_gallery ? [m.featured_gallery] : []),
          ...(m.gallery || [])
        ].map((g: any) => {
          if (typeof g === 'string') {
            return { url: g, thumbnailUrl: g, title: "" };
          }
          return {
            url: g.raw_url || g.url,
            thumbnailUrl: g.url || g.raw_url,
            title: g.title || "",
            featured: g.featured || false
          };
        }).filter((g: any) => g && g.url)
      })));

      return NextResponse.json({ mods });
    } catch (e) {
      return NextResponse.json({ error: String(e) }, { status: 500 });
    }
  }
);
