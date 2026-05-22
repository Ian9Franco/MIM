import { NextRequest, NextResponse } from "next/server";
import { getSettings } from "@/lib/core/settings";
import { readNBT } from "@/lib/modding/nbt";
import path from "path";
import fs from "fs";

export async function GET(req: NextRequest) {
  try {
    const settings = getSettings();
    const savesPath = path.join(settings.minecraftPath, "saves");

    if (!fs.existsSync(savesPath)) {
      return NextResponse.json({ worlds: [] });
    }

    const entries = fs.readdirSync(savesPath, { withFileTypes: true });
    const worlds = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const worldPath = path.join(savesPath, entry.name);
      const levelDatPath = path.join(worldPath, "level.dat");
      const iconPath = path.join(worldPath, "icon.png");

      let worldName = entry.name;
      let iconBase64 = null;

      if (fs.existsSync(levelDatPath)) {
        try {
          const buffer = fs.readFileSync(levelDatPath);
          const nbt = await readNBT(buffer);
          
          // Navigate to Data -> LevelName
          // In NBT compound, value is a record of tags
          const dataTag = nbt.value["Data"];
          if (dataTag && dataTag.value) {
            const levelNameTag = dataTag.value["LevelName"];
            if (levelNameTag && levelNameTag.value) {
              worldName = levelNameTag.value;
            }
          }
        } catch (e) {
          console.warn(`[Worlds API] Failed to read level.dat for ${entry.name}:`, e);
        }
      }

      if (fs.existsSync(iconPath)) {
        try {
          const iconBuffer = fs.readFileSync(iconPath);
          iconBase64 = `data:image/png;base64,${iconBuffer.toString("base64")}`;
        } catch (e) {
          console.warn(`[Worlds API] Failed to read icon.png for ${entry.name}:`, e);
        }
      }

      const datapacksPath = path.join(worldPath, "datapacks");
      const datapacks = [];
      if (fs.existsSync(datapacksPath)) {
        const dpEntries = fs.readdirSync(datapacksPath, { withFileTypes: true });
        for (const dp of dpEntries) {
          if (dp.isFile() && dp.name.endsWith(".zip")) datapacks.push(dp.name);
          else if (dp.isDirectory()) datapacks.push(dp.name);
        }
      }

      let lastPlayed = 0;
      if (fs.existsSync(levelDatPath)) {
        try {
          const stats = fs.statSync(levelDatPath);
          lastPlayed = stats.mtimeMs;
        } catch {}
      }

      worlds.push({
        folderName: entry.name,
        displayName: worldName,
        iconBase64,
        path: worldPath,
        datapacks,
        lastPlayed
      });
    }

    return NextResponse.json({ worlds });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[/api/minecraft/worlds] Unhandled error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
