import { NextResponse } from "next/server";
import crypto from "crypto";

// In-memory cache for serverless environments (6 hours duration)
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 6 * 60 * 60 * 1000;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);

  const cacheKey = `${query}_${page}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return NextResponse.json(cached.data);
  }

  try {
    let targetUrl = `https://chunk.gg/add-ons?page=${page}`;
    if (query) {
      targetUrl = `https://chunk.gg/search?q=${encodeURIComponent(query)}`;
    }

    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
      },
    });

    if (!response.ok) {
      throw new Error(`chunk.gg devolvió HTTP ${response.status}`);
    }

    const html = await response.text();

    const mods: any[] = [];
    const seen = new Set<string>();

    const cardRegex = /<a[^>]+href="(\/@[^"]+)"[^>]*>([\s\S]*?<\/product-frame>)<\/a>/gi;
    let match: RegExpExecArray | null;

    while ((match = cardRegex.exec(html)) !== null) {
      const rawHref = match[1];
      const cardHtml = match[2];
      const cleanLink = rawHref.split("?")[0];
      if (seen.has(cleanLink)) continue;
      seen.add(cleanLink);

      const parts = cleanLink.replace(/^\//, "").split("/");
      const creatorRaw = parts[0] ? parts[0].replace("@", "") : "Minecraft";
      const slug = parts[1] || "";
      if (!slug) continue;

      const titleMatch =
        cardHtml.match(/<h[23][^>]*class="[^"]*product-card__title[^"]*"[^>]*>([\s\S]*?)<\/h[23]>/i) ||
        cardHtml.match(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/i);
      const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : slug;

      const authorMatch = cardHtml.match(/<p[^>]+text="xs tinted"[^>]*>([\s\S]*?)<\/p>/i);
      const author = authorMatch ? authorMatch[1].replace(/<[^>]+>/g, "").trim() : creatorRaw;

      const imgMatch =
        cardHtml.match(/<img[^>]+src="([^"]+)"/i) ||
        cardHtml.match(/<source[^>]+srcset="([^",\s]+)/i);
      const iconUrl = imgMatch ? imgMatch[1] : null;

      const ratingsMatch = cardHtml.match(/([\d,]+)\s*Ratings?/i);
      const ratingsCount = ratingsMatch ? parseInt(ratingsMatch[1].replace(/,/g, ""), 10) : 0;

      const isFree = /free|gratis/i.test(cardHtml);
      const mcMatch =
        cardHtml.match(/(\d[\d,]*)\s*Minecoins?/i) ||
        cardHtml.match(/<p[^>]+text="minecraft uppercase xs">(\d+)<\/p>/i);
      const cost = isFree ? "Gratis" : mcMatch ? `${mcMatch[1].replace(/,/g, "")} Minecoins` : "Premium";

      mods.push({
        projectId: `chunk:${creatorRaw.toLowerCase()}:${slug}`,
        slug,
        title,
        description: `Add-on de Bedrock Edition diseñado por ${author}. Precio: ${cost}.`,
        iconUrl,
        author,
        downloads: ratingsCount * 15,
        follows: ratingsCount,
        latestVersion: "Bedrock Edition",
        categories: ["bedrock", "addon", isFree ? "gratis" : "premium"],
        dateCreated: new Date().toISOString(),
        url: `https://chunk.gg${cleanLink}`,
        projectType: "bedrock",
        _source: "chunk",
        _bedrockCost: cost,
        _bedrockRatings: ratingsCount,
      });
    }

    let maxPage = 1;
    const pageMatches = html.match(/[?&]page=(\d+)/g) || [];
    for (const pm of pageMatches) {
      const numMatch = pm.match(/\d+/);
      if (numMatch) {
        const n = parseInt(numMatch[0], 10);
        if (n > maxPage) maxPage = n;
      }
    }
    if (mods.length > 0 && page > maxPage) maxPage = page;

    const responseData = {
      mods,
      total: mods.length > 0 ? (maxPage > 1 ? maxPage * 24 : mods.length) : 0,
      totalPages: maxPage,
      page,
      query,
    };

    cache.set(cacheKey, { data: responseData, timestamp: Date.now() });

    return NextResponse.json(responseData);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Error desconocido al conectar con chunk.gg" },
      { status: 500 }
    );
  }
}
