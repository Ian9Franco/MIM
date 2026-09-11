"use client";

import React from "react";
import { Bookmark, Heart, Share2, UserCheck } from "lucide-react";

interface ProfileOverviewProps {
  drafts: number;
  favorites: number;
  shares: number;
  creators: number;
  onJump: (section: "drafts" | "favorites" | "shares" | "creators") => void;
}

const items = [
  { id: "drafts" as const, label: "Drafts", icon: Bookmark, tone: "text-orange-400 bg-orange-500/10" },
  { id: "favorites" as const, label: "Favoritos", icon: Heart, tone: "text-rose-400 bg-rose-500/10" },
  { id: "shares" as const, label: "Compartidos", icon: Share2, tone: "text-amber-400 bg-amber-500/10" },
  { id: "creators" as const, label: "Creadores", icon: UserCheck, tone: "text-blue-400 bg-blue-500/10" },
];

export function ProfileOverview({ drafts, favorites, shares, creators, onJump }: ProfileOverviewProps) {
  const counts = { drafts, favorites, shares, creators };
  return (
    <nav aria-label="Resumen del perfil" className="grid grid-cols-4 gap-1.5">
      {items.map(({ id, label, icon: Icon, tone }) => (
        <button
          key={id}
          type="button"
          onClick={() => onJump(id)}
          className="mim-profile-stat min-w-0 rounded-2xl border border-border bg-surface/85 px-1 py-2.5 text-center transition-transform active:translate-y-px"
          aria-label={`${counts[id]} ${label}`}
        >
          <span className={`mx-auto mb-1 flex h-6 w-6 items-center justify-center rounded-lg ${tone}`}>
            <Icon className="h-3.5 w-3.5" />
          </span>
          <strong className="block text-sm leading-none text-white">{counts[id]}</strong>
          <span className="mt-1 block truncate text-[8px] font-semibold text-white/45">{label}</span>
        </button>
      ))}
    </nav>
  );
}
