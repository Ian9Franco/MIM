"use client";

import React from "react";
import { motion } from "framer-motion";
import { Blocks, Layers, Radio, Trophy, TvMinimalPlay, UserRound, Users } from "lucide-react";

export type CommunityTab = "modpacks" | "drafts" | "videos" | "rankings" | "members";

const TABS: { id: CommunityTab; label: string; icon: typeof Blocks }[] = [
  { id: "modpacks", label: "Pool", icon: Blocks },
  { id: "drafts", label: "Drafts", icon: Layers },
  { id: "videos", label: "Showcases", icon: TvMinimalPlay },
  { id: "rankings", label: "Rankings", icon: Trophy },
  { id: "members", label: "Miembros", icon: Users },
];

interface CommunityHeaderProps {
  active: CommunityTab;
  onChange: (tab: CommunityTab) => void;
  onOpenMineProfile?: () => void;
  metrics?: { members: number; recommendations: number; featured: number };
  isModern?: boolean;
}

export function CommunityHeader({
  active,
  onChange,
  onOpenMineProfile,
  metrics,
  isModern = false,
}: CommunityHeaderProps) {
  const borderCls = isModern ? "border-border" : "border-(--fomo-border)";
  const textMuted = isModern ? "text-muted-foreground" : "text-[var(--fomo-text-secondary)]";
  const textMain = isModern ? "text-foreground" : "text-[var(--fomo-text-primary)]";

  return (
    <div className="mb-3 shrink-0 px-4 pt-2">
      <div className={`relative overflow-hidden rounded-2xl border ${borderCls} bg-(--fomo-secondary-bg) px-4 py-3 shadow-[0_12px_34px_rgba(0,0,0,0.12)]`}>
        <div
          className="absolute inset-y-0 left-0 w-1"
          style={{ background: "var(--color-primary)", boxShadow: "0 0 18px var(--color-primary)" }}
        />
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className={`text-[9px] font-mono font-bold uppercase ${textMuted}`}>Comunidad MIM</p>
            <h2 className={`mt-1 text-sm font-black ${textMain}`}>Descubrí lo que mueve al hub.</h2>
            <div className={`mt-1.5 flex items-center gap-2 text-[8px] font-semibold ${textMuted}`}>
              <span><b className={textMain}>{metrics?.members ?? 0}</b> miembros</span>
              <span aria-hidden="true">·</span>
              <span><b className={textMain}>{metrics?.recommendations ?? 0}</b> recomendaciones</span>
              <span aria-hidden="true">·</span>
              <span><b className={textMain}>{metrics?.featured ?? 0}</b> destacadas</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onOpenMineProfile && (
              <button
                type="button"
                onClick={onOpenMineProfile}
                className={`flex h-10 items-center gap-1.5 rounded-xl border px-3 text-[10px] font-black uppercase tracking-wider ${borderCls} hover:border-primary/40`}
                style={{ color: "var(--color-primary)" }}
              >
                <UserRound className="h-3.5 w-3.5" />
                Mi perfil
              </button>
            )}
            <div className={`relative flex h-10 w-10 items-center justify-center rounded-xl border ${borderCls} bg-white/4`}>
              <Radio className="h-4 w-4" style={{ color: "var(--color-primary)" }} />
              <motion.span
                className="absolute inset-1 rounded-lg border"
                style={{ borderColor: "color-mix(in srgb, var(--color-primary) 35%, transparent)" }}
                animate={{ opacity: [0.2, 0.65, 0.2], scale: [0.82, 1, 0.82] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className={`relative mt-3 grid grid-cols-5 rounded-xl border ${borderCls} bg-(--fomo-secondary-bg) p-1 shadow-inner`}>
        {TABS.map(({ id, label, icon: Icon }) => {
          const selected = active === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={`relative z-10 flex h-9 min-w-0 items-center justify-center gap-1 rounded-lg px-1 text-[8px] font-black uppercase transition-colors ${
                selected ? textMain : `${textMuted} hover:opacity-80`
              }`}
            >
              {selected && (
                <motion.span
                  layoutId="community-active-section-desktop"
                  className={`absolute inset-0 -z-10 rounded-lg border shadow-[0_6px_18px_rgba(0,0,0,0.12)] ${
                    isModern ? "border-primary/20 bg-primary/10" : "border-(--fomo-border) bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)]"
                  }`}
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <Icon className="h-3.5 w-3.5 shrink-0" style={selected ? { color: isModern ? "var(--color-primary)" : "var(--color-accent)" } : undefined} />
              <span className="truncate hidden md:inline">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export type CommunitySection = CommunityTab;
