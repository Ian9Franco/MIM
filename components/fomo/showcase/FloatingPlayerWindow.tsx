"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ExternalLink,
  Move,
  X,
  Play,
  Pause,
  FastForward,
  Volume1,
  Volume2,
  VolumeX,
  RotateCcw,
  RotateCw,
} from "lucide-react";
import {
  type PlayerSizeKey,
  cyclePlayerSize,
  getPlayerFullHeight,
  getPlayerVideoSize,
  playerSizeLabel,
} from "@/lib/fomo/playVideo";
import {
  getHubPlayerFullHeight,
  getHubPlayerVideoSize,
} from "@/lib/fomo/floatingPlayerLayout";
import { useSingleFloatingPlayer } from "@/hooks/fomo/useSingleFloatingPlayer";

const EDGE = 10;

type Variant = "desktop" | "hub";

function clampPosition(
  x: number,
  y: number,
  size: PlayerSizeKey,
  isShort: boolean,
  variant: Variant,
) {
  if (typeof window === "undefined") return { x, y };
  const { w } = variant === "hub" ? getHubPlayerVideoSize(size, isShort) : getPlayerVideoSize(size, isShort);
  const h =
    variant === "hub" ? getHubPlayerFullHeight(size, isShort) : getPlayerFullHeight(size, isShort);
  const maxX = Math.max(EDGE, window.innerWidth - w - EDGE);
  const maxY = Math.max(EDGE, window.innerHeight - h - EDGE);
  return { x: Math.max(EDGE, Math.min(x, maxX)), y: Math.max(EDGE, Math.min(y, maxY)) };
}

