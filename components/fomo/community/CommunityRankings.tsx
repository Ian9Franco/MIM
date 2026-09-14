"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bookmark, Crown, Share2, Trophy } from "lucide-react";
import type { ModHit } from "@/lib/core/types";
import { FomoSkeleton } from "@/components/fomo/core/FomoSkeleton";

interface CommunityRankingsProps {
  rankings?: ModHit[];
  loading?: boolean;
  isModern?: boolean;
  onOpen: (mod: ModHit) => void;
}

const PODIUM = [
  { ring: "border-amber-300/55", text: "text-amber-300", glow: "shadow-[0_0_24px_rgba(251,191,36,0.14)]" },
  { ring: "border-slate-300/35", text: "text-slate-300", glow: "" },
  { ring: "border-orange-400/35", text: "text-orange-300", glow: "" },
];

export function CommunityRankings({ onOpen, isModern = false }: CommunityRankingsProps) {
  const [period, setPeriod] = useState<"7d" | "30d" | "all">("30d");
  const [metric, setMetric] = useState<"shares" | "saves">("shares");
  const [visibleRankings, setVisibleRankings] = useState<ModHit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const borderCls = isModern ? "border-border" : "border-[var(--fomo-border)]";
  const panelBg = isModern ? "bg-surface/70" : "bg-[var(--fomo-secondary-bg)]";
  const rowBg = isModern ? "bg-surface/78" : "bg-white/3";
  const podiumBg = isModern ? "bg-surface/85" : "bg-white/3";
  const iconBorder = isModern ? "border-border" : "border-white/8";
  const statBorder = isModern ? "border-border" : "border-white/8";

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetch(`/api/fomo/community-rankings?period=${period}&metric=${metric}&limit=20`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => {
        if (!cancelled) setVisibleRankings(data.rankings || []);
      })
      .catch(() => {
        if (!cancelled) setVisibleRankings([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [metric, period]);

  const controls = (
    <div className="mb-4 space-y-2">
      <div className={`grid grid-cols-3 gap-1 rounded-xl border ${borderCls} ${panelBg} p-1`}>
        {(["7d", "30d", "all"] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={period === value}
            onClick={() => setPeriod(value)}
            className={`h-8 rounded-lg text-[9px] font-bold ${period === value ? "mim-control-3d-active bg-orange-500/15 text-orange-400" : "text-white/40"}`}
          >
            {value === "7d" ? "7 días" : value === "30d" ? "30 días" : "Histórico"}
          </button>
        ))}
      </div>
      <div className={`grid grid-cols-2 gap-1 rounded-xl border ${borderCls} ${panelBg} p-1`}>
        <button type="button" aria-pressed={metric === "shares"} onClick={() => setMetric("shares")} className={`flex h-8 items-center justify-center gap-1 rounded-lg text-[9px] font-bold ${metric === "shares" ? "mim-control-3d-active bg-orange-500/15 text-orange-400" : "text-white/40"}`}>
          <Share2 className="h-3 w-3" />Más compartidos
        </button>
        <button type="button" aria-pressed={metric === "saves"} onClick={() => setMetric("saves")} className={`flex h-8 items-center justify-center gap-1 rounded-lg text-[9px] font-bold ${metric === "saves" ? "mim-control-3d-active bg-orange-500/15 text-orange-400" : "text-white/40"}`}>
          <Bookmark className="h-3 w-3" />Más guardados
        </button>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto px-6 pb-8">
        {controls}
        <FomoSkeleton variant="list" message="Cargando rankings..." count={6} />
      </div>
    );
  }

  if (!visibleRankings.length) {
    return (
      <div className="flex-1 overflow-y-auto px-6 pb-8">
        {controls}
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <Trophy className="mb-3 h-10 w-10 text-white/15" />
          <h3 className="text-sm font-bold text-white">Sin actividad en este período</h3>
          <p className="mt-1 text-[10px] text-white/35">Probá otro período o categoría.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-2 overflow-y-auto px-6 pb-8 pr-1 scrollbar-none">
      {controls}
      <div className="mb-3 flex items-end justify-between px-1">
        <div>
          <p className="text-[9px] font-mono uppercase text-white/30">Pulso comunitario</p>
          <h3 className="mt-0.5 text-xs font-bold text-white/80">
            {metric === "shares" ? "Los proyectos más compartidos" : "Los proyectos más guardados"}
          </h3>
        </div>
        <span className="text-[9px] font-mono text-white/25">TOP {visibleRankings.length}</span>
      </div>

      <div className="grid grid-cols-3 items-end gap-2 px-0.5 pb-4 pt-2">
        {visibleRankings.slice(0, 3).map((mod, index) => {
          const podium = PODIUM[index];
          return (
            <motion.button
              key={`podium-${mod._source}:${mod.projectId}`}
              type="button"
              onClick={() => onOpen(mod)}
              whileTap={{ scale: 0.98 }}
              className={`mim-ranking-podium min-w-0 rounded-2xl border ${podiumBg} p-2.5 text-center ${podium.ring} ${index === 0 ? "-translate-y-2" : ""}`}
            >
              <span className={`mx-auto mb-2 flex h-6 w-6 items-center justify-center rounded-lg font-mono text-[10px] font-black ${podium.text}`}>
                {index === 0 ? <Crown className="h-3.5 w-3.5" /> : index + 1}
              </span>
              <div className={`mx-auto h-11 w-11 overflow-hidden rounded-xl border ${iconBorder} bg-white/4`}>
                {mod.iconUrl && <img src={mod.iconUrl} alt="" className="h-full w-full object-cover" />}
              </div>
              <p className="mt-2 truncate text-[9px] font-bold text-white">{mod.title}</p>
              <p className="mt-1 font-mono text-[8px] text-white/40">{mod.downloads || 0}</p>
            </motion.button>
          );
        })}
      </div>

      {visibleRankings.slice(3).map((mod, rowIndex) => {
        const index = rowIndex + 3;
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
            className={`group flex w-full items-center gap-3 rounded-2xl border ${borderCls} ${rowBg} p-3 text-left transition-colors hover:bg-white/4.5`}
          >
            <div className="flex w-7 shrink-0 flex-col items-center font-mono text-[11px] font-black text-white/25">
              {String(index + 1).padStart(2, "0")}
            </div>
            <div className={`h-11 w-11 shrink-0 overflow-hidden rounded-xl border ${iconBorder} bg-white/4 shadow-md`}>
              {mod.iconUrl ? (
                <img src={mod.iconUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full items-center justify-center text-[10px] font-bold text-white/35">
                  {mod.title.slice(0, 2)}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-white transition-colors group-hover:text-white/90">{mod.title}</p>
              <p className="mt-1 text-[8px] font-mono uppercase text-white/30">{mod._source || "Comunidad"}</p>
            </div>
            <div className={`rounded-lg border ${statBorder} bg-black/20 px-2 py-1 text-right`}>
              <p className="text-[11px] font-black text-white/75">{mod.downloads || 0}</p>
              <p className="text-[7px] font-mono uppercase text-white/25">{metric === "shares" ? "shares" : "guardados"}</p>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
