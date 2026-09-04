import { NextRequest, NextResponse } from "next/server";
import { getRawEnv } from "@/lib/core/env";
import { getApiKey } from "@/lib/core/settings";
import { withApiGuard } from "@/lib/apiGuard";

const CURSEFORGE_API = "https://api.curseforge.com/v1";
const MODRINTH_API = "https://api.modrinth.com/v2";

export const GET = withApiGuard(
  {},
  async ({ request }) => {
    const req = request as NextRequest;

  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title")?.trim();
  const source = searchParams.get("source"); // El origen actual del mod
  const slug = searchParams.get("slug")?.trim();

  if (!title && !slug) return NextResponse.json({ exists: false });

  try {
    // Si el mod viene de CurseForge, lo buscamos en Modrinth
    if (source === "curseforge") {
      // Intentar búsqueda por slug primero (más preciso)
      if (slug) {
        const slugRes = await fetch(`${MODRINTH_API}/project/${slug}`);
        if (slugRes.ok) return NextResponse.json({ exists: true });
      }
      
      // Búsqueda por título (aumentamos limit a 5 para mayor precisión)
      const res = await fetch(`${MODRINTH_API}/search?query=${encodeURIComponent(title || "")}&limit=5`);
      if (res.ok) {
        const data = await res.json();
        const normalizedTitle = title?.toLowerCase().replace(/[^a-z0-9]/g, "");
        const exists = data.hits?.some((h: any) => {
          const hTitle = h.title.toLowerCase().replace(/[^a-z0-9]/g, "");
          return hTitle === normalizedTitle || 
                 h.slug.toLowerCase() === slug?.toLowerCase() ||
                 hTitle.includes(normalizedTitle || "____") ||
                 normalizedTitle?.includes(hTitle || "____");
        });
        return NextResponse.json({ exists });
      }
    } 
    // Si el mod viene de Modrinth, lo buscamos en CurseForge
    else if (source === "modrinth") {
      const apiKey = getApiKey("curseforge");
      if (!apiKey) return NextResponse.json({ exists: false });

      // Aumentamos pageSize a 10 para buscar entre los primeros resultados
      const res = await fetch(`${CURSEFORGE_API}/mods/search?gameId=432&searchFilter=${encodeURIComponent(title || slug || "")}&pageSize=10`, {
        headers: { "x-api-key": apiKey, "Accept": "application/json" }
      });
      if (res.ok) {
        const data = await res.json();
        const normalizedTitle = title?.toLowerCase().replace(/[^a-z0-9]/g, "");
        const exists = data.data?.some((m: any) => {
          const mName = m.name.toLowerCase().replace(/[^a-z0-9]/g, "");
          return mName === normalizedTitle || 
                 m.slug.toLowerCase() === slug?.toLowerCase() ||
                 mName.includes(normalizedTitle || "____") ||
                 normalizedTitle?.includes(mName || "____");
        });
        return NextResponse.json({ exists });
      }
    }

    return NextResponse.json({ exists: false });
  } catch (err) {
    console.error("[CrossCheck] Error checking existence:", err);
    return NextResponse.json({ exists: false }, { status: 500 });
  }

  }
);
