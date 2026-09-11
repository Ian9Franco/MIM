"use client";

import React, { useEffect, useRef, useState } from "react";
import { ZoomIn, ZoomOut } from "lucide-react";

interface ImageCropperProps {
  imageUrl: string;
  aspectRatio: number;
  shape?: "circle" | "rect";
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
}

export function ImageCropper({ imageUrl, aspectRatio, shape = "rect", onSave, onCancel }: ImageCropperProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);
  const cropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  }, [imageUrl]);

  const cropAndSave = () => {
    if (!imgRef.current || !cropRef.current) return;
    const imgRect = imgRef.current.getBoundingClientRect();
    const cropRect = cropRef.current.getBoundingClientRect();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const outputWidth = shape === "circle" ? 512 : 1280;
    const outputHeight = Math.round(outputWidth / aspectRatio);
    canvas.width = outputWidth;
    canvas.height = outputHeight;

    const scaleX = imgRef.current.naturalWidth / imgRect.width;
    const scaleY = imgRef.current.naturalHeight / imgRect.height;
    const sx = (cropRect.left - imgRect.left) * scaleX;
    const sy = (cropRect.top - imgRect.top) * scaleY;
    const sw = cropRect.width * scaleX;
    const sh = cropRect.height * scaleY;

    ctx.drawImage(imgRef.current, sx, sy, sw, sh, 0, 0, outputWidth, outputHeight);
    onSave(canvas.toDataURL("image/jpeg", 0.88));
  };

  return (
    <div className="fixed inset-0 z-[999] bg-[#111113] flex flex-col select-none">
      <div
        className="flex-1 relative overflow-hidden flex items-center justify-center touch-none cursor-move"
        onPointerDown={(e) => {
          setDragging(true);
          setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (dragging) setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
        }}
        onPointerUp={(e) => {
          setDragging(false);
          e.currentTarget.releasePointerCapture(e.pointerId);
        }}
        onPointerCancel={() => setDragging(false)}
      >
        <img
          ref={imgRef}
          src={imageUrl}
          alt=""
          className="max-w-none pointer-events-none"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "center" }}
        />
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div
            ref={cropRef}
            className={`relative border-2 ${shape === "circle" ? "rounded-full" : "rounded-xl"}`}
            style={{
              width: "82vw",
              maxWidth: shape === "circle" ? 420 : 760,
              aspectRatio,
              borderColor: "var(--color-primary)",
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.72)",
            }}
          >
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-30">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="border-white/80 border-r border-b last:border-r-0" />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="h-20 shrink-0 border-t border-white/10 bg-[#151518] px-4 flex items-center justify-between gap-4">
        <button onClick={onCancel} className="px-4 py-2 rounded-xl text-xs font-bold text-white/70 hover:bg-white/10">
          Cancelar
        </button>
        <div className="flex items-center gap-3 flex-1 max-w-[220px]">
          <ZoomOut className="w-4 h-4 text-white/40" />
          <input
            type="range"
            min="0.35"
            max="4"
            step="0.01"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-orange-500"
          />
          <ZoomIn className="w-4 h-4 text-white/40" />
        </div>
        <button onClick={cropAndSave} className="px-4 py-2 rounded-xl text-xs font-bold text-white" style={{ background: "var(--color-primary)" }}>
          Aplicar
        </button>
      </div>
    </div>
  );
}
