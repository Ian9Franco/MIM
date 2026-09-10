"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Check } from "lucide-react";

import type { ModHit } from "../SpotlightMarquees";

interface DraftItemEditModalProps {
  editingItem: (ModHit & { projectId?: string; itemId?: string }) | null;
  onClose: () => void;
  itemType: string;
  setItemType: (t: string) => void;
  itemSide: string;
  setItemSide: (s: string) => void;
  savingItem: boolean;
  onSave: () => void;
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

export function DraftItemEditModal({
  editingItem,
  onClose,
  itemType,
  setItemType,
  itemSide,
  setItemSide,
  savingItem,
  onSave,
}: DraftItemEditModalProps) {
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
            className="bg-zinc-950 border border-white/[0.08] rounded-2xl w-full max-w-xs p-5 relative z-10 flex flex-col gap-4 shadow-2xl"
          >
            <div className="flex justify-between items-center pb-2 border-b border-white/[0.06]">
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-white truncate">{editingItem.title}</h3>
                <p className="text-[9px] text-white/40 font-mono mt-0.5">Editar Propiedades</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1 text-white/30 hover:text-white rounded-lg hover:bg-white/5 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Type Selection */}
              <div>
                <label className="text-[9px] font-mono uppercase text-white/40 tracking-wider">
                  Tipo de Proyecto
                </label>
                <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                  {PROJECT_TYPES.map((t) => {
                    const active = itemType === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setItemType(t.id);
                        }}
                        className={`py-2 px-2 rounded-xl text-[10px] font-semibold transition-all border text-center ${
                          active
                            ? "bg-orange-500/20 text-orange-400 border-orange-500/40"
                            : "bg-white/[0.02] text-white/60 border-white/[0.06] hover:bg-white/5"
                        }`}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Side Selection */}
              <div>
                <label className="text-[9px] font-mono uppercase text-white/40 tracking-wider">
                  Entorno / Lado
                </label>
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
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-white/[0.06]">
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
