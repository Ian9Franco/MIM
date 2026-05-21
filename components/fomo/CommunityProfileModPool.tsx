"use client";

import React, { useMemo } from "react";
import { Puzzle, Search, Blocks } from "lucide-react";
import { parseShareMeta, stripShareMeta } from "@/lib/communityShareMeta";
import { openProjectDetailsInFomo } from "@/lib/fomoProjectNavigation";
import { FomoModBannerStrip } from "./FomoModBannerStrip";
import { communityTypeToBannerType } from "@/lib/fomoModBanner";

const AUTHOR_MARKERS = ["autor de minecraft", "¿querés agregar"];

function isAuthorRow(summary?: string | null) {
  if (!summary) return false;
  const s = summary.toLowerCase();
  return AUTHOR_MARKERS.some((m) => s.includes(m));
}

interface PoolItem {
  id: string;
  mod_id: string;
  platform: string;
  name: string;
  icon_url?: string | null;
  summary?: string | null;
  created_at?: string;
}

export function CommunityProfileModPool({
  favorites,
  onOpenProjectDetails,
}: {
  favorites: PoolItem[];
  onOpenProjectDetails?: (id: string, platform?: string) => void;
}) {
  const poolMods = useMemo(
    () => favorites.filter((f) => !isAuthorRow(f.summary)),
    [favorites]
  );

  if (poolMods.length === 0) {
    return (
      <div className="py-12 text-center text-xs border border-dashed border-white/10 rounded-2xl text-white/40">
        Este usuario no tiene mods en su pool público.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Blocks className="w-4 h-4 text-primary" />
        <h4 className="text-xs font-bold text-white">Pool ({poolMods.length})</h4>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[min(50vh,420px)] overflow-y-auto pr-1 scrollbar-thin">
        {poolMods.map((fav) => {
          const meta = parseShareMeta(fav.summary);
          const summaryText = stripShareMeta(fav.summary);
          return (
            <div
              key={fav.id}
              className="group rounded-2xl bg-white/4 border border-white/5 hover:border-primary/25 overflow-hidden flex flex-col transition-all"
            >
              <FomoModBannerStrip
                projectId={fav.mod_id}
                platform={fav.platform}
                projectType={communityTypeToBannerType(meta.projectType)}
                heightClass="h-20"
              />
              <div className="p-3 flex gap-3 flex-1">
              <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center -mt-7 relative z-10 ring-2 ring-black/30">
                {fav.icon_url ? (
                  <img src={fav.icon_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Puzzle className="w-4 h-4 opacity-40" />
                )}
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenProjectDetails) {
                      onOpenProjectDetails(fav.mod_id, fav.platform);
                    } else {
                      openProjectDetailsInFomo(fav.mod_id, fav.platform, {
                        title: fav.name,
                        projectType: meta.projectType,
                      });
                    }
                  }}
                  className="text-xs font-bold text-white truncate block text-left hover:text-primary cursor-pointer bg-transparent border-none p-0 w-full"
                >
                  {fav.name}
                </button>
                <div className="flex flex-wrap gap-1 mt-1">
                  {meta.gameVersion && (
                    <span className="text-[8px] px-1.5 py-0.5 rounded bg-black/30 text-white/55">
                      MC {meta.gameVersion}
                    </span>
                  )}
                  {meta.modloader && (
                    <span className="text-[8px] px-1.5 py-0.5 rounded bg-primary/15 text-primary/90 uppercase">
                      {meta.modloader}
                    </span>
                  )}
                </div>
                {summaryText && (
                  <p className="text-[9px] text-white/45 line-clamp-1 mt-1">{summaryText}</p>
                )}
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onOpenProjectDetails) {
                    onOpenProjectDetails(fav.mod_id, fav.platform);
                  } else {
                    openProjectDetailsInFomo(fav.mod_id, fav.platform, {
                      title: fav.name,
                      projectType: meta.projectType,
                    });
                  }
                }}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white shrink-0 cursor-pointer border-none self-end"
                title="Ver detalles del proyecto"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
