import React, { useState, useRef, useEffect } from "react";
import { ZoomIn, ZoomOut } from "lucide-react";

export function ImageCropper({
  imageUrl,
  aspectRatio,
  shape = "rect",
  onSave,
  onCancel,
  isModern
}: {
  imageUrl: string;
  aspectRatio: number;
  shape?: "circle" | "rect";
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
  isModern?: boolean;
}) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const cropBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!imgRef.current || !cropBoxRef.current) return;
    const img = new Image();
    img.onload = () => {
      // Auto-fit logic when image loads
      if (!cropBoxRef.current) return;
      const cropRect = cropBoxRef.current.getBoundingClientRect();
      const scaleX = cropRect.width / img.naturalWidth;
      const scaleY = cropRect.height / img.naturalHeight;
      const initialZoom = Math.max(scaleX, scaleY);
      setZoom(initialZoom);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleWheel = (e: React.WheelEvent) => {
    // Wheel event is passive by default in React 17+, but we don't need preventDefault here since it's just state
    setZoom(z => Math.max(0.1, Math.min(z - e.deltaY * 0.002, 5)));
  };

  const cropAndSave = () => {
    if (!imgRef.current || !cropBoxRef.current) return;
    
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cropRect = cropBoxRef.current.getBoundingClientRect();
    const imgRect = imgRef.current.getBoundingClientRect();

    const outputWidth = shape === "circle" ? 512 : 1280;
    const outputHeight = outputWidth / aspectRatio;
    canvas.width = outputWidth;
    canvas.height = outputHeight;

    const scaleX = imgRef.current.naturalWidth / imgRect.width;
    const scaleY = imgRef.current.naturalHeight / imgRect.height;

    const cropX = (cropRect.left - imgRect.left) * scaleX;
    const cropY = (cropRect.top - imgRect.top) * scaleY;

    const sourceWidth = cropRect.width * scaleX;
    const sourceHeight = cropRect.height * scaleY;

    ctx.drawImage(imgRef.current, cropX, cropY, sourceWidth, sourceHeight, 0, 0, outputWidth, outputHeight);
    
    onSave(canvas.toDataURL("image/jpeg", 0.9));
  };

  return (
    <div className="fixed inset-0 z-[999999] bg-[#1a1a1a] flex flex-col select-none">
      <div 
        className="flex-1 relative overflow-hidden flex items-center justify-center cursor-move touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        ref={containerRef}
      >
        {/* The Image */}
        <img 
          ref={imgRef}
          src={imageUrl} 
          alt="" 
          className="max-w-none pointer-events-none"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center",
          }}
        />

        {/* The Crop Mask */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div 
            ref={cropBoxRef}
            className={`relative border-2 border-primary ${shape === "circle" ? "rounded-full" : ""}`}
            style={{
              width: "80vw",
              maxWidth: "800px",
              aspectRatio: `${aspectRatio}`,
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.7)",
            }}
          >
            {/* Grid Lines for aesthetics */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-30">
              <div className="border-r border-white"></div>
              <div className="border-r border-white"></div>
              <div></div>
              <div className="border-r border-t border-b border-white"></div>
              <div className="border-r border-t border-b border-white"></div>
              <div className="border-t border-b border-white"></div>
              <div className="border-r border-white"></div>
              <div className="border-r border-white"></div>
              <div></div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className={`h-20 shrink-0 border-t flex items-center justify-between px-6 ${isModern ? "bg-card border-border" : "bg-[#121214] border-white/10"}`}>
        <button onClick={onCancel} className={`px-4 py-2 rounded-xl font-bold transition-colors ${isModern ? "hover:bg-muted text-foreground" : "hover:bg-white/10 text-white"}`}>
          Cancelar
        </button>

        <div className="flex items-center gap-4">
          <ZoomOut className={`w-5 h-5 ${isModern ? "text-muted-foreground" : "text-white/50"}`} />
          <input 
            type="range" 
            min="0.1" max="5" step="0.01" 
            value={zoom} 
            onChange={e => setZoom(parseFloat(e.target.value))}
            className="w-48 accent-primary"
          />
          <ZoomIn className={`w-5 h-5 ${isModern ? "text-muted-foreground" : "text-white/50"}`} />
        </div>

        <button onClick={cropAndSave} className="px-6 py-2 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity">
          Aplicar
        </button>
      </div>
    </div>
  );
}
