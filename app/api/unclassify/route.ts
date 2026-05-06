/**
 * /api/unclassify — POST
 * ─────────────────────────────────────────────────────────────────────────────
 * Mueve mods clasificados de vuelta a la carpeta Downloads del usuario.
 * Usado cuando el usuario quiere re-clasificar o descartar un mod.
 *
 * Body: { sourcePaths: string[] }
 * Respuesta: { success: true, targetPaths: string[], skipped?: string[] }
 *
 * Usa copy+delete por la misma razón cross-drive que /api/classify.
 * Guard de colisión: si ya existe un archivo con el mismo nombre en Downloads,
 * lo renombra con sufijo timestamp en lugar de sobreescribirlo silenciosamente.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import os from "os";

export async function POST(req: NextRequest) {
  try {
    const { sourcePaths } = await req.json();

    if (!sourcePaths || !Array.isArray(sourcePaths) || sourcePaths.length === 0) {
      return NextResponse.json(
        { error: "Missing or empty sourcePaths array" },
        { status: 400 }
      );
    }

    const downloadsDir = path.join(os.homedir(), "Downloads");
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }

    const moved: string[] = [];
    const skipped: string[] = [];

    for (const p of sourcePaths) {
      if (!fs.existsSync(p)) {
        console.warn(`[/api/unclassify] Source not found, skipping: ${p}`);
        skipped.push(p);
        continue;
      }

      const ext = path.extname(p);
      const base = path.basename(p, ext);
      let targetPath = path.join(downloadsDir, path.basename(p));

      // ── Collision guard ──────────────────────────────────────────────────────
      // If a file with the same name already exists in Downloads, append a
      // timestamp suffix to avoid silently overwriting it.
      if (fs.existsSync(targetPath)) {
        const timestamp = Date.now();
        targetPath = path.join(downloadsDir, `${base}_${timestamp}${ext}`);
        console.warn(
          `[/api/unclassify] Name collision — renaming to: ${path.basename(targetPath)}`
        );
      }

      // Cross-drive move (C: → D: or vice versa): copy then delete.
      fs.copyFileSync(p, targetPath);
      fs.unlinkSync(p);

      moved.push(targetPath);
    }

    return NextResponse.json({
      success: true,
      targetPaths: moved,
      ...(skipped.length > 0 && { skipped }),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[/api/unclassify] Unhandled error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}