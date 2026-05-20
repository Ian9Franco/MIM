"use client";

import React from "react";
import { Star, Award, Puzzle, RefreshCw, Heart, AlertCircle } from "lucide-react";
import { COLORS } from "@/theme/tokens";

interface FomoFollowedRankingsProps {
  animationClass: string;
  loadingHistory: boolean;
  loadingCommunityRankings?: boolean;
  historyFetchError?: string | null;
  communityRankingsError?: string | null;
  onRetryRankingsLoads?: () => void;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  history: any[];
  rankings: Record<string, any[]>;
  communityRankings?: Record<string, any[]>;
  hasMore: boolean;
  onOpenVersions?: (mod: any) => void;
}

function hasRankingRows(rankings: Record<string, any[]> | undefined): boolean {
  if (!rankings) return false;
  return Object.values(rankings).some((arr) => Array.isArray(arr) && arr.length > 0);
}

export function FomoFollowedRankings({
  animationClass,
  loadingHistory,
  loadingCommunityRankings = false,
  historyFetchError = null,
  communityRankingsError = null,
  onRetryRankingsLoads,
  page,
  setPage,
  history,
  rankings,
  communityRankings = {},
  hasMore,
  onOpenVersions,
}: FomoFollowedRankingsProps) {
  const [rankingTab, setRankingTab] = React.useState<"personal" | "community">("personal");

  const labels: Record<string, string> = {
    mod: "Mods y packs",
    resourcepack: "Texturas",
    shader: "Shaders",
    datapack: "Datapacks",
  };

  const displayRankings = rankingTab === "personal" ? rankings : communityRankings;
  const personalHasRows = history.length > 0 || hasRankingRows(rankings);
  const communityHasRows = hasRankingRows(communityRankings);
  const anyRankingsRows = hasRankingRows(rankings) || hasRankingRows(communityRankings);
  const hasLoadError = !!(rankingTab === "personal" ? historyFetchError : communityRankingsError);

  const showGlobalEmpty =
    !personalHasRows &&
    !communityHasRows &&
    !anyRankingsRows &&
    !loadingHistory &&
    page === 1 &&
    !loadingCommunityRankings &&
    !historyFetchError &&
    !communityRankingsError;

  const topLimit = rankingTab === "community" ? 10 : 6;

  return (
    <div key="history" className={animationClass}>
      {(historyFetchError || communityRankingsError) && (
        <div
          className="mb-4 p-3 rounded-2xl border flex flex-wrap items-center gap-3 text-xs"
          style={{ background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.25)", color: COLORS.muted }}
        >
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <div className="flex-1 min-w-[200px] space-y-1">
            <p className="font-bold text-red-300/90">Problema de red al cargar datos</p>
            {historyFetchError ? (
              <p className="text-[10px] text-white/50">Historial local: {historyFetchError}</p>
            ) : null}
            {communityRankingsError ? (
              <p className="text-[10px] text-white/50">Ranking comunidad: {communityRankingsError}</p>
            ) : null}
          </div>
          {onRetryRankingsLoads && (
            <button
              type="button"
              onClick={onRetryRankingsLoads}
              className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/10 text-white text-[10px] font-bold uppercase tracking-wide hover:bg-white/15 cursor-pointer shrink-0"
            >
              Reintentar
            </button>
          )}
        </div>
      )}

      {loadingHistory && page === 1 && !personalHasRows && !historyFetchError ? (
        <div className="py-12 text-center text-white/40">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" /> Cargando historial...
        </div>
      ) : showGlobalEmpty ? (
        <div className="py-20 text-center flex flex-col items-center opacity-40">
          <Puzzle className="w-16 h-16 mb-4" />
          <h3 className="font-headline text-lg">Sin historial de descargas</h3>
          <p className="text-xs max-w-sm">Los mods que descargues aparecerán acá. En Comunidad verás lo más compartido por otros usuarios.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Ranking Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex gap-2 bg-white/5 p-1 rounded-xl w-fit border border-white/5">
              <button
                type="button"
                onClick={() => setRankingTab("personal")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  rankingTab === "personal" ? "bg-primary text-white" : "opacity-40 text-white hover:opacity-100"
                }`}
              >
                <Star className="w-3.5 h-3.5" />
                Personal
              </button>
              <button
                type="button"
                onClick={() => setRankingTab("community")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  rankingTab === "community" ? "bg-primary text-white" : "opacity-40 text-white hover:opacity-100"
                }`}
              >
                <Heart className="w-3.5 h-3.5" />
                Comunidad
              </button>
            </div>
            {rankingTab === "community" && (
              <p className="text-[10px] text-white/45 max-w-md leading-relaxed">
                Basado en favoritos públicos en la nube MIM: más usuarios comparten un ítem, más arriba aparece.
              </p>
            )}
          </div>

          {/* Ranking Sections */}
          {loadingCommunityRankings && rankingTab === "community" && !communityHasRows ? (
            <div className="py-8 text-center text-white/40">
              <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-primary" /> Cargando rankings de la
              comunidad...
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {Object.entries(displayRankings).map(([type, typeRanking]) => {
                if (!Array.isArray(typeRanking) || typeRanking.length === 0) return null;
                return (
                  <div key={`${rankingTab}-${type}`} className="space-y-2">
                    <h4 className="font-headline text-xs flex items-center gap-2">
                      <Award className="w-3.5 h-3.5 text-primary" />
                      Top {labels[type] || type}{" "}
                      {rankingTab === "community" ? "— comunidad" : ""}
                    </h4>
                    <div
                      className={
                        rankingTab === "community"
                          ? "grid grid-cols-2 sm:grid-cols-3 gap-2"
                          : "grid grid-cols-2 gap-2"
                      }
                    >
                      {typeRanking.slice(0, topLimit).map((item, idx) => {
                        const src = item.mod?._source || "modrinth";
                        const isCf = src === "curseforge";
                        return (
                          <div
                            key={`${item.mod.projectId}-${idx}`}
                            onClick={() => onOpenVersions && onOpenVersions(item.mod)}
                            className={`p-2 rounded-xl bg-white/5 border border-white/10 flex relative hover:bg-white/10 transition-all cursor-pointer ${
                              idx === 0 ? "col-span-2 sm:col-span-3 flex-row items-center gap-3" : "flex-col items-center text-center"
                            }`}
                          >
                            <div
                              className={`absolute top-1 left-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white z-10 ${
                                idx === 0 ? "bg-amber-500" : "bg-primary"
                              }`}
                            >
                              {idx + 1}
                            </div>
                            {rankingTab === "community" && (
                              <span
                                className={`absolute top-1 right-1 z-10 text-[8px] font-black px-1.5 py-0.5 rounded-md border ${
                                  isCf
                                    ? "bg-orange-500/20 text-orange-300 border-orange-500/25"
                                    : "bg-emerald-500/15 text-emerald-300 border-emerald-500/20"
                                }`}
                              >
                                {isCf ? "CF" : "MR"}
                              </span>
                            )}
                            <div
                              className={`${
                                idx === 0 ? "w-10 h-10" : "w-8 h-8 mb-1"
                              } rounded-lg bg-white/5 flex items-center justify-center overflow-hidden border border-white/10 shrink-0`}
                            >
                              {item.mod.iconUrl ? (
                                <img src={item.mod.iconUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Puzzle className="w-4 h-4 opacity-40" />
                              )}
                            </div>
                            <div className={idx === 0 ? "flex-1 min-w-0" : "w-full"}>
                              <p className={`font-bold text-[10px] truncate w-full ${idx === 0 ? "text-sm" : ""}`}>
                                {item.mod.title}
                              </p>
                              <p className="font-caption text-[8px] mt-0.5" style={{ color: COLORS.muted }}>
                                {item.count} {rankingTab === "community" ? "compartidos" : "dls"}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {!hasRankingRows(displayRankings) && !loadingCommunityRankings && (
                <div className="col-span-full py-8 text-center text-white/40 space-y-2">
                  <p>
                    {rankingTab === "community"
                      ? "Todavía no hay favoritos compartidos en la nube, o no pudimos cargarlos."
                      : "No hay suficientes descargas para armar un top todavía."}
                  </p>
                  {hasLoadError && onRetryRankingsLoads && (
                    <button
                      type="button"
                      onClick={onRetryRankingsLoads}
                      className="text-primary text-xs font-bold hover:underline cursor-pointer bg-transparent border-none"
                    >
                      Reintentar carga
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Full History Section - only show on personal tab */}
          {rankingTab === "personal" && (
            <div className="space-y-3">
              <h4 className="font-headline text-sm flex items-center gap-2">
                <Star className="w-4 h-4 text-primary" />
                Historial completo
              </h4>
              {historyFetchError && history.length === 0 ? (
                <p className="text-xs text-white/40 py-4 text-center">No se pudo cargar el historial. Probá Reintentar arriba.</p>
              ) : (
                <div className="space-y-2">
                  {history.map((item, idx) => (
                    <div
                      key={`${item.projectId}-${idx}`}
                      onClick={() =>
                        onOpenVersions &&
                        onOpenVersions({ projectId: item.projectId, title: item.title, iconUrl: item.iconUrl })
                      }
                      className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10 overflow-hidden">
                        {item.iconUrl ? (
                          <img src={item.iconUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Puzzle className="w-4 h-4 opacity-40" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{item.title}</p>
                        <p className="font-caption text-[10px]" style={{ color: COLORS.muted }}>
                          {item.loader} • {item.gameVersion} • {new Date(item.downloadedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-[10px] font-bold px-2 py-1 rounded-lg bg-white/5 border border-white/10 uppercase">
                        {item._source}
                      </div>
                    </div>
                  ))}

                  {hasMore && (
                    <button
                      type="button"
                      onClick={() => setPage((prev) => prev + 1)}
                      disabled={loadingHistory}
                      className="w-full p-3 rounded-2xl border border-dashed border-white/10 hover:border-primary/30 hover:bg-primary/5 transition-all flex items-center justify-center gap-2 text-sm font-bold mt-2 cursor-pointer"
                    >
                      {loadingHistory ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Cargar más"}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
