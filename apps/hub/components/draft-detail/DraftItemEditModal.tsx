"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Check } from "lucide-react";
import { dualFormatBadgeLabel, isDualDraftFormat } from "@/lib/fomo/draftItemFormats";
import {
  fixedOrgParentForContentType,
  MAP_PARENTS,
  orgParentForItem,
  remapOrgCategoryToParent,
  type DraftMapLayout,
} from "@/lib/fomo/draftMapLayout";
import { DraftItemCategoryPicker } from "./DraftItemCategoryPicker";

import type { ModHit } from "../SpotlightMarquees";

interface DraftItemEditModalProps {
  editingItem: (ModHit & { projectId?: string; itemId?: string }) | null;
  onClose: () => void;
  itemType: string;
  setItemType: (t: string) => void;
  itemSide: string;
  setItemSide: (s: string) => void;
  itemCategory: string;
  setItemCategory: React.Dispatch<React.SetStateAction<string>>;
  mapLayout: DraftMapLayout;
  onMapLayoutChange: (next: DraftMapLayout) => void;
  savingItem: boolean;
  onSave: () => void;
  availableFormats?: string[];
  usedChildIds: string[];
}

const PROJECT_TYPES = [
  { id: "mod", label: "Mod" },
  { id: "resourcepack", label: "Textura" },
  { id: "shader", label: "Shader" },
  { id: "datapack", label: "Datapack" },
];

const ITEM_SIDES = [
  { id: "both", label: "Ambos" },
  { id: "client", label: "Cliente" },
  { id: "server", label: "Servidor" },
];

const BRANCH_LABEL: Record<string, string> = {
  client: "Cliente",
  server: "Servidor",
  both: "Ambos",
};

const FIXED_SIDE_LABEL: Record<string, string> = {
  client: "Cliente (alluser — texturas y shaders)",
  server: "Servidor (allhost — datapacks)",
};

export function DraftItemEditModal({
  editingItem,
  onClose,
  itemType,
  setItemType,
  itemSide,
  setItemSide,
  itemCategory,
  setItemCategory,
  mapLayout,
  onMapLayoutChange,
  savingItem,
  onSave,
  availableFormats = [],
  usedChildIds,
}: DraftItemEditModalProps) {
  const [newCategoryName, setNewCategoryName] = useState("");
  const fixedSide = fixedOrgParentForContentType(itemType);
  const dual = isDualDraftFormat(availableFormats);
  const knownFormats = new Set(availableFormats);

  const branch = useMemo(
    () => orgParentForItem({ projectType: itemType, content_type: itemType, side: itemSide }),
    [itemType, itemSide],
  );

  useEffect(() => {
    if (!editingItem) return;
    setItemCategory((prev) => remapOrgCategoryToParent(prev, branch));
  }, [branch, editingItem?.itemId, editingItem, setItemCategory]);

  useEffect(() => {
    if (!editingItem) setNewCategoryName("");
  }, [editingItem]);

  const branchLabel = BRANCH_LABEL[branch] || MAP_PARENTS.find((p) => p.id === branch)?.label || branch;

  return (
    <AnimatePresence>
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="bg-zinc-950 border border-white/[0.08] rounded-2xl w-full max-w-sm max-h-[min(90vh,640px)] p-5 relative z-10 flex flex-col gap-4 shadow-2xl overflow-hidden"
          >
            <div className="flex justify-between items-center pb-2 border-b border-white/[0.06] shrink-0">
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-white truncate">{editingItem.title}</h3>
                <p className="text-[9px] text-white/40 font-mono mt-0.5">Editar Propiedades</p>
                {dual && (
                  <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-amber-300">
                    Dual en esta versión: {dualFormatBadgeLabel(availableFormats)}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1 text-white/30 hover:text-white rounded-lg hover:bg-white/5 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto min-h-0 flex-1 pr-0.5">
              <div>
                <label className="text-[9px] font-mono uppercase text-white/40 tracking-wider">
                  Tipo de Proyecto
                </label>
                <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                  {PROJECT_TYPES.map((t) => {
                    const active = itemType === t.id;
                    const allowed = knownFormats.size === 0 || knownFormats.has(t.id) || t.id === editingItem?.projectType;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        disabled={!allowed}
                        onClick={() => {
                          if (!allowed) return;
                          setItemType(t.id);
                          const nextFixed = fixedOrgParentForContentType(t.id);
                          if (nextFixed) setItemSide(nextFixed);
                        }}
                        className={`py-2 px-2 rounded-xl text-[10px] font-semibold transition-all border text-center ${
                          active
                            ? "bg-orange-500/20 text-orange-400 border-orange-500/40"
                            : allowed
                              ? "bg-white/[0.02] text-white/60 border-white/[0.06] hover:bg-white/5"
                              : "bg-white/[0.01] text-white/25 border-white/[0.04] cursor-not-allowed"
                        }`}
                        title={allowed ? t.label : "Este proyecto no publica ese formato en la versión del draft"}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-[9px] font-mono uppercase text-white/40 tracking-wider">
                  Entorno / Lado
                </label>
                {fixedSide ? (
                  <p className="mt-1.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-[10px] font-semibold text-emerald-200">
                    {FIXED_SIDE_LABEL[fixedSide]}
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-1.5 mt-1.5">
                    {ITEM_SIDES.map((s) => {
                      const active = itemSide === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setItemSide(s.id);
                          }}
                          className={`py-2 px-1 rounded-xl text-[9px] font-semibold transition-all border text-center ${
                            active
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
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
                  Rama activa: <span className="text-white/55 font-semibold">{branchLabel}</span>
                </p>
                <div className="mt-2">
                  <DraftItemCategoryPicker
                    compact
                    layout={mapLayout}
                    branch={branch}
                    usedChildIds={usedChildIds}
                    selectedCategoryId={itemCategory}
                    newCategoryName={newCategoryName}
                    setNewCategoryName={setNewCategoryName}
                    onSelectCategory={(categoryId, layoutAfter) => {
                      onMapLayoutChange(layoutAfter);
                      setItemCategory(categoryId);
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-white/[0.06] shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-lg text-[10px] font-bold text-white/60 hover:text-white transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={savingItem}
                className="bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:hover:bg-orange-500 text-black px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1"
              >
                {savingItem ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                Guardar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
