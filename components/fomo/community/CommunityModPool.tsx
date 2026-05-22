"use client";

import React, { useMemo, useState } from "react";
import { Search, RefreshCw, Puzzle, Blocks, Filter } from "lucide-react";
import { CommunityUserAvatar } from "@/components/fomo/community/CommunityUserAvatar";
import { CommunityDeleteButton } from "@/components/fomo/community/CommunityDeleteButton";
import {
  compareCommunityMods,
  parseShareMeta,
  stripShareMeta,
  type CommunityProjectType,
} from "@/lib/fomo/communityShareMeta";
import { CommunityModpacks } from "@/components/fomo/community/CommunityModpacks";
import { FomoModBannerStrip } from "@/components/fomo/discover/FomoModBannerStrip";
import { openProjectDetailsInFomo } from "@/lib/fomo/fomoProjectNavigation";
import { communityTypeToBannerType } from "@/lib/fomo/fomoModBanner";

interface SharedFavorite {
  id: string;
  profile_id: string;
  mod_id: string;
  platform: string;
  name: string;
  icon_url?: string | null;
  summary?: string | null;
  created_at?: string;
  profiles: {
    username: string;
    avatar_url?: string | null;
    color?: string | null;
  };
}

const TYPE_TABS: { id: CommunityProjectType | "all"; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "mod", label: "Mods" },
  { id: "textura", label: "Texturas" },
  { id: "shader", label: "Shaders" },
  { id: "datapack", label: "Datapacks" },
];

interface CommunityModPoolProps {
  cloudFavorites: SharedFavorite[];
  loadingFavorites: boolean;
  currentUserId?: string;
  /** Igual que Seguidos/Colecciones: abre panel de detalles sin salir de FOMO Cloud. */
  onOpenProjectDetails?: (id: string, platform?: string) => void;
  onFavoriteDeleted?: (id: string) => void;
  onOpenProfile?: (username: string) => void;
  onContentDeleted?: () => void;
}

