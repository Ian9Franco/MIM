"use client";

import React from "react";
import { BookOpen } from "lucide-react";
import { useGuidesEnabled } from "@/hooks/useGuidesEnabled";

interface GuidesToggleProps {
  compact?: boolean;
  className?: string;
}

export function GuidesToggle({ compact = false, className = "" }: GuidesToggleProps) {
  const { enabled, toggle } = useGuidesEnabled();

  return (
    <button
      type="button"
      id="onboarding-guides-toggle"
      onClick={toggle}
      className={`font-label text-[9px] px-2.5 py-1 rounded-lg border flex items-center gap-2 transition-all ${className} ${
        enabled
          ? "text-primary bg-primary/10 border-primary/30 shadow-[0_0_10px_rgba(187,150,228,0.15)]"
          : "text-muted bg-white/5 border-white/10 hover:text-foreground hover:border-white/20"
      }`}
      title={enabled ? "Guías interactivas activadas — clic para desactivar" : "Activar guías interactivas (tutoriales por sección)"}
      aria-pressed={enabled}
      aria-label={enabled ? "Desactivar guías interactivas" : "Activar guías interactivas"}
    >
      <BookOpen className={`w-3 h-3 shrink-0 ${enabled ? "text-primary" : ""}`} />
      {!compact && <span>{enabled ? "Guías ON" : "Guías"}</span>}
    </button>
  );
}
