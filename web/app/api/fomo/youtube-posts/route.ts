import { NextResponse } from "next/server";
import crypto from "crypto";

export const HARDCODED_POSTS_CHANNELS = [
  "https://www.youtube.com/@Wero_lovernite",
  "https://www.youtube.com/@EnderVerseMC",
];

// Simple in-memory cache for serverless environment
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 hours cache

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const channelUrl = searchParams.get("channel") || HARDCODED_POSTS_CHANNELS[0];

  const channelHash = crypto
    .createHash("md5")
    .update(channelUrl)
    .digest("hex")
    .substring(0, 10);

  // 1. Check in-memory cache
  const cached = cache.get(channelHash);
  if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
    return NextResponse.json(cached.data);
  }

  try {
    const handle = channelUrl.includes("@")
      ? "@" + channelUrl.split("@").pop()!.split("/")[0]
      : channelUrl.split("/").pop() || "";

    const targetUrl = `https://www.youtube.com/${handle}/posts`;

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
    if (!match) {
      const match2 = html.match(/ytInitialData\s*=\s*({.+?})\s*;/s);
      if (!match2) {
        throw new Error("No se pudo extraer la metadata de YouTube");
      }
    }

    const rawJson = (match || html.match(/ytInitialData\s*=\s*({.+?})\s*;/s))![1];
    let data: any;
    try {
      data = JSON.parse(rawJson);
    } catch {
      throw new Error("ytInitialData no es un JSON válido");
    }

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

    const MODRINTH_REGEX =
      /modrinth\.com\/(mod|plugin|datapack|shader|resourcepack|modpack)\/([a-zA-Z0-9-_]+)/g;
    const CURSEFORGE_REGEX =
      /curseforge\.com\/minecraft\/(mc-mods|texture-packs|customization|mc-addons)\/([a-zA-Z0-9-_]+)/g;

    const posts: any[] = [];

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

      const modSlugs: string[] = [];
      let mMatch: RegExpExecArray | null;
      
      // Reset regex index states
      MODRINTH_REGEX.lastIndex = 0;
      CURSEFORGE_REGEX.lastIndex = 0;

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

    const responseData = {
      mode: "posts",
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
