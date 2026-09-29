"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Check } from "lucide-react";
import {
  fixedOrgParentForContentType,
  parseChildCategoryId,
  type DraftMapLayout,
  type MapParentId,
} from "@/lib/fomo/draftMapLayout";
import { DraftItemCategoryPicker } from "./DraftItemCategoryPicker";
import type { ModHit } from "../SpotlightMarquees";

export function draftItemSelectionKey(mod: ModHit): string {
  return String(mod.itemId || mod.projectId);
}

const ITEM_SIDES: { id: MapParentId; label: string }[] = [
  { id: "both", label: "Ambos" },
  { id: "client", label: "Cliente" },
  { id: "server", label: "Servidor" },
];

export interface DraftBulkRecategorizeModalProps {
  open: boolean;
  onClose: () => void;
  mods: ModHit[];
  mapLayout: DraftMapLayout;
  usedChildIds: string[];
  onMapLayoutChange: (next: DraftMapLayout) => void;
  saving: boolean;
  onApply: (chosenBranch: MapParentId, categoryId: string) => void;
}

export function DraftBulkRecategorizeModal({
  open,
  onClose,
  mods,
  mapLayout,
  usedChildIds,
  onMapLayoutChange,
  saving,
  onApply,
}: DraftBulkRecategorizeModalProps) {
  const [branch, setBranch] = useState<MapParentId>("both");
  const [categoryId, setCategoryId] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");

  const fixedForAll = useMemo(() => {
    const fixed = mods.map((m) => fixedOrgParentForContentType(m.projectType));
    if (fixed.every((f) => f === fixed[0])) return fixed[0];
    return null;
  }, [mods]);

  useEffect(() => {
    if (!open) return;
    setNewCategoryName("");
    const first = mods[0];
    const initial = fixedForAll
      ?? (first ? (first.side === "client" || first.side === "server" ? first.side : "both") : "both");
    setBranch(initial as MapParentId);
    setCategoryId("");
  }, [open, mods, fixedForAll]);

  useEffect(() => {
    if (!open || !categoryId) return;
    const parsed = parseChildCategoryId(categoryId);
    if (parsed && parsed.parent !== branch) setCategoryId("");
  }, [branch, categoryId, open]);

  const sideDisabled = (side: MapParentId) => {
    if (!fixedForAll) return false;
    return fixedForAll !== side;
  };

  const canSave = Boolean(categoryId.trim());

  return (
    <AnimatePresence>
      {open && mods.length > 0 && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
          />
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
                {fixedForAll ? (
                  <p className="mt-1.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-[10px] font-semibold text-emerald-200">
                    Rama fija para la selección: {ITEM_SIDES.find((s) => s.id === fixedForAll)?.label || fixedForAll}
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-1.5 mt-1.5">
                    {ITEM_SIDES.map((s) => {
                      const disabled = sideDisabled(s.id);
                      const active = branch === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          disabled={disabled}
                          onClick={() => setBranch(s.id)}
                          className={`py-2 px-1 rounded-xl text-[9px] font-semibold transition-all border text-center ${
                            active
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                              : disabled
                                ? "bg-white/[0.01] text-white/25 border-white/[0.04] cursor-not-allowed"
                                : "bg-white/[0.02] text-white/60 border-white/[0.06] hover:bg-white/5"
                          }`}
                        >
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                )}
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
                    branch={fixedForAll ?? branch}
                    usedChildIds={usedChildIds}
                    selectedCategoryId={categoryId}
                    newCategoryName={newCategoryName}
                    setNewCategoryName={setNewCategoryName}
                    onSelectCategory={(id, layoutAfter) => {
                      onMapLayoutChange(layoutAfter);
                      setCategoryId(id);
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
                onClick={() => onApply(fixedForAll ?? branch, categoryId)}
                className="bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-black px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1"
              >
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Aplicar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
