"use client";

import React, { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Check, Upload, Trash2, Link2 } from "lucide-react";
import { ImageCropper } from "../ImageCropper";
import { supabase } from "../../lib/supabaseClient";
import {
  DRAFT_COVER_ALLOWED_TYPES,
  DRAFT_COVER_MAX_INPUT_BYTES,
  isAllowedCoverImageType,
} from "../../lib/compressImage";
import { uploadDraftCoverFromDataUrl } from "../../lib/drafts/uploadDraftCover";

interface DraftMetadataModalProps {
  isOpen: boolean;
  onClose: () => void;
  draftId: string;
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
  editDescription: string;
  setEditDescription: (v: string) => void;
  savingMetadata: boolean;
  onSave: () => void;
  isOwner: boolean;
}

export function DraftMetadataModal({
  isOpen,
  onClose,
  draftId,
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
  editDescription,
  setEditDescription,
  savingMetadata,
  onSave,
  isOwner,
}: DraftMetadataModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rawCover, setRawCover] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [previewBroken, setPreviewBroken] = useState(false);
  const [showUrlField, setShowUrlField] = useState(false);
  const busy = savingMetadata || uploadingCover;

  const resetFileInput = () => {
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePickFile = async (file: File | undefined) => {
    setCoverError(null);
    setPreviewBroken(false);
    if (!file) return;

    if (!isAllowedCoverImageType(file.type)) {
      setCoverError("Solo imágenes (JPG, PNG, WEBP).");
      resetFileInput();
      return;
    }
    if (file.type && DRAFT_COVER_ALLOWED_TYPES.length && file.type === "image/svg+xml") {
      setCoverError("SVG no está permitido.");
      resetFileInput();
      return;
    }
    if (file.size > DRAFT_COVER_MAX_INPUT_BYTES) {
      setCoverError("La imagen pesa demasiado (máx. 15 MB). Probá otra más chica.");
      resetFileInput();
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setRawCover(reader.result as string);
    reader.onerror = () => setCoverError("No se pudo leer el archivo.");
    reader.readAsDataURL(file);
    resetFileInput();
  };

  const handleCroppedCover = async (dataUrl: string) => {
    setRawCover(null);
    if (!draftId) {
      setCoverError("No hay draft para subir la portada.");
      return;
    }
    setUploadingCover(true);
    setCoverError(null);
    try {
      const url = await uploadDraftCoverFromDataUrl({ supabase, draftId, dataUrl });
      setEditCoverImage(url);
      setPreviewBroken(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al subir la portada";
      setCoverError(msg);
    } finally {
      setUploadingCover(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              if (!busy) onClose();
            }}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.95, y: 15, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 15, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="bg-zinc-950 border border-white/[0.08] rounded-t-2xl sm:rounded-2xl w-full max-w-sm max-h-[92vh] overflow-y-auto p-5 relative z-10 flex flex-col gap-4 shadow-2xl"
          >
            <div className="flex justify-between items-center pb-2 border-b border-white/[0.06]">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Configuración de Draft
              </h3>
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="p-1 text-white/30 hover:text-white rounded-lg hover:bg-white/5 transition-all disabled:opacity-40"
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

              {isOwner && (
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
              )}

              <div>
                <label className="text-[9px] font-mono uppercase text-white/40 tracking-wider">
                  Portada / Banner
                </label>
                <div className="mt-1.5 relative w-full h-24 rounded-xl overflow-hidden border border-white/10 bg-black/30 flex items-center justify-center">
                  {editCoverImage && !previewBroken ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={editCoverImage}
                      alt="Preview portada"
                      className="w-full h-full object-cover"
                      onError={() => {
                        setPreviewBroken(true);
                      }}
                      onLoad={() => {
                        setPreviewBroken(false);
                      }}
                    />
                  ) : (
                    <span className="text-[10px] font-mono uppercase tracking-wider text-white/35 px-3 text-center">
                      {previewBroken ? "La URL no carga (¿link corto?)" : "Sin portada"}
                    </span>
                  )}
                  {uploadingCover && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
                      <span className="text-[10px] font-bold text-white/80">Comprimiendo y subiendo…</span>
                    </div>
                  )}
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  <label
                    className={`px-3.5 py-2.5 rounded-xl text-[11px] font-semibold cursor-pointer active:scale-95 transition-all flex items-center gap-1.5 ${
                      uploadingCover
                        ? "opacity-40 pointer-events-none bg-orange-500/10 text-orange-400/60"
                        : "bg-orange-500/15 text-orange-400 hover:bg-orange-500/25"
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Subir desde el celular
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingCover}
                      onChange={(e) => {
                        void handlePickFile(e.target.files?.[0]);
                      }}
                    />
                  </label>
                  {editCoverImage && (
                    <button
                      type="button"
                      disabled={uploadingCover}
                      onClick={() => {
                        setEditCoverImage("");
                        setCoverError(null);
                        setPreviewBroken(false);
                      }}
                      className="px-3 py-2.5 rounded-xl text-[11px] font-semibold text-red-400 border border-red-500/20 hover:bg-red-500/10 active:scale-95 transition-all flex items-center gap-1 disabled:opacity-40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Quitar
                    </button>
                  )}
                </div>
                <p className="mt-1.5 text-[9px] leading-relaxed text-white/35">
                  JPG, PNG o WEBP. Se comprime sola (lado largo ~1440px) antes de guardar.
                </p>
                {coverError && (
                  <p className="mt-1.5 text-[10px] font-semibold text-red-400">{coverError}</p>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowUrlField((v) => !v);
                  }}
                  className="mt-2 flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider text-white/35 hover:text-white/60 transition-colors"
                >
                  <Link2 className="w-3 h-3" />
                  {showUrlField ? "Ocultar URL" : "Pegar URL (opcional)"}
                </button>
                {showUrlField && (
                  <input
                    type="text"
                    value={editCoverImage}
                    onChange={(e) => {
                      setEditCoverImage(e.target.value);
                      setPreviewBroken(false);
                      setCoverError(null);
                    }}
                    className="w-full mt-1.5 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-orange-500/50 transition-all font-mono text-[10px]"
                    placeholder="https://ejemplo.com/imagen.png"
                  />
                )}
              </div>

              {/* Visibility selector for creator/owner */}
              {isOwner && (
                <div>
                  <label className="text-[9px] font-mono uppercase text-white/40 tracking-wider">
                    Visibilidad
                  </label>
                  <div className="mt-1.5 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditVisibility("private");
                      }}
                      className={`rounded-xl border px-3 py-2 text-center text-xs font-semibold transition-all ${
                        editVisibility === "private"
                          ? "border-white/20 bg-white/10 text-white"
                          : "border-white/5 bg-transparent text-white/45 hover:border-white/10"
                      }`}
                    >
                      Privado
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditVisibility("public");
                      }}
                      className={`rounded-xl border px-3 py-2 text-center text-xs font-semibold transition-all ${
                        editVisibility === "public"
                          ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-300"
                          : "border-white/5 bg-transparent text-white/45 hover:border-white/10"
                      }`}
                    >
                      Público
                    </button>
                  </div>
                  <p className="mt-2 text-[9px] leading-relaxed text-white/35">
                    Público: cualquiera con sesión puede agregar o quitar ítems. Privado: solo se puede ver.
                  </p>
                </div>
              )}

              <div>
                <label className="text-[9px] font-mono uppercase text-white/40 tracking-wider">
                  Descripción
                </label>
                <textarea
                  value={editDescription}
                  maxLength={100}
                  rows={2}
                  onChange={(e) => {
                    setEditDescription(e.target.value.slice(0, 100));
                  }}
                  className="w-full mt-1 resize-none bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-orange-500/50 transition-all"
                  placeholder="Una línea corta sobre este draft"
                />
                <p className="mt-1 text-right font-mono text-[9px] text-white/30">{editDescription.length}/100</p>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="px-4 py-2 rounded-xl text-[10px] font-bold text-white/60 hover:text-white hover:bg-white/5 transition-all disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={busy || !editName.trim()}
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

          {rawCover && (
            <ImageCropper
              imageUrl={rawCover}
              aspectRatio={16 / 9}
              shape="rect"
              onCancel={() => {
                setRawCover(null);
              }}
              onSave={(croppedUrl) => {
                void handleCroppedCover(croppedUrl);
              }}
            />
          )}
        </div>
      )}
    </AnimatePresence>
  );
}
