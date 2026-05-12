/**
 * /api/curseforge/project — GET
 * ─────────────────────────────────────────────────────────────────────────────
 * Obtiene los detalles de un proyecto en CurseForge, incluyendo su descripción.
 */

import { NextRequest, NextResponse } from "next/server";
import { getRawEnv } from "@/lib/env";
import { getApiKey } from "@/lib/settings";

const CURSEFORGE_API = "https://api.curseforge.com/v1";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  // Carga Manual (Bypass Next.js)
  const apiKey = getApiKey("curseforge");

  if (!projectId) {
    return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
  }

  // CurseForge IDs are strictly numeric. If a non-numeric ID is passed, return 404 gracefully
  if (!/^\d+$/.test(projectId)) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (!apiKey) {
    return NextResponse.json({ error: "CURSEFORGE_API_KEY not set" }, { status: 503 });
  }

  const headers = {
    "x-api-key": apiKey,
    "Accept": "application/json",
  };

  try {
    // 1. Obtener detalles del mod
    const modRes = await fetch(`${CURSEFORGE_API}/mods/${projectId}`, { headers });
    if (!modRes.ok) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    const modData = await modRes.json();

    // 2. Obtener descripción
    const descRes = await fetch(`${CURSEFORGE_API}/mods/${projectId}/description`, { headers });
    const descData = await descRes.json().catch(() => ({ data: "" }));

    return NextResponse.json({
      ...modData.data,
      body: descData.data || "", // CurseForge usa HTML en la descripción
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[/api/curseforge/project] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
