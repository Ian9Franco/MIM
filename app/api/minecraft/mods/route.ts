import { NextRequest, NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import path from "path";
import fs from "fs";

export async function GET(req: NextRequest) {
  try {
    const settings = getSettings();
    const modsPath = path.join(settings.minecraftPath, "mods");

    if (!fs.existsSync(modsPath)) {
      return NextResponse.json({ mods: [] });
    }

    const entries = fs.readdirSync(modsPath, { withFileTypes: true });
    const mods = [];

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".jar")) continue;

      const filePath = path.join(modsPath, entry.name);
      const stats = fs.statSync(filePath);

      mods.push({
        fileName: entry.name,
        size: stats.size,
        mtime: stats.mtime,
        path: filePath
      });
    }

    // Sort by mtime descending (newest first)
    mods.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    return NextResponse.json({ mods });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[/api/minecraft/mods] Unhandled error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
