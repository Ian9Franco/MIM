"use client";
import { sanitizeHtml } from "../../lib/markdown";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Languages, ExternalLink } from "lucide-react";
import {
  type VersionRow,
  normalizeLoaderLabel,
  normalizeChannelLabel,
  channelPillClass,
  compactNumber,
  formatPublishedDate,
  renderBodyText,
} from "./utils";

interface ModDetailsVersionsTabProps {
  loadingDetails: boolean;
  versionRows: VersionRow[];
  filteredVersionRows: VersionRow[];
  availableGameVersionFilters: string[];
  selectedGameVersionFilters: string[];
  handleToggleGameVersionFilter: (gameVersion: string) => void;
  availableVersionLoaderFilters: string[];
  selectedLoaderFilters: string[];
  handleToggleLoaderFilter: (loader: string) => void;
  expandedVersionId: string | null;
  handleToggleVersion: (version: VersionRow) => void;
  versionChangelogs: Record<string, string>;
  loadingVersionChangelog: string | null;
  translatedVersionChangelogs: Record<string, string>;
  translatingVersionChangelog: string | null;
  handleTranslateVersionChangelog: (version: VersionRow, changelog: string) => void;
  modSource?: string;
}

export function ModDetailsVersionsTab({
  loadingDetails,
  versionRows,
  filteredVersionRows,
  availableGameVersionFilters,
  selectedGameVersionFilters,
  handleToggleGameVersionFilter,
  availableVersionLoaderFilters,
  selectedLoaderFilters,
  handleToggleLoaderFilter,
  expandedVersionId,
  handleToggleVersion,
  versionChangelogs,
  loadingVersionChangelog,
  translatedVersionChangelogs,
  translatingVersionChangelog,
  handleTranslateVersionChangelog,
  modSource,
}: ModDetailsVersionsTabProps) {
  return (
    <motion.div
      key="versions"
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.2 }}
      className="flex h-full min-h-0 flex-col gap-2 w-full"
    >
      {loadingDetails ? (
        <div className="flex flex-col items-center justify-center py-6">
          <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {versionRows.length > 0 ? (
            <div className="flex min-h-0 flex-1 flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-white/30 uppercase font-mono tracking-wider block font-semibold">
                  Versiones del mod
                </span>
                <span className="text-[9px] text-white/30 font-mono">
                  {filteredVersionRows.length}/{versionRows.length}
                </span>
              </div>

              {/* Game Version Filter Chips */}
              {availableGameVersionFilters.length > 0 && (
                <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] px-2 py-1.5">
                  <span className="text-[7.5px] text-white/28 uppercase font-mono tracking-wider block font-semibold mb-1">
                    Filtrar por versión de juego
                  </span>
                  <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
                    {availableGameVersionFilters.map((gameVersion) => {
                      const isSelected = selectedGameVersionFilters.includes(gameVersion);

                      return (
                        <button
                          key={gameVersion}
                          type="button"
                          onClick={() => handleToggleGameVersionFilter(gameVersion)}
                          className={`shrink-0 px-2 py-0.5 rounded-md border text-[8.5px] font-black font-mono transition-all active:scale-95 ${
                            isSelected
                              ? "bg-orange-500/15 border-orange-500/35 text-orange-200 shadow-[0_0_14px_rgba(249,115,22,0.16)]"
                              : "bg-white/[0.035] border-white/[0.06] text-white/45 hover:text-white/75 hover:bg-white/[0.06]"
                          }`}
                        >
                          {gameVersion}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Loader Filter Chips */}
              {availableVersionLoaderFilters.length > 0 && (
                <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] px-2 py-1.5">
                  <span className="text-[7.5px] text-white/28 uppercase font-mono tracking-wider block font-semibold mb-1">
                    Filtrar por modloader
                  </span>
                  <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
                    {availableVersionLoaderFilters.map((loader) => {
                      const isSelected = selectedLoaderFilters.includes(loader);

                      return (
                        <button
                          key={loader}
                          type="button"
                          onClick={() => handleToggleLoaderFilter(loader)}
                          className={`shrink-0 px-2 py-0.5 rounded-md border text-[8.5px] font-black transition-all active:scale-95 ${
                            isSelected
                              ? "bg-orange-500/15 border-orange-500/35 text-orange-200 shadow-[0_0_14px_rgba(249,115,22,0.16)]"
                              : "bg-white/[0.035] border-white/[0.06] text-white/45 hover:text-white/75 hover:bg-white/[0.06]"
                          }`}
                        >
                          {normalizeLoaderLabel(loader)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Version Rows */}
              <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-white/[0.06] scrollbar-none">
                {filteredVersionRows.length > 0 ? (
                  filteredVersionRows.map((version) => {
                    const isExpanded = expandedVersionId === version.id;
                    const loadedChangelog = version.changelog || versionChangelogs[version.id] || "";
                    const isLoadingChangelog = loadingVersionChangelog === version.id;

                    return (
                      <div
                        key={version.id}
                        className="border-b border-white/[0.04] bg-white/[0.015] last:border-b-0"
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleVersion(version)}
                          className="grid w-full grid-cols-[1fr_auto] gap-2 p-2.5 text-left transition-colors hover:bg-white/[0.025] active:bg-white/[0.04]"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`px-2 py-1 rounded-full border text-[8px] font-black uppercase shrink-0 ${channelPillClass(
                                  version.versionType
                                )}`}
                              >
                                {normalizeChannelLabel(version.versionType)}
                              </span>
                              <span className="text-[11px] font-bold text-white truncate">
                                {version.name}
                              </span>
                            </div>
                            <div className="mt-1.5 flex flex-wrap gap-1.5 pl-7">
                              {version.gameVersions.slice(0, 3).map((ver: string) => (
                                <span
                                  key={ver}
                                  className="px-1.5 py-0.5 rounded-md bg-white/[0.07] border border-white/[0.06] text-[8px] font-mono text-white/55"
                                >
                                  {ver}
                                </span>
                              ))}
                              {version.gameVersions.length > 3 && (
                                <span className="px-1.5 py-0.5 rounded-md bg-white/5 text-[8px] font-mono text-white/35">
                                  +{version.gameVersions.length - 3}
                                </span>
                              )}
                              {version.loaders.map((loader: string) => (
                                <span
                                  key={loader}
                                  className="px-1.5 py-0.5 rounded-md bg-orange-500/10 border border-orange-500/15 text-[8px] font-bold text-orange-300"
                                >
                                  {normalizeLoaderLabel(loader)}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="block text-[9px] font-mono text-white/40">
                              {formatPublishedDate(version.datePublished)}
                            </span>
                            <span className="block text-[9px] font-bold text-white/55 mt-1">
                              {compactNumber(version.downloads)} desc.
                            </span>
                            <span className="mt-1 block text-[8px] font-bold uppercase tracking-wide text-orange-300/70">
                              {isExpanded ? "Ocultar" : "Changelog"}
                            </span>
                          </div>
                        </button>

                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                              className="overflow-hidden"
                            >
                              <div className="mx-3 mb-3 rounded-xl border border-white/[0.06] bg-black/20 p-3">
                                {isLoadingChangelog ? (
                                  <div className="flex items-center gap-2 text-[10px] font-bold text-white/45">
                                    <Loader2 className="w-3 h-3 animate-spin text-orange-400" />
                                    Cargando changelog...
                                  </div>
                                ) : loadedChangelog ? (
                                  <div className="flex flex-col gap-2.5">
                                    <div className="flex items-center justify-between gap-2 border-b border-white/[0.04] pb-2">
                                      <span className="text-[9px] font-mono uppercase tracking-wider text-white/35 font-bold">
                                        Changelog
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleTranslateVersionChangelog(version, loadedChangelog)
                                        }
                                        disabled={translatingVersionChangelog === version.id}
                                        className="px-2 py-1 rounded-md border text-[9px] font-bold flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                                        style={{
                                          color: "var(--color-primary)",
                                          background: "color-mix(in srgb, var(--color-primary) 10%, transparent)",
                                          borderColor: "color-mix(in srgb, var(--color-primary) 24%, transparent)",
                                        }}
                                      >
                                        {translatingVersionChangelog === version.id ? (
                                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                        ) : (
                                          <Languages className="w-2.5 h-2.5" />
                                        )}
                                        {translatingVersionChangelog === version.id
                                          ? "Traduciendo"
                                          : translatedVersionChangelogs[version.id]
                                          ? "Original"
                                          : "Traducir"}
                                      </button>
                                    </div>
                                    {translatedVersionChangelogs[version.id] ? (
                                      <div
                                        className="mim-rich-description"
                                        dangerouslySetInnerHTML={{
                                          __html: sanitizeHtml(translatedVersionChangelogs[version.id]),
                                        }}
                                      />
                                    ) : (
                                      renderBodyText(loadedChangelog, modSource)
                                    )}
                                  </div>
                                ) : version.changelogUrl ? (
                                  <a
                                    href={version.changelogUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[10px] font-bold text-orange-300 hover:underline inline-flex items-center gap-1"
                                  >
                                    Ver changelog externo <ExternalLink className="w-3 h-3" />
                                  </a>
                                ) : (
                                  <p className="text-[10px] text-white/35 italic">
                                    Esta versión no tiene changelog publicado.
                                  </p>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4 text-center text-[10px] text-white/35">
                    No hay versiones para esa combinación de filtros.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-white/40 italic">No se listaron versiones del mod.</p>
          )}
        </div>
      )}
    </motion.div>
  );
}
