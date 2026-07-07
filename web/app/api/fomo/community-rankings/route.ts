import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET() {
  try {
    const { data: sharedMods, error } = await supabase
      .from("favorite_mods")
      .select("mod_id, name, icon_url, platform");

    if (error) {
      console.error("Error fetching shared mods:", error);
      return NextResponse.json({ rankings: [] }, { status: 500 });
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
            projectType: "mod",
            categories: [item.platform || "modrinth"],
            author: "Comunidad",
            _source: item.platform || "modrinth",
          },
        };
      }
      counts[pk].count++;
    });

    const sorted = Object.values(counts).sort((a, b) => b.count - a.count);
    const topCommunity = sorted.slice(0, 20).map(x => ({
      ...x.mod,
      downloads: x.count // Usamos el conteo de votos como indicador de popularidad
    }));

    return NextResponse.json({
      rankings: topCommunity,
    });
  } catch (e) {
    console.error("Error in community rankings API:", e);
    return NextResponse.json({ rankings: [] }, { status: 500 });
  }
}
export const dynamic = "force-dynamic";
