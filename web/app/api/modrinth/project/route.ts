import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiGuard } from "@/lib/apiGuard";

const querySchema = z.object({
  projectId: z.string().trim().min(1, "Missing or empty projectId parameter"),
});

export const GET = withApiGuard(
  {
    rateLimit: { windowMs: 60 * 1000, maxRequests: 60 },
    querySchema,
  },
  async ({ query: { projectId } }) => {
    const headers: Record<string, string> = {
      "User-Agent": "MIM-Web-App/1.0 (contact@mim.local)",
      "Content-Type": "application/json"
    };
    if (process.env.MODRINTH_API_KEY) {
      headers.Authorization = process.env.MODRINTH_API_KEY;
    }

    const res = await fetch(`https://api.modrinth.com/v2/project/${encodeURIComponent(projectId)}`, {
      headers,
      next: { revalidate: 1800 } // Cache for 30 minutes
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Modrinth error: ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    if (data.organization) {
      try {
        const orgRes = await fetch(`https://api.modrinth.com/v3/organization/${encodeURIComponent(data.organization)}`, {
          headers,
          next: { revalidate: 1800 } // Cache organization for 30 minutes
        });
        if (orgRes.ok) {
          data.organization_info = await orgRes.json();
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error("[Modrinth Project Proxy] Organization fetch error:", errMsg);
      }
    }
    return NextResponse.json(data);
  }
);
