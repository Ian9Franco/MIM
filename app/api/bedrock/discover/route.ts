import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { getPortableDir } from "@/lib/core/settings";

const CACHE_DIR = path.join(getPortableDir(), "cache");

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);

  // Cachear los resultados por 6 horas para ser amigables con chunk.gg
  const cacheKey = `chunk_discover_${crypto
    .createHash("md5")
    .update(query + "_" + page)
    .digest("hex")
    .substring(0, 10)}.json`;
  const cacheFile = path.join(CACHE_DIR, cacheKey);

  if (fs.existsSync(cacheFile)) {
    try {
      const stats = fs.statSync(cacheFile);
      const ageHours =
        (Date.now() - new Date(stats.mtime).getTime()) / (1000 * 60 * 60);
      if (ageHours < 6) {
        return NextResponse.json(
          JSON.parse(fs.readFileSync(cacheFile, "utf-8"))
        );
      }
    } catch {
      // Continuar con solicitud fresca si el caché falla
    }
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
    const $ = cheerio.load(html);

    const mods: any[] = [];
    const seen = new Set<string>();

    // Parsear las tarjetas de producto de chunk.gg
    // Los links de producto van a /@creador/addon-slug
    $("a[href*='/@']").each((_, element) => {
      const card = $(element);
      const link = card.attr("href");
      if (!link) return;

      // Normalizar el href: /@minecraft/lego-minecraft-chicken-mounts
      const cleanLink = link.split("?")[0];
      const parts = cleanLink.replace(/^\//, "").split("/");
      const creatorRaw = parts[0] ? parts[0].replace("@", "") : "Minecraft";
      const slug = parts[1] || "";

      if (!slug || seen.has(cleanLink)) return;
      seen.add(cleanLink);

      const title = card.find("h3").first().text().trim();
      if (!title) return; // Evitar capturar enlaces rotos

      // Extraer texto completo de la tarjeta para ratings y precio
      const textBlock = card.text();

      const ratingsMatch = textBlock.match(/([\d,]+)\s*Ratings?/i);
      const ratingsCount = ratingsMatch
        ? parseInt(ratingsMatch[1].replace(/,/g, ""), 10)
        : 0;

      // Determinar Minecoins vs Gratis
      const isFree =
        textBlock.toLowerCase().includes("free") ||
        textBlock.toLowerCase().includes("gratis");
      const minecoinsMatch = textBlock.match(/(\d[\d,]*)\s*Minecoins?/i);
      const cost = isFree
        ? "Gratis"
        : minecoinsMatch
        ? `${minecoinsMatch[1].replace(/,/g, "")} Minecoins`
        : "Premium";

      // Extraer imagen (CDN de Minecraft/Chunk)
      const imgUrl =
        card.find("img").first().attr("src") ||
        card.find("img").first().attr("data-src") ||
        "";

      mods.push({
        projectId: `chunk:${creatorRaw}:${slug}`,
        slug,
        title,
        description: `Add-on de Bedrock Edition diseñado por ${creatorRaw}. Precio: ${cost}.`,
        iconUrl: imgUrl || null,
        author: creatorRaw,
        // Factor heurístico para simular volumen de descargas
        downloads: ratingsCount * 15,
        follows: ratingsCount,
        latestVersion: "Bedrock Edition",
        categories: [
          "bedrock",
          "addon",
          isFree ? "gratis" : "premium",
        ],
        dateCreated: new Date().toISOString(),
        url: `https://chunk.gg${cleanLink}`,
        projectType: "bedrock-addon",
        _source: "chunk",
        // Datos extra específicos de Bedrock
        _bedrockCost: cost,
        _bedrockRatings: ratingsCount,
      });
    });

    // Parsear páginas
    let maxPage = 1;
    const pages: number[] = [];
    $("a[href*='?page=']").each((_, el) => {
       const text = $(el).text().trim();
       const num = parseInt(text, 10);
       if (!isNaN(num)) pages.push(num);
    });
    if (pages.length > 0) {
       maxPage = Math.max(...pages);
    }
    // Si estamos en la página X y no hay más links, y hay resultados, tal vez X es la última o una de las intermedias cortas, pero Math.max es suficiente para aproximar.
    // Si buscamos algo que no tiene suficientes páginas, Math.max podría ser 1.
    // Asegurar que maxPage es al menos igual a page si hay mods
    if (mods.length > 0 && page > maxPage) maxPage = page;

    const responseData = {
      mods,
      total: mods.length > 0 ? (maxPage > 1 ? maxPage * 21 : mods.length) : 0, // Aproximación (chunk suele devolver ~24, usamos 21 heurístico)
      totalPages: maxPage,
      page,
      query,
    };

    if (!fs.existsSync(CACHE_DIR))
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(
      cacheFile,
      JSON.stringify(responseData, null, 2),
      "utf-8"
    );

    return NextResponse.json(responseData);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Error desconocido al conectar con chunk.gg" },
      { status: 500 }
    );
  }
}
