"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, Maximize2, Minimize2, Move, X, Play, Pause, FastForward, Volume1, Volume2, VolumeX, RotateCcw, RotateCw } from "lucide-react";

type PlayerSize = "large" | "mini";

interface PlayerState {
  isOpen: boolean;
  videoId: string | null;
}

const EDGE = 10;

function getSizes() {
  if (typeof window === "undefined") {
    return {
      large: { w: 420, h: 236 },
      mini: { w: 240, h: 135 },
    };
  }

  const largeW = Math.min(440, window.innerWidth - 16);
  const miniW = Math.min(260, window.innerWidth - 24);
  return {
    large: { w: largeW, h: Math.round(largeW * 9 / 16) },
    mini: { w: miniW, h: Math.round(miniW * 9 / 16) },
  };
}

function fullHeight(size: PlayerSize) {
  return getSizes()[size].h + 36 + 60; // 36px header + 20px seek bar + 40px controls
}

function clampPosition(x: number, y: number, size: PlayerSize) {
  if (typeof window === "undefined") return { x, y };
  const sizes = getSizes();
  const w = sizes[size].w;
  const h = fullHeight(size);
  const maxX = Math.max(EDGE, window.innerWidth - w - EDGE);
  const maxY = Math.max(EDGE, window.innerHeight - h - EDGE);

  return {
    x: Math.max(EDGE, Math.min(x, maxX)),
    y: Math.max(EDGE, Math.min(y, maxY)),
  };
}

