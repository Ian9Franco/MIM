"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Layers, X } from "lucide-react";
import type { ModHit } from "../../SpotlightMarquees";

interface DiscoverBulkDraftBarProps {
  mods: ModHit[];
  onCancel: () => void;
  onAddToDraft: () => void;
}

export function DiscoverBulkDraftBar({ mods, onCancel, onAddToDraft }: DiscoverBulkDraftBarProps) {
  const displayMods = mods.slice(0, 6);
  const remaining = mods.length - displayMods.length;

  return (
    <AnimatePresence>
      {mods.length > 0 && (
        <motion.div
          initial={{ y: 72, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 72, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          className="fixed bottom-20 left-3 right-3 z-[120] p-3 rounded-2xl border flex items-center justify-between gap-3 shadow-2xl"
          style={{
            background: "rgba(18, 18, 22, 0.96)",
            borderColor: "color-mix(in srgb, var(--color-primary) 35%, transparent)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex -space-x-2 shrink-0">
              {displayMods.map((mod, index) => (
                <div
                  key={mod.projectId}
                  className="w-8 h-8 rounded-lg border-2 border-[#121216] bg-white/5 overflow-hidden flex items-center justify-center"
                  style={{ zIndex: displayMods.length - index }}
                >
                  {mod.iconUrl ? (
                    <img src={mod.iconUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[8px] font-bold text-white/50 uppercase">
                      {mod.title.substring(0, 2)}
                    </span>
                  )}
                </div>
              ))}
              {remaining > 0 && (
                <div className="w-8 h-8 rounded-lg border-2 border-[#121216] bg-white/10 flex items-center justify-center text-[9px] font-bold text-white/70">
                  +{remaining}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-white leading-none">{mods.length}</p>
              <p className="text-[9px] uppercase tracking-wider font-bold text-white/50 mt-0.5">Seleccionados</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onCancel}
              className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Cancelar selección"
            >
              <X className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onAddToDraft}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
              style={{
                background: "color-mix(in srgb, var(--color-primary) 18%, transparent)",
                color: "var(--color-primary)",
                border: "1px solid color-mix(in srgb, var(--color-primary) 30%, transparent)",
              }}
            >
              <Layers className="w-3.5 h-3.5" />
              Añadir a draft
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
