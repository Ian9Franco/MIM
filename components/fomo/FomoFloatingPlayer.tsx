"use client";

import React, { useEffect, useState, useRef } from "react";
import { X, Play, Pause, FastForward, Move, Volume1, Volume2, VolumeX } from "lucide-react";

interface FloatingPlayerState {
  isOpen: boolean;
  videoId: string | null;
}

export function FomoFloatingPlayer() {
  const [state, setState] = useState<FloatingPlayerState>({ isOpen: false, videoId: null });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const positionRef = useRef({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);
  
  const [size, setSize] = useState<"small" | "medium" | "large">("small");
  const sizeRef = useRef<"small" | "medium" | "large">("small");
  
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ 
    startX: number; 
    startY: number; 
    initX: number; 
    initY: number;
    lastTime: number;
    lastX: number;
    lastY: number;
    vx: number;
    vy: number;
  } | null>(null);
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const requestRef = useRef<number | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(100);
  const prevVolumeRef = useRef(100);

  // Sincronizar refs para acceder instantáneamente en el loop de física
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    sizeRef.current = size;
  }, [size]);

  // Enviar volumen actual al cambiar de video para mantener consistencia
  useEffect(() => {
    if (state.isOpen && state.videoId) {
      const t = setTimeout(() => {
        sendCommand("setVolume", [volume]);
      }, 600);
      return () => clearTimeout(t);
    }
  }, [state.videoId]);

  const sizes = {
    small: { w: 350, h: 197 },
    medium: { w: 550, h: 310 },
    large: { w: 800, h: 450 }
  };

  const getFullHeight = (s: "small" | "medium" | "large") => {
    return sizes[s].h + 32 + 40; // video + header (32) + controls (40)
  };

  const clampPosition = (x: number, y: number, currentSize: "small" | "medium" | "large") => {
    const w = sizes[currentSize].w;
    const h = getFullHeight(currentSize);
    const maxX = Math.max(0, window.innerWidth - w - 20);
    const maxY = Math.max(0, window.innerHeight - h - 20);
    return {
      x: Math.max(20, Math.min(x, maxX)),
      y: Math.max(20, Math.min(y, maxY))
    };
  };

  useEffect(() => {
    setPosition(clampPosition(window.innerWidth - 350 - 40, window.innerHeight - getFullHeight("small") - 40, "small"));
    setMounted(true);

    const handlePlay = (e: CustomEvent<{ videoId: string }>) => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      setState({ isOpen: true, videoId: e.detail.videoId });
      setIsPlaying(true);
      setSpeed(1);
    };

    const handleResize = () => {
      setPosition(prev => clampPosition(prev.x, prev.y, sizeRef.current));
    };
    
    window.addEventListener("fomo-play-video" as any, handlePlay);
    window.addEventListener("resize", handleResize);
    
    return () => {
      window.removeEventListener("fomo-play-video" as any, handlePlay);
      window.removeEventListener("resize", handleResize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }
    dragRef.current = { 
      startX: e.clientX, 
      startY: e.clientY, 
      initX: position.x, 
      initY: position.y,
      lastTime: performance.now(),
      lastX: e.clientX,
      lastY: e.clientY,
      vx: 0,
      vy: 0
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragRef.current) return;
    
    const now = performance.now();
    const dt = now - dragRef.current.lastTime;
    
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    
    if (dt > 0) {
      // Velocidad instantánea en pixeles por frame (asumiendo ~60fps)
      const instVx = (e.clientX - dragRef.current.lastX) / dt * 16.66;
      const instVy = (e.clientY - dragRef.current.lastY) / dt * 16.66;
      
      // Filtro paso bajo para suavizar los valores extremos
      dragRef.current.vx = dragRef.current.vx * 0.6 + instVx * 0.4;
      dragRef.current.vy = dragRef.current.vy * 0.6 + instVy * 0.4;
    }
    
    dragRef.current.lastTime = now;
    dragRef.current.lastX = e.clientX;
    dragRef.current.lastY = e.clientY;
    
    setPosition({ x: dragRef.current.initX + dx, y: dragRef.current.initY + dy });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);

    if (dragRef.current) {
      const { vx, vy } = dragRef.current;
      // Arrancar loop de físicas con inercias si se arrojó con cierta velocidad
      if (Math.abs(vx) > 0.5 || Math.abs(vy) > 0.5) {
        startPhysics(vx, vy);
      } else {
        // Si se soltó estático, solo asegurar que esté dentro de los bordes
        setPosition(prev => clampPosition(prev.x, prev.y, size));
      }
    }
    dragRef.current = null;
  };

  const startPhysics = (initialVx: number, initialVy: number) => {
    if (requestRef.current) cancelAnimationFrame(requestRef.current);

    let vx = initialVx;
    let vy = initialVy;
    
    const FRICTION = 0.94; // Freno suave
    const BOUNCE_FACTOR = 0.7; // Rebote tipo DVD elástico y divertido
    const MIN_SPEED = 0.15; // Velocidad mínima para detener el loop

    const updatePhysics = () => {
      let curX = positionRef.current.x;
      let curY = positionRef.current.y;
      
      const currentSize = sizeRef.current;
      const w = sizes[currentSize].w;
      const h = getFullHeight(currentSize);

      // Aplicar fricción / resistencia
      vx *= FRICTION;
      vy *= FRICTION;

      // Actualizar posición
      curX += vx;
      curY += vy;

      // Colisión y rebote Izquierda / Derecha
      if (curX < 10) {
        curX = 10;
        vx = -vx * BOUNCE_FACTOR;
      } else if (curX + w > window.innerWidth - 10) {
        curX = window.innerWidth - w - 10;
        vx = -vx * BOUNCE_FACTOR;
      }

      // Colisión y rebote Arriba / Abajo
      if (curY < 10) {
        curY = 10;
        vy = -vy * BOUNCE_FACTOR;
      } else if (curY + h > window.innerHeight - 10) {
        curY = window.innerHeight - h - 10;
        vy = -vy * BOUNCE_FACTOR;
      }

      setPosition({ x: curX, y: curY });

      // Si la velocidad es casi nula, frenar el loop
      if (Math.abs(vx) < MIN_SPEED && Math.abs(vy) < MIN_SPEED) {
        requestRef.current = null;
      } else {
        requestRef.current = requestAnimationFrame(updatePhysics);
      }
    };

    requestRef.current = requestAnimationFrame(updatePhysics);
  };

  const cycleSize = () => {
    const nextSize = size === "small" ? "medium" : size === "medium" ? "large" : "small";
    setSize(nextSize);
    setPosition(prev => clampPosition(prev.x, prev.y, nextSize));
  };

  const close = () => {
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    setState({ isOpen: false, videoId: null });
  };

  const sendCommand = (func: string, args: any[] = []) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(JSON.stringify({
        event: "command",
        func,
        args
      }), "*");
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      sendCommand("pauseVideo");
      setIsPlaying(false);
    } else {
      sendCommand("playVideo");
      setIsPlaying(true);
    }
  };

  const changeSpeed = () => {
    const nextSpeed = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
    sendCommand("setPlaybackRate", [nextSpeed]);
    setSpeed(nextSpeed);
  };

  const changeVolume = (newVol: number) => {
    setVolume(newVol);
    sendCommand("setVolume", [newVol]);
  };

  const toggleMute = () => {
    if (volume > 0) {
      prevVolumeRef.current = volume;
      changeVolume(0);
    } else {
      changeVolume(prevVolumeRef.current > 0 ? prevVolumeRef.current : 50);
    }
  };

  if (!mounted || !state.isOpen || !state.videoId) return null;

  const currentWidth = sizes[size].w;
  const currentHeight = sizes[size].h;

  return (
    <div
      className="fixed z-[9999] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] rounded-2xl overflow-hidden border flex flex-col select-none transition-[width,height] duration-300 ease-out"
      style={{
        width: currentWidth,
        background: "hsl(220 14% 8%)",
        borderColor: "rgba(255,255,255,0.08)",
        left: position.x,
        top: position.y,
        boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255,255,255,0.05)"
      }}
    >
      {/* Header bar (Draggable) */}
      <div 
        className="h-8 shrink-0 flex items-center justify-between px-3 cursor-grab active:cursor-grabbing border-b border-white/5"
        style={{ background: "rgba(0,0,0,0.5)" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className="flex items-center gap-2 opacity-50 text-white pointer-events-none">
          <Move className="w-3.5 h-3.5" />
          <span className="text-[9px] font-black uppercase tracking-[0.15em]">Reproductor</span>
        </div>
        <div className="flex items-center gap-2 text-white">
          {/* Size Cycle Badge */}
          <button 
            onClick={cycleSize}
            className="px-2 py-0.5 text-[8px] font-black uppercase tracking-wider bg-white/10 hover:bg-white/20 border border-white/10 rounded-md transition-all active:scale-90 cursor-pointer"
            title="Cambiar tamaño (Mini / Normal / Maxi)"
          >
            {size === "small" ? "Mini" : size === "medium" ? "Normal" : "Maxi"}
          </button>
          
          <button 
            onClick={close}
            className="p-1 hover:bg-red-500/25 hover:text-red-400 rounded-md transition-colors opacity-70 hover:opacity-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Video Content */}
      <div className="relative bg-black w-full shrink-0" style={{ height: currentHeight }}>
        <iframe
          ref={iframeRef}
          width="100%"
          height="100%"
          src={`https://www.youtube.com/embed/${state.videoId}?enablejsapi=1&autoplay=1&controls=0&modestbranding=1&rel=0`}
          frameBorder="0"
          allow="autoplay; encrypted-media"
          allowFullScreen
          className={isDragging ? "pointer-events-none" : "pointer-events-auto"}
        ></iframe>
      </div>

      {/* Controls */}
      <div className="h-10 shrink-0 flex items-center justify-between px-4 text-white" style={{ background: "rgba(0,0,0,0.5)" }}>
        {/* Play/Pause & Speed */}
        <div className="flex items-center gap-3">
          <button 
            onClick={togglePlay}
            className="w-7 h-7 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/15 border border-white/10 transition-all active:scale-95 cursor-pointer"
            title={isPlaying ? "Pausar" : "Reproducir"}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
          </button>
          <button 
            onClick={changeSpeed}
            className="px-2 py-1 h-7 rounded-lg text-[9px] font-bold flex items-center gap-1 bg-white/5 hover:bg-white/15 border border-white/10 transition-all active:scale-95 cursor-pointer"
            title="Velocidad de reproducción"
          >
            <FastForward className="w-3 h-3" />
            {speed}x
          </button>
        </div>

        {/* Volume slider */}
        <div className="flex items-center gap-2">
          <button 
            onClick={toggleMute}
            className="w-7 h-7 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/15 border border-white/10 transition-all active:scale-95 cursor-pointer"
            title={volume === 0 ? "Activar sonido" : "Silenciar"}
          >
            {volume === 0 ? (
              <VolumeX className="w-3.5 h-3.5 text-red-400" />
            ) : volume < 50 ? (
              <Volume1 className="w-3.5 h-3.5 text-white/85" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
          </button>
          <input 
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              changeVolume(val);
            }}
            className="w-16 sm:w-20 h-1 rounded-lg appearance-none cursor-pointer bg-white/15 accent-red-500 hover:accent-red-400 outline-none transition-all"
            title={`Volumen: ${volume}%`}
          />
        </div>
      </div>
    </div>
  );
}
