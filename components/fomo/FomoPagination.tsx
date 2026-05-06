/**
 * @fileoverview FomoPagination – previous/next buttons plus smart page pills
 * for the FOMO discover mod list.
 */

"use client";

import React, { memo, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { COLORS } from "@/theme/tokens";

interface FomoPaginationProps {
  page:       number;
  totalPages: number;
  loading:    boolean;
  onPage:     (p: number) => void;
}

/** Calculates the window of page numbers to display around the current page */
function getPageWindow(page: number, totalPages: number, windowSize = 5): number[] {
  const count = Math.min(windowSize, totalPages);
  let start: number;
  if (totalPages <= windowSize) start = 1;
  else if (page <= 3)           start = 1;
  else if (page >= totalPages - 2) start = totalPages - windowSize + 1;
  else                          start = page - 2;
  return Array.from({ length: count }, (_, i) => start + i);
}

export const FomoPagination = memo(function FomoPagination({
  page, totalPages, loading, onPage,
}: FomoPaginationProps) {
  const prevPage = useCallback(() => onPage(Math.max(1, page - 1)),               [onPage, page]);
  const nextPage = useCallback(() => onPage(Math.min(totalPages, page + 1)),       [onPage, page, totalPages]);
  const pages    = getPageWindow(page, totalPages);

  return (
    <nav
      aria-label="Paginación de mods"
      className="flex items-center justify-between px-4 py-3.5 border-t shrink-0 gap-2 fomo-pagination-bar rounded-bl-[2rem] rounded-br-[2.5rem]"
      style={{ borderColor: "var(--color-border)" }}
    >
      <button
        onClick={prevPage}
        disabled={page <= 1 || loading}
        aria-label="Página anterior"
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-subhead transition-all disabled:opacity-30 fomo-pagination-btn"
      >
        <ChevronLeft className="w-4 h-4" aria-hidden="true" />
        Anterior
      </button>

      <div className="flex items-center gap-1.5" role="list" aria-label="Páginas">
        {pages.map((p) => (
          <button
            key={p}
            role="listitem"
            onClick={() => onPage(p)}
            aria-label={`Página ${p}`}
            aria-current={p === page ? "page" : undefined}
            className={`w-9 h-9 rounded-xl text-sm font-subhead transition-all border ${
              p === page ? "fomo-pagination-page-active" : "fomo-pagination-page-inactive"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      <button
        onClick={nextPage}
        disabled={page >= totalPages || loading}
        aria-label="Página siguiente"
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-subhead transition-all disabled:opacity-30 fomo-pagination-btn"
      >
        Siguiente
        <ChevronRight className="w-4 h-4" aria-hidden="true" />
      </button>
    </nav>
  );
});