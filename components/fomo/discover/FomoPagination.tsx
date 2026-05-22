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

function getPageWindow(page: number, totalPages: number, windowSize = 5): number[] {
  // Paginación por bloques: mantiene la ventana estática para que la animación fluya
  const currentBlock = Math.floor((Math.max(1, page) - 1) / windowSize);
  const start = currentBlock * windowSize + 1;
  const count = Math.min(windowSize, totalPages - start + 1);
  return Array.from({ length: Math.max(0, count) }, (_, i) => start + i);
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
      className="flex items-center justify-between px-4 py-3.5 border-t shrink-0 gap-2 fomo-pagination-bar rounded-bl-4xl rounded-br-[2.5rem]"
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

      <div className="relative flex items-center gap-1.5 p-1 bg-foreground/5 rounded-2xl" role="list" aria-label="Páginas">
        {/* Liquid Sliding Background */}
        {pages.indexOf(page) !== -1 && (
          <div 
            className="absolute transition-all duration-500 ease-[cubic-bezier(0.6,0.01,-0.05,0.95)] rounded-xl pointer-events-none"
            style={{
              width: "2.25rem",
              height: "2.25rem",
              top: "0.25rem",
              left: `calc(${pages.indexOf(page)} * 2.625rem + 0.25rem)`, // 2.25rem (w-9) + 0.375rem (gap-1.5) = 2.625rem. + 0.25rem (p-1)
              background: "var(--color-primary)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15), 0 0 12px color-mix(in srgb, var(--color-primary) 30%, transparent)",
            }}
          />
        )}

        {pages.map((p) => {
          const isActive = p === page;
          return (
            <button
              key={p}
              role="listitem"
              onClick={() => onPage(p)}
              aria-label={`Página ${p}`}
              aria-current={isActive ? "page" : undefined}
              className={`relative z-10 w-9 h-9 rounded-xl text-sm font-subhead transition-all flex items-center justify-center border ${
                isActive 
                  ? "text-white border-transparent" 
                  : "text-foreground/70 border-white/5 hover:text-foreground hover:bg-white/5"
              }`}
            >
              {p}
            </button>
          );
        })}
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