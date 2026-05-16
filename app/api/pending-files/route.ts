/**
 * /api/pending-files — GET
 * ─────────────────────────────────────────────────────────────────────────────
 * Devuelve la lista de archivos pendientes en la carpeta Downloads con su metadata.
 * Esto es utilizado por el frontend para refrescar la lista de descargas
 * tras realizar una clasificación.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { scanMod } from "@/lib/scanner";
import path from "path";
import fs from "fs";

export async function GET() {
  try {
    const { downloadsPath } = getSettings();
    if (!fs.existsSync(downloadsPath)) {
      return NextResponse.json({ pendingFiles: [] });
    }

    const files = fs.readdirSync(downloadsPath);
    const pendingFiles = files
      .filter(f => f.endsWith(".jar") || f.endsWith(".zip"))
      .map(fileName => {
        const filePath = path.join(downloadsPath, fileName);
        let meta = {};
        try {
          meta = scanMod(filePath);
        } catch (e) {
          console.warn(`[/api/pending-files] Error escaneando ${fileName}:`, e);
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
