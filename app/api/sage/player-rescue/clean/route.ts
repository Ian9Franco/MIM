import { NextRequest, NextResponse } from "next/server";
import { getSettings } from "@/lib/core/settings";
import path from "path";
import fs from "fs";
import { withApiGuard } from "@/lib/apiGuard";

const BACKUP_REGEX = /-[0-9]{10,}\.dat$/;

export const POST = withApiGuard(
  {},
  async ({ request }) => {
    const req = request as NextRequest;

  try {
    const { minecraftPath } = getSettings();
    const logs: string[] = [];
    let deletedCount = 0;
    let totalSizeSaved = 0;

    if (fs.existsSync(path.join(minecraftPath, "saves"))) {
      const worlds = fs.readdirSync(path.join(minecraftPath, "saves"));
      for (const world of worlds) {
        const worldPath = path.join(minecraftPath, "saves", world);
        const playerDataDir = path.join(worldPath, "playerdata");
        
        if (fs.existsSync(playerDataDir)) {
          const files = fs.readdirSync(playerDataDir);
          for (const file of files) {
            if (BACKUP_REGEX.test(file)) {
              const fullPath = path.join(playerDataDir, file);
              const stats = fs.statSync(fullPath);
              totalSizeSaved += stats.size;
              fs.unlinkSync(fullPath);
              deletedCount++;
            }
          }
        }
      }
    }

    const sizeMB = (totalSizeSaved / (1024 * 1024)).toFixed(2);
    logs.push(`Limpieza completada. Se eliminaron ${deletedCount} archivos de backup.`);
    logs.push(`Espacio recuperado: ${sizeMB} MB.`);

    return NextResponse.json({ 
      success: true, 
      logs, 
      deletedCount,
      sizeSaved: totalSizeSaved 
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("Error cleaning player backups:", errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }

  }
);
