import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { withApiGuard } from "@/lib/apiGuard";

const DEFAULT_SUPABASE_URL = 'https://kpdznwxhufdtvfipwwqf.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_2FgSitJXwpwePyOUFR3Elg_W_ipcyOQ';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  platform: z.enum(["modrinth", "curseforge"]).optional(),
  period: z.enum(["7d", "30d", "all"]).optional().default("30d"),
  metric: z.enum(["shares", "saves"]).optional().default("shares"),
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
  async ({ query: { limit, platform, period, metric } }) => {
    try {
      const table = metric === "saves" ? "followed_mods" : "favorite_mods";
      let query = supabase
        .from(table)
        .select("mod_id, name, icon_url, platform, created_at");

      if (platform) {
        query = query.eq("platform", platform);
      }
      if (period !== "all") {
        const days = period === "7d" ? 7 : 30;
        query = query.gte("created_at", new Date(Date.now() - days * 86400000).toISOString());
      }

      const { data: sharedMods, error } = await query;

      if (error) {
        console.error("Error fetching shared mods:", error);
        return NextResponse.json({ rankings: { mod: [] }, metric, period }, { status: 500 });
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
        rankings: {
          mod: topCommunity,
        },
        metric,
        period,
      });
    } catch (e) {
      console.error("Error in community rankings API:", e);
      return NextResponse.json({ rankings: { mod: [] } }, { status: 500 });
    }
  }
);
