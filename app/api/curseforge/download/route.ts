/**
 * /api/curseforge/download — POST
 * ─────────────────────────────────────────────────────────────────────────────
 * Descarga un archivo de CurseForge a la carpeta Downloads del usuario para
 * que el watcher lo detecte e inicie el flujo de clasificación.
 *
 * Body: { url: string, filename: string }
 * Respuesta: { success: true, path: string }
 *
 * Nota: CurseForge no requiere API key para la descarga directa de archivos
 * (a diferencia del discovery). La URL viene del endpoint /api/curseforge/versions.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import os from "os";

export async function POST(req: NextRequest) {
  try {
    const { url, filename } = await req.json();

    if (!url || !filename) {
      return NextResponse.json({ error: "Missing url or filename" }, { status: 400 });
    }

    // path.basename previene path traversal ("../../evil.jar" → "evil.jar")
    const safeFilename = path.basename(filename as string);
    const downloadsDir = path.join(os.homedir(), "Downloads");
    let destPath = path.join(downloadsDir, safeFilename);

    // Guard de colisión: renombrar con timestamp si el archivo ya existe
    if (fs.existsSync(destPath)) {
      const ext  = path.extname(safeFilename);
      const name = path.basename(safeFilename, ext);
      destPath   = path.join(downloadsDir, `${name}_${Date.now()}${ext}`);
    }

    const res = await fetch(url as string);
    if (!res.ok) {
      throw new Error(`Failed to fetch from CurseForge: ${res.statusText}`);
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(destPath, buffer);

    console.log(`[/api/curseforge/download] Saved: ${path.basename(destPath)}`);
    return NextResponse.json({ success: true, path: destPath });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[/api/curseforge/download] Unhandled error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
