"use client";

import React, { useMemo, useState } from "react";
import { Puzzle, Search, Blocks } from "lucide-react";
import { parseShareMeta, stripShareMeta, type CommunityProjectType } from "@/lib/fomo/communityShareMeta";
import { openProjectDetailsInFomo } from "@/lib/fomo/fomoProjectNavigation";
import { FomoModBannerStrip } from "@/components/fomo/discover/FomoModBannerStrip";
import { communityTypeToBannerType } from "@/lib/fomo/fomoModBanner";

const AUTHOR_MARKERS = ["autor de minecraft", "¿querés agregar"];

const TYPE_TABS: { id: CommunityProjectType | "all"; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "mod", label: "Mods" },
  { id: "textura", label: "Texturas" },
  { id: "shader", label: "Shaders" },
  { id: "datapack", label: "Datapacks" },
  { id: "modpack", label: "Modpacks" },
];

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
  const [typeFilter, setTypeFilter] = useState<CommunityProjectType | "all">("all");
  const [versionFilter, setVersionFilter] = useState<string>("all");
  const [loaderFilter, setLoaderFilter] = useState<string>("all");

  const poolMods = useMemo(
    () => favorites.filter((f) => !isAuthorRow(f.summary)),
    [favorites]
  );

  const versions = useMemo(() => {
    const set = new Set<string>();
    poolMods.forEach((fav) => {
      const v = parseShareMeta(fav.summary).gameVersion;
      if (v) set.add(v);
    });
    return [...set].sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  }, [poolMods]);

  const loaders = useMemo(() => {
    const set = new Set<string>();
    poolMods.forEach((fav) => {
      const l = parseShareMeta(fav.summary).modloader;
      if (l) set.add(l);
    });
    return [...set].sort();
  }, [poolMods]);

  const filteredMods = useMemo(() => {
    return poolMods.filter((fav) => {
      const meta = parseShareMeta(fav.summary);
      if (typeFilter !== "all" && meta.projectType !== typeFilter) return false;
      if (versionFilter !== "all" && meta.gameVersion !== versionFilter) return false;
      if (loaderFilter !== "all" && meta.modloader !== loaderFilter) return false;
      return true;
    });
  }, [poolMods, typeFilter, versionFilter, loaderFilter]);

  if (filteredMods.length === 0) {
    return (
      <div className="py-12 text-center text-xs border border-dashed border-white/10 rounded-2xl text-white/40">
        Este usuario no tiene mods en su pool público.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <Blocks className="w-4 h-4 text-primary" />
        <h4 className="text-xs font-bold text-white">Pool ({filteredMods.length})</h4>
      </div>
      <div className="flex flex-wrap gap-2 items-center mb-3">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setTypeFilter(tab.id)}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-headline font-bold uppercase tracking-wider transition-all cursor-pointer backdrop-blur-md border ${
              typeFilter === tab.id
                ? "bg-primary/20 border-primary/40 text-primary shadow-[0_0_12px_rgba(240,90,40,0.3)]"
                : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}

        {versions.length > 0 && (
          <select
            value={versionFilter}
            onChange={(e) => setVersionFilter(e.target.value)}
            className="ml-auto bg-white/5 border border-white/10 rounded-xl py-1.5 px-3 text-[10px] text-white font-medium focus:outline-none focus:border-primary/50 transition-colors"
          >
            <option value="all">Todas las versiones</option>
            {versions.map((v) => (
              <option key={v} value={v}>
                MC {v}
              </option>
            ))}
          </select>
        )}

        {loaders.length > 0 && (
          <select
            value={loaderFilter}
            onChange={(e) => setLoaderFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl py-1.5 px-3 text-[10px] text-white font-medium focus:outline-none focus:border-primary/50 transition-colors"
          >
            <option value="all">Todos los loaders</option>
            {loaders.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[min(50vh,420px)] overflow-y-auto pr-1 scrollbar-thin">
        {filteredMods.map((fav) => {
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
                    requestAnimationFrame(() => {
                      window.dispatchEvent(new CustomEvent("fomo-apply-pending-discover"));
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
