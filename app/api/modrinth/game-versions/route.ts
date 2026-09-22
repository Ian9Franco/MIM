import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiGuard } from "@/lib/apiGuard";
import { getApiKey } from "@/lib/core/settings";

const MODRINTH_API = "https://api.modrinth.com/v2";

export const GET = withApiGuard(
  {
    rateLimit: { windowMs: 60 * 1000, maxRequests: 30 },
    querySchema: z.object({}),
  },
  async () => {
    const headers: Record<string, string> = {
      "User-Agent": "MIM-App/1.0 (contact@mim.local)",
    };
    const apiKey = getApiKey("modrinth");
    if (apiKey) headers.Authorization = apiKey;

    const res = await fetch(`${MODRINTH_API}/tag/game_version`, { headers });
    if (!res.ok) {
      return NextResponse.json({ error: "No se pudieron cargar las versiones" }, { status: 502 });
    }
    const data = (await res.json()) as Array<{ version?: string; version_type?: string }>;
    const versions = data
      .filter((entry) => entry.version_type === "release" && entry.version)
      .map((entry) => entry.version as string);
    return NextResponse.json({ versions });
  },
);
