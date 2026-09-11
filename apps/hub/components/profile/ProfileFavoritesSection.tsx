"use client";

import React from "react";
import { motion } from "framer-motion";
import { Check, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import type { ModHit } from "../SpotlightMarquees";
import {
  readFavoriteMeta,
  projectUpdateKey,
  handleHorizontalWheel,
} from "./utils";

interface ProfileFavoritesSectionProps {
  sortedUserFavorites: any[];
  recentUpdates: Record<string, boolean>;
  loadingUserData: boolean;
  handleOpenModDetails: (mod: ModHit) => void;
  expanded: boolean;
  onToggleExpanded: () => void;
  filter: "all" | "updated";
  onFilterChange: (filter: "all" | "updated") => void;
}

export function ProfileFavoritesSection({
  sortedUserFavorites,
  recentUpdates,
  loadingUserData,
  handleOpenModDetails,
  expanded,
  onToggleExpanded,
  filter,
  onFilterChange,
}: ProfileFavoritesSectionProps) {
  const visibleFavorites = expanded ? sortedUserFavorites : sortedUserFavorites.slice(0, 3);
  return (
    <motion.section
      variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
      className="flex flex-col gap-3"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold text-white/70 tracking-wide flex items-center gap-1.5">
          <Check className="w-4 h-4 text-emerald-400" /> Favoritos
        </h3>
        <button type="button" onClick={onToggleExpanded} aria-expanded={expanded} className="flex items-center gap-1 text-[9px] font-semibold text-white/45">
          {expanded ? "Ver menos" : `Ver todos (${sortedUserFavorites.length})`}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      </div>
      <div className="inline-flex w-fit rounded-xl border border-border bg-surface/70 p-0.5" aria-label="Filtrar favoritos">
        {(["all", "updated"] as const).map((value) => (
          <button key={value} type="button" aria-pressed={filter === value} onClick={() => onFilterChange(value)} className={`rounded-lg px-3 py-1 text-[9px] font-bold transition-all ${filter === value ? "mim-control-3d-active bg-orange-500/15 text-orange-400" : "text-white/40"}`}>
            {value === "all" ? "Todos" : "Actualizados"}
          </button>
        ))}
      </div>
      {loadingUserData ? (
        <div className="py-6 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
        </div>
      ) : sortedUserFavorites.length > 0 ? (
        <div
          onWheel={handleHorizontalWheel}
          className="grid grid-flow-col grid-rows-3 auto-cols-[minmax(260px,1fr)] gap-3 overflow-x-auto overflow-y-hidden pb-2 pr-1 snap-x snap-mandatory scrollbar-none touch-auto overscroll-x-contain"
        >
          {visibleFavorites.map((fav) => {
            const meta = readFavoriteMeta(fav);
            const projectId = fav.mod_id || fav.project_id || fav.id;
            const projectType = fav.project_type || meta.project_type || "mod";
            const projectSource = fav.platform || fav.source || "modrinth";
            const isRecentlyUpdated = recentUpdates[projectUpdateKey(projectSource, projectId)];
            let title = fav.name || "";
            let author = "Comunidad";
            if (fav.name && fav.name.includes(" ::: ")) {
              const parts = fav.name.split(" ::: ");
              title = parts[0];
              author = parts[1];
            }

            return (
              <div
                key={fav.id}
                onClick={() =>
                  handleOpenModDetails({
                    projectId,
                    title,
                    description:
                      fav.description ||
                      meta.description ||
                      (!fav.summary?.trim?.().startsWith("{") ? fav.summary : "") ||
                      "",
                    iconUrl: fav.icon_url,
                    author,
                    projectType,
                    categories: fav.categories || meta.categories || [],
                    url: fav.url || meta.url || `https://modrinth.com/${projectType}/${projectId}`,
                    _source: projectSource,
                  })
                }
                className={`mim-profile-list-card bg-surface/80 border rounded-2xl p-3.5 min-h-[66px] flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-all hover:border-white/10 snap-start ${
                  isRecentlyUpdated
                    ? "border-amber-300/70 shadow-[0_0_18px_rgba(251,191,36,0.28)]"
                    : "border-border"
                }`}
              >
                <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/[0.05] flex items-center justify-center overflow-hidden flex-shrink-0">
                  {fav.icon_url ? (
                    <img src={fav.icon_url} alt="" className="object-cover w-full h-full" />
                  ) : (
                    <span className="text-white/40 text-xs font-bold uppercase">{title.substring(0, 2)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-white truncate">{title}</h4>
                  <p className="text-[9px] text-white/35 mt-0.5 capitalize">
                    {author} • {fav.platform}
                  </p>
                  {isRecentlyUpdated && (
                    <span className="mt-1 inline-flex rounded-full border border-amber-400/30 bg-amber-500/10 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wide text-amber-400">Actualizado</span>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-white/20 shrink-0" />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white/[0.02] border border-dashed border-white/[0.08] rounded-2xl p-6 text-center">
          <p className="text-xs text-white/40">No guardaste ningún mod favorito todavía.</p>
        </div>
      )}
    </motion.section>
  );
}
