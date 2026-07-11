"use client";

import { motion } from "framer-motion";
import { Crown, Trophy } from "lucide-react";
import type { ModHit } from "../SpotlightMarquees";
import { RankingsSkeleton } from "../FomoSkeletons";

interface CommunityRankingsProps {
  rankings: ModHit[];
  loading: boolean;
  onOpen: (mod: ModHit) => void;
}

const PODIUM = [
  { ring: "border-amber-300/55", text: "text-amber-300", glow: "shadow-[0_0_24px_rgba(251,191,36,0.14)]" },
  { ring: "border-slate-300/35", text: "text-slate-300", glow: "" },
  { ring: "border-orange-400/35", text: "text-orange-300", glow: "" },
];

/** Ranking rows use a stronger first-three hierarchy while preserving the original vote data. */
export function CommunityRankings({ rankings, loading, onOpen }: CommunityRankingsProps) {
  if (loading) return <RankingsSkeleton />;

  if (!rankings.length) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
        <Trophy className="mb-3 h-10 w-10 text-white/15" />
        <h3 className="text-sm font-bold text-white">Todavía no hay ranking</h3>
        <p className="mt-1 text-[10px] text-white/35">Los votos de la comunidad aparecerán acá.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-2 overflow-y-auto pb-28 pr-1 scrollbar-none">
      <div className="mb-3 flex items-end justify-between px-1">
        <div>
          <p className="text-[9px] font-mono uppercase text-white/30">Pulso comunitario</p>
          <h3 className="mt-0.5 text-xs font-bold text-white/80">Los proyectos más votados</h3>
        </div>
        <span className="text-[9px] font-mono text-white/25">TOP {rankings.length}</span>
      </div>

      {rankings.map((mod, index) => {
        const podium = PODIUM[index];
        return (
          <motion.button
            key={mod.projectId}
            type="button"
            onClick={() => onOpen(mod)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.035, 0.25) }}
            whileHover={{ x: 3 }}
            whileTap={{ scale: 0.985 }}
            className={`group flex w-full items-center gap-3 rounded-2xl border bg-surface/78 p-3 text-left transition-colors hover:bg-white/[0.045] ${podium ? `${podium.ring} ${podium.glow}` : "border-white/[0.07]"}`}
          >
            <div className={`flex w-7 shrink-0 flex-col items-center font-mono text-[11px] font-black ${podium?.text || "text-white/25"}`}>
              {index === 0 && <Crown className="mb-0.5 h-3 w-3" />}
              {String(index + 1).padStart(2, "0")}
            </div>
            <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.04] shadow-md">
              {mod.iconUrl ? <img src={mod.iconUrl} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-[10px] font-bold text-white/35">{mod.title.slice(0, 2)}</span>}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-white transition-colors group-hover:text-white/90">{mod.title}</p>
              <p className="mt-1 text-[8px] font-mono uppercase text-white/30">{mod._source || "Comunidad"}</p>
            </div>
            <div className="rounded-lg border border-white/[0.07] bg-black/20 px-2 py-1 text-right">
              <p className="text-[11px] font-black text-white/75">{mod.downloads || 0}</p>
              <p className="text-[7px] font-mono uppercase text-white/25">votos</p>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

