"use client";
import { DefaultModIcon } from "../DefaultModIcon";

import React from "react";
import { motion } from "framer-motion";
import { Compass, Loader2, ChevronRight } from "lucide-react";
import type { ModHit } from "../SpotlightMarquees";

interface RankingsTabProps {
  rankings: ModHit[];
  loadingRankings: boolean;
  handleOpenModDetails: (mod: ModHit) => void;
}

/**
 * RankingsTab — top mods votados por la comunidad (datos de Supabase).
 */
export function RankingsTab({ rankings, loadingRankings, handleOpenModDetails }: RankingsTabProps) {
  return (
    <motion.div
      key="rankings"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="flex-1 flex flex-col min-h-0"
    >
      <div
        className="border-l-2 rounded-r-lg p-3 mb-6 shrink-0"
        style={{
          background: "linear-gradient(to right, color-mix(in srgb, var(--color-primary) 10%, transparent), transparent)",
          borderColor: "var(--color-primary)"
        }}
      >
        <p className="text-[10px] font-mono uppercase tracking-wider font-bold" style={{ color: "var(--color-primary)" }}>
          Ránkings
        </p>
        <h2 className="text-xs font-semibold text-white/90 mt-1">
          Mods más votados por la comunidad de MIM en la nube.
        </h2>
      </div>

      {loadingRankings ? (
        <div className="flex-1 flex flex-col justify-center items-center">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          <span className="text-xs text-white/40 mt-3 font-mono">Leyendo Supabase Cloud...</span>
        </div>
      ) : rankings.length > 0 ? (
        <div className="flex-1 overflow-y-auto space-y-3 pb-28 pr-1 scrollbar-none">
          {rankings.map((mod, i) => (
            <div
              key={mod.projectId}
              onClick={() => handleOpenModDetails(mod)}
              className="bg-surface/90 border border-border rounded-2xl p-3 flex items-center gap-3 active:scale-[0.98] transition-all cursor-pointer hover:border-border"
            >
              <div className="w-6 text-center font-mono font-black text-sm text-purple-400/80">
                #{i + 1}
              </div>
              <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/[0.05] flex items-center justify-center overflow-hidden flex-shrink-0">
                {mod.iconUrl ? (
                  <>
                    <img
                      src={mod.iconUrl}
                      alt=""
                      className="object-cover w-full h-full"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        const sibling = e.currentTarget.nextSibling as HTMLElement;
                        if (sibling) sibling.style.display = "block";
                      }}
                    />
                    <div className="hidden w-full h-full">
                      <DefaultModIcon platform={mod._source} />
                    </div>
                  </>
                ) : (
                  <DefaultModIcon platform={mod._source} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{mod.title}</p>
                <p className="text-[9px] text-white/40 mt-0.5 capitalize">{mod._source}</p>
              </div>
              <div className="bg-purple-500/10 border border-purple-500/20 text-purple-300 font-mono text-[10px] px-2 py-0.5 rounded-full">
                {mod.downloads} {mod.downloads === 1 ? "voto" : "votos"}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-center items-center text-center p-6">
          <Compass className="w-12 h-12 text-purple-400 mb-4 opacity-50" />
          <h2 className="text-sm font-semibold text-white">Sin rankings</h2>
          <p className="text-xs text-white/40 mt-1">No hay votos registrados en Supabase todavía.</p>
        </div>
      )}
    </motion.div>
  );
}
