"use client";

import React, { useState, useEffect } from "react";
import { ThumbsUp } from "lucide-react";
import { useAuth } from "@/components/security/AuthContext";
import { supabase } from "@/lib/core/supabaseClient";

interface CommunityReactionButtonProps {
  shareId: string;
  initialCount?: number;
  initialMine?: boolean;
}

export function CommunityReactionButton({
  shareId,
  initialCount = 0,
  initialMine = false,
}: CommunityReactionButtonProps) {
  const { user } = useAuth();
  const [mine, setMine] = useState(initialMine);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadReaction() {
      try {
        const { data, count: totalCount } = await supabase
          .from("community_reactions")
          .select("profile_id", { count: "exact" })
          .eq("share_id", shareId);

        if (!cancelled) {
          if (typeof totalCount === "number") setCount(totalCount);
          if (user && data) {
            setMine(data.some((r) => r.profile_id === user.id));
          }
        }
      } catch {
        // silent fallback
      }
    }
    loadReaction();
    return () => {
      cancelled = true;
    };
  }, [shareId, user]);

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || loading) return;
    setLoading(true);

    const nextMine = !mine;
    const nextCount = Math.max(0, count + (nextMine ? 1 : -1));
    setMine(nextMine);
    setCount(nextCount);

    try {
      if (nextMine) {
        await supabase
          .from("community_reactions")
          .insert({ profile_id: user.id, share_id: shareId, reaction: "like" });
      } else {
        await supabase
          .from("community_reactions")
          .delete()
          .eq("profile_id", user.id)
          .eq("share_id", shareId);
      }
    } catch (err) {
      console.error("Error toggling reaction:", err);
      // rollback
      setMine(!nextMine);
      setCount(count);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={user ? (mine ? "Ya no me gusta" : "Me gusta") : "Iniciá sesión para reaccionar"}
      disabled={!user}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer border ${
        mine
          ? "bg-blue-500/15 text-blue-400 border-blue-500/25 shadow-sm"
          : "bg-white/[0.04] text-white/50 hover:text-white/90 hover:bg-white/[0.08] border-white/10"
      } ${!user ? "opacity-40 cursor-default" : ""}`}
    >
      <ThumbsUp className={`w-3 h-3 ${mine ? "fill-current scale-110" : ""}`} />
      <span className="font-mono text-[9px]">{count}</span>
    </button>
  );
}
