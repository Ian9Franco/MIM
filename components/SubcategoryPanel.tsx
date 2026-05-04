"use client";

import { SUBCATEGORIES } from "@/lib/constants";
import { ArrowLeft } from "lucide-react";

interface SubcategoryPanelProps {
  activeCategory: string;
  fileName: string;
  onSelect: (category: string, sub: string) => void;
  onBack: () => void;
}

const CATEGORY_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  ".essential": { label: "Essential · Core",    color: "#BB96E4", bg: "rgba(187,150,228,0.07)", border: "rgba(187,150,228,0.2)"  },
  ".local":     { label: "Local · Client-side", color: "#FFD066", bg: "rgba(255,208,102,0.07)", border: "rgba(255,208,102,0.18)" },
  ".server":    { label: "Server-side",          color: "#66C8A0", bg: "rgba(102,200,160,0.07)", border: "rgba(102,200,160,0.18)" },
};

export function SubcategoryPanel({ activeCategory, fileName, onSelect, onBack }: SubcategoryPanelProps) {
  const subs = SUBCATEGORIES[activeCategory] ?? [];
  const meta = CATEGORY_META[activeCategory] ?? CATEGORY_META[".essential"];

  return (
    <div
      className="rounded-2xl overflow-hidden animate-scale-in"
      style={{
        background: "color-mix(in srgb, var(--color-card) 85%, transparent)",
        border: `1px solid ${meta.border}`,
        backdropFilter: "blur(18px)",
      }}
    >
      {/* Header */}
      <div
        className="px-5 py-3.5 flex items-center justify-between"
        style={{ background: meta.bg, borderBottom: `1px solid ${meta.border}` }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200"
            style={{
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.04)",
              color: "var(--color-foreground)",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>

          <div>
            <p className="font-label" style={{ color: meta.color, fontSize: "0.62rem" }}>{meta.label}</p>
            <p className="font-caption truncate max-w-[260px]" style={{ color: "var(--color-muted)" }}>
              {fileName}
            </p>
          </div>
        </div>

        <span className="font-label" style={{ color: "var(--color-muted)", fontSize: "0.6rem" }}>
          {subs.length} categorías
        </span>
      </div>

      {/* Grid */}
      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {subs.map((sub, i) => (
          <button
            key={sub}
            onClick={() => onSelect(activeCategory, sub)}
            className="animate-fade-up group relative text-left px-3.5 py-2.5 rounded-xl overflow-hidden capitalize transition-all duration-200 active:scale-[0.97]"
            style={{
              animationDelay: `${i * 0.025}s`,
              opacity: 0,
              border: "1px solid rgba(255,255,255,0.07)",
              background: "rgba(255,255,255,0.02)",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = meta.bg;
              el.style.borderColor = meta.border;
              el.style.transform = "scale(1.02)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = "rgba(255,255,255,0.02)";
              el.style.borderColor = "rgba(255,255,255,0.07)";
              el.style.transform = "scale(1)";
            }}
          >
            <span
              className="relative font-body-med text-sm capitalize transition-colors duration-200"
              style={{ color: "var(--color-muted)" }}
            >
              {sub}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}