"use client";

import React from "react";
import { motion } from "framer-motion";
import { Maximize2 } from "lucide-react";
import type { FomoGalleryItem } from "../../types/fomo";

interface ModDetailsGalleryTabProps {
  galleryImages: FomoGalleryItem[];
  activeImageIndex?: number | null;
  setActiveImageIndex: React.Dispatch<React.SetStateAction<number | null>> | ((val: number | null) => void);
  setDragEnabled: (val: boolean) => void;
}

/**
 * ModDetailsGalleryTab — Cuadrícula interactiva de capturas oficiales del mod.
 * Al hacer clic en cualquier miniatura, se abre el visor fullscreen (ModGalleryLightbox)
 * montado mediante Portal sin interferencias con el header o scroll del sheet.
 */
export function ModDetailsGalleryTab({
  galleryImages,
  setActiveImageIndex,
  setDragEnabled,
}: ModDetailsGalleryTabProps) {
  return (
    <motion.div
      key="gallery-tab-content"
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col gap-3 w-full pb-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-white/40 uppercase font-mono tracking-wider block font-semibold">
          Galería de Imágenes ({galleryImages.length})
        </span>
        <span className="text-[10px] text-white/30 font-sans">
          Tocá una imagen para ampliar
        </span>
      </div>

      {galleryImages.length > 0 ? (
        <div className="grid grid-cols-2 gap-2.5 pb-2">
          {galleryImages.map((img: FomoGalleryItem, i: number) => {
            const imgUrl = img.url || (img as unknown as Record<string, string>)?.raw_url || "";
            return (
              <button
                type="button"
                key={i}
                onClick={() => setActiveImageIndex(i)}
                className="group relative aspect-video w-full rounded-xl overflow-hidden bg-white/5 border border-white/[0.08] cursor-pointer hover:border-orange-500/50 transition-all active:scale-[0.98] shadow-sm flex items-center justify-center text-left"
              >
                <img
                  src={imgUrl}
                  alt={img.title || `Captura ${i + 1}`}
                  className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-2">
                  <span className="text-[10px] text-white/95 font-medium truncate drop-shadow pr-1">
                    {img.title || `Captura ${i + 1}`}
                  </span>
                  <div className="w-5 h-5 rounded-md bg-black/60 flex items-center justify-center shrink-0 text-white/80">
                    <Maximize2 className="w-3 h-3" />
                  </div>
                </div>
                <div className="absolute top-1.5 right-1.5 rounded-md bg-black/60 backdrop-blur-xs px-1.5 py-0.5 text-[9px] font-mono font-medium text-white/70 border border-white/10 shadow-xs">
                  {i + 1}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6 text-center">
          <p className="text-xs text-white/40 italic font-mono">
            Este proyecto no tiene capturas oficiales asociadas.
          </p>
        </div>
      )}
    </motion.div>
  );
}

