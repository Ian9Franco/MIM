"use client";

import React from "react";
import { motion } from "framer-motion";
import { X, Loader2, Check } from "lucide-react";
import type { DraftMapLayout, MapParentId } from "@/lib/fomo/draftMapLayout";
import { DraftItemCategoryPicker } from "./DraftItemCategoryPicker";
import { BulkBranchPicker } from "./DraftBulkRecategorizeBranchPicker";
import type { ModHit } from "../SpotlightMarquees";

export function DraftBulkRecategorizeModalContent({
  mods,
  fixedForAll,
  branch,
  onBranch,
  activeBranch,
  mapLayout,
  usedChildIds,
  categoryId,
  newCategoryName,
  setNewCategoryName,
  onMapLayoutChange,
  onSelectCategory,
  saving,
  canSave,
  onClose,
  onApply,
}: {
  mods: ModHit[];
  fixedForAll: MapParentId | null;
  branch: MapParentId;
  onBranch: (b: MapParentId) => void;
  activeBranch: MapParentId;
  mapLayout: DraftMapLayout;
  usedChildIds: string[];
  categoryId: string;
  newCategoryName: string;
  setNewCategoryName: (v: string) => void;
  onMapLayoutChange: (layout: DraftMapLayout) => void;
  onSelectCategory: (id: string) => void;
  saving: boolean;
  canSave: boolean;
  onClose: () => void;
  onApply: () => void;
}) {
  return (
    <motion.div
      initial={{ scale: 0.95, y: 15, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      exit={{ scale: 0.95, y: 15, opacity: 0 }}
      className="bg-zinc-950 border border-white/[0.08] rounded-2xl w-full max-w-sm max-h-[min(90vh,640px)] p-5 relative z-10 flex flex-col gap-4 shadow-2xl overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-center pb-2 border-b border-white/[0.06] shrink-0">
        <div>
          <h3 className="text-xs font-bold text-white">Recategorizar {mods.length} ítems</h3>
          <p className="text-[9px] text-white/40 font-mono mt-0.5 truncate max-w-[14rem]">
            {mods.slice(0, 3).map((m) => m.title).join(", ")}
            {mods.length > 3 ? "…" : ""}
          </p>
        </div>
        <button type="button" onClick={onClose} className="p-1 text-white/30 hover:text-white rounded-lg">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4 overflow-y-auto min-h-0 flex-1">
        <div>
          <label className="text-[9px] font-mono uppercase text-white/40 tracking-wider">
            Entorno / Lado
          </label>
          <BulkBranchPicker fixedForAll={fixedForAll} branch={branch} onBranch={onBranch} />
        </div>
        <div>
          <label className="text-[9px] font-mono uppercase text-white/40 tracking-wider">
            Categoría
          </label>
          <p className="mt-1 text-[9px] text-white/35">
            Solo categorías que ya existen en esta rama.
          </p>
          <div className="mt-2">
            <DraftItemCategoryPicker
              compact
              layout={mapLayout}
              branch={activeBranch}
              usedChildIds={usedChildIds}
              selectedCategoryId={categoryId}
              newCategoryName={newCategoryName}
              setNewCategoryName={setNewCategoryName}
              onSelectCategory={(id, layoutAfter) => {
                onMapLayoutChange(layoutAfter);
                onSelectCategory(id);
              }}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-3 border-t border-white/[0.06] shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="px-3.5 py-1.5 rounded-lg text-[10px] font-bold text-white/60 hover:text-white"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={saving || !canSave}
          onClick={onApply}
          className="bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-black px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1"
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Aplicar
        </button>
      </div>
    </motion.div>
  );
}
