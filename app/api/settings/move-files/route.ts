/**
 * /api/settings/move-files — POST
 * ─────────────────────────────────────────────────────────────────────────────
 * Mueve recursivamente todos los archivos de una ruta a otra.
 * Usado cuando el usuario cambia la carpeta raíz del source/builds en Settings.
 *
 * Body: { sourcePath: string, targetPath: string }
 * Respuesta: { success: true, message: string }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextResponse } from "next/server";
import { mimMsg } from "@/lib/core/voice";
import fs from "fs";
import path from "path";

/**
 * Mueve recursivamente el contenido de `src` a `dest`.
 * Usa copy+delete porque fs.rename falla en movimientos cross-drive (C: → D:).
 * Elimina el directorio fuente una vez vaciado.
 */
function moveDirectorySync(src: string, dest: string): void {
  if (!fs.existsSync(src)) return;

  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath  = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      moveDirectorySync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      fs.unlinkSync(srcPath);
    }
  }

  // Eliminar el directorio fuente ya vacío
  try {
    fs.rmdirSync(src);
  } catch (e) {
    console.warn(`[/api/settings/move-files] No se pudo eliminar directorio fuente: ${src}`, e);
  }
}

export async function POST(req: Request) {
  try {
    const { sourcePath, targetPath } = await req.json();

    if (sourcePath === targetPath) {
      return NextResponse.json({ success: true, message: mimMsg.settingsSamePath() });
    }

    if (!fs.existsSync(sourcePath)) {
      return NextResponse.json({ error: mimMsg.notFound(sourcePath) }, { status: 404 });
    }

    moveDirectorySync(sourcePath, targetPath);

    return NextResponse.json({ success: true, message: mimMsg.settingsMoved() });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[/api/settings/move-files] Error:", message);
    return NextResponse.json({ error: mimMsg.internalError("/api/settings/move-files") }, { status: 500 });
  }
}
