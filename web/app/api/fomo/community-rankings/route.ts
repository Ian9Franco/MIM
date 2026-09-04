import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiGuard } from "@/lib/apiGuard";
import { supabase } from "@/lib/supabaseClient";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  platform: z.enum(["modrinth", "curseforge"]).optional(),
});

const sharedModRowSchema = z.object({
  mod_id: z.union([z.string(), z.number()]).transform(String),
  name: z.string().nullable().optional(),
  icon_url: z.string().nullable().optional(),
  platform: z.string().nullable().optional(),
});

interface CommunityRankingMod {
  projectId: string;
  title: string;
  iconUrl: string | null;
  projectType: string;
  categories: string[];
  author: string;
  _source: string;
  downloads: number;
}

export const GET = withApiGuard(
  {
    rateLimit: { windowMs: 60 * 1000, maxRequests: 60 },
    querySchema,
  },
  async ({ query: { limit, platform } }) => {
    let query = supabase
      .from("favorite_mods")
      .select("mod_id, name, icon_url, platform");

    if (platform) {
      query = query.eq("platform", platform);
    }

    const { data: sharedMods, error } = await query;

    if (error) {
      console.error("Error fetching shared mods:", error);
      return NextResponse.json({ rankings: [] }, { status: 500 });
    }

    const rows = Array.isArray(sharedMods) ? sharedMods : [];
    const counts: Record<string, { count: number; mod: Omit<CommunityRankingMod, "downloads"> }> = {};

    rows.forEach((rawItem) => {
      const parsedItem = sharedModRowSchema.safeParse(rawItem);
      if (!parsedItem.success) return;

      const item = parsedItem.data;
      const modPlatform = item.platform || "modrinth";
      const pk = `${modPlatform}::${item.mod_id}`;

      if (!counts[pk]) {
        counts[pk] = {
          count: 0,
          mod: {
            projectId: item.mod_id,
            title: item.name || "Mod",
            iconUrl: item.icon_url || null,
            projectType: "mod",
            categories: [modPlatform],
            author: "Comunidad",
            _source: modPlatform,
          },
        };
      }
      counts[pk].count++;
    });

    const sorted = Object.values(counts).sort((a, b) => b.count - a.count);
    const topCommunity: CommunityRankingMod[] = sorted.slice(0, limit).map((x) => ({
      ...x.mod,
      downloads: x.count,
    }));

    return NextResponse.json({
      rankings: topCommunity,
    });
  }
);

export const dynamic = "force-dynamic";
