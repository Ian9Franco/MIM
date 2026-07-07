import { NextResponse } from "next/server";
import crypto from "crypto";

/**
 * Web-compatible YouTube showcase API.
 *
 * Strategy: Use YouTube's public XML RSS feed which is available without
 * any API key and returns real thumbnail URLs, video IDs, titles, and dates.
 * Feed URL: https://www.youtube.com/feeds/videos.xml?user=<handle>
 * or:       https://www.youtube.com/feeds/videos.xml?channel_id=<id>
 *
 * We first try to resolve the @handle to a channel ID using the public
 * YouTube channel page scrape, then fall back to direct feed if needed.
 */

const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

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

/**
 * Resolves a YouTube channel handle/URL to its channel ID.
 * Scrapes the channel page to find the canonical channel ID.
 */
async function resolveChannelId(channelUrl: string): Promise<string | null> {
  try {
    const handle = getHandle(channelUrl);
    const pageUrl = `https://www.youtube.com/${handle}`;
    const res = await fetch(pageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        Accept: "text/html",
      },
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Look for channel ID in several common patterns in the page HTML
    const patterns = [
      /"channelId"\s*:\s*"(UC[a-zA-Z0-9_-]{22})"/,
      /channel\/(UC[a-zA-Z0-9_-]{22})/,
      /"externalId"\s*:\s*"(UC[a-zA-Z0-9_-]{22})"/,
    ];
    for (const p of patterns) {
      const m = html.match(p);
      if (m?.[1]) return m[1];
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetches videos from the YouTube RSS feed for a channel.
 */
async function fetchRssFeed(
  channelId: string,
  channelUrl: string,
  limit: number
): Promise<unknown[]> {
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  const res = await fetch(feedUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 compatible RSS reader",
      Accept: "application/xml,text/xml",
    },
  });
  if (!res.ok) throw new Error(`RSS feed returned ${res.status}`);

  const xml = await res.text();
  const handle = getHandle(channelUrl);

  // Parse XML entries using regex (no DOM parser in edge runtime)
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  const results: unknown[] = [];
  let match: RegExpExecArray | null;

  while ((match = entryRegex.exec(xml)) !== null && results.length < limit) {
    const entry = match[1];

    const videoIdMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    const titleMatch = entry.match(/<title>([^<]+)<\/title>/);
    const publishedMatch = entry.match(/<published>([^<]+)<\/published>/);
    const descMatch = entry.match(/<media:description>([^<]*)<\/media:description>/);

    if (!videoIdMatch?.[1] || !titleMatch?.[1]) continue;

    const videoId = videoIdMatch[1].trim();
    const title = titleMatch[1]
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();

    const publishedRaw = publishedMatch?.[1] ?? "";
    // Convert ISO date to compact YYYYMMDD format used in the desktop
    const publishedDate = publishedRaw
      ? publishedRaw.substring(0, 10).replace(/-/g, "")
      : "";

    const description = descMatch?.[1] ?? "";
    const modSlugs = extractModSlugs(description);

    // Use i.ytimg.com for reliable thumbnail loading
    const thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    results.push({
      videoId,
      title,
      thumbnail,
      videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
      publishedAt: publishedDate,
      modSlugs,
      channelName: handle,
      channelUrl,
    });
  }

  return results;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const channelUrl =
    searchParams.get("channel") ?? DEFAULT_CHANNELS[0];
  const limitParam = parseInt(searchParams.get("limit") ?? "3", 10);
  const limit = isNaN(limitParam) || limitParam < 1 ? 3 : Math.min(limitParam, 15);

  const cacheKey = crypto
    .createHash("md5")
    .update(`${channelUrl}_${limit}`)
    .digest("hex")
    .substring(0, 12);

  // Return from cache if fresh
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return NextResponse.json(cached.data);
  }

  try {
    // Resolve channel ID from handle
    const channelId = await resolveChannelId(channelUrl);
    if (!channelId) {
      throw new Error(`No se pudo resolver el canal: ${channelUrl}`);
    }

    const videos = await fetchRssFeed(channelId, channelUrl, limit);

    const responseData = { mode: "spotlight", showcases: videos, channelId };
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
