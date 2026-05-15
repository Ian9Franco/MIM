import { NextRequest, NextResponse } from "next/server";
import { buildHeaders, getAuthorName } from "@/services/modrinth/CollectionService";

const MODRINTH_API = "https://api.modrinth.com/v2";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ids = searchParams.get("ids");

  if (!ids) {
    return NextResponse.json({ error: "Missing ids" }, { status: 400 });
  }

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
      projectType: m.project_type
    })));

    return NextResponse.json({ mods });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
