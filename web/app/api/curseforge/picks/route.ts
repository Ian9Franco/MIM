import { NextResponse } from "next/server";

const CURSEFORGE_MINECRAFT_HOME = "https://www.curseforge.com/minecraft";
const PROJECT_PATH_TO_TYPE: Record<string, string> = {
  "mc-mods": "mod",
  "texture-packs": "resourcepack",
  shaders: "shader",
  modpacks: "modpack",
  "data-packs": "datapack",
};

const FALLBACK_PICKS = [
  {
    id: "curseforge-fallback-monthly",
    name: "CurseForge Monthly Picks",
    description: "Selección editorial de CurseForge para Minecraft.",
    iconUrl: "https://www.curseforge.com/community-picks/assets/minecraft/curseforge-apr26/featured-thumbnail.webp",
    source: "curseforge",
    projectCount: 3,
    previewIcons: [
      "https://media.forgecdn.net/avatars/583/94/637962453676839352.png",
      "https://media.forgecdn.net/avatars/412/120/637628373672909439.png",
      "https://media.forgecdn.net/avatars/615/340/637996373672809439.png",
    ],
    mods: [
      {
        projectId: "waystones",
        title: "Waystones",
        description: "Agrega bloques de teletransporte para viajar rápidamente por el mundo.",
        iconUrl: "https://media.forgecdn.net/avatars/583/94/637962453676839352.png",
        author: "Balm",
        projectType: "mod",
        categories: ["Forge", "Fabric", "Utility"],
        url: "https://www.curseforge.com/minecraft/mc-mods/waystones",
        _source: "curseforge",
      },
      {
        projectId: "xaeros-minimap",
        title: "Xaero's Minimap",
        description: "Un minimapa fluido y personalizable con waypoints y detalles del mapa.",
        iconUrl: "https://media.forgecdn.net/avatars/412/120/637628373672909439.png",
        author: "Xaero",
        projectType: "mod",
        categories: ["Forge", "Fabric"],
        url: "https://www.curseforge.com/minecraft/mc-mods/xaeros-minimap",
        _source: "curseforge",
      },
      {
        projectId: "natures-compass",
        title: "Nature's Compass",
        description: "Una brujula especial para localizar biomas y ver información sobre ellos.",
        iconUrl: "https://media.forgecdn.net/avatars/615/340/637996373672809439.png",
        author: "ChaosPlayr",
        projectType: "mod",
        categories: ["Forge", "Fabric"],
        url: "https://www.curseforge.com/minecraft/mc-mods/natures-compass",
        _source: "curseforge",
      },
    ],
  },
];

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(value: string) {
  return decodeHtml(value.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "));
}

function absoluteUrl(path: string) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `https://www.curseforge.com${path.startsWith("/") ? path : `/${path}`}`;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "curseforge";
}

async function fetchHtml(url: string) {
  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      "User-Agent": "MIM-Hub/1.0 (+https://mim-hub.vercel.app)",
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) throw new Error(`CurseForge HTML ${res.status}`);
  return res.text();
}

function imageNear(html: string, index: number) {
  const slice = html.slice(Math.max(0, index - 1200), Math.min(html.length, index + 2200));
  const imageMatch =
    slice.match(/<img[^>]+(?:src|data-src)=["']([^"']+)["'][^>]*>/i) ||
    slice.match(/(?:src|data-src)=["']([^"']+\.(?:png|jpe?g|webp)(?:\?[^"']*)?)["']/i);
  return imageMatch ? absoluteUrl(decodeHtml(imageMatch[1])) : undefined;
}

function descriptionNear(html: string, index: number) {
  const slice = html.slice(index, Math.min(html.length, index + 1800));
  const paragraphs = [...slice.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => stripTags(match[1]))
    .filter((text) => text.length > 24 && !/^By\s+/i.test(text));
  return paragraphs[0] || "";
}

