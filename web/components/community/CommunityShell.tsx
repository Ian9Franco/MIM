"use client";

import React from "react";
import { motion } from "framer-motion";
import { Radio, Share2, Trophy, Users } from "lucide-react";

export type CommunitySection = "compartidos" | "rankings" | "miembros";

const SECTIONS = [
  { id: "compartidos" as const, label: "Compartidos", icon: Share2 },
  { id: "rankings" as const, label: "Rankings", icon: Trophy },
  { id: "miembros" as const, label: "Miembros", icon: Users },
];

interface CommunityHeaderProps {
  active: CommunitySection;
  onChange: (section: CommunitySection) => void;
}

/** Compact masthead and shared animated selector for the three community views. */
export function CommunityHeader({ active, onChange }: CommunityHeaderProps) {
  return (
    <div className="mb-4 shrink-0">
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-surface/75 px-4 py-3 shadow-[0_12px_34px_rgba(0,0,0,0.18)]">
        <div
          className="absolute inset-y-0 left-0 w-1"
          style={{ background: "var(--color-primary)", boxShadow: "0 0 18px var(--color-primary)" }}
        />
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[9px] font-mono font-bold uppercase text-white/40">Comunidad MIM</p>
            <h2 className="mt-1 text-sm font-black text-white">Descubrí lo que mueve al hub.</h2>
            <p className="mt-0.5 truncate text-[10px] text-white/40">Proyectos, votos y perfiles públicos.</p>
          </div>
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04]">
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

      <div className="relative mt-3 grid grid-cols-3 rounded-xl border border-white/[0.07] bg-black/20 p-1 shadow-inner">
        {SECTIONS.map(({ id, label, icon: Icon }) => {
          const selected = active === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={`relative z-10 flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 text-[9px] font-black uppercase transition-colors ${selected ? "text-white" : "text-white/38 hover:text-white/70"}`}
            >
              {selected && (
                <motion.span
                  layoutId="community-active-section"
                  className="absolute inset-0 -z-10 rounded-lg border border-white/[0.09] bg-white/[0.08] shadow-[0_6px_18px_rgba(0,0,0,0.2)]"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <Icon className="h-3.5 w-3.5 shrink-0" style={selected ? { color: "var(--color-primary)" } : undefined} />
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

