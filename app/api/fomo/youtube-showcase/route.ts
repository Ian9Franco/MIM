import { NextResponse } from "next/server";
import YTDlpWrap from "yt-dlp-wrap";
import path from "path";
import fs from "fs";

// Definimos la ruta del binario en la carpeta standalone del proyecto
const binDir = path.join(process.cwd(), "standalone");
const binPath = path.join(binDir, "yt-dlp.exe");

// Instanciamos el wrapper apuntando al binario local
const ytDlpWrap = new YTDlpWrap(binPath);

// Asegurar que el binario existe, si no, descargarlo
async function ensureYtDlp() {
  if (!fs.existsSync(binPath)) {
    console.log("[youtube-showcase] No se encontró yt-dlp. Descargando desde GitHub...");
    // Asegurar que la carpeta existe
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

  return {
    title: detail.title,
    thumbnail: detail.thumbnail,
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

  const flatInfo = JSON.parse(flatOut.trim());
  const videoId: string = flatInfo.id;
  const videoUrl: string = flatInfo.url || `https://www.youtube.com/watch?v=${videoId}`;

  return scrapeVideoDetail(videoUrl);
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/fomo/youtube-showcase?channel=<url>&limit=<1|n>
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const channelUrl = searchParams.get("channel") ?? "https://www.youtube.com/@EnderVerseMC";
  const limitParam = parseInt(searchParams.get("limit") ?? "1", 10);
  const limit = isNaN(limitParam) || limitParam < 1 ? 1 : Math.min(limitParam, 20);
  const pageParam = parseInt(searchParams.get("page") ?? "1", 10);
  const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;

  // Asegurar que apuntamos a la sección de videos para evitar destacados/shorts
  let targetUrl = channelUrl;
  if (/youtube\.com\/@[^\/]+$/.test(targetUrl.replace(/\/$/, "")) || (targetUrl.includes("@") && !targetUrl.includes("/videos") && !targetUrl.includes("/shorts") && !targetUrl.includes("/streams"))) {
    targetUrl = targetUrl.replace(/\/$/, "") + "/videos";
  }

  try {
    await ensureYtDlp();

    if (limit === 1 && page === 1) {
      const showcase = await scrapeLatestVideo(targetUrl);
      return NextResponse.json({ mode: "spotlight", showcases: [showcase] });
    }

    const start = (page - 1) * limit + 1;
    const end = page * limit;

    // Modo Archivo (Seguidos) — paginado
    const flatOut = await ytDlpWrap.execPromise([
      targetUrl,
      "--flat-playlist",
      "--playlist-start", start.toString(),
      "--playlist-end", end.toString(),
      "--dump-json"
    ]);

    const lines = flatOut.trim().split("\n").filter(Boolean);
    const videoEntries = lines.map((line) => JSON.parse(line));

    const CONCURRENCY = 3;
    const results: any[] = [];

    for (let i = 0; i < videoEntries.length; i += CONCURRENCY) {
      const batch = videoEntries.slice(i, i + CONCURRENCY);
      const settled = await Promise.allSettled(
        batch.map((entry) => {
          const vUrl = entry.url || `https://www.youtube.com/watch?v=${entry.id}`;
          return scrapeVideoDetail(vUrl);
        })
      );
      for (const res of settled) {
        if (res.status === "fulfilled") results.push(res.value);
      }
    }

    return NextResponse.json({ mode: "archive", showcases: results });
  } catch (err: any) {
    console.error("[youtube-showcase] Error:", err.message);
    return NextResponse.json(
      { error: "No se pudo obtener el showcase de YouTube. Verificá que yt-dlp-wrap funcione correctamente." },
      { status: 500 }
    );
  }
}
