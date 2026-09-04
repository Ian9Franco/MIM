import { NextResponse } from "next/server";
import { z } from "zod";
import YTDlpWrap from "yt-dlp-wrap";
import path from "path";
import fs from "fs";
import { withApiGuard } from "@/lib/apiGuard";
import { checkYtdlpUpdate } from "@/lib/ytdlp/updater";

const binDir = path.join(process.cwd(), "standalone");
const binPath = path.join(binDir, "yt-dlp.exe");
const ytDlpWrap = new YTDlpWrap(binPath);

async function ensureYtDlp() {
  if (!fs.existsSync(binPath)) {
    if (!fs.existsSync(binDir)) fs.mkdirSync(binDir, { recursive: true });
    await YTDlpWrap.downloadFromGithub(binPath);
  }
}

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

const querySchema = z.object({
  videoId: z.string().trim().min(1, "videoId is required"),
});

export const GET = withApiGuard(
  {
    rateLimit: { windowMs: 60 * 1000, maxRequests: 60 },
    querySchema,
  },
  async ({ query }) => {
    const { videoId } = query;

    try {
      await ensureYtDlp();
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const detailOut = await ytDlpWrap.execPromise([videoUrl, "--dump-json", "--no-playlist"]);
      const detail = JSON.parse(detailOut.trim());
      
      return NextResponse.json({
        title: detail.title,
        thumbnail: detail.thumbnail,
        videoUrl,
        videoId: detail.id,
        modSlugs: extractModSlugs(detail.description || ""),
        publishedAt: detail.upload_date ?? "",
        channelUrl: detail.uploader_url || (detail.uploader_id ? `https://www.youtube.com/@${detail.uploader_id.replace(/^@/, "")}` : detail.channel_url) || "",
        channelName: detail.uploader ?? "",
      });
    } catch (err: any) {
      console.error("[youtube-video] Error:", err.message);

      let updateInfo = { needsUpdate: false, latest: "", current: "" };
      try {
        const info = await checkYtdlpUpdate();
        updateInfo = { needsUpdate: info.needsUpdate, latest: info.latest, current: info.current };
      } catch {
        // Non-critical
      }

      return NextResponse.json(
        {
          error: "Failed to fetch video details",
          updateAvailable: updateInfo.needsUpdate,
          latestVersion: updateInfo.latest,
          currentVersion: updateInfo.current,
        },
        { status: 500 }
      );
    }
  }
);
