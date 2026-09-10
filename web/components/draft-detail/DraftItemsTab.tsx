"use client";

import React from "react";
import { motion } from "framer-motion";
import { Package, Pencil, Trash2, ChevronRight } from "lucide-react";
import { TYPE_FILTERS, typeColor, typeLabel } from "./draftDetailConstants";
import { CollectionsSkeleton } from "../FomoSkeletons";
import type { ModHit } from "../SpotlightMarquees";

interface DraftItemsTabProps {
  typeFilter: string;
  setTypeFilter: (f: string) => void;
  loadingActiveMods: boolean;
  visibleMods: ModHit[];
  handleOpenModDetails: (mod: ModHit) => void;
  onOpenEditItem: (mod: ModHit) => void;
  onRemoveItem?: (mod: ModHit) => void;
}

export function DraftItemsTab({
  typeFilter,
  setTypeFilter,
  loadingActiveMods,
  visibleMods,
  handleOpenModDetails,
  onOpenEditItem,
  onRemoveItem,
}: DraftItemsTabProps) {
  return (
    <motion.div
      key="items"
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col gap-3"
    >
      {/* Type filter */}
      <div className="flex gap-1 overflow-x-auto scrollbar-none rounded-xl border border-white/[0.06] bg-black/10 p-1">
        {TYPE_FILTERS.map((f) => {
          const active = typeFilter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                setTypeFilter(f.id);
              }}
              className="relative overflow-hidden shrink-0 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-colors active:scale-95"
              style={{
                color: active ? "var(--color-primary)" : "var(--color-muted)",
              }}
            >
              {active && (
                <motion.span
                  layoutId="draft-type-filter-selection"
                  className="absolute inset-0 rounded-lg border"
                  style={{
                    background: "color-mix(in srgb, var(--color-primary) 13%, transparent)",
                    borderColor: "color-mix(in srgb, var(--color-primary) 28%, transparent)",
                  }}
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <span className="relative z-10">{f.label}</span>
            </button>
          );
        })}
      </div>

      {loadingActiveMods ? (
        <CollectionsSkeleton />
      ) : visibleMods.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/[0.06] py-8 text-center text-xs text-white/40">
          {typeFilter === "all" ? "Este draft no tiene ítems." : "No hay items de este tipo."}
        </div>
      ) : (
        visibleMods.map((mod: ModHit) => {
          const col = typeColor(mod.projectType);
          return (
            <div
              key={mod.itemId || mod.id || mod.projectId}
              onClick={() => handleOpenModDetails(mod)}
              className="bg-surface/90 border border-border rounded-2xl p-3 flex items-center gap-3 active:scale-[0.98] transition-all cursor-pointer hover:border-white/15"
            >
              <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/[0.05] flex items-center justify-center overflow-hidden flex-shrink-0">
                {mod.iconUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={mod.iconUrl} alt="" className="object-cover w-full h-full" />
                ) : (
                  <Package className="w-5 h-5 text-white/20" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{mod.title}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-md ${col.bg} ${col.text} border ${col.border}`}>
                    {typeLabel(mod.projectType)}
                  </span>
                  {mod.gameVersions?.[0] && (
                    <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-md bg-white/5 text-white/55 border border-white/[0.06]" title="Versiones compatibles de este mod">
                      {mod.gameVersions.join(", ")}
                    </span>
                  )}
                  {mod.loaders?.[0] && (
                    <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/20 uppercase">
                      {mod.loaders[0]}
                    </span>
                  )}
                  {mod.side && (
                    <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 capitalize">
                      {mod.side === "both" ? "Ambos" : mod.side === "client" ? "Cliente" : "Servidor"}
                    </span>
                  )}
                </div>
              </div>

              {/* Edit item action */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenEditItem(mod);
                }}
                className="p-1.5 rounded-lg text-white/30 hover:text-orange-400 hover:bg-orange-500/10 transition-all active:scale-90"
                title="Modificar tipo o lado del ítem"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>

              {onRemoveItem ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveItem(mod);
                  }}
                  className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all active:scale-90 shrink-0"
                  title="Eliminar del draft"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              ) : (
                <ChevronRight className="w-4 h-4 text-white/20 shrink-0" />
              )}
            </div>
          );
        })
      )}
    </motion.div>
  );
}
