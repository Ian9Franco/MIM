"use client";

import React from "react";
import { Star, Award, Puzzle, RefreshCw, Heart, AlertCircle, Share2, Bookmark, Crown, Trophy } from "lucide-react";
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
  const [period, setPeriod] = React.useState<"7d" | "30d" | "all">("30d");
  const [metric, setMetric] = React.useState<"shares" | "saves">("shares");
  const [customCommunityRankings, setCustomCommunityRankings] = React.useState<Record<string, any[]> | null>(null);
  const [loadingPeriod, setLoadingPeriod] = React.useState(false);

  React.useEffect(() => {
    if (rankingTab !== "community") return;
    let cancelled = false;
    setLoadingPeriod(true);
    fetch(`/api/fomo/community-rankings?period=${period}&metric=${metric}&limit=20`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (!cancelled && data?.rankings) {
          setCustomCommunityRankings(data.rankings);
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch filtered community rankings:", err);
      })
      .finally(() => {
        if (!cancelled) setLoadingPeriod(false);
      });
    return () => {
      cancelled = true;
    };
  }, [rankingTab, period, metric]);

  const labels: Record<string, string> = {
    mod: "Mods y packs",
    resourcepack: "Texturas",
    shader: "Shaders",
    datapack: "Datapacks",
  };

  const activeCommunityRankings = customCommunityRankings ?? communityRankings;
  const displayRankings = rankingTab === "personal" ? rankings : activeCommunityRankings;
  const personalHasRows = history.length > 0 || hasRankingRows(rankings);
  const communityHasRows = hasRankingRows(activeCommunityRankings);
  const anyRankingsRows = hasRankingRows(rankings) || hasRankingRows(activeCommunityRankings);
  const isCommunityLoading = loadingCommunityRankings || loadingPeriod;

  const showGlobalEmpty =
    !personalHasRows &&
    !communityHasRows &&
    !anyRankingsRows &&
    !loadingHistory &&
    page === 1 &&
    !isCommunityLoading &&
    !historyFetchError &&
    !communityRankingsError;

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
          {/* Header Controls */}
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
                {metric === "shares"
                  ? "Proyectos más compartidos en la nube MIM en el período seleccionado."
                  : "Proyectos más guardados en favoritos por usuarios de MIM."}
              </p>
            )}
          </div>

          {/* Desktop Community Filters Toolbar */}
          {rankingTab === "community" && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-2xl bg-white/[0.03] border border-white/5">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono uppercase text-white/35 mr-1 font-bold">Ventana:</span>
                {(["7d", "30d", "all"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriod(p)}
                    className={`px-3 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                      period === p
                        ? "bg-primary text-white shadow-sm"
                        : "bg-white/5 text-white/50 hover:text-white"
                    }`}
                  >
                    {p === "7d" ? "7 días" : p === "30d" ? "30 días" : "Histórico"}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setMetric("shares")}
                  className={`px-3 py-1 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    metric === "shares"
                      ? "bg-primary text-white shadow-sm"
                      : "bg-white/5 text-white/50 hover:text-white"
                  }`}
                >
                  <Share2 className="w-3 h-3" />
                  Más compartidos
                </button>
                <button
                  type="button"
                  onClick={() => setMetric("saves")}
                  className={`px-3 py-1 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    metric === "saves"
                      ? "bg-primary text-white shadow-sm"
                      : "bg-white/5 text-white/50 hover:text-white"
                  }`}
                >
                  <Bookmark className="w-3 h-3" />
                  Más guardados
                </button>
              </div>
            </div>
          )}

          {/* Ranking Sections */}
          {isCommunityLoading && rankingTab === "community" && !communityHasRows ? (
            <div className="py-8 text-center text-white/40">
              <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-primary" /> Cargando rankings de la
              comunidad...
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(displayRankings).map(([type, typeRanking]) => {
                if (!Array.isArray(typeRanking) || typeRanking.length === 0) return null;

                const topThree = rankingTab === "community" ? typeRanking.slice(0, 3) : [];
                const restRows = rankingTab === "community" ? typeRanking.slice(3, 20) : typeRanking.slice(0, 6);

                return (
                  <div key={`${rankingTab}-${type}`} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-headline text-xs flex items-center gap-2">
                        <Award className="w-3.5 h-3.5 text-primary" />
                        Top {labels[type] || type}{" "}
                        {rankingTab === "community" ? `— ${metric === "shares" ? "compartidos" : "guardados"}` : ""}
                      </h4>
                      {rankingTab === "community" && (
                        <span className="text-[9px] font-mono text-white/30 uppercase">
                          TOP {typeRanking.length}
                        </span>
                      )}
                    </div>

                    {/* Desktop Podium View for Top 3 in Community */}
                    {rankingTab === "community" && topThree.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end pt-2 pb-1">
                        {/* Rank 2 (Flank Left on Desktop) */}
                        {topThree[1] && (
                          <div
                            onClick={() => onOpenVersions && onOpenVersions(topThree[1].mod)}
                            className="order-2 md:order-1 p-3.5 rounded-2xl bg-white/[0.04] border border-slate-400/25 hover:border-slate-400/50 hover:bg-white/[0.07] transition-all cursor-pointer flex flex-col items-center text-center relative group"
                          >
                            <span className="absolute top-2 left-2 w-5 h-5 rounded-lg bg-slate-400/20 text-slate-300 font-mono text-[10px] font-black flex items-center justify-center border border-slate-400/30">
                              2
                            </span>
                            <span className="absolute top-2 right-2 text-[8px] font-black px-1.5 py-0.5 rounded-md border bg-white/5 border-white/10 uppercase text-white/50">
                              {topThree[1].mod?._source || "modrinth"}
                            </span>
                            <div className="w-12 h-12 rounded-xl bg-white/5 overflow-hidden border border-white/10 my-2 flex items-center justify-center shrink-0">
                              {topThree[1].mod?.iconUrl ? (
                                <img src={topThree[1].mod.iconUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Puzzle className="w-6 h-6 opacity-40" />
                              )}
                            </div>
                            <p className="font-bold text-xs truncate w-full text-white">{topThree[1].mod?.title}</p>
                            <p className="font-mono text-[9px] text-white/40 mt-1">
                              {topThree[1].count || topThree[1].downloads || 0} {metric === "shares" ? "shares" : "guardados"}
                            </p>
                          </div>
                        )}

                        {/* Rank 1 (Prominent Center) */}
                        {topThree[0] && (
                          <div
                            onClick={() => onOpenVersions && onOpenVersions(topThree[0].mod)}
                            className="order-1 md:order-2 p-4 rounded-2xl bg-amber-500/[0.08] border border-amber-500/40 hover:border-amber-500/70 hover:bg-amber-500/[0.12] transition-all cursor-pointer flex flex-col items-center text-center relative group shadow-[0_4px_20px_rgba(245,158,11,0.1)]"
                          >
                            <span className="absolute top-2 left-2 w-6 h-6 rounded-lg bg-amber-500/25 text-amber-300 font-mono text-xs font-black flex items-center justify-center border border-amber-500/40">
                              <Crown className="w-3.5 h-3.5" />
                            </span>
                            <span className="absolute top-2 right-2 text-[8px] font-black px-1.5 py-0.5 rounded-md border bg-amber-500/15 border-amber-500/30 uppercase text-amber-300">
                              {topThree[0].mod?._source || "modrinth"}
                            </span>
                            <div className="w-14 h-14 rounded-2xl bg-white/10 overflow-hidden border border-amber-500/30 my-2 flex items-center justify-center shrink-0 shadow-md">
                              {topThree[0].mod?.iconUrl ? (
                                <img src={topThree[0].mod.iconUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Puzzle className="w-7 h-7 text-amber-300 opacity-60" />
                              )}
                            </div>
                            <p className="font-bold text-sm truncate w-full text-white">{topThree[0].mod?.title}</p>
                            <p className="font-mono text-[10px] font-bold text-amber-400 mt-1">
                              {topThree[0].count || topThree[0].downloads || 0} {metric === "shares" ? "shares" : "guardados"}
                            </p>
                          </div>
                        )}

                        {/* Rank 3 (Flank Right on Desktop) */}
                        {topThree[2] && (
                          <div
                            onClick={() => onOpenVersions && onOpenVersions(topThree[2].mod)}
                            className="order-3 p-3.5 rounded-2xl bg-white/[0.04] border border-amber-700/25 hover:border-amber-700/50 hover:bg-white/[0.07] transition-all cursor-pointer flex flex-col items-center text-center relative group"
                          >
                            <span className="absolute top-2 left-2 w-5 h-5 rounded-lg bg-amber-700/20 text-amber-500 font-mono text-[10px] font-black flex items-center justify-center border border-amber-700/30">
                              3
                            </span>
                            <span className="absolute top-2 right-2 text-[8px] font-black px-1.5 py-0.5 rounded-md border bg-white/5 border-white/10 uppercase text-white/50">
                              {topThree[2].mod?._source || "modrinth"}
                            </span>
                            <div className="w-12 h-12 rounded-xl bg-white/5 overflow-hidden border border-white/10 my-2 flex items-center justify-center shrink-0">
                              {topThree[2].mod?.iconUrl ? (
                                <img src={topThree[2].mod.iconUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Puzzle className="w-6 h-6 opacity-40" />
                              )}
                            </div>
                            <p className="font-bold text-xs truncate w-full text-white">{topThree[2].mod?.title}</p>
                            <p className="font-mono text-[9px] text-white/40 mt-1">
                              {topThree[2].count || topThree[2].downloads || 0} {metric === "shares" ? "shares" : "guardados"}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Remaining ranking rows (#4 to #20) or Personal rankings */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {restRows.map((item, rowIdx) => {
                        const idx = rankingTab === "community" ? rowIdx + 3 : rowIdx;
                        const src = item.mod?._source || "modrinth";
                        const isCf = src === "curseforge";
                        return (
                          <div
                            key={`${item.mod?.projectId || rowIdx}-${idx}`}
                            onClick={() => onOpenVersions && onOpenVersions(item.mod)}
                            className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-center gap-3 hover:bg-white/[0.08] hover:border-white/15 transition-all cursor-pointer group"
                          >
                            <div className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-mono font-bold text-white/60 shrink-0">
                              {idx + 1}
                            </div>
                            <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden border border-white/10 shrink-0">
                              {item.mod?.iconUrl ? (
                                <img src={item.mod.iconUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Puzzle className="w-4 h-4 opacity-40" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-xs truncate text-white group-hover:text-primary transition-colors">
                                {item.mod?.title}
                              </p>
                              <p className="font-caption text-[9px] mt-0.5 text-white/40">
                                {item.count || item.downloads || 0} {rankingTab === "community" ? (metric === "shares" ? "shares" : "guardados") : "dls"}
                              </p>
                            </div>
                            <span
                              className={`text-[8px] font-black px-1.5 py-0.5 rounded-md border shrink-0 ${
                                isCf
                                  ? "bg-orange-500/15 text-orange-300 border-orange-500/25"
                                  : "bg-emerald-500/15 text-emerald-300 border-emerald-500/20"
                              }`}
                            >
                              {isCf ? "CF" : "MR"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {!hasRankingRows(displayRankings) && !isCommunityLoading && (
                <div className="col-span-full py-12 text-center text-white/40 space-y-2">
                  <Trophy className="w-10 h-10 mx-auto text-white/15 mb-2" />
                  <p className="font-bold text-sm text-white/60">
                    {rankingTab === "community"
                      ? "Sin actividad comunitaria en este período"
                      : "No hay suficientes descargas para armar un top todavía"}
                  </p>
                  <p className="text-xs text-white/35">
                    {rankingTab === "community"
                      ? "Probá cambiando el filtro de período o métrica."
                      : "Los mods que descargues aparecerán acá."}
                  </p>
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
