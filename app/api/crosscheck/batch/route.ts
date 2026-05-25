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
import { getRawEnv } from "@/lib/core/env";
import { getApiKey } from "@/lib/core/settings";

const CURSEFORGE_API = "https://api.curseforge.com/v1";
const MODRINTH_API = "https://api.modrinth.com/v2";

const modrinthCompatibilityCache = new Map<string, { exists: boolean, client_side?: string, server_side?: string, timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

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

    const results: Record<string, { exists: boolean; client_side?: string; server_side?: string }> = {};

    // Procesar mods de CurseForge buscando en Modrinth
    const curseforgeMods = mods.filter(m => m.source === "curseforge");
    if (curseforgeMods.length > 0) {
      try {
        // Intentar búsqueda por slugs primero (más preciso)
        const slugs = curseforgeMods.map(m => m.slug).filter(Boolean);
        const slugResults: Record<string, { exists: boolean; client_side?: string; server_side?: string }> = {};
        
        if (slugs.length > 0) {
          // Batch request por slugs (checking cache first)
          const now = Date.now();
          const slugPromises = slugs.map(async (slug) => {
            if (!slug) return { slug, exists: false };
            
            const cacheKey = `mr_slug_${slug}`;
            const cached = modrinthCompatibilityCache.get(cacheKey);
            if (cached && now - cached.timestamp < CACHE_TTL) {
              return { slug, ...cached };
            }

            try {
              const res = await fetch(`${MODRINTH_API}/project/${encodeURIComponent(slug)}`);
              if (res.ok) {
                const data = await res.json();
                const result = { exists: true, client_side: data.client_side, server_side: data.server_side };
                modrinthCompatibilityCache.set(cacheKey, { ...result, timestamp: now });
                return { slug, ...result };
              }
              modrinthCompatibilityCache.set(cacheKey, { exists: false, timestamp: now });
              return { slug, exists: false };
            } catch {
              return { slug, exists: false };
            }
          });
          
          const slugResponses = await Promise.all(slugPromises);
          slugResponses.forEach((res: any) => {
            slugResults[res.slug!] = { exists: res.exists, client_side: res.client_side, server_side: res.server_side };
          });
        }

        // Para los que no tienen slug o no se encontraron, buscar por título
        const titleSearchMods = curseforgeMods.filter(m => 
          !m.slug || !slugResults[m.slug]?.exists
        );
        
        if (titleSearchMods.length > 0) {
          // Búsqueda batch por títulos - usar límite mayor para cubrir todos
          const now = Date.now();
          const searchPromises = titleSearchMods.map(async (mod) => {
            const query = encodeURIComponent(mod.title);
            const cacheKey = `mr_search_${query}`;
            const cached = modrinthCompatibilityCache.get(cacheKey);
            
            if (cached && now - cached.timestamp < CACHE_TTL) {
              return { key: mod.title + (mod.slug || ""), ...cached };
            }

            try {
              const res = await fetch(`${MODRINTH_API}/search?query=${query}&limit=5`);
              if (res.ok) {
                const data = await res.json();
                const matchedMod = data.hits?.find((h: any) => {
                  const hName = (h.title || h.slug || "").toLowerCase().replace(/[^a-z0-9]/g, "");
                  const modName = mod.title.toLowerCase().replace(/[^a-z0-9]/g, "");
                  return hName === modName || hName.includes(modName) || modName.includes(hName);
                });
                
                const result = { 
                  exists: !!matchedMod, 
                  client_side: matchedMod?.client_side, 
                  server_side: matchedMod?.server_side 
                };
                
                modrinthCompatibilityCache.set(cacheKey, { ...result, timestamp: now });
                return { key: mod.title + (mod.slug || ""), ...result };
              }
              modrinthCompatibilityCache.set(cacheKey, { exists: false, timestamp: now });
              return { key: mod.title + (mod.slug || ""), exists: false };
            } catch {
              return { key: mod.title + (mod.slug || ""), exists: false };
            }
          });
          
          const searchResponses = await Promise.all(searchPromises);
          searchResponses.forEach((res: any) => {
            results[res.key] = { exists: res.exists, client_side: res.client_side, server_side: res.server_side };
          });
        }

        // Combinar resultados de slug
        curseforgeMods.forEach(mod => {
          const key = mod.title + (mod.slug || "");
          if (mod.slug && slugResults[mod.slug]?.exists) {
            results[key] = { exists: true, client_side: slugResults[mod.slug].client_side, server_side: slugResults[mod.slug].server_side };
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
