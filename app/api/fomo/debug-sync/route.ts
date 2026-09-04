import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getPortableDir } from "@/lib/core/settings";
import { withApiGuard } from "@/lib/apiGuard";

const DATA_DIR = path.join(getPortableDir(), "data");
const CHANNELS_FILE = path.join(DATA_DIR, "showcase_channels.json");
const STORAGE_KEY = "mim_fomo_last_sync_state";

interface SyncState {
  lastVideoIds: Record<string, string>;
  lastModDates: Record<string, string>;
}

function getChannels(): string[] {
  if (fs.existsSync(CHANNELS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CHANNELS_FILE, "utf-8"));
    } catch (e) {
      console.error("Error reading channels file", e);
    }
  }
  return ["https://www.youtube.com/@EnderVerseMC"];
}

export const GET = withApiGuard(
  {},
  async ({ request }) => {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  // Debug: mostrar canales guardados
  if (action === "channels") {
    const channels = getChannels();
    return NextResponse.json({ channels });
  }

  // Debug: mostrar estado de sync
  if (action === "state") {
    if (typeof window !== "undefined") {
      // Server-side, no window
      return NextResponse.json({ error: "Cannot access localStorage on server" }, { status: 400 });
    }
    return NextResponse.json({ error: "Use client-side to check localStorage" }, { status: 400 });
  }

  // Debug: testear fetch de un canal específico
  if (action === "test-channel") {
    const channelUrl = searchParams.get("url");
    if (!channelUrl) {
      return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
    }

    try {
      // Construir URL base del servidor
      const baseUrl = new URL(request.url).origin;
      const showcaseUrl = new URL(
        `/api/fomo/youtube-showcase?channel=${encodeURIComponent(
          channelUrl
        )}&limit=1`,
        baseUrl
      ).toString();

      const res = await fetch(showcaseUrl);
      if (res.ok) {
        const data = await res.json();
        const latestVideo = data.showcases?.[0];
        return NextResponse.json({
          channel: channelUrl,
          latestVideo: latestVideo || null,
          cached: true,
        });
      }
      return NextResponse.json({ error: "Failed to fetch showcase", status: res.status }, { status: res.status });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  // Debug: limpiar caché de un canal
  if (action === "clear-cache") {
    const channelUrl = searchParams.get("url");
    if (!channelUrl) {
      return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
    }

    try {
      const cacheDir = path.join(getPortableDir(), "cache");
      const channelHash = crypto.createHash("md5").update(channelUrl).digest("hex").substring(0, 10);

      // Delete all cache files for this channel
      const files = fs.readdirSync(cacheDir);
      const deleted: string[] = [];

      files.forEach((file) => {
        if (file.includes(`showcase_cache_${channelHash}`)) {
          const filePath = path.join(cacheDir, file);
          fs.unlinkSync(filePath);
          deleted.push(file);
        }
      });

      return NextResponse.json({
        message: "Cache cleared",
        channel: channelUrl,
        deletedFiles: deleted,
      });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  // Debug: forzar sync inmediato
  if (action === "force-sync") {
    try {
      const channels = getChannels();
      const results: any[] = [];
      const baseUrl = new URL(request.url).origin;

      for (const channelUrl of channels) {
        try {
          // Limpiamos caché antes de testear
          const cacheDir = path.join(getPortableDir(), "cache");
          const channelHash = crypto.createHash("md5").update(channelUrl).digest("hex").substring(0, 10);

          const files = fs.readdirSync(cacheDir);
          files.forEach((file) => {
            if (file.includes(`showcase_cache_${channelHash}`)) {
              fs.unlinkSync(path.join(cacheDir, file));
            }
          });

          // Ahora fetchiamos el video nuevo
          const showcaseUrl = new URL(
            `/api/fomo/youtube-showcase?channel=${encodeURIComponent(
              channelUrl
            )}&limit=1`,
            baseUrl
          ).toString();

          const scRes = await fetch(showcaseUrl);

          if (scRes.ok) {
            const scData = await scRes.json();
            const latestVideo = scData.showcases?.[0];
            results.push({
              channel: channelUrl,
              videoId: latestVideo?.videoId || null,
              title: latestVideo?.title || null,
              publishedAt: latestVideo?.publishedAt || null,
              status: "success",
            });
          } else {
            results.push({
              channel: channelUrl,
              status: "error",
              error: "Failed to fetch",
            });
          }
        } catch (err: any) {
          results.push({
            channel: channelUrl,
            status: "error",
            error: err.message,
          });
        }
      }

      return NextResponse.json({
        action: "force-sync",
        channels: channels.length,
        results,
      });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    available: [
      "/api/fomo/debug-sync?action=channels - Ver canales guardados",
      "/api/fomo/debug-sync?action=test-channel&url=<URL> - Testear un canal específico",
      "/api/fomo/debug-sync?action=clear-cache&url=<URL> - Limpiar caché de un canal",
      "/api/fomo/debug-sync?action=force-sync - Forzar sync de todos los canales",
    ],
  });
}
);
