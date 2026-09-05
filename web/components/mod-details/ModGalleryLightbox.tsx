"use client";

import React, { useEffect, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X, Image as ImageIcon } from "lucide-react";
import type { FomoGalleryItem } from "../../types/fomo";

interface ModGalleryLightboxProps {
  galleryImages: FomoGalleryItem[];
  activeImageIndex: number | null;
  setActiveImageIndex: React.Dispatch<React.SetStateAction<number | null>>;
  projectTitle?: string;
}

/**
 * ModGalleryLightbox — Visor fullscreen de imágenes para la galería.
 * Se monta mediante React Portal directamente en document.body para evitar
 * quedar atrapado dentro del stacking context y transformaciones de la Bottom Sheet.
 */
export function ModGalleryLightbox({
  galleryImages,
  activeImageIndex,
  setActiveImageIndex,
  projectTitle,
}: ModGalleryLightboxProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isOpen = activeImageIndex !== null && galleryImages.length > 0;
  const activeImage = isOpen && activeImageIndex !== null ? galleryImages[activeImageIndex] : null;
  const activeImageUrl = activeImage?.url || (activeImage as unknown as Record<string, string>)?.raw_url || null;
  const hasMultipleImages = galleryImages.length > 1;

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

  const handleClose = useCallback(() => {
    setActiveImageIndex(null);
  }, [setActiveImageIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleClose();
      if (event.key === "ArrowLeft") showPreviousImage();
      if (event.key === "ArrowRight") showNextImage();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose, showNextImage, showPreviousImage]);

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && activeImageUrl && (
        <motion.div
          key="mod-gallery-lightbox-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[99999] bg-black/95 backdrop-blur-xl flex flex-col justify-between p-3 sm:p-6 select-none touch-none"
          onClick={handleClose}
        >
          {/* Top Control Bar */}
          <div
            className="w-full flex items-center justify-between z-10 shrink-0 gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
                <ImageIcon className="w-4 h-4 text-orange-400" />
              </div>
              <div className="flex flex-col min-w-0">
                {projectTitle && (
                  <span className="text-xs sm:text-sm font-bold text-white truncate drop-shadow">
                    {projectTitle}
                  </span>
                )}
                <span className="text-[11px] font-mono text-white/50">
                  Captura {(activeImageIndex ?? 0) + 1} de {galleryImages.length}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white/90 border border-white/15 flex items-center justify-center transition-all cursor-pointer shadow-lg"
              aria-label="Cerrar galería"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main Visual Stage */}
          <div
            className="relative flex-1 w-full flex items-center justify-center min-h-0 my-2"
            onClick={handleClose}
          >
            {/* Desktop Navigation Chevrons */}
            {hasMultipleImages && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  showPreviousImage();
                }}
                className="absolute left-2 sm:left-4 z-20 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/60 hover:bg-black/80 text-white/90 hover:text-white border border-white/20 backdrop-blur-md flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xl"
                aria-label="Imagen anterior"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            <motion.div
              key={activeImageUrl}
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              className="relative max-w-[96vw] sm:max-w-[90vw] max-h-[76dvh] sm:max-h-[82dvh] flex items-center justify-center rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black/40"
              onClick={(e) => e.stopPropagation()}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={(_e, info) => {
                if (!hasMultipleImages) return;
                if (info.offset.x > 60) showPreviousImage();
                if (info.offset.x < -60) showNextImage();
              }}
            >
              <img
                src={activeImageUrl}
                alt={activeImage?.title || projectTitle || "Screenshot"}
                className="max-w-full max-h-[76dvh] sm:max-h-[82dvh] object-contain select-none pointer-events-auto"
                draggable={false}
              />
            </motion.div>

            {hasMultipleImages && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  showNextImage();
                }}
                className="absolute right-2 sm:right-4 z-20 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/60 hover:bg-black/80 text-white/90 hover:text-white border border-white/20 backdrop-blur-md flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xl"
                aria-label="Imagen siguiente"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Bottom Caption & Pill */}
          <div
            className="w-full flex flex-col items-center justify-center z-10 shrink-0 gap-2 pb-1"
            onClick={(e) => e.stopPropagation()}
          >
            {activeImage?.title && (
              <p className="text-xs text-white/80 max-w-lg text-center font-medium drop-shadow px-3 truncate">
                {activeImage.title}
              </p>
            )}
            {hasMultipleImages && (
              <div className="rounded-full border border-white/15 bg-black/70 backdrop-blur-md px-3 py-1 text-[11px] font-mono font-semibold text-white/80 shadow-lg">
                {(activeImageIndex ?? 0) + 1} / {galleryImages.length}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
