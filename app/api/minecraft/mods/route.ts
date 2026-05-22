import { NextRequest, NextResponse } from "next/server";
import { getSettings } from "@/lib/core/settings";
import path from "path";
import fs from "fs";
import { scanMod } from "@/lib/modding/enhanced-mod-scanner";

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

    // Detect dominant version if mods are present (MIMU mode heuristic)
    let detectedVersion = "1.20.1"; // Fallback
    const jarFiles = entries.filter(e => e.isFile() && e.name.endsWith(".jar"));
    
    if (jarFiles.length > 0) {
      const randomJars = jarFiles.sort(() => 0.5 - Math.random()).slice(0, 5);
      const versions: string[] = [];
      
      for (const jar of randomJars) {
        const filePath = path.join(modsPath, jar.name);
        try {
          const meta = await scanMod(filePath);
          if (meta.gameVersion && meta.gameVersion !== "UNKNOWN") {
            versions.push(meta.gameVersion);
          }
        } catch (e) {
          console.error(`[/api/minecraft/mods] Failed to scan ${jar.name}:`, e);
        }
      }
      
      if (versions.length > 0) {
        const counts: Record<string, number> = {};
        versions.forEach(v => counts[v] = (counts[v] || 0) + 1);
        detectedVersion = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b, "1.20.1");
      }
    }

    return NextResponse.json({ mods, detectedVersion });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[/api/minecraft/mods] Unhandled error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
