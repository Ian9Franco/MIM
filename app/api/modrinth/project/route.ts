/**
 * /api/modrinth/project — GET
 * ─────────────────────────────────────────────────────────────────────────────
 * Obtiene los metadatos de un proyecto de Modrinth por su ID o slug.
 * Usado por el panel de detalles de la FOMO Sidebar para mostrar la
 * descripción completa, compatibilidad cliente/servidor y cuerpo del proyecto.
 *
 * Query params: ?projectId=<id_o_slug>
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiGuard } from "@/lib/apiGuard";
import { getApiKey } from "@/lib/core/settings";

const MODRINTH_API = "https://api.modrinth.com/v2";

const querySchema = z.object({
  projectId: z.string().trim().min(1, "Missing or empty projectId parameter"),
});

export const GET = withApiGuard(
  {
    rateLimit: { windowMs: 60 * 1000, maxRequests: 60 },
    querySchema,
  },
  async ({ query }) => {
    const { projectId } = query;

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
        fetch(`${MODRINTH_API}/project/${encodeURIComponent(projectId)}/members`, { headers }),
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
          role: m.role || "Member",
        }));
      }

      return NextResponse.json({
        ...data,
        iconUrl: data.icon_url,
        members,
      });
    } catch (e) {
      console.error("[/api/modrinth/project] Error:", e);
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
  }
);