const YoutubePlayerIframe = React.memo(function YoutubePlayerIframe({
  videoId,
  isDragging,
  iframeRef,
  onReady,
  autoplay,
}: {
  videoId: string;
  isDragging: boolean;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  onReady: () => void;
  autoplay: boolean;
}) {
  const src = useMemo(() => {
    const origin =
      typeof window !== "undefined" ? encodeURIComponent(window.location.origin) : "";
    return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=${autoplay ? 1 : 0}&controls=0&modestbranding=1&rel=0&playsinline=1&origin=${origin}`;
  }, [videoId, autoplay]);

  return (
    <iframe
      ref={iframeRef}
      key={videoId}
      width="100%"
      height="100%"
      src={src}
      frameBorder="0"
      allow="autoplay; encrypted-media; picture-in-picture"
      allowFullScreen
      className={isDragging ? "pointer-events-none" : "pointer-events-auto"}
      onLoad={onReady}
      title="YouTube player"
    />
  );
});

export type FloatingPlayerWindowProps = {
  variant: Variant;
  videoId: string;
  isShort: boolean;
  size: PlayerSizeKey;
  position: { x: number; y: number };
  hasAudio: boolean;
  zIndex: number;
  slotIndex: number;
  totalPlayers: number;
  onClose: () => void;
  onRequestAudio: () => void;
  onFocus: () => void;
  onPositionChange: (position: { x: number; y: number }) => void;
  onSizeChange: (size: PlayerSizeKey) => void;
};

export function FloatingPlayerWindow({
  variant,
  videoId,
  isShort,
  size,
  position,
  hasAudio,
  zIndex,
  slotIndex,
  totalPlayers,
  onClose,
  onRequestAudio,
  onFocus,
  onPositionChange,
  onSizeChange,
}: FloatingPlayerWindowProps) {
  const positionRef = useRef(position);
  const sizeRef = useRef(size);
  const isShortRef = useRef(isShort);
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

  const [isDragging, setIsDragging] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimerRef = useRef<number | null>(null);

  const player = useSingleFloatingPlayer({ videoId, hasAudio, onRequestAudio });

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    sizeRef.current = size;
  }, [size]);

  useEffect(() => {
    isShortRef.current = isShort;
  }, [isShort]);

  const clearControlsTimer = useCallback(() => {
    if (controlsTimerRef.current) {
      window.clearTimeout(controlsTimerRef.current);
      controlsTimerRef.current = null;
    }
  }, []);

  const revealControls = useCallback(
    (keepVisible = false) => {
      if (variant !== "hub") return;
      setControlsVisible(true);
      clearControlsTimer();
      if (keepVisible) return;
      controlsTimerRef.current = window.setTimeout(() => setControlsVisible(false), 2000);
    },
    [variant, clearControlsTimer],
  );

  useEffect(() => {
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      clearControlsTimer();
    };
  }, [clearControlsTimer]);

  const dimensions =
    variant === "hub"
      ? getHubPlayerVideoSize(size, isShort)
      : getPlayerVideoSize(size, isShort);

  const startPhysics = useCallback(
    (initialVx: number, initialVy: number) => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      let vx = initialVx;
      let vy = initialVy;
      const friction = 0.94;
      const bounce = variant === "hub" ? 0.68 : 0.7;
      const minSpeed = variant === "hub" ? 0.16 : 0.15;

      const step = () => {
        const short = isShortRef.current;
        const currentSize = sizeRef.current;
        const { w } =
          variant === "hub" ? getHubPlayerVideoSize(currentSize, short) : getPlayerVideoSize(currentSize, short);
        const h =
          variant === "hub"
            ? getHubPlayerFullHeight(currentSize, short)
            : getPlayerFullHeight(currentSize, short);

        let curX = positionRef.current.x + vx;
        let curY = positionRef.current.y + vy;
        vx *= friction;
        vy *= friction;

        if (curX < EDGE) {
          curX = EDGE;
          vx = -vx * bounce;
        } else if (curX + w > window.innerWidth - EDGE) {
          curX = window.innerWidth - w - EDGE;
          vx = -vx * bounce;
        }
        if (curY < EDGE) {
          curY = EDGE;
          vy = -vy * bounce;
        } else if (curY + h > window.innerHeight - EDGE) {
          curY = window.innerHeight - h - EDGE;
          vy = -vy * bounce;
        }

        const next = { x: curX, y: curY };
        positionRef.current = next;
        onPositionChange(next);

        if (Math.abs(vx) < minSpeed && Math.abs(vy) < minSpeed) {
          requestRef.current = null;
          const clamped = clampPosition(curX, curY, currentSize, short, variant);
          positionRef.current = clamped;
          onPositionChange(clamped);
        } else {
          requestRef.current = requestAnimationFrame(step);
        }
      };

      requestRef.current = requestAnimationFrame(step);
    },
    [variant, onPositionChange],
  );

  const isInteractiveTarget = (target: EventTarget | null) => {
    const el = target as HTMLElement | null;
    if (!el) return false;
    return Boolean(el.closest("button, a, input, [data-player-no-drag]"));
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isInteractiveTarget(e.target)) return;

    onFocus();
    if (variant === "hub") revealControls();

    setIsDragging(true);
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: position.x,
      initY: position.y,
      lastTime: performance.now(),
      lastX: e.clientX,
      lastY: e.clientY,
      vx: 0,
      vy: 0,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (variant === "hub") revealControls(Boolean(dragRef.current));
    if (!isDragging || !dragRef.current) return;

    const now = performance.now();
    const dt = Math.max(1, now - dragRef.current.lastTime);
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const instVx = ((e.clientX - dragRef.current.lastX) / dt) * 16.66;
    const instVy = ((e.clientY - dragRef.current.lastY) / dt) * 16.66;
    dragRef.current.vx = dragRef.current.vx * 0.6 + instVx * 0.4;
    dragRef.current.vy = dragRef.current.vy * 0.6 + instVy * 0.4;
    dragRef.current.lastTime = now;
    dragRef.current.lastX = e.clientX;
    dragRef.current.lastY = e.clientY;

    const next = { x: dragRef.current.initX + dx, y: dragRef.current.initY + dy };
    positionRef.current = next;
    onPositionChange(next);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    if (variant === "hub") revealControls();
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // already released
    }

    if (dragRef.current) {
      const { vx, vy } = dragRef.current;
      if (Math.abs(vx) > 0.5 || Math.abs(vy) > 0.5) startPhysics(vx, vy);
      else {
        const clamped = clampPosition(positionRef.current.x, positionRef.current.y, size, isShort, variant);
        onPositionChange(clamped);
      }
    }
    dragRef.current = null;
  };

  const cycleSize = () => {
    if (variant === "hub") revealControls();
    const next = cyclePlayerSize(size);
    onSizeChange(next);
    onPositionChange(clampPosition(position.x, position.y, next, isShort, variant));
  };

  const showChrome = variant === "desktop" || controlsVisible || isDragging || player.isSeeking;
  const videoAsDragSurface = variant === "hub" && (isDragging || !showChrome);
  const audioRing = hasAudio ? "ring-2 ring-emerald-500/70" : "ring-1 ring-white/10";

  const shellClass =
    variant === "desktop"
      ? `fomo-floating-player fixed shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] rounded-2xl overflow-hidden border flex flex-col select-none transition-[width,height] duration-300 ease-out ${isShort ? "fomo-floating-player--short" : ""} ${audioRing}`
      : `fixed select-none overflow-hidden rounded-2xl border shadow-[0_22px_70px_rgba(0,0,0,0.68)] ${audioRing}`;

  const shellStyle: React.CSSProperties =
    variant === "desktop"
      ? {
          width: dimensions.w,
          background: "hsl(220 14% 8%)",
          borderColor: hasAudio ? "rgba(52,211,153,0.45)" : "rgba(255,255,255,0.08)",
          left: position.x,
          top: position.y,
          zIndex,
          boxShadow: hasAudio
            ? "0 20px 50px rgba(0,0,0,0.6), 0 0 0 1px rgba(52,211,153,0.25)"
            : "0 20px 50px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255,255,255,0.05)",
        }
      : {
          width: dimensions.w,
          left: position.x,
          top: position.y,
          zIndex,
          background: "color-mix(in srgb, var(--color-surface) 97%, black)",
          borderColor: hasAudio ? "color-mix(in srgb, var(--color-primary) 55%, transparent)" : "var(--color-border-strong)",
          touchAction: "none",
        };

  const headerContent = (
    <>
      <div className="flex items-center gap-2 opacity-70 pointer-events-none min-w-0">
        <Move className="w-3.5 h-3.5 shrink-0" />
        <span
          className={`truncate text-[9px] font-black uppercase tracking-[0.15em] ${variant === "hub" ? "" : "text-white"}`}
          style={variant === "hub" ? { color: "var(--color-primary)" } : undefined}
        >
          {isShort ? "Short" : variant === "hub" ? "Showcase" : "Reproductor"}
        </span>
        <span
          className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10"
          style={variant === "hub" ? { color: "var(--color-foreground)", opacity: 0.55 } : { color: "white", opacity: 0.55 }}
        >
          {slotIndex + 1}/{totalPlayers}
        </span>
      </div>
      <div className={`flex items-center gap-1.5 shrink-0 ${variant === "desktop" ? "text-white" : ""}`} style={variant === "hub" ? { color: "var(--color-foreground)" } : undefined}>
        {!hasAudio && (
          <button
            type="button"
            data-player-no-drag
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onRequestAudio();
            }}
            className="px-2 py-0.5 text-[8px] font-black uppercase tracking-wider bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-md transition-all active:scale-90 cursor-pointer"
            title="Activar audio en este reproductor"
          >
            Audio
          </button>
        )}
        <button
          type="button"
          data-player-no-drag
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            cycleSize();
          }}
          className="px-2 py-0.5 text-[8px] font-black uppercase tracking-wider bg-white/10 hover:bg-white/20 border border-white/10 rounded-md transition-all active:scale-90 cursor-pointer"
          style={variant === "hub" ? { color: "var(--color-foreground)" } : undefined}
          title="Cambiar tamaño (Mini / Normal / Maxi)"
        >
          {playerSizeLabel(size)}
        </button>
        {variant === "hub" && (
          <a
            href={`https://www.youtube.com/watch?v=${videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            data-player-no-drag
            onPointerDown={(e) => e.stopPropagation()}
            className="p-1.5 rounded-lg bg-foreground/5 border border-foreground/10 active:scale-90 transition-all hover:bg-foreground/10 flex items-center justify-center"
            title="Abrir en YouTube"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
        <button
          type="button"
          data-player-no-drag
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="p-1 hover:bg-red-500/25 hover:text-red-400 rounded-md transition-colors opacity-70 hover:opacity-100 cursor-pointer"
          title="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </>
  );

  const seekBar = (
    <div
      className={`px-4 py-1.5 flex items-center gap-3 select-none border-b ${variant === "hub" ? "overflow-hidden" : ""}`}
      style={{
        height: 20,
        background: variant === "desktop" ? "rgba(0,0,0,0.6)" : "color-mix(in srgb, var(--color-surface) 95%, black)",
        borderColor: variant === "desktop" ? undefined : "var(--color-border)",
      }}
    >
      <span
        className="text-[9px] font-mono tracking-wider tabular-nums min-w-[30px] text-right"
        style={{ color: variant === "desktop" ? "rgba(255,255,255,0.5)" : "var(--color-foreground)", opacity: variant === "hub" ? 0.6 : undefined }}
      >
        {player.formatTime(player.currentTime)}
      </span>
      <div
        className="flex-1 relative h-3 flex items-center cursor-pointer group"
        onPointerDown={(e) => {
          if (variant === "hub") revealControls(true);
          player.handleSeekStart(e);
        }}
        onPointerMove={(e) => {
          if (variant === "hub") revealControls(player.isSeeking);
          player.handleSeekMove(e);
        }}
        onPointerUp={(e) => {
          player.handleSeekEnd(e);
          if (variant === "hub") revealControls();
        }}
        onPointerLeave={() => player.setHoverLeft(null)}
      >
        <div className={`w-full h-1 rounded-full ${variant === "desktop" ? "bg-white/10 group-hover:bg-white/15" : "bg-foreground/10 group-hover:bg-foreground/15"} group-hover:h-1.5 transition-all duration-200`} />
        {player.hoverLeft !== null && !player.isSeeking && (
          <div
            className={`absolute left-0 top-1/2 -translate-y-1/2 h-1 rounded-full ${variant === "desktop" ? "bg-white/25" : "bg-foreground/25"} group-hover:h-1.5 transition-all duration-200 pointer-events-none`}
            style={{ width: `${player.hoverLeft}%` }}
          />
        )}
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-gradient-to-r from-red-600 to-rose-500 group-hover:h-1.5 transition-all duration-200 pointer-events-none"
          style={{ width: `${player.duration ? (player.currentTime / player.duration) * 100 : 0}%` }}
        />
        <div
          className={`absolute top-1/2 -translate-y-1/2 -ml-1.5 w-3 h-3 rounded-full bg-white border border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] transition-transform duration-200 pointer-events-none ${player.isSeeking ? "scale-100" : "scale-0 group-hover:scale-100"}`}
          style={{ left: `${player.duration ? (player.currentTime / player.duration) * 100 : 0}%` }}
        />
      </div>
      <span
        className="text-[9px] font-mono tracking-wider tabular-nums min-w-[30px]"
        style={{ color: variant === "desktop" ? "rgba(255,255,255,0.5)" : "var(--color-foreground)", opacity: variant === "hub" ? 0.6 : undefined }}
      >
        {player.formatTime(player.duration)}
      </span>
    </div>
  );

  const controls = (
    <div
      className={`shrink-0 flex items-center justify-between px-4 ${variant === "desktop" ? "h-10 text-white" : "overflow-hidden"}`}
      style={{
        height: variant === "hub" ? 40 : undefined,
        background: variant === "desktop" ? "rgba(0,0,0,0.5)" : "color-mix(in srgb, var(--color-surface) 93%, black)",
        color: variant === "hub" ? "var(--color-foreground)" : undefined,
      }}
    >
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => { if (variant === "hub") revealControls(); player.handleRewind(); }} className="w-7 h-7 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/15 border border-white/10 transition-all active:scale-90 cursor-pointer" title="Retroceder 15s">
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => { if (variant === "hub") revealControls(); player.togglePlay(); }} className="w-7 h-7 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/15 border border-white/10 transition-all active:scale-95 cursor-pointer" title={player.isPlaying ? "Pausar" : "Reproducir"}>
          {player.isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
        </button>
        <button type="button" onClick={() => { if (variant === "hub") revealControls(); player.handleForward(); }} className="w-7 h-7 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/15 border border-white/10 transition-all active:scale-90 cursor-pointer" title="Adelantar 15s">
          <RotateCw className="w-3.5 h-3.5" />
        </button>
        {(variant === "desktop" || size !== "mini") && (
          <button type="button" onClick={() => { if (variant === "hub") revealControls(); player.changeSpeed(); }} className="px-2 py-1 h-7 rounded-lg text-[9px] font-bold flex items-center gap-1 bg-white/5 hover:bg-white/15 border border-white/10 transition-all active:scale-95 cursor-pointer ml-1" title="Velocidad">
            <FastForward className="w-3 h-3" />
            {player.speed}x
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => { if (variant === "hub") revealControls(); player.toggleMute(); }}
          className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all active:scale-95 cursor-pointer ${hasAudio ? "bg-white/5 hover:bg-white/15 border-white/10" : "bg-white/5 border-white/5 opacity-50"}`}
          title={hasAudio ? (player.volume === 0 ? "Activar sonido" : "Silenciar") : "Activar audio en este reproductor"}
        >
          {!hasAudio || player.volume === 0 ? (
            <VolumeX className={`w-3.5 h-3.5 ${hasAudio ? "text-red-400" : ""}`} />
          ) : player.volume < 50 ? (
            <Volume1 className="w-3.5 h-3.5" />
          ) : (
            <Volume2 className="w-3.5 h-3.5" />
          )}
        </button>
        <input
          type="range"
          min="0"
          max="100"
          value={hasAudio ? player.volume : 0}
          onChange={(e) => {
            if (variant === "hub") revealControls();
            player.changeVolume(parseInt(e.target.value, 10));
          }}
          className={`w-12 sm:w-20 h-1 rounded-lg appearance-none cursor-pointer outline-none transition-all ${variant === "desktop" ? "bg-white/15 accent-red-500" : "accent-red-500"}`}
          title={hasAudio ? `Volumen: ${player.volume}%` : "Activar audio"}
        />
      </div>
    </div>
  );

  if (variant === "hub") {
    return (
      <motion.div
        className={shellClass}
        style={shellStyle}
        initial={{ opacity: 0, scale: 0.9, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 18 }}
        transition={{ type: "spring", stiffness: 360, damping: 25, bounce: 0.22 }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerEnter={() => revealControls()}
      >
        <AnimatePresence initial={false}>
          {showChrome && (
            <motion.div
              key="header"
              initial={{ opacity: 0, height: 0, y: -8 }}
              animate={{ opacity: 1, height: 36, y: 0 }}
              exit={{ opacity: 0, height: 0, y: -8 }}
              className="cursor-grab active:cursor-grabbing flex items-center justify-between gap-2 border-b px-3 overflow-hidden"
              style={{ borderColor: "var(--color-border)", background: "color-mix(in srgb, var(--color-surface) 90%, black)" }}
            >
              {headerContent}
            </motion.div>
          )}
        </AnimatePresence>
        <div className="relative bg-black w-full shrink-0" style={{ height: dimensions.h }}>
          <YoutubePlayerIframe
            videoId={videoId}
            isDragging={videoAsDragSurface}
            iframeRef={player.iframeRef}
            onReady={player.handleIframeReady}
            autoplay
          />
        </div>
        <AnimatePresence initial={false}>{showChrome && <motion.div key="seek" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 20 }} exit={{ opacity: 0, height: 0 }}>{seekBar}</motion.div>}</AnimatePresence>
        <AnimatePresence initial={false}>{showChrome && <motion.div key="controls" initial={{ opacity: 0, height: 0, y: 8 }} animate={{ opacity: 1, height: 40, y: 0 }} exit={{ opacity: 0, height: 0, y: 8 }}>{controls}</motion.div>}</AnimatePresence>
      </motion.div>
    );
  }

  return (
    <div
      className={shellClass}
      style={shellStyle}
      onPointerDownCapture={onFocus}
    >
      <div
        className="h-8 shrink-0 flex items-center justify-between px-3 border-b border-white/5"
        style={{ background: "rgba(0,0,0,0.5)" }}
      >
        <div
          className="flex min-w-0 flex-1 items-center cursor-grab active:cursor-grabbing"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <div className="flex items-center gap-2 opacity-70 pointer-events-none min-w-0">
            <Move className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate text-[9px] font-black uppercase tracking-[0.15em] text-white">
              {isShort ? "Short" : "Reproductor"}
            </span>
            <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-white opacity-55">
              {slotIndex + 1}/{totalPlayers}
            </span>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 shrink-0 text-white`}>
          {!hasAudio && (
            <button
              type="button"
              data-player-no-drag
              onClick={onRequestAudio}
              className="px-2 py-0.5 text-[8px] font-black uppercase tracking-wider bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-md transition-all active:scale-90 cursor-pointer"
              title="Activar audio en este reproductor"
            >
              Audio
            </button>
          )}
          <button
            type="button"
            data-player-no-drag
            onClick={cycleSize}
            className="px-2 py-0.5 text-[8px] font-black uppercase tracking-wider bg-white/10 hover:bg-white/20 border border-white/10 rounded-md transition-all active:scale-90 cursor-pointer"
            title="Cambiar tamaño (Mini / Normal / Maxi)"
          >
            {playerSizeLabel(size)}
          </button>
          <button
            type="button"
            data-player-no-drag
            onClick={onClose}
            className="p-1 hover:bg-red-500/25 hover:text-red-400 rounded-md transition-colors opacity-70 hover:opacity-100 cursor-pointer"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="relative bg-black w-full shrink-0" style={{ height: dimensions.h }}>
        <YoutubePlayerIframe
          videoId={videoId}
          isDragging={isDragging}
          iframeRef={player.iframeRef}
          onReady={player.handleIframeReady}
          autoplay={false}
        />
      </div>
      {seekBar}
      {controls}
    </div>
  );
}
