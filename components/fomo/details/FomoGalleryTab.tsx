"use client";

import React from "react";
import { Images, Maximize2 } from "lucide-react";

interface FomoGalleryTabProps {
  showSkeleton: boolean;
  loadingGallery: boolean;
  gallery: Array<{ url: string; thumbnailUrl?: string; title?: string }>;
  onSelectImage: (index: number) => void;
}

export function FomoGalleryTab({
  showSkeleton,
  loadingGallery,
  gallery,
  onSelectImage,
}: FomoGalleryTabProps) {
  return (
    <div className="space-y-4 animate-fade-in">
      {showSkeleton ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-32 bg-white/5 animate-pulse rounded-2xl border border-white/5"
            />
          ))}
        </div>
      ) : !loadingGallery && gallery.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/5">
            <Images className="w-8 h-8 opacity-20" />
          </div>
          <div>
            <p className="text-sm font-headline opacity-60">
              Este proyecto aún no tiene capturas de pantalla públicas.
            </p>
            <p className="text-[10px] opacity-30 mt-1 uppercase tracking-widest">Galería Vacía</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {gallery.map((img, i) => (
            <div
              key={i}
              onClick={() => onSelectImage(i)}
              className="group relative rounded-2xl overflow-hidden border border-white/10 bg-black/40 aspect-video cursor-zoom-in hover:border-primary/50 transition-all"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.thumbnailUrl || img.url}
                alt={img.title || ""}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                loading="lazy"
                onError={(e) => {
                  console.warn(`[Gallery] Failed to load image at index ${i}:`, img.url);
                  (e.currentTarget as HTMLImageElement).src =
                    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23333' width='100' height='100'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='%23999' font-size='12'%3EImage Error%3C/text%3E%3C/svg%3E";
                }}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <Maximize2 className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity scale-50 group-hover:scale-100 duration-300" />
              </div>
              {img.title && (
                <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  {img.title}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
