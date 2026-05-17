/**
 * /api/modrinth/project — GET
 * ─────────────────────────────────────────────────────────────────────────────
 * Obtiene los metadatos de un proyecto de Modrinth por su ID o slug.
 * Usado por el panel de detalles de la FOMO Sidebar para mostrar la
 * descripción completa, compatibilidad cliente/servidor y cuerpo del proyecto.
 *
 * Query params: ?projectId=<id_o_slug>
 * Respuesta: { body: string, client_side: string, server_side: string }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import { getApiKey } from "@/lib/settings";

const MODRINTH_API = "https://api.modrinth.com/v2";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
  }

  const headers: Record<string, string> = {
    "User-Agent": "MIM-App/1.0 (contact@mim.local)",
  };
  const apiKey = getApiKey("modrinth");
  if (apiKey) {
    headers["Authorization"] = apiKey;
  }

  try {
    const [projectRes, membersRes] = await Promise.all([
      fetch(`${MODRINTH_API}/project/${encodeURIComponent(projectId)}`, { headers }),
      fetch(`${MODRINTH_API}/project/${encodeURIComponent(projectId)}/members`, { headers })
    ]);

    if (!projectRes.ok) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const data = await projectRes.json();
    
    let members: any[] = [];
    if (membersRes.ok) {
      const membersData = await membersRes.json();
      members = (membersData ?? []).map((m: any) => ({
        id: m.user.id,
        username: m.user.username,
        name: m.user.name || m.user.username,
        avatarUrl: m.user.avatar_url ?? null,
        role: m.role || "Member"
      }));
    }

    return NextResponse.json({ 
      ...data,
      members
    });
  } catch (e) {
    console.error("[/api/modrinth/project] Error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
