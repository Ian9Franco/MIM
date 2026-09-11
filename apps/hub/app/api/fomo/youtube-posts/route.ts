import { NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { withApiGuard } from "@/lib/apiGuard";

export const HARDCODED_POSTS_CHANNELS = [
  "https://www.youtube.com/@Wero_lovernite",
  "https://www.youtube.com/@EnderVerseMC",
];

// Simple in-memory cache for serverless environment
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 hours cache

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

function findFirstValueForKey(obj: any, key: string): any {
  if (!obj || typeof obj !== "object") return null;
  if (obj[key] !== undefined) return obj[key];
  for (const k in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) {
      const val = findFirstValueForKey(obj[k], key);
      if (val !== null) return val;
    }
  }
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

function extractJsonObjectAfter(html: string, marker: string): any | null {
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
    const playerDescription = playerResponse?.videoDetails?.shortDescription;
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

    let data: any;
    try {
      data = JSON.parse(rawJson);
    } catch {
      throw new Error("ytInitialData no es un JSON válido");
    }

    const MODRINTH_REGEX =
      /modrinth\.com\/(mod|plugin|datapack|shader|resourcepack|modpack)\/([a-zA-Z0-9-_]+)/g;
    const CURSEFORGE_REGEX =
      /curseforge\.com\/minecraft\/(mc-mods|texture-packs|customization|mc-addons)\/([a-zA-Z0-9-_]+)/g;

    const posts: any[] = [];

    const parsedIds = new Set<string>();

    if (feedType === "videos") {
      // 1. Try videoRenderer
      const videoItems = findKeys(data, "videoRenderer");
      for (const item of videoItems) {
        const videoId = item.videoId || "";
        if (!videoId || parsedIds.has(videoId)) continue;
        parsedIds.add(videoId);

        const title = item.title?.runs?.[0]?.text || item.title?.accessibility?.accessibilityData?.label || "";
        const thumbs = item.thumbnail?.thumbnails || [];
        let thumbnail = thumbs[thumbs.length - 1]?.url || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
        if (thumbnail.startsWith("//")) {
          thumbnail = "https:" + thumbnail;
        }
        const publishedAt = item.publishedTimeText?.simpleText || item.publishedTimeText?.runs?.[0]?.text || "";
        const description = item.descriptionSnippet?.runs?.map((r: any) => r.text).join("") || "";
        
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
        const videoId = item.contentId || "";
        if (!videoId || parsedIds.has(videoId)) continue;
        parsedIds.add(videoId);

        const title = item.metadata?.lockupMetadataViewModel?.title?.content || "";
        const thumbs = item.contentImage?.thumbnailViewModel?.thumbnail?.thumbnails || [];
        let thumbnail = thumbs[thumbs.length - 1]?.url || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
        if (thumbnail.startsWith("//")) {
          thumbnail = "https:" + thumbnail;
        }
        
        const rows = item.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows || [];
        let publishedAt = "";
        if (rows.length > 0) {
          const parts = rows[0].metadataParts || [];
          if (parts.length > 1) {
            publishedAt = parts[1].text?.content || "";
          } else if (parts.length > 0) {
            publishedAt = parts[0].text?.content || "";
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
        const videoId = item.videoId || "";
        if (!videoId || parsedIds.has(videoId)) continue;
        parsedIds.add(videoId);

        const title = item.headline?.simpleText || item.headline?.runs?.[0]?.text || "";
        const thumbs = item.thumbnail?.thumbnails || [];
        let thumbnail = thumbs[thumbs.length - 1]?.url || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
        if (thumbnail.startsWith("//")) {
          thumbnail = "https:" + thumbnail;
        }
        const publishedAt = item.viewsText?.simpleText || "";

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
        const videoId = item.contentId || "";
        if (!videoId || parsedIds.has(videoId)) continue;
        parsedIds.add(videoId);

        const title = item.metadata?.lockupMetadataViewModel?.title?.content || "";
        const thumbs = item.contentImage?.thumbnailViewModel?.thumbnail?.thumbnails || [];
        let thumbnail = thumbs[thumbs.length - 1]?.url || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
        if (thumbnail.startsWith("//")) {
          thumbnail = "https:" + thumbnail;
        }
        
        const rows = item.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows || [];
        let publishedAt = "";
        if (rows.length > 0) {
          const parts = rows[0].metadataParts || [];
          if (parts.length > 1) {
            publishedAt = parts[1].text?.content || "";
          } else if (parts.length > 0) {
            publishedAt = parts[0].text?.content || "";
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
        const videoId = findFirstValueForKey(item, "videoId") || item.entityId?.split("-").pop() || "";
        if (!videoId || parsedIds.has(videoId)) continue;
        parsedIds.add(videoId);

        const title = item.overlayMetadata?.primaryText?.content || "";
        const thumbs = item.thumbnailViewModel?.thumbnailViewModel?.image?.sources || [];
        let thumbnail = thumbs[thumbs.length - 1]?.url || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
        if (thumbnail.startsWith("//")) {
          thumbnail = "https:" + thumbnail;
        }
        const publishedAt = item.overlayMetadata?.secondaryText?.content || "";

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
      const tabs: any[] = data.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
      const communityTab = tabs.find(
        (t: any) =>
          t.tabRenderer?.title === "Comunidad" ||
          t.tabRenderer?.title === "Community" ||
          t.tabRenderer?.title === "Publicaciones" ||
          t.tabRenderer?.title === "Posts" ||
          t.tabRenderer?.endpoint?.browseEndpoint?.browseId === undefined
      );

      const contents: any[] =
        communityTab?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]
          ?.itemSectionRenderer?.contents || [];

      for (const item of contents) {
        const postRenderer = item.backstagePostThreadRenderer?.post?.backstagePostRenderer;
        if (!postRenderer) continue;

        const postId: string = postRenderer.postId || "";
        if (!postId) continue;

        const rawText: string =
          postRenderer.contentText?.runs?.map((r: any) => r.text).join("") || "";

        const publishedTime: string =
          postRenderer.publishedTimeText?.runs?.[0]?.text ||
          postRenderer.publishedTimeText?.simpleText ||
          "";

        const attachment = postRenderer.backstageAttachment?.backstageImageRenderer;
        const multiImages = postRenderer.backstageAttachment?.postMultiImageRenderer?.images;
        const videoAttachment = postRenderer.backstageAttachment?.videoRenderer;

        let thumbnail = "";
        let embeddedVideoId = "";

        if (attachment?.image?.thumbnails?.length) {
          const thumbs = attachment.image.thumbnails;
          thumbnail = thumbs[thumbs.length - 1]?.url || thumbs[0]?.url || "";
        } else if (multiImages?.length) {
          const firstImg = multiImages[0]?.backstageImageRenderer?.image?.thumbnails;
          if (firstImg?.length) {
            thumbnail = firstImg[firstImg.length - 1]?.url || firstImg[0]?.url || "";
          }
        } else if (videoAttachment) {
          embeddedVideoId = videoAttachment.videoId || "";
          if (videoAttachment.thumbnail?.thumbnails?.length) {
            const thumbs = videoAttachment.thumbnail.thumbnails;
            thumbnail = thumbs[thumbs.length - 1]?.url || thumbs[0]?.url || "";
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
