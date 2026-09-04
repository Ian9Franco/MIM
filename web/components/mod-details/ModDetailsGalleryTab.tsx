"use client";

import React, { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { FomoGalleryItem } from "../../types/fomo";

interface ModDetailsGalleryTabProps {
  galleryImages: FomoGalleryItem[];
  activeImageIndex: number | null;
  setActiveImageIndex: React.Dispatch<React.SetStateAction<number | null>>;
  setDragEnabled: (val: boolean) => void;
}

export function ModDetailsGalleryTab({
  galleryImages,
  activeImageIndex,
  setActiveImageIndex,
  setDragEnabled,
}: ModDetailsGalleryTabProps) {
  const activeImage = activeImageIndex !== null ? galleryImages[activeImageIndex] : null;
  const activeImageUrl = activeImage?.url || null;
  const hasGalleryNav = galleryImages.length > 1;

  const showPreviousImage = useCallback(() => {
    setActiveImageIndex((current) => {
      if (current === null || galleryImages.length === 0) return current;
      return (current - 1 + galleryImages.length) % galleryImages.length;
    });
  }, [galleryImages.length, setActiveImageIndex]);

  const showNextImage = useCallback(() => {
    setActiveImageIndex((current) => {
      if (current === null || galleryImages.length === 0) return current;
      return (current + 1) % galleryImages.length;
    });
  }, [galleryImages.length, setActiveImageIndex]);

  useEffect(() => {
    if (activeImageIndex === null) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveImageIndex(null);
      if (event.key === "ArrowLeft") showPreviousImage();
      if (event.key === "ArrowRight") showNextImage();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeImageIndex, showNextImage, showPreviousImage, setActiveImageIndex]);

  return (
    <>
      <motion.div
        key="gallery"
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -12 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col gap-3.5 w-full pb-2"
      >
        <span className="text-[10px] text-white/30 uppercase font-mono tracking-wider block font-semibold">
          Galería de Imágenes ({galleryImages.length})
        </span>
        {galleryImages.length > 0 ? (
          <div
            onTouchStart={(e) => {
              e.stopPropagation();
              setDragEnabled(false);
            }}
            onTouchEnd={() => setDragEnabled(true)}
            onTouchCancel={() => setDragEnabled(true)}
            className="grid grid-cols-2 gap-3 pb-1 pr-1"
          >
            {galleryImages.map((img: FomoGalleryItem, i: number) => (
              <button
                type="button"
                key={i}
                onClick={() => setActiveImageIndex(i)}
                className="relative aspect-video w-full rounded-xl overflow-hidden bg-white/5 border border-white/[0.06] cursor-pointer hover:border-white/20 transition-all active:scale-[0.98]"
              >
                <img src={img.url} alt={img.title || "Screenshot"} className="object-cover w-full h-full" />
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-white/40 italic font-mono">Este mod no tiene imágenes asociadas.</p>
        )}
      </motion.div>

      {/* Lightbox / Fullscreen Image Viewer */}
      <AnimatePresence>
        {activeImageUrl && (
          <motion.div
            className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[600]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveImageIndex(null)}
          >
            <motion.div
              className="relative max-w-[92vw] max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl border border-white/10"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.16}
              onDragEnd={(_event, info) => {
                if (!hasGalleryNav) return;
                if (info.offset.x > 70) showPreviousImage();
                if (info.offset.x < -70) showNextImage();
              }}
            >
              <img
                key={activeImageUrl}
                src={activeImageUrl}
                alt={activeImage?.title || "Preview"}
                className="max-w-full max-h-[85vh] object-contain select-none"
                draggable={false}
              />
              {hasGalleryNav && (
                <>
                  <button
                    type="button"
                    onClick={showPreviousImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 rounded-full p-2 text-white/80 transition-all cursor-pointer border border-white/15 active:scale-95 flex items-center justify-center"
                    aria-label="Imagen anterior"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={showNextImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 rounded-full p-2 text-white/80 transition-all cursor-pointer border border-white/15 active:scale-95 flex items-center justify-center"
                    aria-label="Imagen siguiente"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <div className="absolute left-1/2 bottom-3 -translate-x-1/2 rounded-full border border-white/10 bg-black/60 px-2.5 py-1 text-[10px] font-semibold text-white/70">
                    {(activeImageIndex ?? 0) + 1} / {galleryImages.length}
                  </div>
                </>
              )}
              <button
                type="button"
                onClick={() => setActiveImageIndex(null)}
                className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 rounded-full p-2 text-white/80 transition-all cursor-pointer border border-white/15 active:scale-95 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
