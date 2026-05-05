/**
 * /api/curseforge/download — POST
 * ─────────────────────────────────────────────────────────────────────────────
 * Proxy para descargar archivos de CurseForge y guardarlos en Downloads.
 * Reutiliza la lógica de Modrinth para consistencia.
 */

import { NextRequest, NextResponse } from "next/server";
import { SOURCE_BASE } from "@/lib/constants";
import path from "path";
import fs from "fs";
import os from "os";

export async function POST(req: NextRequest) {
  try {
    const { url, filename } = await req.json();

    if (!url || !filename) {
      return NextResponse.json({ error: "Missing url or filename" }, { status: 400 });
    }

    const safeFilename = path.basename(filename);
    const downloadsDir = path.join(os.homedir(), "Downloads");
    let destPath = path.join(downloadsDir, safeFilename);

    // Evitar sobreescritura si ya existe en Downloads
    if (fs.existsSync(destPath)) {
      const ext = path.extname(safeFilename);
      const name = path.basename(safeFilename, ext);
      destPath = path.join(downloadsDir, `${name}_${Date.now()}${ext}`);
    }

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch from CurseForge: ${res.statusText}`);
    
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    fs.writeFileSync(destPath, buffer);

    return NextResponse.json({ success: true, path: destPath });
  } catch (e: any) {
    console.error("[CurseForge Download Error]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
