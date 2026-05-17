import { NextRequest, NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import path from "path";
import fs from "fs";

export async function GET(req: NextRequest) {
  try {
    const settings = getSettings();
    const packsPath = path.join(settings.minecraftPath, "resourcepacks");

    if (!fs.existsSync(packsPath)) {
      return NextResponse.json({ packs: [] });
    }

    const entries = fs.readdirSync(packsPath, { withFileTypes: true });
    const packs = [];

    for (const entry of entries) {
      if (!entry.isFile() && !entry.isDirectory()) continue;
      // Resource packs can be files (zip) or directories!
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

    return NextResponse.json({ packs });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[/api/minecraft/resourcepacks] Unhandled error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
