import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiGuard } from "@/lib/apiGuard";
import { getApiKey } from "@/lib/core/settings";

/**
 * Base de datos curada de mods por colección.
 * Si el slug está aquí, usamos estos datos directamente.
 */
const CURATED_MODS: Record<string, string[]> = {
  "curseforge-apr26": [
    "blocks-previewer", "msu", "seeds-bag", "ardas-uncrafting-table", "thewasteland",
    "furniture-medieval", "the-wings-of-fire", "nocubes-food-desire", "hellish-trials", "the-zenith-sword"
  ],
  "curseforge-mar26": [
    "exposure", "trowel", "better-than-mending", "supplementaries", "farmers-delight",
    "create", "alexsmobs", "quark", "waystones", "blue-skies"
  ],
  "curseforge-feb26": [
    "biomes-o-plenty", "serene-seasons", "tough-as-nails", "corpse", "xaeros-minimap",
    "iron-chests", "storage-drawers", "refined-storage", "applied-energistics-2", "journeymap"
  ],
  "the-best-minecraft-mods-of-2024": [
    "valhelsia-structures", "moog-voyager-structures", "exposure", "trowel", "better-than-mending",
    "serene-seasons", "alexsmobs", "create", "farmers-delight", "supplementaries"
  ]
};

async function scrapeModSlugs(collectionSlug: string): Promise<string[]> {
  const url = `https://www.curseforge.com/community-picks/minecraft/${collectionSlug}`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      next: { revalidate: 3600 }
    });

    if (!res.ok) return [];

    const html = await res.text();
    const matches = [...html.matchAll(/\/minecraft\/mc-mods\/([a-z0-9-]+)(?:["'/])/gi)];
    const slugs = [...new Set(matches.map((m) => m[1]))];
    const blocked = new Set(["files", "download", "all", "install", "external", "discord", "settings"]);
    return slugs.filter((s) => s.length > 2 && !blocked.has(s));
  } catch {
    return [];
  }
}

async function fetchModBySlug(slug: string, apiKey: string): Promise<any | null> {
  try {
    const searchRes = await fetch(
      `https://api.curseforge.com/v1/mods/search?gameId=432&slug=${encodeURIComponent(slug)}`,
      { headers: { "x-api-key": apiKey } }
    );
    if (!searchRes.ok) return null;
    const data = await searchRes.json();
    return data.data?.find((m: any) => m.slug === slug) ?? data.data?.[0] ?? null;
  } catch {
    return null;
  }
}

function normalizeMod(m: any) {
  return {
    projectId: m.id.toString(),
    slug: m.slug,
    title: m.name,
    description: m.summary,
    iconUrl: m.logo?.thumbnailUrl ?? m.logo?.url ?? null,
    author: m.authors?.[0]?.name ?? "Unknown",
    downloads: m.downloadCount ?? 0,
    follows: 0,
    latestVersion: null,
    dateCreated: m.dateCreated ?? "",
    categories: m.categories?.map((c: any) => c.name) ?? [],
    url: m.links?.websiteUrl ?? `https://www.curseforge.com/minecraft/mc-mods/${m.slug}`,
    projectType: m.classId === 6 ? "mod" : m.classId === 4471 ? "modpack" : "mod",
    _source: "curseforge",
  };
}

const paramsSchema = z.object({
  slug: z.string().min(1, "Missing slug"),
});

export const GET = withApiGuard(
  {
    rateLimit: { windowMs: 60 * 1000, maxRequests: 60 },
    paramsSchema,
  },
  async ({ params: routeParams }) => {
    const { slug } = routeParams;
    const apiKey = getApiKey("curseforge");

    // 1. Prioridad: Base de datos curada
    let modSlugs = CURATED_MODS[slug] || [];

    // 2. Fallback: Scraping si no está en la base de datos
    if (modSlugs.length === 0) {
      if (process.send && process.env.NODE_ENV === 'production') {
        // Estamos en Electron (PROD) - Usamos el scraper indestructible por IPC
        modSlugs = await new Promise<string[]>((resolve) => {
          const listener = (msg: any) => {
            if (msg.type === 'scrape_mods_response' && msg.slug === slug) {
              process.off('message', listener);
              resolve(msg.mods || []);
            }
          };
          process.on('message', listener);
          process.send!({ type: 'scrape_mods', slug });
          
          // Timeout de seguridad de 15 segundos
          setTimeout(() => {
            process.off('message', listener);
            resolve([]);
          }, 15000);
        });
      } else {
        // Estamos en DEV (npm run dev) - Fallback al fetch directo
        modSlugs = await scrapeModSlugs(slug);
        
        // Si el fetch directo falla (403) en DEV, usamos mock data específica por slug
        if (modSlugs.length === 0) {
          const DEV_MOCKS: Record<string, string[]> = {
            // May 2026
            "may-collection-2026":      ["star-wars-mod", "galacticraft-legacy", "immersive-portals-mod", "sodium", "iris"],
            "lupin-may26":              ["mekanism", "thermal-expansion", "applied-energistics-2", "refined-storage", "create"],
            // April 2026
            "curseforge-apr26":         ["blocks-previewer", "msu", "seeds-bag", "thewasteland", "the-zenith-sword"],
            "apr-collection-2026":      ["egg-item", "bunny-overload", "easter-eggs", "springtime", "jei"],
            // March 2026
            "lupin-mar26":              ["zombie-apocalypse", "lost-cities", "torchmaster", "tough-as-nails", "sophisticated-backpacks"],
            "curseforge-mar26":         ["exposure", "trowel", "better-than-mending", "supplementaries", "farmers-delight"],
            "mar-collection-2026":      ["alexsmobs", "exotic-birds", "the-zoo", "creature-mod", "waddles"],
            // February 2026
            "feb-collection-2026":      ["biomes-o-plenty", "serene-seasons", "tough-as-nails", "xaeros-minimap", "journeymap"],
            "infernal-studios-feb26":   ["hytale-reborn", "player-animator", "geckolib", "fabric-api", "cloth-config"],
            // January 2026
            "curseforge-jan26":         ["trepidation", "dungeons-arise", "when-dungeons-arise", "raid-mod", "goblin-traders"],
            "doublesal-jan26":          ["neep-meat", "mite-beyond", "neep-meat-trifecta", "pam-harvestcraft-2", "spice-of-life"],
            "jan-collection-2026":      ["education-mod", "scicraft", "computercraft", "mathematics-mod", "physics-mod"],
            // December 2025
            "curseforge-dec25":         ["valhelsia-structures", "moog-voyager-structures", "dungeons-arise", "repurposed-structures", "yung-extras"],
            "noxus-dec25":              ["create", "alexsmobs", "supplementaries", "farmers-delight", "serene-seasons"],
            "sircolor-dec25":           ["aquaculture", "fins-and-tails", "drowned-expansion", "better-diving", "water-strainer"],
          };
          modSlugs = DEV_MOCKS[slug] || [];
          if (modSlugs.length === 0) {
            console.log(`[DEV] Sin mock data para "${slug}". Retornando vacío (normal en dev por el 403 de Cloudflare).`);
          } else {
            console.log(`[DEV] Usando mock data para "${slug}"`);
          }
        }
      }
    }

    if (modSlugs.length === 0) {
      return NextResponse.json({ mods: [], message: "No se encontraron mods para esta colección." });
    }

    if (!apiKey) {
      return NextResponse.json({
        mods: modSlugs.map(s => ({
          projectId: s,
          slug: s,
          title: s.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
          author: "CurseForge",
          _source: "curseforge"
        }))
      });
    }

    const results: any[] = [];
    const BATCH_SIZE = 5;
    for (let i = 0; i < modSlugs.length; i += BATCH_SIZE) {
      const batch = modSlugs.slice(i, i + BATCH_SIZE);
      const settled = await Promise.allSettled(batch.map(s => fetchModBySlug(s, apiKey)));
      settled.forEach(r => {
        if (r.status === "fulfilled" && r.value) results.push(normalizeMod(r.value));
      });
    }

    return NextResponse.json({ mods: results });
  }
);
