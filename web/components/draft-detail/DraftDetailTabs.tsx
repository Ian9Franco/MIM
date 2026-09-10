"use client";

import React from "react";
import { motion } from "framer-motion";
import { LayoutGrid, Layers, Users, Activity } from "lucide-react";
import type { DraftTab } from "./draftDetailConstants";

interface DraftDetailTabsProps {
  tab: DraftTab;
  setTab: (tab: DraftTab) => void;
}

const TABS: { id: DraftTab; label: string; icon: React.ReactNode }[] = [
  { id: "summary",  label: "Resumen",   icon: <LayoutGrid className="w-3 h-3" /> },
  { id: "items",    label: "Ítems",     icon: <Layers className="w-3 h-3" /> },
  { id: "members",  label: "Miembros",  icon: <Users className="w-3 h-3" /> },
  { id: "activity", label: "Actividad", icon: <Activity className="w-3 h-3" /> },
];

export function DraftDetailTabs({ tab, setTab }: DraftDetailTabsProps) {
  return (
    <div className="flex gap-1 mb-4 rounded-xl border border-white/[0.07] bg-black/15 p-1 shrink-0 overflow-x-auto scrollbar-none shadow-inner">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => setTab(t.id)}
          className={`relative overflow-hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors whitespace-nowrap uppercase tracking-wider ${
            tab === t.id
              ? "text-orange-400"
              : "text-white/40 hover:text-white/70"
          }`}
        >
          {tab === t.id && (
            <motion.span
              layoutId="draft-tab-selection"
              className="absolute inset-0 rounded-lg border border-orange-500/25 bg-orange-500/15 shadow-[0_6px_16px_rgba(0,0,0,0.18)]"
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
            />
          )}
          <span className="relative z-10">{t.icon}</span>
          <span className="relative z-10">{t.label}</span>
        </button>
      ))}
    </div>
  );
}
