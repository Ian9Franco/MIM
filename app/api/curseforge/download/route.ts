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
import { getSettings } from "@/lib/core/settings";
import { enrichUpdatesCache } from "@/lib/storage/cache-enricher";
import path from "path";
import fs from "fs";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { url, filename, hashes, iconUrl, projectId, loader, gameVersion, projectType, title } = await req.json();

    if (!url || !filename) {
      return NextResponse.json({ error: "Missing url or filename" }, { status: 400 });
    }

    // path.basename previene path traversal ("../../evil.jar" → "evil.jar")
    let safeFilename = path.basename(filename as string);
    if (!/\.(jar|zip|mrpack)$/i.test(safeFilename)) {
      const pType = projectType || "mod";
      const ext = pType === "mod" ? ".jar" : pType === "modpack" ? ".mrpack" : ".zip";
      safeFilename = `${safeFilename}${ext}`;
    }
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

    const res = await fetch(url as string, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.curseforge.com/"
      }
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch from CurseForge: ${res.statusText} (${res.status})`);
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
      projectType,
      title,
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
