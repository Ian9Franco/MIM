"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, Maximize2, Minimize2, Move, X } from "lucide-react";
import { playFomoSound } from "../lib/sounds";

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
  return getSizes()[size].h + 36;
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
      playFomoSound("on");
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

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    sizeRef.current = size;
  }, [size]);

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
    if (target.closest("button") || target.closest("a")) return;

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
    playFomoSound("on");
  };

  const close = () => {
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    setState({ isOpen: false, videoId: null });
    playFomoSound("off");
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
        }}
        initial={{ opacity: 0, scale: 0.9, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 18 }}
        transition={{ type: "spring", stiffness: 360, damping: 25, bounce: 0.22 }}
      >
        <div
          className="h-9 cursor-grab active:cursor-grabbing flex items-center justify-between gap-2 border-b px-3"
          style={{ borderColor: "var(--color-border)", background: "rgba(0,0,0,0.38)" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <div className="pointer-events-none flex min-w-0 items-center gap-2">
            <Move className="w-3.5 h-3.5 text-white/45" />
            <span className="truncate text-[9px] font-black uppercase tracking-[0.18em]" style={{ color: "var(--color-primary)" }}>
              Showcase Player
            </span>
          </div>
          <div className="flex items-center gap-1 text-white">
            {/* Reduce button — only visible in large mode */}
            {size === "large" && (
              <button
                type="button"
                onClick={toggleSize}
                className="p-1.5 rounded-lg bg-white/5 border border-white/[0.08] text-white/65 active:scale-90 transition-all"
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
                className="p-1.5 rounded-lg bg-white/5 border border-white/[0.08] text-white/65 active:scale-90 transition-all"
                title="Modo grande"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            )}
            <a
              href={`https://www.youtube.com/watch?v=${state.videoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg bg-white/5 border border-white/[0.08] text-white/65 active:scale-90 transition-all"
              title="Abrir en YouTube"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              type="button"
              onClick={close}
              className="p-1.5 rounded-lg bg-white/5 border border-white/[0.08] text-white/65 active:scale-90 transition-all hover:text-red-300"
              title="Cerrar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="relative bg-black" style={{ height: current.h }}>
          <iframe
            key={state.videoId}
            src={embedSrc}
            className={`absolute inset-0 h-full w-full ${isDragging ? "pointer-events-none" : ""}`}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            title="YouTube showcase player"
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
