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
import fs from "fs";

export async function POST(req: NextRequest) {
  try {
    const { path } = await req.json();

    if (!path) {
      return NextResponse.json({ error: "No path provided" }, { status: 400 });
    }

    if (!fs.existsSync(path)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    fs.unlinkSync(path);
    return NextResponse.json({ success: true, message: "File deleted successfully" });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[/api/delete] Unhandled error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
