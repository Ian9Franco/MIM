/**
 * @fileoverview FomoDiscoverFilters – search input + filter selects + sort
 * toggle for the FOMO discover view. Extracted from FomoSidebar to keep
 * each component under 150 lines.
 */

"use client";

import React, { memo } from "react";
import { Search, Filter, RefreshCw, X } from "lucide-react";
import { LOADERS, GAME_VERSIONS, PROJECT_TYPES, SORT_OPTIONS } from "../../constants/app";
import { COLORS } from "@/theme/tokens";
import { getProjectTypeLabel } from "@/utils/format";
import type { SortOrder } from "../../constants/app";

interface FomoDiscoverFiltersProps {
  loader:      string;
  gameVersion: string;
  projectType: string;
  sortOrder:   SortOrder;
  query:       string;
  loading:     boolean;
  onLoader:      (v: string) => void;
  onVersion:     (v: string) => void;
  onProjectType: (v: string) => void;
  onSort:        (v: SortOrder) => void;
  onQuery:       (v: string) => void;
  onRefresh:     () => void;
}

const SELECT_STYLE: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border:     `1px solid ${COLORS.borderStrong}`,
  color:       COLORS.foreground,
};

const CARD_BG: React.CSSProperties = { background: COLORS.card };

export const FomoDiscoverFilters = memo(function FomoDiscoverFilters({
  loader, gameVersion, projectType, sortOrder, query, loading,
  onLoader, onVersion, onProjectType, onSort, onQuery, onRefresh,
}: FomoDiscoverFiltersProps) {
  return (
    <div
      className="px-4 pb-3 flex flex-col gap-2.5 shrink-0 border-b"
      style={{ borderColor: COLORS.border }}
    >
      {/* Search input */}
      <div
        className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 mt-3"
        style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${COLORS.borderStrong}` }}
      >
        <Search className="w-4 h-4 shrink-0" style={{ color: COLORS.muted }} aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder={`Buscar ${getProjectTypeLabel(projectType)}...`}
          aria-label="Buscar mods"
          className="flex-1 bg-transparent outline-none text-sm font-body-med"
          style={{ color: COLORS.foreground }}
        />
        {query && (
          <button onClick={() => onQuery("")} aria-label="Limpiar búsqueda">
            <X className="w-3.5 h-3.5" style={{ color: COLORS.muted }} />
          </button>
        )}
      </div>

      {/* Row 1: Type + Loader + Version + Refresh */}
      <div className="flex gap-2 items-center">
        <Filter className="w-4 h-4 shrink-0" style={{ color: COLORS.muted }} aria-hidden="true" />

        <select
          value={projectType}
          onChange={(e) => onProjectType(e.target.value)}
          aria-label="Tipo de proyecto"
          className="flex-1 text-sm font-subhead rounded-lg px-2 py-2 outline-none"
          style={SELECT_STYLE}
        >
          {PROJECT_TYPES.map((pt) => (
            <option key={pt.value} value={pt.value} style={CARD_BG}>{pt.label}</option>
          ))}
        </select>

        {projectType === "mod" && (
          <select
            value={loader}
            onChange={(e) => onLoader(e.target.value)}
            aria-label="Mod loader"
            className="flex-1 text-sm font-subhead rounded-lg px-2 py-2 outline-none"
            style={SELECT_STYLE}
          >
            {LOADERS.map((l) => (
              <option key={l} value={l} style={CARD_BG}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
            ))}
          </select>
        )}

        {projectType !== "datapack" && (
          <select
            value={gameVersion}
            onChange={(e) => onVersion(e.target.value)}
            aria-label="Versión del juego"
            className="flex-1 text-sm font-subhead rounded-lg px-2 py-2 outline-none"
            style={SELECT_STYLE}
          >
            {GAME_VERSIONS.map((v) => (
              <option key={v} value={v} style={CARD_BG}>{v}</option>
            ))}
          </select>
        )}

        <button
          onClick={onRefresh}
          disabled={loading}
          aria-label="Actualizar resultados"
          className="p-2 rounded-lg transition-colors hover:bg-white/10 disabled:opacity-50 shrink-0"
          style={{ color: COLORS.primary }}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Row 2: Sort toggle */}
      <div
        role="group"
        aria-label="Ordenar por"
        className="flex rounded-xl overflow-hidden"
        style={{ border: `1px solid ${COLORS.borderStrong}` }}
      >
        {SORT_OPTIONS.map((opt, i) => (
          <button
            key={opt.value}
            onClick={() => onSort(opt.value as SortOrder)}
            aria-pressed={sortOrder === opt.value}
            className="flex-1 py-2 text-xs font-subhead transition-all truncate px-1"
            style={{
              background: sortOrder === opt.value ? "rgba(255,108,62,0.2)" : "rgba(255,255,255,0.03)",
              color:      sortOrder === opt.value ? COLORS.fomoFlame         : COLORS.muted,
              borderRight: i < SORT_OPTIONS.length - 1 ? `1px solid ${COLORS.borderStrong}` : "none",
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
});