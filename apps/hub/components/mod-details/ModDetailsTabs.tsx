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
    <div className="mim-details-tabs flex gap-1 rounded-xl border p-0.5 shrink-0 overflow-x-auto scrollbar-none">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => setModalTab(t.id)}
          className={`relative overflow-hidden flex-1 text-center py-1 px-1 rounded-lg text-[9.5px] sm:text-[10px] font-semibold transition-colors whitespace-nowrap ${
            modalTab === t.id ? "mim-details-tab-active mim-control-3d-active" : "mim-details-tab"
          }`}
        >
          {/* Shared pill animation across tabs */}
          {modalTab === t.id && (
            <motion.span
              layoutId="mod-details-tab-selection"
              className="mim-details-tab-pill absolute inset-0 rounded-lg border"
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
            />
          )}
          <span className="relative z-10">{t.label}</span>
        </button>
      ))}
    </div>
  );
}
