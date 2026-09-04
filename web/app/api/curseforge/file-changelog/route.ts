import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiGuard } from "@/lib/apiGuard";

const CURSEFORGE_API = "https://api.curseforge.com/v1";

const querySchema = z.object({
  projectId: z.string().trim().regex(/^\d+$/, "projectId must be numeric"),
  fileId: z.string().trim().regex(/^\d+$/, "fileId must be numeric"),
});

export const GET = withApiGuard(
  {
    rateLimit: { windowMs: 60 * 1000, maxRequests: 60 },
    querySchema,
  },
  async ({ query: { projectId, fileId } }) => {
    const apiKey = process.env.CURSEFORGE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "CURSEFORGE_API_KEY no configurada" }, { status: 503 });
    }

    const res = await fetch(`${CURSEFORGE_API}/mods/${projectId}/files/${fileId}/changelog`, {
      headers: {
        Accept: "application/json",
        "x-api-key": apiKey,
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `CurseForge API Error: ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ changelog: typeof data.data === "string" ? data.data : "" });
  }
);
