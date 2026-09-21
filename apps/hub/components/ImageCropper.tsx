"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ZoomIn, ZoomOut } from "lucide-react";

interface ImageCropperProps {
  imageUrl: string;
  aspectRatio: number;
  shape?: "circle" | "rect";
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
}

const MIN_ZOOM = 0.35;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.15;

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

function pointerDistance(
  a: { x: number; y: number },
  b: { x: number; y: number },
) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

/**
 * Full-screen image cropper.
 * Portaled to document.body so it always stacks above BottomNav (z-50) and
 * parent modals that share the same stacking context (e.g. DraftMetadataModal).
 */
export function ImageCropper({
  imageUrl,
  aspectRatio,
  shape = "rect",
  onSave,
  onCancel,
}: ImageCropperProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const cropRef = useRef<HTMLDivElement>(null);
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef<{ startDist: number; startZoom: number } | null>(null);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  }, [imageUrl]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

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

  const syncPointers = (e: React.PointerEvent) => {
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  };

  const beginPinchIfNeeded = () => {
    if (pointersRef.current.size !== 2) {
      pinchRef.current = null;
      return;
    }
    const [a, b] = Array.from(pointersRef.current.values());
    pinchRef.current = {
      startDist: Math.max(1, pointerDistance(a, b)),
      startZoom: zoomRef.current,
    };
    setDragging(false);
  };

  const onStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    syncPointers(e);
    if (pointersRef.current.size >= 2) {
      beginPinchIfNeeded();
      return;
    }
    setDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const onStagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    syncPointers(e);

    if (pointersRef.current.size >= 2 && pinchRef.current) {
      const [a, b] = Array.from(pointersRef.current.values());
      const dist = Math.max(1, pointerDistance(a, b));
      const next = clampZoom(pinchRef.current.startZoom * (dist / pinchRef.current.startDist));
      setZoom(next);
      return;
    }

    if (dragging && pointersRef.current.size === 1) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const onStagePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(e.pointerId);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    if (pointersRef.current.size < 2) {
      pinchRef.current = null;
    }
    if (pointersRef.current.size === 1) {
      const remaining = Array.from(pointersRef.current.values())[0];
      setDragging(true);
      setDragStart({ x: remaining.x - pan.x, y: remaining.y - pan.y });
    } else {
      setDragging(false);
    }
  };

  const ui = (
    <div
      className="fixed inset-0 z-[10000] bg-[#111113] flex flex-col select-none"
      role="dialog"
      aria-modal="true"
      aria-label="Recortar imagen"
    >
      <div
        className="flex-1 relative overflow-hidden flex items-center justify-center touch-none cursor-move min-h-0"
        onPointerDown={onStagePointerDown}
        onPointerMove={onStagePointerMove}
        onPointerUp={onStagePointerUp}
        onPointerCancel={onStagePointerUp}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={imageUrl}
          alt=""
          className="max-w-none pointer-events-none"
          draggable={false}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center",
          }}
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

      <div
        className="shrink-0 border-t border-white/10 bg-[#151518] px-3 pt-3 flex flex-col gap-3"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            aria-label="Alejar"
            onClick={() => setZoom((z) => clampZoom(z - ZOOM_STEP))}
            className="h-10 w-10 rounded-xl flex items-center justify-center text-white/80 bg-white/5 hover:bg-white/10 active:scale-95 transition-all"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            aria-label="Zoom"
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 max-w-[220px] accent-orange-500 h-10"
          />
          <button
            type="button"
            aria-label="Acercar"
            onClick={() => setZoom((z) => clampZoom(z + ZOOM_STEP))}
            className="h-10 w-10 rounded-xl flex items-center justify-center text-white/80 bg-white/5 hover:bg-white/10 active:scale-95 transition-all"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 min-h-11 px-4 py-2.5 rounded-xl text-sm font-bold text-white/80 bg-white/5 hover:bg-white/10 active:scale-[0.98] transition-all"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={cropAndSave}
            className="flex-1 min-h-11 px-4 py-2.5 rounded-xl text-sm font-bold text-white active:scale-[0.98] transition-all"
            style={{ background: "var(--color-primary)" }}
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );

  if (!mounted || typeof document === "undefined") return null;
  return createPortal(ui, document.body);
}
