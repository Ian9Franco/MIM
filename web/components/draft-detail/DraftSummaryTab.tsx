"use client";

import React from "react";
import { motion } from "framer-motion";
import { typeLabel, typeColor } from "./draftDetailConstants";
import type { ModHit } from "../SpotlightMarquees";

interface DraftSummaryTabProps {
  draft: any;
  activeCollectionMods: ModHit[];
}

export function DraftSummaryTab({
  draft,
  activeCollectionMods,
}: DraftSummaryTabProps) {
  const stats = [
    { label: "Versión", value: draft?.minecraft_version },
    { label: "Loader", value: draft?.loader },
    { label: "Visibilidad", value: draft?.visibility === "public" ? "Público" : "Privado" },
    { label: "Total ítems", value: activeCollectionMods.length },
  ];

  return (
    <motion.div
      key="summary"
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col gap-4"
    >
      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        {stats.map(({ label, value }) => (
          <div key={label} className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-3">
            <p className="text-[9px] font-mono uppercase tracking-wider text-white/30">{label}</p>
            <p className="text-xs font-bold text-white mt-1 capitalize">{value}</p>
          </div>
        ))}
      </div>

      {/* Breakdown by type */}
      {activeCollectionMods.length > 0 && (
        <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4">
          <p className="text-[9px] font-mono uppercase tracking-wider text-white/30 mb-3">Composición</p>
          <div className="space-y-3">
            {(["mod", "resourcepack", "shader", "datapack"] as const).map((type) => {
              const count = activeCollectionMods.filter(m => (m.projectType || "mod") === type).length;
              const pct = activeCollectionMods.length > 0 ? (count / activeCollectionMods.length) * 100 : 0;
              const col = typeColor(type);
              return (
                <div key={type} className="flex items-center gap-2">
                  <span className={`text-[8px] font-bold uppercase w-16 shrink-0 ${col.text}`}>
                    {typeLabel(type)}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden relative">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: col.hex }}
                    />
                  </div>
                  <span className="text-[9px] font-mono text-white/60 w-8 text-right font-bold">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Description */}
      {draft?.description && (
        <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4">
          <p className="text-[9px] font-mono uppercase tracking-wider text-white/30 mb-2">Descripción</p>
          <p className="text-xs text-white/65 leading-relaxed">{draft.description}</p>
        </div>
      )}
    </motion.div>
  );
}
