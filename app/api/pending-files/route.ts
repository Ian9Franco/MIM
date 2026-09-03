/**
 * /api/pending-files — GET
 * ─────────────────────────────────────────────────────────────────────────────
 * Devuelve la lista de archivos pendientes en la carpeta Downloads con su metadata.
 * Esto es utilizado por el frontend para refrescar la lista de descargas
 * tras realizar una clasificación.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import { getSettings } from "@/lib/core/settings";
import { scanMod } from "@/lib/scanner";
import { SOURCE_BASE } from "@/lib/core/constants";
import path from "path";
import fs from "fs";

export async function GET() {
  try {
    const { downloadsPath } = getSettings();
    if (!fs.existsSync(downloadsPath)) {
      return NextResponse.json({ pendingFiles: [] });
    }

    const HISTORY_FILE = path.join(SOURCE_BASE, ".mim-index", "download-history.json");
    let history = [];
    if (fs.existsSync(HISTORY_FILE)) {
      try { 
        history = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf-8")); 
      } catch (err) {
        console.warn("[/api/pending-files] Corrupted download-history.json, using empty array:", err);
      }
    }

    const files = fs.readdirSync(downloadsPath);
    const pendingFiles = files
      .filter(f => f.endsWith(".jar") || f.endsWith(".zip"))
      .map(fileName => {
        const filePath = path.join(downloadsPath, fileName);
        let meta: any = {};
        try {
          meta = scanMod(filePath);
        } catch (e) {
          console.warn(`[/api/pending-files] Error escaneando ${fileName}:`, e);
        }
        
        // Enrich from history if available
        const hEntry = history.find((h: any) => h.fileName === fileName);
        if (hEntry) {
          if (!meta.iconBase64 && hEntry.iconUrl) meta.iconBase64 = hEntry.iconUrl;
          if (meta.modName === "unknown" && hEntry.title) meta.modName = hEntry.title;
          if (meta.gameVersion === "unknown" && hEntry.gameVersion) meta.gameVersion = hEntry.gameVersion;
          if (meta.loader === "unknown" && hEntry.loader) meta.loader = hEntry.loader;
          if (meta.projectType === "unknown" && hEntry.projectType) meta.projectType = hEntry.projectType;
        }

        return {
          path: filePath,
          fileName,
          meta
        };
      });

    return NextResponse.json({ pendingFiles });
  } catch (error: any) {
    console.error("[/api/pending-files] Error fatal:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
