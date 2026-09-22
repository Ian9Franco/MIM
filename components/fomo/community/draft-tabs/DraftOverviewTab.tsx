import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/core/supabaseClient";
import { DraftActivityFeed } from "@/components/fomo/community/DraftActivityFeed";
import { DraftMembersTab } from "@/components/fomo/community/draft-tabs/DraftMembersTab";
import { LayoutGrid, Box, Image as ImageIcon, Glasses, Database, HardDrive, Users, Clock } from "lucide-react";
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

export function DraftOverviewTab({
  draftId,
  draft,
  members,
  user,
  isModern,
  setIsInviteModalOpen,
}: {
  draftId: string;
  draft: any;
  members: any[];
  user: any;
  isModern: boolean;
  setIsInviteModalOpen: (open: boolean) => void;
}) {
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
          mods: items.filter((i) => (i.content_type || "mod") === "mod").length,
          resourcepacks: items.filter((i) => i.content_type === "resourcepack").length,
          shaders: items.filter((i) => i.content_type === "shader").length,
          datapacks: items.filter((i) => i.content_type === "datapack").length,
          snapshots: snapsRes.count ?? 0,
          members: Math.max(1, membersRes.count || 0),
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
          icon: <Box className="w-5 h-5 text-primary" />,
          label: "Mods",
          value: stats.mods,
          color: "bg-primary/10 border-primary/20",
        },
        {
          icon: <ImageIcon className="w-5 h-5 text-amber-400" />,
          label: "Texturas",
          value: stats.resourcepacks,
          color: "bg-amber-500/10 border-amber-500/20",
        },
        {
          icon: <Glasses className="w-5 h-5 text-purple-400" />,
          label: "Shaders",
          value: stats.shaders,
          color: "bg-purple-500/10 border-purple-500/20",
        },
        {
          icon: <Database className="w-5 h-5 text-emerald-400" />,
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
          icon: <Users className="w-5 h-5 text-[var(--color-accent)]" />,
          label: "Miembros",
          value: stats.members,
          color: "bg-[var(--color-accent)]/10 border-[var(--color-accent)]/25",
        },
      ]
    : [];

  const labelClass = isModern ? "text-muted-foreground" : "text-[var(--color-accent)]/80";
  const titleClass = isModern ? "text-foreground" : "text-white";

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-[var(--color-accent)]" />
          <h3 className={`text-lg font-bold ${titleClass}`}>Resumen del Draft</h3>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 animate-pulse">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className={`h-20 rounded-2xl border ${isModern ? "bg-muted/40 border-border" : "bg-white/5 border-white/10"}`}
              />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
              {statCards.map((card) => (
                <div
                  key={card.label}
                  className={`flex flex-col gap-2 p-4 rounded-2xl border ${card.color} ${isModern ? "" : "backdrop-blur-sm"}`}
                >
                  <div className="flex items-center gap-2">
                    {card.icon}
                    <span className={`text-xs font-bold uppercase tracking-widest ${labelClass}`}>
                      {card.label}
                    </span>
                  </div>
                  <span className={`text-3xl font-black ${titleClass}`}>{card.value}</span>
                </div>
              ))}
            </div>

            {stats?.lastActivity && (
              <div className={`flex items-center gap-2 text-xs ${isModern ? "text-muted-foreground" : "text-[var(--color-accent)]/70"}`}>
                <Clock className="w-3.5 h-3.5" />
                <span>
                  Última actividad{" "}
                  <strong className={isModern ? "text-foreground" : "text-[var(--color-accent)]"}>
                    {formatDistanceToNow(new Date(stats.lastActivity), { addSuffix: true, locale: es })}
                  </strong>
                </span>
              </div>
            )}
          </>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1 min-h-0">
        <div className="xl:col-span-2 flex flex-col min-h-[300px]">
          <DraftActivityFeed draftId={draftId} isModern={isModern} />
        </div>
        <div className="xl:col-span-1 flex flex-col min-h-[300px]">
          <DraftMembersTab
            draft={draft}
            members={members}
            user={user}
            isModern={isModern}
            setIsInviteModalOpen={setIsInviteModalOpen}
            embedded
          />
        </div>
      </div>
    </div>
  );
}
