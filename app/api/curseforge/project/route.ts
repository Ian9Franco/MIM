/**
 * /api/curseforge/project — GET
 * ─────────────────────────────────────────────────────────────────────────────
 * Obtiene los detalles de un proyecto en CurseForge, incluyendo su descripción.
 */

import { NextRequest, NextResponse } from "next/server";
import { getRawEnv } from "@/lib/core/env";
import { getApiKey } from "@/lib/core/settings";

const CURSEFORGE_API = "https://api.curseforge.com/v1";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  let projectId = searchParams.get("projectId");
  let slug = searchParams.get("slug");
  
  // Si projectId está presente pero NO es un número, asumimos que es un slug
  // Esto arregla los clicks desde el Showcase que pasan el slug en la prop projectId
  if (projectId && !/^\d+$/.test(projectId)) {
    slug = projectId;
    projectId = null;
  }
  
  // Carga Manual (Bypass Next.js)
  const apiKey = getApiKey("curseforge");

  if (!projectId && !slug) {
    return NextResponse.json({ error: "Missing projectId or slug" }, { status: 400 });
  }

  if (!apiKey) {
    return NextResponse.json({ error: "CURSEFORGE_API_KEY not set" }, { status: 503 });
  }

  const headers = {
    "x-api-key": apiKey,
    "Accept": "application/json",
  };

  try {
    // Si se provee slug, resolvemos el projectId usando el endpoint de búsqueda
    if (!projectId && slug) {
      const searchRes = await fetch(`${CURSEFORGE_API}/mods/search?gameId=432&slug=${encodeURIComponent(slug)}`, { headers });
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.data && searchData.data.length > 0) {
          projectId = searchData.data[0].id.toString();
        } else {
          return NextResponse.json({ error: "Project not found by slug" }, { status: 404 });
        }
      } else {
        return NextResponse.json({ error: "Failed to resolve slug" }, { status: 404 });
      }
    }

    // CurseForge IDs are strictly numeric. If a non-numeric ID is passed, return 404 gracefully
    if (!projectId || !/^\d+$/.test(projectId)) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // 1. Obtener detalles del mod
    const modRes = await fetch(`${CURSEFORGE_API}/mods/${projectId}`, { headers });
    if (!modRes.ok) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    const modData = await modRes.json();

    // 2. Obtener descripción
    const descRes = await fetch(`${CURSEFORGE_API}/mods/${projectId}/description`, { headers });
    const descData = await descRes.json().catch(() => ({ data: "" }));

    // 3. Crosscheck con Modrinth para obtener el entorno preciso (client/server)
    try {
      if (modData.data && modData.data.slug) {
        // Fetch a Modrinth usando el slug
        const mrRes = await fetch(`https://api.modrinth.com/v2/project/${modData.data.slug}`);
        if (mrRes.ok) {
          const mrData = await mrRes.json();
          modData.data.client_side = mrData.client_side;
          modData.data.server_side = mrData.server_side;
        } else {
          // Fallback a búsqueda por título si el slug exacto falla
          const query = encodeURIComponent(modData.data.name);
          const mrSearch = await fetch(`https://api.modrinth.com/v2/search?query=${query}&limit=5`);
          if (mrSearch.ok) {
            const searchData = await mrSearch.json();
            const matchedMod = searchData.hits?.find((h: any) => {
              const hName = (h.title || h.slug || "").toLowerCase().replace(/[^a-z0-9]/g, "");
              const modName = modData.data.name.toLowerCase().replace(/[^a-z0-9]/g, "");
              return hName === modName || hName.includes(modName) || modName.includes(hName);
            });
            if (matchedMod) {
              modData.data.client_side = matchedMod.client_side;
              modData.data.server_side = matchedMod.server_side;
            }
          }
        }
      }
    } catch (e) {
      console.error("[/api/curseforge/project] Error en crosscheck de entorno:", e);
    }

    return NextResponse.json({
      ...modData.data,
      body: descData.data || "", // CurseForge usa HTML en la descripción
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[/api/curseforge/project] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
