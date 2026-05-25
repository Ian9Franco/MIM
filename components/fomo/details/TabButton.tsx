import React from "react";
import { COLORS } from "@/theme/tokens";

export function TabButton({ active, onClick, icon, label, count }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, count?: number }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-2 text-xs font-bold rounded-t-lg transition-all flex items-center gap-2 shrink-0 ${active ? "border-b-2" : "opacity-40 hover:opacity-100"}`}
      style={{ 
        background: active ? "var(--fomo-card-bg, var(--color-secondary-bg))" : "transparent",
        borderColor: COLORS.primary,
        color: active ? COLORS.primary : "var(--fomo-text-subtle, var(--color-muted))"
      }}
    >
      {icon}
      <span>{label}</span>
      {count !== undefined && (
        <span className={`px-1.5 py-0.5 rounded-full text-[9px] min-w-[18px] text-center ${active ? "bg-primary text-white" : "bg-white/10 text-white/50"}`}>
          {count}
        </span>
      )}
    </button>
  );
}
