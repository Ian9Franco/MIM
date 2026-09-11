import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiGuard } from "@/lib/apiGuard";

const querySchema = z.object({
  ids: z.string().trim().min(1, "Missing or empty ids parameter"),
});

export const GET = withApiGuard(
  {
    rateLimit: { windowMs: 60 * 1000, maxRequests: 60 },
    querySchema,
  },
  async ({ query: { ids: idsParam } }) => {
    const headers: Record<string, string> = {
      "User-Agent": "MIM-Web-App/1.0 (contact@mim.local)",
      "Content-Type": "application/json"
    };
    if (process.env.MODRINTH_API_KEY) {
      headers.Authorization = process.env.MODRINTH_API_KEY;
    }

    const res = await fetch(`https://api.modrinth.com/v2/projects?ids=${encodeURIComponent(idsParam)}`, {
      headers,
      next: { revalidate: 1800 } // Cache for 30 minutes
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Modrinth error: ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  }
);

export const dynamic = "force-dynamic";
