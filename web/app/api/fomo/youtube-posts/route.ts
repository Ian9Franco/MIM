import { NextResponse } from "next/server";
import crypto from "crypto";

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
  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const channelUrl = searchParams.get("channel") || HARDCODED_POSTS_CHANNELS[0];
  const feedType = searchParams.get("type") || "posts"; // "posts", "videos", "shorts"

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

  try {
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
          description: title,
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
          description: title,
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
          description: title,
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
          description: title,
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

    const responseData = {
      mode: feedType,
      showcases: posts,
      channel: channelUrl,
      handle,
    };

    // Save in memory cache
    cache.set(channelHash, { data: responseData, timestamp: Date.now() });

    return NextResponse.json(responseData);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Error desconocido" },
      { status: 500 }
    );
  }
}
