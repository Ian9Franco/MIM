"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Check } from "lucide-react";

interface DraftMetadataModalProps {
  isOpen: boolean;
  onClose: () => void;
  editName: string;
  setEditName: (v: string) => void;
  editVersion: string;
  setEditVersion: (v: string) => void;
  editLoader: string;
  setEditLoader: (v: string) => void;
  editCoverImage: string;
  setEditCoverImage: (v: string) => void;
  editVisibility: string;
  setEditVisibility: (v: string) => void;
  savingMetadata: boolean;
  onSave: () => void;
  isOwner: boolean;
}

export function DraftMetadataModal({
  isOpen,
  onClose,
  editName,
  setEditName,
  editVersion,
  setEditVersion,
  editLoader,
  setEditLoader,
  editCoverImage,
  setEditCoverImage,
  editVisibility,
  setEditVisibility,
  savingMetadata,
  onSave,
  isOwner,
}: DraftMetadataModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
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
            className="bg-zinc-950 border border-white/[0.08] rounded-2xl w-full max-w-sm p-5 relative z-10 flex flex-col gap-4 shadow-2xl"
          >
            <div className="flex justify-between items-center pb-2 border-b border-white/[0.06]">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Configuración de Draft
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="p-1 text-white/30 hover:text-white rounded-lg hover:bg-white/5 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="text-[9px] font-mono uppercase text-white/40 tracking-wider">
                  Nombre del Draft
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => {
                    setEditName(e.target.value);
                  }}
                  className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-orange-500/50 transition-all"
                  placeholder="Ej. Mi Modpack Brutal"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[9px] font-mono uppercase text-white/40 tracking-wider">
                    Minecraft
                  </label>
                  <input
                    type="text"
                    value={editVersion}
                    onChange={(e) => {
                      setEditVersion(e.target.value);
                    }}
                    className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500/50 transition-all"
                    placeholder="Ej. 1.20.1"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-mono uppercase text-white/40 tracking-wider">
                    Mod Loader
                  </label>
                  <select
                    value={editLoader}
                    onChange={(e) => {
                      setEditLoader(e.target.value);
                    }}
                    className="w-full mt-1 bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500/50 transition-all cursor-pointer"
                  >
                    <option value="fabric">Fabric</option>
                    <option value="forge">Forge</option>
                    <option value="neoforge">NeoForge</option>
                    <option value="quilt">Quilt</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[9px] font-mono uppercase text-white/40 tracking-wider">
                  URL del Banner (Cover)
                </label>
                <input
                  type="text"
                  value={editCoverImage}
                  onChange={(e) => {
                    setEditCoverImage(e.target.value);
                  }}
                  className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-orange-500/50 transition-all font-mono text-[10px]"
                  placeholder="https://ejemplo.com/imagen.png"
                />
                {editCoverImage && (
                  <div className="mt-2 h-14 rounded-lg overflow-hidden border border-white/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={editCoverImage}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Visibility selector for creator/owner */}
              {isOwner && (
                <div>
                  <label className="text-[9px] font-mono uppercase text-white/40 tracking-wider">
                    Visibilidad
                  </label>
                  <div className="grid grid-cols-2 gap-2 mt-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEditVisibility("private");
                      }}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all border text-center ${
                        editVisibility === "private"
                          ? "bg-white/10 text-white border-white/20"
                          : "bg-transparent text-white/45 border-white/5 hover:border-white/10"
                      }`}
                    >
                      Privado
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditVisibility("public");
                      }}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all border text-center ${
                        editVisibility === "public"
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                          : "bg-transparent text-white/45 border-white/5 hover:border-white/10"
                      }`}
                    >
                      Público
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-[10px] font-bold text-white/60 hover:text-white hover:bg-white/5 transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={savingMetadata || !editName.trim()}
                className="bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:hover:bg-orange-500 text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5"
              >
                {savingMetadata ? (
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
