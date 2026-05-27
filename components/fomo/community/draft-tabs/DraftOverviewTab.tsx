import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/core/supabaseClient";
import { DraftActivityFeed } from "@/components/fomo/community/DraftActivityFeed";
import { Puzzle, Image, Sun, Database, HardDrive, Users, Clock, Blend } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface DraftStats {
  mods: number;
  resourcepacks: number;
  shaders: number;
  datapacks: number;
  snapshots: number;
  members: number;
  lastActivity: string | null;
}

export function DraftOverviewTab({ draftId, isModern }: { draftId: string; isModern: boolean }) {
  const [stats, setStats] = useState<DraftStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [itemsRes, snapsRes, membersRes] = await Promise.all([
          supabase
            .from("draft_items")
            .select("content_type, created_at")
            .eq("draft_id", draftId)
            .order("created_at", { ascending: false }),
          supabase
            .from("draft_snapshots")
            .select("id", { count: "exact" })
            .eq("draft_id", draftId),
          supabase
            .from("draft_members")
            .select("id", { count: "exact" })
            .eq("draft_id", draftId),
        ]);

        const items = itemsRes.data || [];
        const lastActivity = items.length > 0 ? items[0].created_at : null;

        setStats({
          mods: items.filter(i => (i.content_type || "mod") === "mod").length,
          resourcepacks: items.filter(i => i.content_type === "resourcepack").length,
          shaders: items.filter(i => i.content_type === "shader").length,
          datapacks: items.filter(i => i.content_type === "datapack").length,
          snapshots: snapsRes.count ?? 0,
          members: Math.max(1, membersRes.count || 0), // Si la DB devuelve 0 o 1, siempre hay al menos 1 (owner)
          lastActivity,
        });
      } catch (err) {
        console.error("[DraftOverviewTab] Error fetching stats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [draftId]);

  const statCards = stats
    ? [
        {
          icon: <Puzzle className="w-5 h-5 text-primary" />,
          label: "Mods",
          value: stats.mods,
          color: "bg-primary/10 border-primary/20",
        },
        {
          icon: <Image className="w-5 h-5 text-amber-500" />,
          label: "Texturas",
          value: stats.resourcepacks,
          color: "bg-amber-500/10 border-amber-500/20",
        },
        {
          icon: <Sun className="w-5 h-5 text-purple-500" />,
          label: "Shaders",
          value: stats.shaders,
          color: "bg-purple-500/10 border-purple-500/20",
        },
        {
          icon: <Database className="w-5 h-5 text-emerald-500" />,
          label: "Datapacks",
          value: stats.datapacks,
          color: "bg-emerald-500/10 border-emerald-500/20",
        },
        {
          icon: <HardDrive className="w-5 h-5 text-blue-400" />,
          label: "Snapshots",
          value: stats.snapshots,
          color: "bg-blue-500/10 border-blue-500/20",
        },
        {
          icon: <Users className="w-5 h-5 text-rose-400" />,
          label: "Miembros",
          value: stats.members,
          color: "bg-rose-500/10 border-rose-500/20",
        },
      ]
    : [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Left: Stats */}
      <div className="md:col-span-2 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Blend className="w-4 h-4 text-primary" />
          <h3 className={`text-lg font-bold ${isModern ? "text-foreground" : "text-white"}`}>
            Resumen del Draft
          </h3>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 animate-pulse">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className={`h-20 rounded-2xl border ${isModern ? "bg-muted/40 border-border" : "bg-white/5 border-white/10"}`}
              />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {statCards.map((card) => (
                <div
                  key={card.label}
                  className={`flex flex-col gap-2 p-4 rounded-2xl border ${card.color} ${isModern ? "" : "backdrop-blur-sm"}`}
                >
                  <div className="flex items-center gap-2">
                    {card.icon}
                    <span className={`text-xs font-bold uppercase tracking-widest ${isModern ? "text-muted-foreground" : "text-white/60"}`}>
                      {card.label}
                    </span>
                  </div>
                  <span className={`text-3xl font-black ${isModern ? "text-foreground" : "text-white"}`}>
                    {card.value}
                  </span>
                </div>
              ))}
            </div>

            {stats?.lastActivity && (
              <div className={`flex items-center gap-2 mt-1 text-xs ${isModern ? "text-muted-foreground" : "text-white/40"}`}>
                <Clock className="w-3.5 h-3.5" />
                <span>
                  Última actividad{" "}
                  <strong className={isModern ? "text-foreground" : "text-white/70"}>
                    {formatDistanceToNow(new Date(stats.lastActivity), { addSuffix: true, locale: es })}
                  </strong>
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Right: Activity Feed */}
      <div className="md:col-span-1 h-[320px]">
        <DraftActivityFeed draftId={draftId} isModern={isModern} />
      </div>
    </div>
  );
}
