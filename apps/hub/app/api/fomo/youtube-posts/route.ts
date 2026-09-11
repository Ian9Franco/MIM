import { NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { withApiGuard } from "@/lib/apiGuard";

export const HARDCODED_POSTS_CHANNELS = [
  "https://www.youtube.com/@Wero_lovernite",
  "https://www.youtube.com/@EnderVerseMC",
];

export interface YouTubePostItem {
  postId: string;
  title: string;
  description: string;
  thumbnail: string;
  embeddedVideoId: string;
  videoUrl: string;
  modSlugs: string[];
  publishedAt: string;
  mode: "post" | "video" | "short";
}

// Simple in-memory cache for serverless environment
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 hours cache

function findKeys(obj: unknown, key: string, results: Array<Record<string, unknown>> = []): Array<Record<string, unknown>> {
  if (!obj || typeof obj !== "object") return results;
  const record = obj as Record<string, unknown>;
  if (record[key] && typeof record[key] === "object") {
    results.push(record[key] as Record<string, unknown>);
  }
  for (const k in record) {
    if (Object.prototype.hasOwnProperty.call(record, k)) {
      findKeys(record[k], key, results);
    }
  }
  return results;
}

function findFirstValueForKey(obj: unknown, key: string): unknown {
  if (!obj || typeof obj !== "object") return null;
  const record = obj as Record<string, unknown>;
  if (record[key] !== undefined) return record[key];
  for (const k in record) {
    if (Object.prototype.hasOwnProperty.call(record, k)) {
      const val = findFirstValueForKey(record[k], key);
      if (val !== null && val !== undefined) return val;
    }
  }
  return null;
}

const MODRINTH_REGEX =
  /modrinth\.com\/(mod|plugin|datapack|shader|resourcepack|modpack)\/([a-zA-Z0-9-_]+)/g;
const CURSEFORGE_REGEX =
  /curseforge\.com\/minecraft\/(mc-mods|texture-packs|customization|mc-addons)\/([a-zA-Z0-9-_]+)/g;

function cleanDetectedModName(name: string): string {
  return decodeHtmlEntities(name)
    .replace(/^[\s\-–—:|]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTimestampModNames(text: string): string[] {
  if (!text) return [];

  const names: string[] = [];
  const seen = new Set<string>();
  const timestampLine = /^\s*(?:\(?\d{1,2}:)?\d{1,2}:\d{2}\)?\s*(?:[-–—|:]\s*)?(.+?)\s*$/;
  const ignored = new Set(["intro", "outro", "subscribe", "conclusion", "final thoughts"]);

  for (const line of text.split(/\r?\n/)) {
    const match = line.match(timestampLine);
    if (!match) continue;

    const name = cleanDetectedModName(match[1]);
    const comparable = normalizeComparableText(name);
    if (
      name.length < 3 ||
      name.length > 90 ||
      ignored.has(comparable) ||
      comparable.startsWith("http") ||
      comparable.includes("sponsor") ||
      comparable.includes("server")
    ) {
      continue;
    }

    if (seen.has(comparable)) continue;
    seen.add(comparable);
    names.push(name);
  }

  return names;
}

function extractModSlugs(text: string): string[] {
  if (!text) return [];
  const found: string[] = [];
  const mr = new RegExp(MODRINTH_REGEX.source, "g");
  const cf = new RegExp(CURSEFORGE_REGEX.source, "g");
  let m: RegExpExecArray | null;
  while ((m = mr.exec(text)) !== null) found.push(`modrinth:${m[1]}:${m[2]}`);
  while ((m = cf.exec(text)) !== null) found.push(`curseforge:${m[1]}:${m[2]}`);
  for (const name of extractTimestampModNames(text)) found.push(`search:${encodeURIComponent(name)}`);
  return [...new Set(found)];
}

function extractJsonObjectAfter(html: string, marker: string): Record<string, unknown> | null {
  const markerIndex = html.indexOf(marker);
  if (markerIndex === -1) return null;
  const start = html.indexOf("{", markerIndex);
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < html.length; i++) {
    const char = html[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
    } else if (char === "{") {
      depth++;
    } else if (char === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }

  return null;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function normalizeComparableText(text: string): string {
  return decodeHtmlEntities(text || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function isUsefulVideoDescription(description: string, title = ""): boolean {
  const normalized = decodeHtmlEntities(description || "").trim();
  if (!normalized) return false;
  const comparable = normalizeComparableText(normalized);
  if (title && comparable === normalizeComparableText(title)) return false;

  const genericSnippets = [
    "Enjoy the videos and music you love",
    "upload original content",
    "share it all with friends, family, and the world on YouTube",
  ];
  return !genericSnippets.some((snippet) => comparable.includes(snippet.toLowerCase()));
}

async function fetchVideoDescription(videoId: string, title = ""): Promise<{ description: string; html: string }> {
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "Cookie": "CONSENT=YES+cb.20210328-17-p0.en+FX+999;",
      },
    });
    if (!res.ok) return { description: "", html: "" };
    const html = await res.text();
    let description = "";

    const playerResponse = extractJsonObjectAfter(html, "ytInitialPlayerResponse");
    const videoDetails = playerResponse?.videoDetails as Record<string, unknown> | undefined;
    const playerDescription = videoDetails?.shortDescription;
    if (typeof playerDescription === "string" && isUsefulVideoDescription(playerDescription, title)) {
      description = playerDescription;
    }

    // Try to extract full description from application/ld+json
    if (!description) {
      const ldRegex = /<script\s+type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs;
      let ldMatch;
      while ((ldMatch = ldRegex.exec(html)) !== null) {
        try {
          const ldJson = JSON.parse(ldMatch[1].trim());
          if (ldJson && ldJson["@type"] === "VideoObject" && isUsefulVideoDescription(ldJson.description, title)) {
            description = ldJson.description;
            break;
          }
        } catch (err) {
          console.debug("[youtube-posts] Could not parse LD+JSON block:", err);
        }
      }
    }

    if (!description) {
      const match = html.match(/"shortDescription":"(.*?)"/);
      if (match) {
        try {
          description = JSON.parse(`"${match[1]}"`);
        } catch {
          description = match[1].replace(/\\n/g, "\n").replace(/\\"/g, '"');
        }
        if (!isUsefulVideoDescription(description, title)) description = "";
      }
    }

    if (!description) {
      const metaMatch = html.match(/<meta\s+name="description"\s+content="(.*?)"/i) || 
                        html.match(/<meta\s+property="og:description"\s+content="(.*?)"/i);
      if (metaMatch && isUsefulVideoDescription(metaMatch[1], title)) {
        description = decodeHtmlEntities(metaMatch[1]);
      }
    }

    return { description, html };
  } catch (e) {
    console.error(`[fetchVideoDescription] Error for ${videoId}:`, e);
  }
  return { description: "", html: "" };
}

async function fetchYouTubeApiDescriptions(videoIds: string[]): Promise<Map<string, string>> {
  const descriptions = new Map<string, string>();
  const apiKey = process.env.YOUTUBE_DATA_API_KEY?.trim();
  const uniqueVideoIds = [...new Set(videoIds.filter(Boolean))].slice(0, 50);

  if (!apiKey || uniqueVideoIds.length === 0) return descriptions;

  try {
    const params = new URLSearchParams({
      part: "snippet",
      id: uniqueVideoIds.join(","),
      key: apiKey,
    });

    const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params.toString()}`, {
      cache: "no-store",
    });

    if (!res.ok) {
      console.error(`[fetchYouTubeApiDescriptions] YouTube Data API returned HTTP ${res.status}`);
      return descriptions;
    }

    const data = await res.json();
    const items = Array.isArray(data.items) ? data.items : [];

    for (const item of items) {
      const id = item?.id;
      const description = item?.snippet?.description;
      if (typeof id === "string" && typeof description === "string") {
        descriptions.set(id, description);
      }
    }
  } catch (e) {
    console.error("[fetchYouTubeApiDescriptions] Error:", e);
  }

  return descriptions;
}


const querySchema = z.object({
  channel: z.string().trim().max(200).optional().default(HARDCODED_POSTS_CHANNELS[0]),
  type: z.enum(["posts", "videos", "shorts"]).optional().default("posts"),
});

export const GET = withApiGuard(
  {
    rateLimit: { windowMs: 60 * 1000, maxRequests: 60 },
    querySchema,
  },
  async ({ query }) => {
    const channelUrl = query.channel;
    const feedType = query.type;

    const channelHash = crypto
      .createHash("md5")
      .update(`${channelUrl}_${feedType}`)
      .digest("hex")
      .substring(0, 10);

    // 1. Check in-memory cache (bypassed in development mode)
    const isDev = process.env.NODE_ENV === "development";
    const cached = cache.get(channelHash);
    if (!isDev && cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
      return NextResponse.json(cached.data);
    }

    const handle = channelUrl.includes("@")
      ? "@" + channelUrl.split("@").pop()!.split("/")[0]
      : channelUrl.split("/").pop() || "";

    let targetUrl = `https://www.youtube.com/${handle}/posts`;
    if (feedType === "videos") {
      targetUrl = `https://www.youtube.com/${handle}/videos`;
    } else if (feedType === "shorts") {
      targetUrl = `https://www.youtube.com/${handle}/shorts`;
    }

    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Cookie": "CONSENT=YES+cb.20210328-17-p0.es+FX+999;",
      },
    });

    if (!response.ok) {
      throw new Error(`YouTube devolvió HTTP ${response.status}`);
    }

    const html = await response.text();

    const regex = /var ytInitialData\s*=\s*({.*?});\s*<\/script>/s;
    const match = html.match(regex);
    let rawJson: string;
    if (match) {
      rawJson = match[1];
    } else {
      const match2 = html.match(/ytInitialData\s*=\s*({.+?})\s*;/s);
      if (!match2) {
        throw new Error("No se pudo extraer la metadata de YouTube");
      }
      rawJson = match2[1];
    }

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(rawJson);
    } catch {
      throw new Error("ytInitialData no es un JSON válido");
    }

    const MODRINTH_REGEX =
      /modrinth\.com\/(mod|plugin|datapack|shader|resourcepack|modpack)\/([a-zA-Z0-9-_]+)/g;
    const CURSEFORGE_REGEX =
      /curseforge\.com\/minecraft\/(mc-mods|texture-packs|customization|mc-addons)\/([a-zA-Z0-9-_]+)/g;

    const posts: YouTubePostItem[] = [];

    const parsedIds = new Set<string>();

    if (feedType === "videos") {
      // 1. Try videoRenderer
      const videoItems = findKeys(data, "videoRenderer");
      for (const item of videoItems) {
        const videoId = String(item.videoId || "");
        if (!videoId || parsedIds.has(videoId)) continue;
        parsedIds.add(videoId);

        const titleObj = item.title as Record<string, unknown> | undefined;
        const runs = titleObj?.runs as Array<{ text?: string }> | undefined;
        const accLabel = (titleObj?.accessibility as Record<string, unknown> | undefined)?.accessibilityData as { label?: string } | undefined;
        const title = String(runs?.[0]?.text || accLabel?.label || "");
        const thumbObj = item.thumbnail as Record<string, unknown> | undefined;
        const thumbs = Array.isArray(thumbObj?.thumbnails) ? (thumbObj?.thumbnails as Array<{ url?: string }>) : [];
        let thumbnail = String(thumbs[thumbs.length - 1]?.url || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`);
        if (thumbnail.startsWith("//")) {
          thumbnail = "https:" + thumbnail;
        }
        const publishedTimeText = item.publishedTimeText as Record<string, unknown> | undefined;
        const pubRuns = publishedTimeText?.runs as Array<{ text?: string }> | undefined;
        const publishedAt = String(publishedTimeText?.simpleText || pubRuns?.[0]?.text || "");
        const descObj = item.descriptionSnippet as Record<string, unknown> | undefined;
        const descRuns = Array.isArray(descObj?.runs) ? (descObj?.runs as Array<{ text?: string }>) : [];
        const description = descRuns.map((r: { text?: string }) => r.text || "").join("");
        
        const modSlugs: string[] = [];
        MODRINTH_REGEX.lastIndex = 0;
        CURSEFORGE_REGEX.lastIndex = 0;
        let mMatch: RegExpExecArray | null;
        while ((mMatch = MODRINTH_REGEX.exec(description)) !== null) {
          modSlugs.push(`modrinth:${mMatch[1]}:${mMatch[2]}`);
        }
        while ((mMatch = CURSEFORGE_REGEX.exec(description)) !== null) {
          modSlugs.push(`curseforge:${mMatch[1]}:${mMatch[2]}`);
        }

        posts.push({
          postId: videoId,
          title,
          description,
          thumbnail,
          embeddedVideoId: videoId,
          videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
          modSlugs: [...new Set(modSlugs)],
          publishedAt,
          mode: "video",
        });
      }

      // 2. Try lockupViewModel (new YouTube layout)
      const lockupItems = findKeys(data, "lockupViewModel");
      for (const item of lockupItems) {
        const videoId = String(item.contentId || "");
        if (!videoId || parsedIds.has(videoId)) continue;
        parsedIds.add(videoId);

        const metaObj = item.metadata as Record<string, unknown> | undefined;
        const lockupMeta = metaObj?.lockupMetadataViewModel as Record<string, unknown> | undefined;
        const lockupTitle = lockupMeta?.title as { content?: string } | undefined;
        const title = String(lockupTitle?.content || "");
        const contentImg = item.contentImage as Record<string, unknown> | undefined;
        const thumbView = contentImg?.thumbnailViewModel as Record<string, unknown> | undefined;
        const thumbInner = thumbView?.thumbnail as Record<string, unknown> | undefined;
        const thumbs = Array.isArray(thumbInner?.thumbnails)
          ? (thumbInner?.thumbnails as Array<{ url?: string }>)
          : [];
        let thumbnail = String(thumbs[thumbs.length - 1]?.url || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`);
        if (thumbnail.startsWith("//")) {
          thumbnail = "https:" + thumbnail;
        }
        
        const innerMeta = lockupMeta?.metadata as Record<string, unknown> | undefined;
        const contentMeta = innerMeta?.contentMetadataViewModel as Record<string, unknown> | undefined;
        const rows = Array.isArray(contentMeta?.metadataRows)
          ? (contentMeta?.metadataRows as Array<{ metadataParts?: Array<{ text?: { content?: string } }> }>)
          : [];
        let publishedAt = "";
        if (rows.length > 0) {
          const parts = Array.isArray(rows[0].metadataParts) ? rows[0].metadataParts : [];
          if (parts.length > 1) {
            publishedAt = String(parts[1].text?.content || "");
          } else if (parts.length > 0) {
            publishedAt = String(parts[0].text?.content || "");
          }
        }

        posts.push({
          postId: videoId,
          title,
          description: "",
          thumbnail,
          embeddedVideoId: videoId,
          videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
          modSlugs: [],
          publishedAt,
          mode: "video",
        });
      }
    } else if (feedType === "shorts") {
      // 1. Try reelItemRenderer
      const reelItems = findKeys(data, "reelItemRenderer");
      for (const item of reelItems) {
        const videoId = String(item.videoId || "");
        if (!videoId || parsedIds.has(videoId)) continue;
        parsedIds.add(videoId);

        const headline = item.headline as Record<string, unknown> | undefined;
        const headRuns = headline?.runs as Array<{ text?: string }> | undefined;
        const title = String(headline?.simpleText || headRuns?.[0]?.text || "");
        const thumbObj = item.thumbnail as Record<string, unknown> | undefined;
        const thumbs = Array.isArray(thumbObj?.thumbnails) ? (thumbObj?.thumbnails as Array<{ url?: string }>) : [];
        let thumbnail = String(thumbs[thumbs.length - 1]?.url || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`);
        if (thumbnail.startsWith("//")) {
          thumbnail = "https:" + thumbnail;
        }
        const viewsText = item.viewsText as Record<string, unknown> | undefined;
        const publishedAt = String(viewsText?.simpleText || "");

        posts.push({
          postId: videoId,
          title,
          description: "",
          thumbnail,
          embeddedVideoId: videoId,
          videoUrl: `https://www.youtube.com/shorts/${videoId}`,
          modSlugs: [],
          publishedAt,
          mode: "short",
        });
      }

      // 2. Try lockupViewModel
      const lockupItems = findKeys(data, "lockupViewModel");
      for (const item of lockupItems) {
        const videoId = String(item.contentId || "");
        if (!videoId || parsedIds.has(videoId)) continue;
        parsedIds.add(videoId);

        const metaObj = item.metadata as Record<string, unknown> | undefined;
        const lockupMeta = metaObj?.lockupMetadataViewModel as Record<string, unknown> | undefined;
        const lockupTitle = lockupMeta?.title as { content?: string } | undefined;
        const title = String(lockupTitle?.content || "");
        const contentImg = item.contentImage as Record<string, unknown> | undefined;
        const thumbView = contentImg?.thumbnailViewModel as Record<string, unknown> | undefined;
        const thumbInner = thumbView?.thumbnail as Record<string, unknown> | undefined;
        const thumbs = Array.isArray(thumbInner?.thumbnails)
          ? (thumbInner?.thumbnails as Array<{ url?: string }>)
          : [];
        let thumbnail = String(thumbs[thumbs.length - 1]?.url || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`);
        if (thumbnail.startsWith("//")) {
          thumbnail = "https:" + thumbnail;
        }
        
        const innerMeta = lockupMeta?.metadata as Record<string, unknown> | undefined;
        const contentMeta = innerMeta?.contentMetadataViewModel as Record<string, unknown> | undefined;
        const rows = Array.isArray(contentMeta?.metadataRows)
          ? (contentMeta?.metadataRows as Array<{ metadataParts?: Array<{ text?: { content?: string } }> }>)
          : [];
        let publishedAt = "";
        if (rows.length > 0) {
          const parts = Array.isArray(rows[0].metadataParts) ? rows[0].metadataParts : [];
          if (parts.length > 1) {
            publishedAt = String(parts[1].text?.content || "");
          } else if (parts.length > 0) {
            publishedAt = String(parts[0].text?.content || "");
          }
        }

        posts.push({
          postId: videoId,
          title,
          description: "",
          thumbnail,
          embeddedVideoId: videoId,
          videoUrl: `https://www.youtube.com/shorts/${videoId}`,
          modSlugs: [],
          publishedAt,
          mode: "short",
        });
      }

      // 3. Try shortsLockupViewModel (new YouTube Shorts layout)
      const shortsItems = findKeys(data, "shortsLockupViewModel");
      for (const item of shortsItems) {
        const foundId = findFirstValueForKey(item, "videoId");
        const entityId = typeof item.entityId === "string" ? item.entityId.split("-").pop() : "";
        const videoId = String(foundId || entityId || "");
        if (!videoId || parsedIds.has(videoId)) continue;
        parsedIds.add(videoId);

        const overlayMeta = item.overlayMetadata as Record<string, unknown> | undefined;
        const primaryText = overlayMeta?.primaryText as { content?: string } | undefined;
        const secondaryText = overlayMeta?.secondaryText as { content?: string } | undefined;
        const title = String(primaryText?.content || "");
        const thumbView = item.thumbnailViewModel as Record<string, unknown> | undefined;
        const innerThumb = thumbView?.thumbnailViewModel as Record<string, unknown> | undefined;
        const imageObj = innerThumb?.image as Record<string, unknown> | undefined;
        const thumbs = Array.isArray(imageObj?.sources)
          ? (imageObj?.sources as Array<{ url?: string }>)
          : [];
        let thumbnail = String(thumbs[thumbs.length - 1]?.url || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`);
        if (thumbnail.startsWith("//")) {
          thumbnail = "https:" + thumbnail;
        }
        const publishedAt = String(secondaryText?.content || "");

        posts.push({
          postId: videoId,
          title,
          description: "",
          thumbnail,
          embeddedVideoId: videoId,
          videoUrl: `https://www.youtube.com/shorts/${videoId}`,
          modSlugs: [],
          publishedAt,
          mode: "short",
        });
      }
    } else {
      // Default: posts
      const contentsObj = data.contents as Record<string, unknown> | undefined;
      const twoCol = contentsObj?.twoColumnBrowseResultsRenderer as Record<string, unknown> | undefined;
      const tabs: Array<Record<string, unknown>> = Array.isArray(twoCol?.tabs)
        ? (twoCol?.tabs as Array<Record<string, unknown>>)
        : [];
      const communityTab = tabs.find((t) => {
        const tabRenderer = t.tabRenderer as Record<string, unknown> | undefined;
        const title = tabRenderer?.title;
        const endpoint = tabRenderer?.endpoint as Record<string, unknown> | undefined;
        const browseEndpoint = endpoint?.browseEndpoint as Record<string, unknown> | undefined;
        return (
          title === "Comunidad" ||
          title === "Community" ||
          title === "Publicaciones" ||
          title === "Posts" ||
          browseEndpoint?.browseId === undefined
        );
      });

      const tabRenderer = communityTab?.tabRenderer as Record<string, unknown> | undefined;
      const content = tabRenderer?.content as Record<string, unknown> | undefined;
      const secList = content?.sectionListRenderer as Record<string, unknown> | undefined;
      const secContents = Array.isArray(secList?.contents) ? (secList?.contents as Array<Record<string, unknown>>) : [];
      const itemSection = secContents[0]?.itemSectionRenderer as Record<string, unknown> | undefined;
      const contents: Array<Record<string, unknown>> = Array.isArray(itemSection?.contents)
        ? (itemSection?.contents as Array<Record<string, unknown>>)
        : [];

      for (const item of contents) {
        const backstagePostThread = item.backstagePostThreadRenderer as Record<string, unknown> | undefined;
        const post = backstagePostThread?.post as Record<string, unknown> | undefined;
        const postRenderer = post?.backstagePostRenderer as Record<string, unknown> | undefined;
        if (!postRenderer) continue;

        const postId: string = String(postRenderer.postId || "");
        if (!postId) continue;

        const contentText = postRenderer.contentText as Record<string, unknown> | undefined;
        const runs = Array.isArray(contentText?.runs) ? (contentText?.runs as Array<{ text?: string }>) : [];
        const rawText: string = runs.map((r) => r.text || "").join("") || "";

        const pubTimeText = postRenderer.publishedTimeText as Record<string, unknown> | undefined;
        const pubTimeRuns = Array.isArray(pubTimeText?.runs) ? (pubTimeText?.runs as Array<{ text?: string }>) : [];
        const publishedTime: string = String(
          pubTimeRuns[0]?.text ||
          pubTimeText?.simpleText ||
          ""
        );

        const backstageAttachment = postRenderer.backstageAttachment as Record<string, unknown> | undefined;
        const attachment = backstageAttachment?.backstageImageRenderer as Record<string, unknown> | undefined;
        const postMulti = backstageAttachment?.postMultiImageRenderer as Record<string, unknown> | undefined;
        const multiImages = Array.isArray(postMulti?.images) ? (postMulti?.images as Array<Record<string, unknown>>) : undefined;
        const videoAttachment = backstageAttachment?.videoRenderer as Record<string, unknown> | undefined;

        let thumbnail = "";
        let embeddedVideoId = "";

        const attachImg = attachment?.image as Record<string, unknown> | undefined;
        const attachThumbs = Array.isArray(attachImg?.thumbnails) ? (attachImg?.thumbnails as Array<{ url?: string }>) : [];
        if (attachThumbs.length) {
          thumbnail = attachThumbs[attachThumbs.length - 1]?.url || attachThumbs[0]?.url || "";
        } else if (multiImages?.length) {
          const firstImageRenderer = multiImages[0]?.backstageImageRenderer as Record<string, unknown> | undefined;
          const firstImgObj = firstImageRenderer?.image as Record<string, unknown> | undefined;
          const firstThumbs = Array.isArray(firstImgObj?.thumbnails) ? (firstImgObj?.thumbnails as Array<{ url?: string }>) : [];
          if (firstThumbs.length) {
            thumbnail = firstThumbs[firstThumbs.length - 1]?.url || firstThumbs[0]?.url || "";
          }
        } else if (videoAttachment) {
          embeddedVideoId = String(videoAttachment.videoId || "");
          const vidThumb = videoAttachment.thumbnail as Record<string, unknown> | undefined;
          const vidThumbs = Array.isArray(vidThumb?.thumbnails) ? (vidThumb?.thumbnails as Array<{ url?: string }>) : [];
          if (vidThumbs.length) {
            thumbnail = vidThumbs[vidThumbs.length - 1]?.url || vidThumbs[0]?.url || "";
          }
        }
        if (thumbnail && thumbnail.startsWith("//")) {
          thumbnail = "https:" + thumbnail;
        }

        const modSlugs: string[] = [];
        MODRINTH_REGEX.lastIndex = 0;
        CURSEFORGE_REGEX.lastIndex = 0;
        let mMatch: RegExpExecArray | null;

        while ((mMatch = MODRINTH_REGEX.exec(rawText)) !== null) {
          modSlugs.push(`modrinth:${mMatch[1]}:${mMatch[2]}`);
        }
        while ((mMatch = CURSEFORGE_REGEX.exec(rawText)) !== null) {
          modSlugs.push(`curseforge:${mMatch[1]}:${mMatch[2]}`);
        }

        posts.push({
          postId,
          title: rawText.substring(0, 180) + (rawText.length > 180 ? "..." : ""),
          description: rawText,
          thumbnail,
          embeddedVideoId,
          videoUrl: `https://www.youtube.com/post/${postId}`,
          modSlugs: [...new Set(modSlugs)],
          publishedAt: publishedTime,
          mode: "post",
        });
      }
    }

    if (feedType === "videos" || feedType === "shorts") {
      const targetPosts = posts.slice(0, 12);
      const scrapedTextByPostId = new Map<string, string>();

      await Promise.all(
        targetPosts.map(async (post) => {
          const resObj = await fetchVideoDescription(post.postId, post.title);
          scrapedTextByPostId.set(post.postId, `${resObj.html || ""}\n${resObj.description || ""}`);
          post.description = isUsefulVideoDescription(resObj.description, post.title)
            ? resObj.description
            : isUsefulVideoDescription(post.description, post.title)
              ? post.description
              : "";
          post.modSlugs = extractModSlugs(scrapedTextByPostId.get(post.postId) || "");
        })
      );

      const postsMissingDescription = targetPosts.filter(
        (post) => !isUsefulVideoDescription(post.description, post.title)
      );
      const apiDescriptions = await fetchYouTubeApiDescriptions(
        postsMissingDescription.map((post) => post.postId)
      );

      for (const post of postsMissingDescription) {
        const apiDescription = apiDescriptions.get(post.postId) || "";
        if (!isUsefulVideoDescription(apiDescription, post.title)) continue;

        post.description = apiDescription;
        post.modSlugs = [...new Set([
          ...(post.modSlugs || []),
          ...extractModSlugs(apiDescription),
        ])];
      }

      posts.splice(0, posts.length, ...targetPosts);
    }

    const responseData = {
      mode: feedType,
      showcases: posts,
      channel: channelUrl,
      handle,
    };

    // Save in memory cache
    cache.set(channelHash, { data: responseData, timestamp: Date.now() });

    return NextResponse.json(responseData);
  }
);
