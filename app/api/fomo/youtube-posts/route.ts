import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { withApiGuard } from "@/lib/apiGuard";
import { getPortableDir } from "@/lib/core/settings";

const CACHE_DIR = path.join(getPortableDir(), "cache");

// Canales predeterminados que tienen posts de comunidad con compilaciones de mods
export const HARDCODED_POSTS_CHANNELS = [
  "https://www.youtube.com/@Wero_lovernite",
  "https://www.youtube.com/@EnderVerseMC",
];

const querySchema = z.object({
  channel: z.string().optional().default(HARDCODED_POSTS_CHANNELS[0]),
});

export const GET = withApiGuard(
  {
    rateLimit: { windowMs: 60 * 1000, maxRequests: 60 },
    querySchema,
  },
  async ({ query }) => {
    const channelUrl = query.channel;

    // Cache válida por 12 horas para ser amigables con YouTube
    const channelHash = crypto
      .createHash("md5")
      .update(channelUrl)
      .digest("hex")
      .substring(0, 10);
    const cacheFile = path.join(CACHE_DIR, `showcase_posts_v2_${channelHash}.json`);

    // 1. Validar caché existente
    if (fs.existsSync(cacheFile)) {
      try {
        const stats = fs.statSync(cacheFile);
        const ageHours =
          (Date.now() - new Date(stats.mtime).getTime()) / (1000 * 60 * 60);
        if (ageHours < 12) {
          return NextResponse.json(
            JSON.parse(fs.readFileSync(cacheFile, "utf-8"))
          );
        }
      } catch {
        // Si hay error leyendo el caché, continuamos con la solicitud fresca
      }
    }

    try {
      // Extraer el handle del canal de la URL
      const rawHandle = channelUrl.includes("@")
        ? "@" + (channelUrl.split("@").pop()?.split("/")[0] || "")
        : channelUrl.split("/").pop() || "";
      const handle = encodeURIComponent(rawHandle.replace(/[^a-zA-Z0-9_.-@]/g, ""));

      const targetUrl = `https://www.youtube.com/${handle}/posts`;

      // Fetch con User-Agent moderno para imitar un browser real
      const response = await fetch(targetUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        },
      });

      if (!response.ok) {
        throw new Error(`YouTube devolvió HTTP ${response.status}`);
      }

      const html = await response.text();

      // Extraer el JSON de ytInitialData incrustado en el HTML de YouTube
      const regex = /var ytInitialData\s*=\s*({.*?});\s*<\/script>/s;
      const match = html.match(regex);
      if (!match) {
        // Intentar regex alternativa
        const match2 = html.match(/ytInitialData\s*=\s*({.+?})\s*;/s);
        if (!match2) {
          throw new Error(
            "No se pudo extraer la metadata de YouTube (ytInitialData no encontrado)"
          );
        }
      }

      const rawJson = (match || html.match(/ytInitialData\s*=\s*({.+?})\s*;/s))![1];
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(rawJson);
      } catch {
        throw new Error("ytInitialData no es un JSON válido");
      }

      // Recorrer el árbol JSON para encontrar los posts de comunidad
      const contentsObj = data.contents as Record<string, unknown> | undefined;
      const twoCol = contentsObj?.twoColumnBrowseResultsRenderer as Record<string, unknown> | undefined;
      const tabs: Array<Record<string, unknown>> = Array.isArray(twoCol?.tabs) ? (twoCol?.tabs as Array<Record<string, unknown>>) : [];
      const communityTab = tabs.find((t) => {
        const tabRenderer = t.tabRenderer as Record<string, unknown> | undefined;
        const title = tabRenderer?.title;
        const endpoint = tabRenderer?.endpoint as Record<string, unknown> | undefined;
        const browseEndpoint = endpoint?.browseEndpoint as Record<string, unknown> | undefined;
        const params = typeof browseEndpoint?.params === "string" ? browseEndpoint.params : "";
        return (
          title === "Comunidad" ||
          title === "Community" ||
          title === "Publicaciones" ||
          title === "Posts" ||
          params.includes("community") ||
          params.includes("posts")
        );
      });

      const tabRenderer = communityTab?.tabRenderer as Record<string, unknown> | undefined;
      const tabContent = tabRenderer?.content as Record<string, unknown> | undefined;
      const secList = tabContent?.sectionListRenderer as Record<string, unknown> | undefined;
      const secContents = Array.isArray(secList?.contents) ? (secList?.contents as Array<Record<string, unknown>>) : [];
      const itemSection = secContents[0]?.itemSectionRenderer as Record<string, unknown> | undefined;
      const contents: Array<Record<string, unknown>> = Array.isArray(itemSection?.contents)
        ? (itemSection?.contents as Array<Record<string, unknown>>)
        : [];

      // Regex para detectar slugs/enlaces de Modrinth y CurseForge en el texto del post
      const MODRINTH_REGEX =
        /modrinth\.com\/(mod|plugin|datapack|shader|resourcepack|modpack)\/([a-zA-Z0-9-_]+)/g;
      const CURSEFORGE_REGEX =
        /curseforge\.com\/minecraft\/(mc-mods|texture-packs|customization|mc-addons)\/([a-zA-Z0-9-_]+)/g;

      interface SimplePostItem {
        postId: string;
        title: string;
        description: string;
        thumbnail: string;
        embeddedVideoId: string;
        videoUrl: string;
        modSlugs: string[];
        publishedAt: string;
        mode: string;
      }
      const posts: SimplePostItem[] = [];

      for (const item of contents) {
        const backstagePostThread = item.backstagePostThreadRenderer as Record<string, unknown> | undefined;
        const post = backstagePostThread?.post as Record<string, unknown> | undefined;
        const postRenderer = post?.backstagePostRenderer as Record<string, unknown> | undefined;
        if (!postRenderer) continue;

        const postId: string = String(postRenderer.postId || "");
        if (!postId) continue;

        // Extraer texto completo del post
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

        // Extraer imagen o video adjunto si existe
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
          // Preferir la miniatura más grande
          thumbnail = attachThumbs[attachThumbs.length - 1]?.url || attachThumbs[0]?.url || "";
        } else if (multiImages?.length) {
          const firstImgRenderer = multiImages[0]?.backstageImageRenderer as Record<string, unknown> | undefined;
          const firstImg = firstImgRenderer?.image as Record<string, unknown> | undefined;
          const firstThumbs = Array.isArray(firstImg?.thumbnails) ? (firstImg?.thumbnails as Array<{ url?: string }>) : [];
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

        // Detectar slugs de plataformas en el texto
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

      const responseData = {
        mode: "posts",
        showcases: posts,
        channel: channelUrl,
        handle,
      };

      // Guardar en cache
      if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
      fs.writeFileSync(cacheFile, JSON.stringify(responseData, null, 2), "utf-8");

      return NextResponse.json(responseData);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Error desconocido";
      return NextResponse.json(
        { error: errorMsg },
        { status: 500 }
      );
    }
  }
);
