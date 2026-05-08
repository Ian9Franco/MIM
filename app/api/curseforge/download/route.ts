/**
 * /api/curseforge/download — POST
 * ─────────────────────────────────────────────────────────────────────────────
 * Descarga un archivo de CurseForge a la carpeta Downloads del usuario para
 * que el watcher lo detecte e inicie el flujo de clasificación.
 * 
 * Corrección importante:
 *   - Utiliza getSettings().downloadsPath para respetar la ruta del usuario.
 *   - Enriquece la caché de actualizaciones (remote-cache.json) con metadatos.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { enrichUpdatesCache } from "@/lib/cache-enricher";
import path from "path";
import fs from "fs";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { url, filename, hashes, iconUrl, projectId, loader, gameVersion } = await req.json();

    if (!url || !filename) {
      return NextResponse.json({ error: "Missing url or filename" }, { status: 400 });
    }

    // path.basename previene path traversal ("../../evil.jar" → "evil.jar")
    const safeFilename = path.basename(filename as string);
    const settings = getSettings();
    const downloadsDir = settings.downloadsPath;

    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }

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

    // Calcular hash sha1 local para enriquecer la caché
    const sha1 = hashes?.sha1 || crypto.createHash("sha1").update(buffer).digest("hex");

    enrichUpdatesCache({
      filePath: destPath,
      projectId,
      iconUrl,
      loader,
      gameVersion,
      sha1
    });

    console.log(`[/api/curseforge/download] Saved: ${path.basename(destPath)}`);
    return NextResponse.json({ success: true, path: destPath });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[/api/curseforge/download] Unhandled error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
