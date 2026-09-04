import { NextResponse } from "next/server";
import { z } from "zod";
import YTDlpWrap from "yt-dlp-wrap";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { withApiGuard } from "@/lib/apiGuard";
import { getPortableDir } from "@/lib/core/settings";
import { checkYtdlpUpdate } from "@/lib/ytdlp/updater";

// Definimos la ruta del binario en la carpeta standalone del proyecto
const binDir = path.join(process.cwd(), "standalone");
const binPath = path.join(binDir, "yt-dlp.exe");

// Instanciamos el wrapper apuntando al binario local
const ytDlpWrap = new YTDlpWrap(binPath);

// Asegurar que el binario existe, si no, descargarlo
async function ensureYtDlp() {
  if (!fs.existsSync(binPath)) {
    console.log("[youtube-showcase] No se encontró yt-dlp. Descargando desde GitHub...");
    if (!fs.existsSync(binDir)) {
      fs.mkdirSync(binDir, { recursive: true });
    }
    await YTDlpWrap.downloadFromGithub(binPath);
    console.log("[youtube-showcase] yt-dlp descargado con éxito.");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Regex patterns para plataformas de mods
// ─────────────────────────────────────────────────────────────────────────────
const MODRINTH_REGEX = /modrinth\.com\/(mod|plugin|datapack|shader|resourcepack|modpack)\/([a-zA-Z0-9-_]+)/g;
const CURSEFORGE_REGEX = /curseforge\.com\/minecraft\/(mc-mods|texture-packs|customization|mc-addons)\/([a-zA-Z0-9-_]+)/g;

function sanitizeSlug(raw: string): string {
  return raw.split(/[?#&]/)[0].replace(/[^a-zA-Z0-9-_]/g, "").toLowerCase();
}

function extractModSlugs(description: string): string[] {
  const found: string[] = [];
  let match: RegExpExecArray | null;

  const modrinthCopy = new RegExp(MODRINTH_REGEX.source, "g");
  while ((match = modrinthCopy.exec(description)) !== null) {
    const type = match[1];
    const slug = sanitizeSlug(match[2]);
    if (slug) {
      // Heurística: buscar modloader y versión en las 100 caracteres anteriores al link
      const textBefore = description.substring(Math.max(0, match.index - 100), match.index);
      const isFabric = /fabric/i.test(textBefore);
      const isForge = /forge/i.test(textBefore);
      const loader = isFabric ? "fabric" : isForge ? "forge" : "";
      
      const verMatch = textBefore.match(/1\.\d+(\.\d+)?/);
      const version = verMatch ? verMatch[0] : "";
      
      found.push(`modrinth:${type}:${slug}:${loader}:${version}`);
    }
  }

  const curseForgeCopy = new RegExp(CURSEFORGE_REGEX.source, "g");
  while ((match = curseForgeCopy.exec(description)) !== null) {
    const type = match[1];
    const slug = sanitizeSlug(match[2]);
    if (slug) {
      const textBefore = description.substring(Math.max(0, match.index - 100), match.index);
      const isFabric = /fabric/i.test(textBefore);
      const isForge = /forge/i.test(textBefore);
      const loader = isFabric ? "fabric" : isForge ? "forge" : "";
      
      const verMatch = textBefore.match(/1\.\d+(\.\d+)?/);
      const version = verMatch ? verMatch[0] : "";
      
      found.push(`curseforge:${type}:${slug}:${loader}:${version}`);
    }
  }

  return [...new Set(found)];
}

async function scrapeVideoDetail(videoUrl: string): Promise<{
  title: string;
  thumbnail: string;
  videoUrl: string;
  videoId: string;
  modSlugs: string[];
  publishedAt: string;
}> {
  await ensureYtDlp();

  // Obtener descripción completa del video específico
  const detailOut = await ytDlpWrap.execPromise([
    videoUrl,
    "--dump-json",
    "--no-playlist"
  ]);

  const detail = JSON.parse(detailOut.trim());
  const description: string = detail.description || "";

  let thumbnail = detail.thumbnail || `https://i.ytimg.com/vi/${detail.id}/mqdefault.jpg`;
  if (thumbnail.startsWith("//")) {
    thumbnail = "https:" + thumbnail;
  }

  return {
    title: detail.title,
    thumbnail,
    videoUrl,
    videoId: detail.id,
    modSlugs: extractModSlugs(description),
    publishedAt: detail.upload_date ?? "",
  };
}

async function scrapeLatestVideo(channelUrl: string) {
  await ensureYtDlp();

  // Paso 1: Obtener el último video del canal
  const flatOut = await ytDlpWrap.execPromise([
    channelUrl,
    "--flat-playlist",
    "--playlist-end", "1",
    "--dump-json"
  ]);

  const lines = flatOut.trim().split("\n").filter(Boolean);
  const jsonLine = lines.slice().reverse().find(l => l.startsWith("{"));
  if (!jsonLine) throw new Error("No JSON found in yt-dlp output");
  const flatInfo = JSON.parse(jsonLine);
  const videoId: string = flatInfo.id;
  const videoUrl: string = flatInfo.url || `https://www.youtube.com/watch?v=${videoId}`;

  return scrapeVideoDetail(videoUrl);
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/fomo/youtube-showcase?channel=<url>&limit=<1|n>
// ─────────────────────────────────────────────────────────────────────────────
const querySchema = z.object({
  channel: z.string().optional().default("https://www.youtube.com/@EnderVerseMC"),
  limit: z.coerce.number().int().min(1).max(20).optional().default(1),
  cursor: z.coerce.number().int().min(1).optional(),
  page: z.coerce.number().int().min(1).optional(),
  type: z.string().optional(),
});

export const GET = withApiGuard(
  {
    rateLimit: { windowMs: 60 * 1000, maxRequests: 60 },
    querySchema,
  },
  async ({ query }) => {
    const channelUrl = query.channel;
    const limit = query.limit;
    const cursor = query.cursor ?? query.page ?? 1;
    const type = query.type ?? (channelUrl.includes("/shorts") ? "shorts" : "videos");

    // Normalizar cualquier URL de canal de YouTube para asegurar que apunte a /videos o /shorts
    let targetUrl = channelUrl.replace(/\/$/, "");
    
    if (targetUrl.startsWith("http")) {
      // Remover sufijos existentes para evitar duplicados
      targetUrl = targetUrl.replace(/\/(videos|shorts|featured|streams|playlists)$/, "");
      // Añadir el sufijo correcto
      targetUrl = targetUrl + (type === "shorts" ? "/shorts" : "/videos");
    } else {
      // Si es un handle o nombre de usuario simple
      targetUrl = `https://www.youtube.com/${targetUrl.startsWith("@") ? "" : "@"}${targetUrl}${type === "shorts" ? "/shorts" : "/videos"}`;
    }

    const channelHash = crypto.createHash("md5").update(targetUrl).digest("hex").substring(0, 10);
    const cacheDir = path.join(getPortableDir(), "cache");
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    const cacheFile = path.join(cacheDir, `showcase_cache_${channelHash}_${type}_cursor_${cursor}_limit_${limit}.json`);

    if (fs.existsSync(cacheFile)) {
      try {
        const stats = fs.statSync(cacheFile);
        const now = new Date().getTime();
        const mtime = new Date(stats.mtime).getTime();
        const ageHours = (now - mtime) / (1000 * 60 * 60);

        // Expirar la caché cada 6 horas para buscar videos nuevos
        if (ageHours < 6) {
          const cachedData = JSON.parse(fs.readFileSync(cacheFile, "utf-8"));
          return NextResponse.json(cachedData);
        } else {
          console.log(`[youtube-showcase] Caché expirada (${ageHours.toFixed(1)}h), buscando nuevos videos...`);
        }
      } catch (e) {
        console.error("Error reading cache file", e);
      }
    }

    try {
      await ensureYtDlp();

      if (limit === 1 && cursor === 1) {
        const showcase = await scrapeLatestVideo(targetUrl);
        const responseData = { mode: "spotlight", showcases: [showcase] };
        fs.writeFileSync(cacheFile, JSON.stringify(responseData, null, 2), "utf-8");
        return NextResponse.json(responseData);
      }

      const start = cursor;
      const end = cursor + 14; 

      // Modo Archivo (Seguidos) — paginado por cursor
      const flatOut = await ytDlpWrap.execPromise([
        targetUrl,
        "--flat-playlist",
        "--playlist-start", start.toString(),
        "--playlist-end", end.toString(),
        "--dump-json"
      ]);

      const lines = flatOut.trim().split("\n").filter(Boolean);
      const videoEntries = lines.map((line) => {
        try { return JSON.parse(line); } catch { return null; }
      }).filter(Boolean);

      const results: any[] = [];
      let itemsProcessed = 0;

      const CONCURRENCY = 3;
      for (let i = 0; i < videoEntries.length; i += CONCURRENCY) {
        if (results.length >= limit) break;

        const batch = videoEntries.slice(i, i + CONCURRENCY);
        const settled = await Promise.allSettled(
          batch.map((entry) => {
            const vUrl = entry.url || `https://www.youtube.com/watch?v=${entry.id}`;
            return scrapeVideoDetail(vUrl);
          })
        );

        for (let j = 0; j < settled.length; j++) {
          itemsProcessed++;
          const res = settled[j];
          if (res.status === "fulfilled") {
            results.push(res.value);
            if (results.length === limit) {
              break;
            }
          }
        }
      }

      const nextCursor = cursor + itemsProcessed;
      const hasMore = (videoEntries.length > 0 && itemsProcessed < videoEntries.length) || results.length === limit;

      const responseData = { mode: "archive", showcases: results, nextCursor, hasMore };
      fs.writeFileSync(cacheFile, JSON.stringify(responseData, null, 2), "utf-8");
      return NextResponse.json(responseData);
    } catch (err: any) {
      console.error("[youtube-showcase] Error:", err.message);

      // Before failing, check if a yt-dlp update might fix the issue
      let updateInfo = { needsUpdate: false, latest: "", current: "" };
      try {
        const info = await checkYtdlpUpdate();
        updateInfo = { needsUpdate: info.needsUpdate, latest: info.latest, current: info.current };
      } catch {
        // Non-critical
      }

      return NextResponse.json(
        {
          error: "No se pudo obtener el showcase de YouTube. Verificá que yt-dlp-wrap funcione correctamente.",
          updateAvailable: updateInfo.needsUpdate,
          latestVersion: updateInfo.latest,
          currentVersion: updateInfo.current,
        },
        { status: 500 }
      );
    }
  }
);
