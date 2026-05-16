/**
 * /api/crosscheck/batch — POST
 * ─────────────────────────────────────────────────────────────────────────────
 * Verifica la existencia de múltiples mods en la plataforma opuesta en una sola
 * solicitud batch para optimizar el uso de APIs.
 *
 * Body: { mods: Array<{title: string, slug?: string, source: string}> }
 * Respuesta: { results: Record<string, { exists: boolean }> }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import { getRawEnv } from "@/lib/env";
import { getApiKey } from "@/lib/settings";

const CURSEFORGE_API = "https://api.curseforge.com/v1";
const MODRINTH_API = "https://api.modrinth.com/v2";

interface BatchRequest {
  mods: Array<{
    title: string;
    slug?: string;
    source: string;
  }>;
}

export async function POST(req: NextRequest) {
  try {
    const { mods } = (await req.json()) as BatchRequest;
    
    if (!mods || !Array.isArray(mods) || mods.length === 0) {
      return NextResponse.json({ error: "Missing or empty mods array" }, { status: 400 });
    }

    const results: Record<string, { exists: boolean }> = {};

    // Procesar mods de CurseForge buscando en Modrinth
    const curseforgeMods = mods.filter(m => m.source === "curseforge");
    if (curseforgeMods.length > 0) {
      try {
        // Intentar búsqueda por slugs primero (más preciso)
        const slugs = curseforgeMods.map(m => m.slug).filter(Boolean);
        const slugResults: Record<string, boolean> = {};
        
        if (slugs.length > 0) {
          // Batch request por slugs
          const slugPromises = slugs.map(async (slug) => {
            try {
              const res = await fetch(`${MODRINTH_API}/project/${encodeURIComponent(slug!)}`);
              return { slug, exists: res.ok };
            } catch {
              return { slug, exists: false };
            }
          });
          
          const slugResponses = await Promise.all(slugPromises);
          slugResponses.forEach(({ slug, exists }) => {
            slugResults[slug!] = exists;
          });
        }

        // Para los que no tienen slug o no se encontraron, buscar por título
        const titleSearchMods = curseforgeMods.filter(m => 
          !m.slug || !slugResults[m.slug]
        );
        
        if (titleSearchMods.length > 0) {
          // Búsqueda batch por títulos - usar límite mayor para cubrir todos
          const queries = titleSearchMods.map(m => encodeURIComponent(m.title));
          const searchPromises = queries.map(async (query, index) => {
            try {
              const res = await fetch(`${MODRINTH_API}/search?query=${query}&limit=10`);
              if (res.ok) {
                const data = await res.json();
                const currentMod = titleSearchMods[index];
                const normalizedTitle = currentMod.title.toLowerCase().replace(/[^a-z0-9]/g, "");
                const exists = data.hits?.some((h: any) => {
                  const hTitle = h.title.toLowerCase().replace(/[^a-z0-9]/g, "");
                  return hTitle === normalizedTitle || 
                         h.slug.toLowerCase() === currentMod.slug?.toLowerCase();
                });
                return { key: currentMod.title + (currentMod.slug || ""), exists };
              }
              return { key: titleSearchMods[index].title + (titleSearchMods[index].slug || ""), exists: false };
            } catch {
              return { key: titleSearchMods[index].title + (titleSearchMods[index].slug || ""), exists: false };
            }
          });
          
          const titleResponses = await Promise.all(searchPromises);
          titleResponses.forEach(({ key, exists }) => {
            results[key] = { exists };
          });
        }

        // Combinar resultados de slug
        curseforgeMods.forEach(mod => {
          const key = mod.title + (mod.slug || "");
          if (mod.slug && slugResults[mod.slug] !== undefined) {
            results[key] = { exists: slugResults[mod.slug] };
          } else if (!results[key]) {
            results[key] = { exists: false };
          }
        });
      } catch (err) {
        console.error("[BatchCrossCheck] Error checking CurseForge mods:", err);
        curseforgeMods.forEach(mod => {
          results[mod.title + (mod.slug || "")] = { exists: false };
        });
      }
    }

    // Procesar mods de Modrinth buscando en CurseForge
    const modrinthMods = mods.filter(m => m.source === "modrinth");
    if (modrinthMods.length > 0) {
      const apiKey = getApiKey("curseforge");
      if (!apiKey) {
        // Sin API key, marcar todos como no encontrados
        modrinthMods.forEach(mod => {
          results[mod.title + (mod.slug || "")] = { exists: false };
        });
      } else {
        try {
          // Batch search en CurseForge - aumentar pageSize para cubrir más resultados
          const searchPromises = modrinthMods.map(async (mod) => {
            try {
              const searchQuery = encodeURIComponent(mod.slug || mod.title);
              const res = await fetch(
                `${CURSEFORGE_API}/mods/search?gameId=432&searchFilter=${searchQuery}&pageSize=20`,
                {
                  headers: { "x-api-key": apiKey, "Accept": "application/json" }
                }
              );
              
              if (res.ok) {
                const data = await res.json();
                const normalizedTitle = mod.title.toLowerCase().replace(/[^a-z0-9]/g, "");
                const exists = data.data?.some((m: any) => {
                  const mName = m.name.toLowerCase().replace(/[^a-z0-9]/g, "");
                  return mName === normalizedTitle || 
                         m.slug.toLowerCase() === mod.slug?.toLowerCase();
                });
                return { key: mod.title + (mod.slug || ""), exists };
              }
              return { key: mod.title + (mod.slug || ""), exists: false };
            } catch {
              return { key: mod.title + (mod.slug || ""), exists: false };
            }
          });
          
          const curseResponses = await Promise.all(searchPromises);
          curseResponses.forEach(({ key, exists }) => {
            results[key] = { exists };
          });
        } catch (err) {
          console.error("[BatchCrossCheck] Error checking Modrinth mods:", err);
          modrinthMods.forEach(mod => {
            results[mod.title + (mod.slug || "")] = { exists: false };
          });
        }
      }
    }

    return NextResponse.json({ results });
  } catch (err) {
    console.error("[BatchCrossCheck] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