export function MobileFloatingPlayer() {
  const [state, setState] = useState<PlayerState>({ isOpen: false, videoId: null });
  const [mounted, setMounted] = useState(false);
  const [size, setSize] = useState<PlayerSize>("large");
  const [position, setPosition] = useState({ x: 12, y: 120 });
  const [isDragging, setIsDragging] = useState(false);

  const positionRef = useRef(position);
  const sizeRef = useRef(size);
  const requestRef = useRef<number | null>(null);
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

  // Playback control states
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(100);
  const prevVolumeRef = useRef(100);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const isSeekingRef = useRef(false);
  const [hoverLeft, setHoverLeft] = useState<number | null>(null);

  // Keep ref synchronized with state
  useEffect(() => {
    isSeekingRef.current = isSeeking;
  }, [isSeeking]);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    sizeRef.current = size;
  }, [size]);

  const sendCommand = useCallback((func: string, args: any[] = []) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: "command", func, args }),
        "*"
      );
    }
  }, []);

  const sendListening = useCallback(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: "listening" }),
        "*"
      );
    }
  }, []);

  const handleIframeReady = useCallback(() => {
    setTimeout(() => {
      sendCommand("playVideo");
      sendCommand("setVolume", [volume]);
      sendListening();
    }, 600);
  }, [sendCommand, sendListening, volume]);

  useEffect(() => {
    setMounted(true);
    const initial = clampPosition(
      Math.max(8, (window.innerWidth - getSizes().large.w) / 2),
      window.innerHeight - fullHeight("large") - 18,
      "large"
    );
    setPosition(initial);

    const handlePlay = (event: Event) => {
      const detail = (event as CustomEvent<{ videoId?: string }>).detail;
      if (!detail?.videoId) return;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      setSize("large");
      setPosition(clampPosition(
        Math.max(8, (window.innerWidth - getSizes().large.w) / 2),
        window.innerHeight - fullHeight("large") - 18,
        "large"
      ));
      setState({ isOpen: true, videoId: detail.videoId });
      setIsPlaying(true);
      setSpeed(1);
      setCurrentTime(0);
      setDuration(0);
    };

    const handleResize = () => {
      setPosition((prev) => clampPosition(prev.x, prev.y, sizeRef.current));
    };

    window.addEventListener("fomo-play-video", handlePlay);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("fomo-play-video", handlePlay);
      window.removeEventListener("resize", handleResize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  // Listen for message events from the YouTube iframe API
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data && data.event === "infoDelivery" && data.info) {
          const { currentTime: cTime, duration: dur } = data.info;
          if (cTime !== undefined && !isSeekingRef.current) {
            setCurrentTime(cTime);
          }
          if (dur !== undefined) {
            setDuration(dur);
          }
        }
      } catch (e) {
        // Ignore invalid/unrelated messages
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  // Send a periodic 'listening' signal to ensure continuous updates from the iframe
  useEffect(() => {
    if (state.isOpen && state.videoId) {
      const interval = setInterval(() => {
        sendListening();
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [state.isOpen, state.videoId, sendListening]);

  // Keep volume consistent when the video changes
  useEffect(() => {
    if (state.isOpen && state.videoId) {
      const t = setTimeout(() => {
        sendCommand("setVolume", [volume]);
        sendListening();
      }, 600);
      return () => clearTimeout(t);
    }
  }, [state.videoId, state.isOpen, volume, sendCommand, sendListening]);

  // Reset playback position on video changes
  useEffect(() => {
    if (state.videoId) {
      setCurrentTime(0);
      setDuration(0);
    }
  }, [state.videoId]);

  const embedSrc = useMemo(() => {
    if (!state.videoId) return "";
    const origin = typeof window !== "undefined" ? encodeURIComponent(window.location.origin) : "";
    return `https://www.youtube.com/embed/${state.videoId}?autoplay=1&playsinline=1&enablejsapi=1&modestbranding=1&rel=0&origin=${origin}`;
  }, [state.videoId]);

  const startPhysics = useCallback((initialVx: number, initialVy: number) => {
    if (requestRef.current) cancelAnimationFrame(requestRef.current);

    let vx = initialVx;
    let vy = initialVy;
    const friction = 0.94;
    const bounce = 0.68;
    const minSpeed = 0.16;

    const step = () => {
      const sizes = getSizes();
      const currentSize = sizeRef.current;
      const w = sizes[currentSize].w;
      const h = fullHeight(currentSize);
      let x = positionRef.current.x + vx;
      let y = positionRef.current.y + vy;

      vx *= friction;
      vy *= friction;

      if (x < EDGE) {
        x = EDGE;
        vx = -vx * bounce;
      } else if (x + w > window.innerWidth - EDGE) {
        x = window.innerWidth - w - EDGE;
        vx = -vx * bounce;
      }

      if (y < EDGE) {
        y = EDGE;
        vy = -vy * bounce;
      } else if (y + h > window.innerHeight - EDGE) {
        y = window.innerHeight - h - EDGE;
        vy = -vy * bounce;
      }

      setPosition({ x, y });

      if (Math.abs(vx) < minSpeed && Math.abs(vy) < minSpeed) {
        requestRef.current = null;
        setPosition((prev) => clampPosition(prev.x, prev.y, sizeRef.current));
        return;
      }

      requestRef.current = requestAnimationFrame(step);
    };

    requestRef.current = requestAnimationFrame(step);
  }, []);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("button") || target.closest("a") || target.closest("input")) return;

    setIsDragging(true);
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      initX: positionRef.current.x,
      initY: positionRef.current.y,
      lastTime: performance.now(),
      lastX: event.clientX,
      lastY: event.clientY,
      vx: 0,
      vy: 0,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const now = performance.now();
    const dt = Math.max(1, now - dragRef.current.lastTime);
    const dx = event.clientX - dragRef.current.startX;
    const dy = event.clientY - dragRef.current.startY;
    const vx = ((event.clientX - dragRef.current.lastX) / dt) * 16.66;
    const vy = ((event.clientY - dragRef.current.lastY) / dt) * 16.66;

    dragRef.current.vx = dragRef.current.vx * 0.6 + vx * 0.4;
    dragRef.current.vy = dragRef.current.vy * 0.6 + vy * 0.4;
    dragRef.current.lastTime = now;
    dragRef.current.lastX = event.clientX;
    dragRef.current.lastY = event.clientY;

    setPosition({ x: dragRef.current.initX + dx, y: dragRef.current.initY + dy });
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {}

    if (dragRef.current) {
      const { vx, vy } = dragRef.current;
      if (Math.abs(vx) > 0.5 || Math.abs(vy) > 0.5) startPhysics(vx, vy);
      else setPosition((prev) => clampPosition(prev.x, prev.y, size));
    }
    dragRef.current = null;
  };

  const toggleSize = () => {
    const next = size === "large" ? "mini" : "large";
    setSize(next);
    setPosition((prev) => clampPosition(prev.x, prev.y, next));
  };

  const close = () => {
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    setState({ isOpen: false, videoId: null });
  };

  // Playback control handlers
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

  const handleRewind = () => {
    const newTime = Math.max(0, currentTime - 15);
    setCurrentTime(newTime);
    sendCommand("seekTo", [newTime, true]);
  };

  const handleForward = () => {
    if (!duration) return;
    const newTime = Math.min(duration, currentTime + 15);
    setCurrentTime(newTime);
    sendCommand("seekTo", [newTime, true]);
  };

  // Seek bar event handlers
  const handleSeekStart = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsSeeking(true);
    setHoverLeft(null);
    if (duration) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = Math.max(0, Math.min(1, x / rect.width));
      const newTime = pct * duration;
      setCurrentTime(newTime);
    }
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleSeekMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));

    if (isSeekingRef.current) {
      const newTime = pct * duration;
      setCurrentTime(newTime);
    } else {
      setHoverLeft(pct * 100);
    }
  };

  const handleSeekEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    const newTime = pct * duration;

    sendCommand("seekTo", [newTime, true]);
    setIsSeeking(false);
    setHoverLeft(null);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleSeekLeave = () => {
    setHoverLeft(null);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds === Infinity) return "0:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const sStr = s < 10 ? `0${s}` : s;
    if (h > 0) {
      const mStr = m < 10 ? `0${m}` : m;
      return `${h}:${mStr}:${sStr}`;
    }
    return `${m}:${sStr}`;
  };

  if (!mounted || !state.isOpen || !state.videoId) return null;

  const current = getSizes()[size];

  return (
    <AnimatePresence>
      <motion.div
        className="fixed z-[650] select-none overflow-hidden rounded-2xl border shadow-[0_22px_70px_rgba(0,0,0,0.68)]"
        style={{
          width: current.w,
          left: position.x,
          top: position.y,
          background: "color-mix(in srgb, var(--color-surface) 97%, black)",
          borderColor: "var(--color-border-strong)",
          touchAction: "none",
        }}
        initial={{ opacity: 0, scale: 0.9, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 18 }}
        transition={{ type: "spring", stiffness: 360, damping: 25, bounce: 0.22 }}
      >
        {/* Header bar (Draggable) */}
        <div
          className="h-9 cursor-grab active:cursor-grabbing flex items-center justify-between gap-2 border-b px-3"
          style={{ 
            borderColor: "var(--color-border)", 
            background: "color-mix(in srgb, var(--color-surface) 90%, black)", 
            touchAction: "none" 
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <div className="pointer-events-none flex min-w-0 items-center gap-2">
            <Move className="w-3.5 h-3.5" style={{ color: "var(--color-foreground)", opacity: 0.5 }} />
            <span className="truncate text-[9px] font-black uppercase tracking-[0.18em]" style={{ color: "var(--color-primary)" }}>
              Showcase Player
            </span>
          </div>
          <div className="flex items-center gap-1" style={{ color: "var(--color-foreground)" }}>
            {/* Reduce button — only visible in large mode */}
            {size === "large" && (
              <button
                type="button"
                onClick={toggleSize}
                className="p-1.5 rounded-lg bg-foreground/5 border border-foreground/10 active:scale-90 transition-all cursor-pointer hover:bg-foreground/10"
                style={{ color: "var(--color-foreground)" }}
                title="Modo mini"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
            )}
            {/* Expand button — only visible in mini mode */}
            {size === "mini" && (
              <button
                type="button"
                onClick={toggleSize}
                className="p-1.5 rounded-lg bg-foreground/5 border border-foreground/10 active:scale-90 transition-all cursor-pointer hover:bg-foreground/10"
                style={{ color: "var(--color-foreground)" }}
                title="Modo grande"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            )}
            <a
              href={`https://www.youtube.com/watch?v=${state.videoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg bg-foreground/5 border border-foreground/10 active:scale-90 transition-all hover:bg-foreground/10 flex items-center justify-center"
              style={{ color: "var(--color-foreground)" }}
              title="Abrir en YouTube"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              type="button"
              onClick={close}
              className="p-1.5 rounded-lg bg-foreground/5 border border-foreground/10 active:scale-90 transition-all hover:text-red-500 hover:bg-foreground/10 cursor-pointer"
              style={{ color: "var(--color-foreground)" }}
              title="Cerrar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Video Frame */}
        <div className="relative bg-black w-full shrink-0" style={{ height: current.h }}>
          <iframe
            ref={iframeRef}
            key={state.videoId}
            src={embedSrc}
            className={`absolute inset-0 h-full w-full ${isDragging ? "pointer-events-none" : ""}`}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            title="YouTube showcase player"
            onLoad={handleIframeReady}
          />
        </div>

        {/* Seek Bar & Telemetry Display */}
        <div 
          className="px-4 py-1.5 flex items-center gap-3 select-none border-b"
          style={{ 
            height: 20, 
            background: "color-mix(in srgb, var(--color-surface) 95%, black)", 
            borderColor: "var(--color-border)" 
          }}
        >
          {/* Current Time Indicator */}
          <span 
            className="text-[9px] font-mono tracking-wider tabular-nums min-w-[30px] text-right"
            style={{ color: "var(--color-foreground)", opacity: 0.6 }}
          >
            {formatTime(currentTime)}
          </span>
          
          {/* Custom Draggable Progress Track */}
          <div 
            className="flex-1 relative h-3 flex items-center cursor-pointer group"
            onPointerDown={handleSeekStart}
            onPointerMove={handleSeekMove}
            onPointerUp={handleSeekEnd}
            onPointerLeave={handleSeekLeave}
          >
            {/* Layer 1: Background Track */}
            <div className="w-full h-1 rounded-full bg-foreground/10 group-hover:bg-foreground/15 group-hover:h-1.5 transition-all duration-200" />
            
            {/* Layer 2: Hover Preview Bar */}
            {hoverLeft !== null && !isSeeking && (
              <div 
                className="absolute left-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-foreground/25 group-hover:h-1.5 transition-all duration-200 pointer-events-none"
                style={{ width: `${hoverLeft}%` }}
              />
            )}
            
            {/* Layer 3: Progress Fill */}
            <div 
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-gradient-to-r from-red-600 to-rose-500 group-hover:h-1.5 transition-all duration-200 pointer-events-none"
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            />
            
            {/* Layer 4: Draggable Thumb Indicator */}
            <div 
              className={`absolute top-1/2 -translate-y-1/2 -ml-1.5 w-3 h-3 rounded-full bg-white border border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] transition-transform duration-200 pointer-events-none ${isSeeking ? "scale-100" : "scale-0 group-hover:scale-100"}`}
              style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>

          {/* Total Duration Indicator */}
          <span 
            className="text-[9px] font-mono tracking-wider tabular-nums min-w-[30px]"
            style={{ color: "var(--color-foreground)", opacity: 0.6 }}
          >
            {formatTime(duration)}
          </span>
        </div>

        {/* Playback Controls */}
        <div 
          className="h-10 shrink-0 flex items-center justify-between px-4" 
          style={{ background: "color-mix(in srgb, var(--color-surface) 93%, black)" }}
        >
          {/* Play/Pause & Speed & Navigation buttons */}
          <div className="flex items-center gap-2">
            {/* Skip Backward 15s */}
            <button 
              onClick={handleRewind}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-foreground/5 hover:bg-foreground/15 border border-foreground/10 transition-all active:scale-90 cursor-pointer"
              style={{ color: "var(--color-foreground)" }}
              title="Retroceder 15 segundos"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Play / Pause Toggle */}
            <button 
              onClick={togglePlay}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-foreground/5 hover:bg-foreground/15 border border-foreground/10 transition-all active:scale-95 cursor-pointer"
              style={{ color: "var(--color-foreground)" }}
              title={isPlaying ? "Pausar" : "Reproducir"}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
            </button>

            {/* Skip Forward 15s */}
            <button 
              onClick={handleForward}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-foreground/5 hover:bg-foreground/15 border border-foreground/10 transition-all active:scale-90 cursor-pointer"
              style={{ color: "var(--color-foreground)" }}
              title="Adelantar 15 segundos"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            {/* Speed Selector (Hidden in mini mode) */}
            {size !== "mini" && (
              <button 
                onClick={changeSpeed}
                className="px-2 py-1 h-7 rounded-lg text-[9px] font-bold flex items-center gap-1 bg-foreground/5 hover:bg-foreground/15 border border-foreground/10 transition-all active:scale-95 cursor-pointer ml-1"
                style={{ color: "var(--color-foreground)" }}
                title="Velocidad de reproducción"
              >
                <FastForward className="w-3 h-3" />
                {speed}x
              </button>
            )}
          </div>

          {/* Volume Controls */}
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleMute}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-foreground/5 hover:bg-foreground/15 border border-foreground/10 transition-all active:scale-95 cursor-pointer"
              style={{ color: "var(--color-foreground)" }}
              title={volume === 0 ? "Activar sonido" : "Silenciar"}
            >
              {volume === 0 ? (
                <VolumeX className="w-3.5 h-3.5 text-red-500" />
              ) : volume < 50 ? (
                <Volume1 className="w-3.5 h-3.5" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
            </button>
            
            {/* Volume slider (Hidden in mini mode to prevent overflow) */}
            {size !== "mini" && (
              <input 
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  changeVolume(val);
                }}
                className="w-16 sm:w-20 h-1 rounded-lg appearance-none cursor-pointer bg-foreground/15 accent-red-500 hover:accent-red-400 outline-none transition-all"
                title={`Volumen: ${volume}%`}
              />
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
