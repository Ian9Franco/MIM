import { NextResponse } from "next/server";
import crypto from "crypto";

/**
 * Web-compatible YouTube showcase API using ytInitialData scraping.
 * This is 100% reliable as it matches YouTube's public web app format.
 */

const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 4 * 60 * 60 * 1000; // 4 hours

const DEFAULT_CHANNELS = [
  "https://www.youtube.com/@EnderVerseMC",
  "https://www.youtube.com/@KreksuMinecraft",
  "https://www.youtube.com/@NoxusMods",
  "https://www.youtube.com/@sir_color",
  "https://www.youtube.com/@Wero_lovernite",
];

const MODRINTH_REGEX =
  /modrinth\.com\/(mod|plugin|datapack|shader|resourcepack|modpack)\/([a-zA-Z0-9-_]+)/g;
const CURSEFORGE_REGEX =
  /curseforge\.com\/minecraft\/(mc-mods|texture-packs|customization|mc-addons)\/([a-zA-Z0-9-_]+)/g;

function extractModSlugs(text: string): string[] {
  const found: string[] = [];
  const mr = new RegExp(MODRINTH_REGEX.source, "g");
  const cf = new RegExp(CURSEFORGE_REGEX.source, "g");
  let m: RegExpExecArray | null;
  while ((m = mr.exec(text)) !== null) found.push(`modrinth:${m[1]}:${m[2]}`);
  while ((m = cf.exec(text)) !== null) found.push(`curseforge:${m[1]}:${m[2]}`);
  return [...new Set(found)];
}

function getHandle(channelUrl: string): string {
  return channelUrl.includes("@")
    ? "@" + channelUrl.split("@")[1]?.split("/")[0]
    : channelUrl.split("/").pop() ?? channelUrl;
}

function findKeys(obj: any, key: string, results: any[] = []): any[] {
  if (!obj || typeof obj !== "object") return results;
  if (obj[key]) {
    results.push(obj[key]);
  }
  for (const k in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) {
      findKeys(obj[k], key, results);
    }
  }
  return results;
}

// Estimates a date string or converts relative dates
function parseRelativeDate(text: string): string {
  if (!text) return "";
  // If it's already YYYYMMDD, return it
  if (/^\d{8}$/.test(text)) return text;
  
  // Return the raw text (e.g. "hace 2 días", "2 days ago") as formatting falls back gracefully
  return text;
}

async function scrapeVideosFromChannel(channelUrl: string, limit: number): Promise<any[]> {
  const handle = getHandle(channelUrl);
  const targetUrl = `https://www.youtube.com/${handle}/videos`;

  const res = await fetch(targetUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    },
  });

  if (!res.ok) {
    throw new Error(`YouTube returned HTTP ${res.status}`);
  }

  const html = await res.text();

  const regex = /var ytInitialData\s*=\s*({.*?});\s*<\/script>/s;
  const match = html.match(regex);
  let rawJson: string;
  if (match) {
    rawJson = match[1];
  } else {
    const match2 = html.match(/ytInitialData\s*=\s*({.+?})\s*;/s);
    if (!match2) {
      throw new Error("Could not extract ytInitialData");
    }
    rawJson = match2[1];
  }

  const data = JSON.parse(rawJson);
  const results: any[] = [];
  const parsedIds = new Set<string>();

  // 1. Parse videoRenderer items
  const videoItems = findKeys(data, "videoRenderer");
  for (const item of videoItems) {
    const videoId = item.videoId || "";
    if (!videoId || parsedIds.has(videoId)) continue;
    parsedIds.add(videoId);

    const title = item.title?.runs?.[0]?.text || item.title?.accessibility?.accessibilityData?.label || "";
    const thumbs = item.thumbnail?.thumbnails || [];
    let thumbnail = thumbs[thumbs.length - 1]?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    if (thumbnail.startsWith("//")) {
      thumbnail = "https:" + thumbnail;
    }
    
    const publishedAtRaw = item.publishedTimeText?.simpleText || item.publishedTimeText?.runs?.[0]?.text || "";
    const publishedAt = parseRelativeDate(publishedAtRaw);
    
    const description = item.descriptionSnippet?.runs?.map((r: any) => r.text).join("") || "";
    const modSlugs = extractModSlugs(description);

    results.push({
      videoId,
      title,
      thumbnail,
      videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
      publishedAt,
      modSlugs,
      channelName: handle,
      channelUrl,
    });

    if (results.length >= limit) break;
  }

  // 2. Parse lockupViewModel items (new layout) if we haven't reached the limit
  if (results.length < limit) {
    const lockupItems = findKeys(data, "lockupViewModel");
    for (const item of lockupItems) {
      const videoId = item.contentId || "";
      if (!videoId || parsedIds.has(videoId)) continue;
      parsedIds.add(videoId);

      const title = item.metadata?.lockupMetadataViewModel?.title?.content || "";
      const thumbs = item.contentImage?.thumbnailViewModel?.thumbnail?.thumbnails || [];
      let thumbnail = thumbs[thumbs.length - 1]?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
      if (thumbnail.startsWith("//")) {
        thumbnail = "https:" + thumbnail;
      }
      
      const rows = item.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows || [];
      let publishedAtRaw = "";
      if (rows.length > 0) {
        const parts = rows[0].metadataParts || [];
        if (parts.length > 1) {
          publishedAtRaw = parts[1].text?.content || "";
        } else if (parts.length > 0) {
          publishedAtRaw = parts[0].text?.content || "";
        }
      }
      const publishedAt = parseRelativeDate(publishedAtRaw);

      results.push({
        videoId,
        title,
        thumbnail,
        videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
        publishedAt,
        modSlugs: [], // lockupViewModel does not contain snippets usually
        channelName: handle,
        channelUrl,
      });

      if (results.length >= limit) break;
    }
  }

  return results;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const channelUrl = searchParams.get("channel") ?? DEFAULT_CHANNELS[0];
  const limitParam = parseInt(searchParams.get("limit") ?? "3", 10);
  const limit = isNaN(limitParam) || limitParam < 1 ? 3 : Math.min(limitParam, 15);

  const cacheKey = crypto
    .createHash("md5")
    .update(`${channelUrl}_${limit}`)
    .digest("hex")
    .substring(0, 12);

  // Return from cache if fresh (bypassed in development mode if user requests it, but let's keep it clean)
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return NextResponse.json(cached.data);
  }

  try {
    const videos = await scrapeVideosFromChannel(channelUrl, limit);
    const responseData = { mode: "spotlight", showcases: videos };
    
    cache.set(cacheKey, { data: responseData, timestamp: Date.now() });
    return NextResponse.json(responseData);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("[youtube-showcase-web] Error:", message);
    return NextResponse.json(
      { error: message, showcases: [] },
      { status: 500 }
    );
  }
}