const formatSharedDate = (dateStr?: string) => {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

export function CommunityModPool({
  cloudFavorites,
  loadingFavorites,
  currentUserId,
  onOpenProjectDetails,
  onFavoriteDeleted,
  onOpenProfile,
  onContentDeleted,
}: CommunityModPoolProps) {
  const [typeFilter, setTypeFilter] = useState<CommunityProjectType | "all">("all");
  const [versionFilter, setVersionFilter] = useState<string>("all");
  const [loaderFilter, setLoaderFilter] = useState<string>("all");

  const poolItems = useMemo(() => {
    return cloudFavorites
      .filter((f) => parseShareMeta(f.summary).projectType !== "autor")
      .sort(compareCommunityMods);
  }, [cloudFavorites]);

  const versions = useMemo(() => {
    const set = new Set<string>();
    poolItems.forEach((f) => {
      const v = parseShareMeta(f.summary).gameVersion;
      if (v) set.add(v);
    });
    return [...set].sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  }, [poolItems]);

  const loaders = useMemo(() => {
    const set = new Set<string>();
    poolItems.forEach((f) => {
      const l = parseShareMeta(f.summary).modloader;
      if (l) set.add(l);
    });
    return [...set].sort();
  }, [poolItems]);

  const filtered = useMemo(() => {
    return poolItems.filter((f) => {
      const meta = parseShareMeta(f.summary);
      if (typeFilter !== "all" && meta.projectType !== typeFilter) return false;
      if (versionFilter !== "all" && meta.gameVersion !== versionFilter) return false;
      if (loaderFilter !== "all" && meta.modloader !== loaderFilter) return false;
      return true;
    });
  }, [poolItems, typeFilter, versionFilter, loaderFilter]);

  const groups = useMemo(() => {
    const g: Record<string, SharedFavorite[]> = {};
    filtered.forEach((fav) => {
      const username = fav.profiles?.username || "Usuario";
      if (!g[username]) g[username] = [];
      g[username].push(fav);
    });
    return g;
  }, [filtered]);

  const handleOpenDetails = (fav: SharedFavorite, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (onOpenProjectDetails) {
      onOpenProjectDetails(fav.mod_id, fav.platform);
      return;
    }
    openProjectDetailsInFomo(fav.mod_id, fav.platform, {
      title: fav.name,
      projectType: parseShareMeta(fav.summary).projectType,
    });
    // Ensure the Discover panel applies pending search/open actions
    requestAnimationFrame(() => {
      window.dispatchEvent(new CustomEvent("fomo-apply-pending-discover"));
    });
  };

  return (
    <div className="space-y-6">
      <CommunityModpacks
        currentUserId={currentUserId}
        onContentDeleted={onContentDeleted}
        browseOnly
        maxVisible={1}
      />

      <div>
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Blocks className="w-4 h-4 text-primary" />
          Pool
        </h3>
        <p className="text-xs text-white/40 mt-0.5">
          Mods compartidos por la comunidad. Ordenados por versión de Minecraft, modloader y fecha.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <Filter className="w-3.5 h-3.5 text-white/30 shrink-0" />
        {TYPE_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTypeFilter(t.id)}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-headline font-bold uppercase tracking-wider transition-all cursor-pointer backdrop-blur-md border ${
              typeFilter === t.id
                ? "bg-primary/20 border-primary/40 text-primary shadow-[0_0_12px_rgba(240,90,40,0.3)]"
                : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
        {versions.length > 0 && (
          <select
            value={versionFilter}
            onChange={(e) => setVersionFilter(e.target.value)}
            className="ml-auto bg-white/5 border border-white/10 rounded-xl py-1.5 px-3 text-xs text-white font-medium focus:outline-none focus:border-primary/50 transition-colors"
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
            className="bg-white/5 border border-white/10 rounded-xl py-1.5 px-3 text-xs text-white font-medium focus:outline-none focus:border-primary/50 transition-colors"
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

      {loadingFavorites ? (
        <div className="py-12 text-center text-white/40">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-primary" /> Cargando pool...
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 border border-dashed border-white/10 bg-white/[0.02] rounded-3xl text-center text-white/40 text-sm font-medium backdrop-blur-sm">
          No hay mods en el pool con estos filtros.
        </div>
      ) : (
        <div className="space-y-10">
          {Object.keys(groups).map((username) => {
            const userFavs = groups[username];
            const displayFavs = userFavs.slice(0, 4);
            const firstFav = userFavs[0];
            const profileColor = firstFav?.profiles?.color;
            const profileAvatar = firstFav?.profiles?.avatar_url;

            return (
              <div key={username} className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-white/5 to-transparent rounded-2xl border border-white/5 backdrop-blur-sm shadow-sm relative overflow-hidden group/header">
                  <div 
                    className="absolute inset-0 opacity-0 group-hover/header:opacity-10 transition-opacity duration-500 pointer-events-none"
                    style={{ background: `linear-gradient(90deg, ${profileColor || 'var(--color-primary)'}, transparent)` }}
                  />
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onOpenProfile?.(username)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") onOpenProfile?.(username);
                    }}
                    className="flex items-center gap-4 cursor-pointer text-left relative z-10"
                  >
                    <CommunityUserAvatar
                      username={username}
                      avatarUrl={profileAvatar}
                      color={profileColor}
                      size="md"
                      interactive={false}
                    />
                    <div>
                      <span className="text-sm font-black text-white block group-hover/header:text-primary transition-colors tracking-tight">
                        @{username}
                      </span>
                      <span className="text-[11px] font-medium text-white/50 block mt-0.5">
                        {userFavs.length} aportes en el pool
                      </span>
                    </div>
                  </div>
                  {userFavs.length > 4 && (
                    <button
                      type="button"
                      onClick={() => onOpenProfile?.(username)}
                      className="px-4 py-2 rounded-xl border border-primary/20 bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-black tracking-wider uppercase transition-all cursor-pointer relative z-10 backdrop-blur-md"
                    >
                      Ver perfil (+{userFavs.length - 4})
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {displayFavs.map((fav) => {
                    const meta = parseShareMeta(fav.summary);
                    const summaryText = stripShareMeta(fav.summary);
                    return (
                      <div
                        key={fav.id}
                        className="group rounded-3xl bg-white/[0.03] border border-white/10 hover:border-primary/40 transition-all duration-500 overflow-hidden flex flex-col hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:-translate-y-1 relative"
                      >
                        <FomoModBannerStrip
                          projectId={fav.mod_id}
                          platform={fav.platform}
                          projectType={communityTypeToBannerType(meta.projectType)}
                          heightClass="h-20"
                        />
                        <div className="p-3.5 flex gap-3 flex-1">
                        <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden -mt-7 relative z-10 ring-2 ring-black/30">
                          {fav.icon_url ? (
                            <img src={fav.icon_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Puzzle className="w-4 h-4 opacity-40" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 pt-1">
                          <h4 className="text-xs font-bold text-white truncate">{fav.name}</h4>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {meta.gameVersion && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-black/30 text-white/60">
                                MC {meta.gameVersion}
                              </span>
                            )}
                            {meta.modloader && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-black/30 text-primary/80 uppercase">
                                {meta.modloader}
                              </span>
                            )}
                            {meta.projectType && meta.projectType !== "mod" && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-white/5 text-white/50 uppercase">
                                {meta.projectType}
                              </span>
                            )}
                          </div>
                          {summaryText && (
                            <p className="text-xs text-white/45 line-clamp-1 mt-1">{summaryText}</p>
                          )}
                          {fav.created_at && (
                            <span className="text-[10px] text-white/25 block mt-1">
                              {formatSharedDate(fav.created_at)}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 shrink-0 self-end">
                          {currentUserId && fav.profile_id === currentUserId && (
                            <CommunityDeleteButton
                              type="favorite"
                              id={fav.id}
                              onDeleted={onFavoriteDeleted}
                            />
                          )}
                          <button
                            type="button"
                            onClick={(e) => handleOpenDetails(fav, e)}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-all cursor-pointer"
                            title="Ver detalles del proyecto"
                          >
                            <Search className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
