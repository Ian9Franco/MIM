import { NextRequest, NextResponse } from "next/server";
import { getApiKey } from "@/lib/settings";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const source = searchParams.get("source") || "modrinth";

  if (!projectId) return NextResponse.json({ error: "Falta projectId" }, { status: 400 });

  try {
    if (source === "curseforge") {
      const apiKey = getApiKey("curseforge");
      if (!apiKey) return NextResponse.json({ error: "CF API Key missing" }, { status: 503 });

      const res = await fetch(`https://api.curseforge.com/v1/mods/${projectId}`, {
        headers: { "x-api-key": apiKey }
      });
      
      if (!res.ok) {
        throw new Error(`CurseForge error: ${res.status}`);
      }

      const data = await res.json();
      const gallery = (data.data?.screenshots || []).map((s: any) => ({
        url: s.url,
        thumbnailUrl: s.thumbnailUrl || s.url,
        title: s.title || ""
      }));
      
      return NextResponse.json({ gallery });
    } else {
      // Modrinth
      const res = await fetch(`https://api.modrinth.com/v2/project/${projectId}`);
      
      if (!res.ok) {
        throw new Error(`Modrinth error: ${res.status}`);
      }

      const data = await res.json();
      const gallery = (data.gallery || []).map((g: any) => ({
        url: g.raw_url || g.url, // Usar la imagen original de alta resolución
        thumbnailUrl: g.url,     // Usar la versión de 350px para la previa
        title: g.title || "",
        description: g.description || "",
        featured: g.featured || false
      }));
      
      return NextResponse.json({ gallery });
    }
  } catch (e: any) {
    console.error("[ModGallery API] Error:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
