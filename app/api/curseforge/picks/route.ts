import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

/**
 * Registro de colecciones conocidas y sus metadatos.
 * Esto asegura que las colecciones principales funcionen siempre, incluso sin scraping.
 */
const KNOWN_PICKS = [
  {
    id: "curseforge-apr26",
    name: "10 Cool New Minecraft Mods (Abril)",
    description: "Nuevas mecánicas, bloques y tweaks frescos para recibir la primavera.",
    iconUrl: "https://www.curseforge.com/community-picks/assets/minecraft/curseforge-apr26/featured-thumbnail.webp",
    slug: "curseforge-apr26",
    source: "curseforge",
    projectCount: 10
  },
  {
    id: "curseforge-mar26",
    name: "CurseForge Picks (Marzo)",
    description: "Selección de mods destacados por la comunidad durante el mes de marzo.",
    iconUrl: "https://www.curseforge.com/community-picks/assets/minecraft/curseforge-mar26/featured-thumbnail.webp",
    slug: "curseforge-mar26",
    source: "curseforge",
    projectCount: 10
  },
  {
    id: "curseforge-feb26",
    name: "CurseForge Picks (Febrero)",
    description: "Los mejores mods del mes de febrero, curados por CurseForge.",
    iconUrl: "https://www.curseforge.com/community-picks/assets/minecraft/curseforge-feb26/featured-thumbnail.webp",
    slug: "curseforge-feb26",
    source: "curseforge",
    projectCount: 10
  },
  {
    id: "the-best-minecraft-mods-of-2024",
    name: "Best Mods of 2024",
    description: "Una retrospectiva de los mods que definieron el año 2024.",
    iconUrl: "https://www.curseforge.com/community-picks/assets/minecraft/the-best-minecraft-mods-of-2024/featured-thumbnail.webp",
    slug: "the-best-minecraft-mods-of-2024",
    source: "curseforge",
    projectCount: 15
  }
];

async function scrapeCollections() {
  const url = "https://www.curseforge.com/community-picks/minecraft";
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      next: { revalidate: 3600 } // Cache por 1 hora
    });

    if (!res.ok) return [];

    const html = await res.text();
    
    // Buscamos el patrón de las tarjetas de colecciones.
    // Usamos una regex que capture el slug y el título si es posible.
    // Basado en el doc del usuario, los slugs están en links que dicen "View Community Picks"
    const slugMatches = [...html.matchAll(/href="\/community-picks\/minecraft\/([a-z0-9-]+)"[^>]*>View Community Picks/gi)];
    
    // Para cada slug, intentamos buscar el título y la imagen asociados en el HTML (esto es más complejo con regex)
    // Pero podemos intentar capturar bloques de tarjetas.
    const collections = slugMatches.map(match => {
      const slug = match[1];
      
      return {
        id: slug,
        name: slug.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" "),
        description: "Community selection from CurseForge",
        iconUrl: `https://www.curseforge.com/community-picks/assets/minecraft/${slug}/featured-thumbnail.webp`,
        slug: slug,
        source: "curseforge",
        projectCount: 0 
      };
    });

    return collections;
  } catch (e) {
    console.error("Error scraping collections:", e);
    return [];
  }
}

function getCachedPicks() {
  const possiblePaths = [
    path.join(process.cwd(), "curseforge_picks_cache.json"),
    path.join(process.cwd(), "..", "..", "curseforge_picks_cache.json"),
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        const data = JSON.parse(fs.readFileSync(p, "utf8"));
        return data.picks || [];
      } catch (e) {
        console.error("Error reading curseforge cache:", e);
      }
    }
  }
  return [];
}

export async function GET(req: NextRequest) {
  // 1. Intentamos leer de la caché generada por Electron (Indestructible)
  let discovered = getCachedPicks();
  
  // 2. Si no hay caché, fallback al scraping ligero (v1)
  if (discovered.length === 0) {
    discovered = await scrapeCollections();
  }

  let allPicks = [...discovered];
  
  // 3. Mezclamos con las conocidas evitando duplicados
  KNOWN_PICKS.forEach(k => {
    if (!allPicks.find(p => p.slug === k.slug)) {
      allPicks.push(k as any);
    }
  });

  return NextResponse.json({ picks: allPicks }, {
    headers: {
      "Cache-Control": "s-maxage=3600, stale-while-revalidate=7200",
    },
  });
}
