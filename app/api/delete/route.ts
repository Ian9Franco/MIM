/**
 * /api/delete — POST
 * ─────────────────────────────────────────────────────────────────────────────
 * Elimina un archivo del sistema de archivos por su ruta absoluta.
 * Usado para descartar archivos de Downloads que el usuario no quiere clasificar.
 *
 * Body: { path: string }
 * Respuesta: { success: true } | { error: string }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import { mimMsg } from "@/lib/core/voice";
import fs from "fs";

export async function POST(req: NextRequest) {
  try {
    const { path, paths } = await req.json();

    if (!path && (!paths || !Array.isArray(paths))) {
      return NextResponse.json({ error: mimMsg.deleteNoPath() }, { status: 400 });
    }

    const targetPaths = paths || [path];
    let deletedCount = 0;
    let failedCount = 0;

    for (const p of targetPaths) {
      try {
        if (fs.existsSync(p)) {
          fs.unlinkSync(p);
          deletedCount++;
        }
      } catch (e) {
        console.error(`[/api/delete] Failed to delete ${p}:`, e);
        failedCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: mimMsg.deleteDone(deletedCount, failedCount)
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[/api/delete] Unhandled error:", message);
    return NextResponse.json({ error: mimMsg.internalError("/api/delete") }, { status: 500 });
  }
}
