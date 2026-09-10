"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { Maximize2, X } from "lucide-react";

interface FomoLightboxProps {
  images: Array<{ url: string; title?: string }>;
  index: number | null;
  onClose: () => void;
  onNext: (e: React.MouseEvent) => void;
  onPrev: (e: React.MouseEvent) => void;
  isFullView: boolean;
  setIsFullView: React.Dispatch<React.SetStateAction<boolean>>;
}

export function FomoLightbox({
  images,
  index,
  onClose,
  onNext,
  onPrev,
  isFullView,
  setIsFullView,
}: FomoLightboxProps) {
  if (typeof document === "undefined" || index === null || !images[index]) return null;

  return createPortal(
    <div
      className="lightbox-overlay fixed inset-0 z-[9999] flex items-center justify-center p-8 bg-black/95 backdrop-blur-3xl animate-fade-in"
      style={{ animationDuration: "400ms" }}
      onClick={onClose}
    >
      <div className="absolute top-6 right-6 flex items-center gap-2 z-50">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsFullView((prev) => !prev);
          }}
          className={`p-3 rounded-full transition-all active:scale-95 ${
            isFullView ? "bg-primary text-white" : "bg-white/5 text-white/50 hover:bg-white/10"
          }`}
          title={isFullView ? "Contraer" : "Expandir"}
        >
          <Maximize2 className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="p-3 rounded-full bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-all active:scale-95"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <button
        type="button"
        onClick={onPrev}
        className="absolute left-0 top-0 bottom-0 w-[40%] z-10 cursor-pointer opacity-0"
        aria-label="Anterior"
      />
      <button
        type="button"
        onClick={onNext}
        className="absolute right-0 top-0 bottom-0 w-[40%] z-10 cursor-pointer opacity-0"
        aria-label="Siguiente"
      />

      <div className="relative flex flex-col items-center justify-center pointer-events-none w-full h-full p-4">
        <div
          className={`flex flex-col items-center gap-4 pointer-events-auto transition-all duration-500 ease-out ${
            isFullView ? "scale-105" : "scale-100"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[index].url}
            alt=""
            className={`object-contain block rounded-2xl transition-all duration-500 shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-white/10 animate-zoom-in ${
              isFullView ? "w-[94vw] h-[90vh]" : "max-w-[90vw] h-[75vh] w-auto"
            }`}
            onClick={(e) => e.stopPropagation()}
          />

          {!isFullView && (
            <div className="flex flex-col items-center gap-2 pointer-events-none animate-fade-in">
              {images[index].title && (
                <div className="px-5 py-2 rounded-2xl bg-white/10 border border-white/20 text-xs font-bold text-white backdrop-blur-xl shadow-2xl">
                  {images[index].title}
                </div>
              )}
              <div className="px-3 py-1 rounded-full bg-black/40 border border-white/5 text-[10px] text-white/40 uppercase tracking-[0.3em] font-headline backdrop-blur-md">
                {index + 1} <span className="mx-1 opacity-20">/</span> {images.length}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
