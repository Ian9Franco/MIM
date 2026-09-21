"use client";

import React from "react";
import { ChevronLeft, Download, X } from "lucide-react";

interface FomoOverlayTopBarProps {
  onClose: () => void;
  onBack?: () => void;
  backLabel?: string | null;
  pendingCount: number;
  onOpenDownloads?: () => void;
}

export function FomoOverlayTopBar({
  onClose,
  onBack,
  backLabel,
  pendingCount,
  onOpenDownloads,
}: FomoOverlayTopBarProps) {
  const showBack = Boolean(onBack && backLabel);

  return (
    <div
      className="flex items-center justify-between px-5 py-4 border-b shrink-0"
      style={{ borderColor: "var(--fomo-border)" }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={showBack ? onBack : onClose}
          className="p-2 -ml-2 rounded-xl hover:bg-white/10 text-foreground transition-colors shrink-0"
          aria-label={showBack ? `Volver a ${backLabel}` : "Cerrar detalles"}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h3 className="font-headline text-lg truncate">Detalles</h3>
          {showBack && (
            <p className="text-[10px] text-foreground/50 truncate">
              Volver a <span className="text-primary/90 font-semibold">{backLabel}</span>
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {pendingCount > 0 && onOpenDownloads && (
          <button
            type="button"
            onClick={onOpenDownloads}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-all group"
          >
            <div className="relative">
              <Download className="w-4 h-4 group-hover:animate-bounce" />
              <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-rose-500 text-white text-[7px] font-bold flex items-center justify-center shadow-sm">
                {pendingCount}
              </span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-tight">Descargas</span>
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-xl hover:bg-white/10 text-foreground/50 hover:text-foreground transition-colors"
          aria-label="Cerrar detalles"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
