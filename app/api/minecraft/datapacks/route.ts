import { NextRequest, NextResponse } from "next/server";
import { getSettings } from "@/lib/core/settings";
import path from "path";
import fs from "fs";
import { withApiGuard } from "@/lib/apiGuard";

export const GET = withApiGuard(
  {},
  async ({ request }) => {
    const req = request as NextRequest;

  try {
    const settings = getSettings();
    const savesPath = path.join(settings.minecraftPath, "saves");

    if (!fs.existsSync(savesPath)) {
      return NextResponse.json({ packs: [] });
    }

    const { searchParams } = new URL(req.url);
    let worldName = searchParams.get("world");

    // Fallback: find last played world if not specified
    if (!worldName) {
      const entries = fs.readdirSync(savesPath, { withFileTypes: true });
      let maxMtime = 0;
      let lastWorld = "";

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const levelDatPath = path.join(savesPath, entry.name, "level.dat");
        if (fs.existsSync(levelDatPath)) {
          const stats = fs.statSync(levelDatPath);
          if (stats.mtimeMs > maxMtime) {
            maxMtime = stats.mtimeMs;
            lastWorld = entry.name;
          }
        }
      }
      worldName = lastWorld;
    }

    if (!worldName) {
      return NextResponse.json({ packs: [] });
    }

    const packsPath = path.join(savesPath, worldName, "datapacks");

    if (!fs.existsSync(packsPath)) {
      return NextResponse.json({ packs: [] });
    }

    const entries = fs.readdirSync(packsPath, { withFileTypes: true });
    const packs = [];

    for (const entry of entries) {
      if (!entry.isFile() && !entry.isDirectory()) continue;
      if (entry.isFile() && !entry.name.endsWith(".zip")) continue;

      const filePath = path.join(packsPath, entry.name);
      const stats = fs.statSync(filePath);

      packs.push({
        fileName: entry.name,
        size: stats.isDirectory() ? 0 : stats.size,
        mtime: stats.mtime,
        path: filePath,
        isFolder: stats.isDirectory()
      });
    }

    // Sort by mtime descending (newest first)
    packs.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    return NextResponse.json({ packs, worldName });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[/api/minecraft/datapacks] Unhandled error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  }
);
