"use client";

import React from "react";
import { motion } from "framer-motion";

export type ModDetailsTabId = "summary" | "gallery" | "desc" | "versions" | "deps";

interface ModDetailsTabsProps {
  modalTab: ModDetailsTabId;
  setModalTab: (t: ModDetailsTabId) => void;
  hasGallery: boolean;
}

export function ModDetailsTabs({
  modalTab,
  setModalTab,
  hasGallery,
}: ModDetailsTabsProps) {
  const tabs: Array<{ id: ModDetailsTabId; label: string }> = [
    { id: "summary", label: "Resumen" },
    ...(hasGallery ? [{ id: "gallery" as ModDetailsTabId, label: "Galería" }] : []),
    { id: "desc", label: "Desc." },
    { id: "versions", label: "Vers." },
    { id: "deps", label: "Depen." },
  ];

  return (
    <div className="flex gap-1 rounded-xl border border-white/[0.07] bg-black/15 p-0.5 shrink-0 overflow-x-auto scrollbar-none shadow-inner">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => setModalTab(t.id)}
          className={`relative overflow-hidden flex-1 text-center py-1 px-1 rounded-lg text-[9.5px] sm:text-[10px] font-semibold transition-colors whitespace-nowrap ${
            modalTab === t.id ? "text-orange-400" : "text-white/50 hover:text-white/80"
          }`}
        >
          {/* Shared pill animation across tabs */}
          {modalTab === t.id && (
            <motion.span
              layoutId="mod-details-tab-selection"
              className="absolute inset-0 rounded-lg border border-orange-500/25 bg-orange-500/15 shadow-[0_6px_16px_rgba(0,0,0,0.18)]"
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
            />
          )}
          <span className="relative z-10">{t.label}</span>
        </button>
      ))}
    </div>
  );
}
