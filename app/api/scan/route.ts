import { NextRequest, NextResponse } from "next/server";
import { scanModEnhanced } from "@/lib/modding/enhanced-mod-scanner";
import fs from "fs";

/**
 * /api/scan — GET
 * ─────────────────────────────────────────────────────────────────────────────
 * Escaneo profundo de un archivo JAR individual.
 * Devuelve metadata enriquecida (ID, versión, loader, dependencias, icono, etc.)
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const filePath = searchParams.get("path");

  if (!filePath) {
    return NextResponse.json({ error: "Missing required query param: path" }, { status: 400 });
  }

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: `File not found: ${filePath}` }, { status: 404 });
  }

  try {
    const meta = await scanModEnhanced(filePath);
    return NextResponse.json(meta);
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[/api/scan] Error scanning mod:", error);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
