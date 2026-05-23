import { NextRequest, NextResponse } from "next/server";
import { getApiKey } from "@/lib/core/settings";

function normalizeGalleryItem(g: any) {
  if (!g) return null;
  if (typeof g === "string") {
    return { url: g, thumbnailUrl: g, title: "" };
  }

  const url = g.url || g.raw_url || g.image_url || g.imageUrl || g.value || g.src || "";
  const thumbnailUrl =
    g.thumbnailUrl || g.thumbnail_url || g.url || g.raw_url || g.image_url || g.imageUrl || g.value || g.src || "";

  if (!url) return null;

  return {
    url,
    thumbnailUrl: thumbnailUrl || url,
    title: g.title || g.description || g.caption || "",
    description: g.description || g.caption || "",
    featured: g.featured || false,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const source = searchParams.get("source") || "modrinth";
  const debug = searchParams.get("debug") === "true";

  if (!projectId) return NextResponse.json({ error: "Falta projectId" }, { status: 400 });

  try {
    if (source === "curseforge") {
      const apiKey = getApiKey("curseforge");
      if (!apiKey) return NextResponse.json({ error: "CF API Key missing" }, { status: 503 });

      const cfUrl = `https://api.curseforge.com/v1/mods/${projectId}`;
      if (debug) console.log(`[Gallery] CF Fetching: ${cfUrl}`);

      const res = await fetch(cfUrl, {
        headers: { "x-api-key": apiKey }
      });
      
      if (!res.ok) {
        const errText = await res.text();
        console.error(`[Gallery] CF HTTP ${res.status}: ${errText}`);
        throw new Error(`CurseForge error: ${res.status}`);
      }

      const data = await res.json();
      if (debug) console.log("[Gallery] CF Response data:", data);
      
      const gallery = (data.data?.screenshots || []).map((s: any) => {
        // Validar que las URLs sean válidas
        if (!s.url) return null;
        return {
          url: s.url,
          thumbnailUrl: s.thumbnailUrl || s.url,
          title: s.title || ""
        };
      }).filter(Boolean); // Filtrar null values
      
      if (debug) console.log(`[Gallery] CF Returning ${gallery.length} images`);
      return NextResponse.json({ gallery, _debug: { source: "curseforge", projectId, count: gallery.length } });
    } else {
      // Modrinth
      const mrUrl = `https://api.modrinth.com/v2/project/${projectId}`;
      if (debug) console.log(`[Gallery] MR Fetching: ${mrUrl}`);

      const res = await fetch(mrUrl);
      
      if (!res.ok) {
        const errText = await res.text();
        console.error(`[Gallery] MR HTTP ${res.status}: ${errText}`);
        throw new Error(`Modrinth error: ${res.status}`);
      }

      const data = await res.json();
      if (debug) console.log("[Gallery] MR Response:", data);

      // Manejar ambos formatos: array de strings o array de objetos
      const rawGallery = [
        ...(data.featured_gallery ? [data.featured_gallery] : []),
        ...(data.gallery || []),
        ...(data.galleryItems || [])
      ];
      if (debug) console.log(`[Gallery] MR Raw gallery length: ${rawGallery.length}`, rawGallery.slice(0, 2));

      const gallery = rawGallery
        .map(normalizeGalleryItem)
        .filter((g: any) => g && g.url);
      
      if (debug) console.log(`[Gallery] MR Returning ${gallery.length} images`);
      return NextResponse.json({ gallery, _debug: { source: "modrinth", projectId, count: gallery.length, rawLength: rawGallery.length } });
    }
  } catch (e: any) {
    console.error("[ModGallery API] Error:", e.message);
    return NextResponse.json({ 
      error: e.message, 
      gallery: [],
      _debug: { source, projectId, error: e.message }
    }, { status: 500 });
  }
}