function parseProjects(html: string, limit = 12) {
  const projectRegex = /<a[^>]+href=["']([^"']*\/minecraft\/(mc-mods|texture-packs|shaders|modpacks|data-packs)\/([^"'/?#]+)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const mods: any[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = projectRegex.exec(html)) && mods.length < limit) {
    const [, rawHref, pathType, slug, innerHtml] = match;
    const title = stripTags(innerHtml);
    if (!title || title.length < 3 || /^(view|install|download|browse all)$/i.test(title)) continue;
    if (seen.has(slug)) continue;
    seen.add(slug);

    const authorSlice = html.slice(match.index, Math.min(html.length, match.index + 900));
    const author = stripTags(authorSlice.match(/By\s+<\/?[^>]*>([\s\S]{1,120}?)(?:<|\n)/i)?.[1] || "") || "CurseForge";

    mods.push({
      projectId: decodeHtml(slug),
      title,
      description: descriptionNear(html, match.index),
      iconUrl: imageNear(html, match.index),
      author,
      projectType: PROJECT_PATH_TO_TYPE[pathType] || "mod",
      categories: [],
      url: absoluteUrl(rawHref),
      _source: "curseforge",
    });
  }

  return mods;
}

function parseSections(homeHtml: string) {
  const sections: any[] = [];
  const headingRegex = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
  const headings = [...homeHtml.matchAll(headingRegex)];

  headings.forEach((heading, index) => {
    const name = stripTags(heading[1]);
    if (!name || /popular categories/i.test(name)) return;

    const start = heading.index || 0;
    const end = headings[index + 1]?.index || homeHtml.length;
    const sectionHtml = homeHtml.slice(start, end);
    const mods = parseProjects(sectionHtml, 12);
    if (!mods.length) return;

    sections.push({
      id: `curseforge-${slugify(name)}`,
      name,
      description: `Selección de CurseForge: ${name}.`,
      iconUrl: mods.find((mod) => mod.iconUrl)?.iconUrl,
      source: "curseforge",
      projectCount: mods.length,
      previewIcons: mods.map((mod) => mod.iconUrl).filter(Boolean).slice(0, 6),
      mods,
    });
  });

  return sections;
}

function findMonthlyCollection(homeHtml: string) {
  const heroMatch = homeHtml.match(/<a[^>]+href=["']([^"']*\/community-picks\/minecraft\/[^"']+)["'][^>]*>\s*(?:<[^>]+>)*\s*View Collection/gi)?.[0];
  const href = heroMatch?.match(/href=["']([^"']+)["']/i)?.[1];
  const name =
    stripTags(homeHtml.match(/Top Mods for [A-Za-z]+/i)?.[0] || "") ||
    "CurseForge Monthly Picks";
  const description =
    stripTags(homeHtml.match(/Top Mods for [A-Za-z]+[\s\S]{0,400}?<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] || "") ||
    "Selección mensual de mods destacados por CurseForge.";

  return href ? { name, description, url: absoluteUrl(href) } : null;
}

async function buildMonthlyPick(homeHtml: string, sections: any[]) {
  const monthly = findMonthlyCollection(homeHtml);
  let mods: any[] = [];
  let iconUrl: string | undefined;

  if (monthly?.url) {
    const collectionHtml = await fetchHtml(monthly.url).catch(() => "");
    if (collectionHtml) {
      mods = parseProjects(collectionHtml, 24);
      iconUrl = imageNear(collectionHtml, 0);
    }
  }

  if (!mods.length) {
    const monthlySection = sections.find((section) => /monthly|theme|top mods/i.test(section.name));
    mods = monthlySection?.mods || [];
    iconUrl = monthlySection?.iconUrl;
  }

  if (!mods.length) return null;

  return {
    id: `curseforge-${slugify(monthly?.name || "monthly-picks")}`,
    name: monthly?.name || "CurseForge Monthly Picks",
    description: monthly?.description || "Selección mensual de mods destacados por CurseForge.",
    iconUrl: iconUrl || mods.find((mod) => mod.iconUrl)?.iconUrl,
    source: "curseforge",
    projectCount: mods.length,
    previewIcons: mods.map((mod) => mod.iconUrl).filter(Boolean).slice(0, 6),
    mods,
    url: monthly?.url,
  };
}

export async function GET() {
  try {
    const homeHtml = await fetchHtml(CURSEFORGE_MINECRAFT_HOME);
    const sections = parseSections(homeHtml);
    const monthlyPick = await buildMonthlyPick(homeHtml, sections);
    const collections = sections.filter((section) => section.id !== monthlyPick?.id);

    return NextResponse.json({
      picks: monthlyPick ? [monthlyPick] : FALLBACK_PICKS,
      collections: collections.length ? collections : FALLBACK_PICKS,
      source: "curseforge-home",
    });
  } catch (err: any) {
    console.error("[CurseForge Picks] Failed to scrape home:", err);
    return NextResponse.json({
      picks: FALLBACK_PICKS,
      collections: FALLBACK_PICKS,
      source: "fallback",
    });
  }
}
