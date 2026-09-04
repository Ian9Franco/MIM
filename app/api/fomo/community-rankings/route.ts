import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { withApiGuard } from "@/lib/apiGuard";

const DEFAULT_SUPABASE_URL = 'https://kpdznwxhufdtvfipwwqf.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_2FgSitJXwpwePyOUFR3Elg_W_ipcyOQ';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const GET = withApiGuard(
  {
    rateLimit: { windowMs: 60 * 1000, maxRequests: 60 },
  },
  async () => {
    try {
      const { data: sharedMods, error } = await supabase
        .from("favorite_mods")
        .select("mod_id, name, icon_url, platform");

      if (error) {
        console.error("Error fetching shared mods:", error);
        return NextResponse.json({ rankings: {} }, { status: 500 });
      }

      const rows = Array.isArray(sharedMods) ? sharedMods : [];

      const counts: Record<string, { count: number; mod: any }> = {};
      rows.forEach((item: any) => {
        const pk = `${item.platform || "modrinth"}::${item.mod_id}`;
        if (!counts[pk]) {
          counts[pk] = {
            count: 0,
            mod: {
              projectId: item.mod_id,
              title: item.name || "Mod",
              iconUrl: item.icon_url || null,
              _source: item.platform || "modrinth",
            },
          };
        }
        counts[pk].count++;
      });

      const sorted = Object.values(counts).sort((a, b) => b.count - a.count);
      const topCommunity = sorted.slice(0, 20);

      return NextResponse.json({
        rankings: {
          mod: topCommunity,
        },
      });
    } catch (e) {
      console.error("Error in community rankings API:", e);
      return NextResponse.json({ rankings: {} }, { status: 500 });
    }
  }
);
