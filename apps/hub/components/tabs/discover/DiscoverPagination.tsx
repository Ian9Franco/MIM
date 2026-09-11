"use client";

import React from "react";
import { DISCOVER_PAGE_SIZE } from "./discoverConstants";

interface DiscoverPaginationProps {
  position: "top" | "bottom";
  discoverPage: number;
  discoverTotal: number;
  discoverLoading: boolean;
  runDiscoverSearch: (page: number) => void;
}

export function DiscoverPagination({
  position,
  discoverPage,
  discoverTotal,
  discoverLoading,
  runDiscoverSearch,
}: DiscoverPaginationProps) {
  if (discoverTotal <= 0) return null;

  const totalDiscoverPages = Math.max(1, Math.ceil(discoverTotal / DISCOVER_PAGE_SIZE));

  return (
    <div
      className={`flex items-center justify-between px-1 shrink-0 ${
        position === "top"
          ? "border-b border-white/[0.06] pb-3 mb-3"
          : "border-t border-white/[0.06] pt-4 mt-2 mb-6"
      }`}
    >
      <button
        type="button"
        onClick={() => {
          if (discoverPage > 1) {
            runDiscoverSearch(discoverPage - 1);
          }
        }}
        disabled={discoverPage <= 1 || discoverLoading}
        className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/[0.08] text-xs font-semibold text-white/80 disabled:opacity-30 disabled:pointer-events-none active:scale-95 transition-all flex items-center gap-1"
      >
        &larr; Anterior
      </button>

      <div className="flex flex-col items-center">
        <span className="text-[11px] font-bold text-white/90">
          Página {discoverPage} de {totalDiscoverPages}
        </span>
        <span className="text-[9px] text-white/40 font-semibold font-mono mt-0.5">
          {discoverTotal} resultados
        </span>
      </div>

      <button
        type="button"
        onClick={() => {
          if (discoverPage < totalDiscoverPages) {
            runDiscoverSearch(discoverPage + 1);
          }
        }}
        disabled={discoverPage >= totalDiscoverPages || discoverLoading}
        className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/[0.08] text-xs font-semibold text-white/80 disabled:opacity-30 disabled:pointer-events-none active:scale-95 transition-all flex items-center gap-1"
      >
        Siguiente &rarr;
      </button>
    </div>
  );
}
