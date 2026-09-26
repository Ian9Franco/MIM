"use client";

import React, { useEffect, useRef } from "react";
import styles from "./CollectibleSurface.module.css";

type CollectibleVariant = "card" | "row" | "compact";

export function CollectibleSurface({
  children,
  className = "",
  detail = false,
  variant = "card",
  onClick,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  detail?: boolean;
  variant?: CollectibleVariant;
  onClick?: () => void;
  label?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const target = useRef({ x: 0, y: 0, gx: 50, gy: 50 });
  const current = useRef({ x: 0, y: 0, gx: 50, gy: 50 });
  const raf = useRef(0);

  const paint = (x: number, y: number, glareX: number, glareY: number) => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", `${x}deg`);
    el.style.setProperty("--ry", `${y}deg`);
    el.style.setProperty("--glare-x", `${glareX}%`);
    el.style.setProperty("--glare-y", `${glareY}%`);
    el.style.setProperty("--liquid-x", `${glareX}%`);
    el.style.setProperty("--liquid-y", `${glareY}%`);
  };

  const tick = () => {
    const c = current.current;
    const t = target.current;
    c.x += (t.x - c.x) * 0.16;
    c.y += (t.y - c.y) * 0.16;
    c.gx += (t.gx - c.gx) * 0.12;
    c.gy += (t.gy - c.gy) * 0.12;
    paint(c.x, c.y, c.gx, c.gy);
    if (Math.abs(c.x - t.x) > 0.04 || Math.abs(c.y - t.y) > 0.04) {
      raf.current = requestAnimationFrame(tick);
    } else {
      raf.current = 0;
    }
  };

  const aim = (x: number, y: number, gx: number, gy: number) => {
    target.current = { x, y, gx, gy };
    if (!raf.current) raf.current = requestAnimationFrame(tick);
  };

  const reset = () => aim(0, 0, 50, 50);

  useEffect(() => () => {
    if (raf.current) cancelAnimationFrame(raf.current);
  }, []);

  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const tiltScale = variant === "row" ? { x: 8, y: 10 } : { x: 12, y: 16 };

  return (
    <div
      ref={ref}
      className={`${styles.surface} ${variant === "row" ? styles.row : ""} ${variant === "compact" ? styles.compact : ""} ${detail ? styles.detail : ""} ${className}`}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={label}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse" || e.buttons || reduced()) return;
        const r = e.currentTarget.getBoundingClientRect();
        const nx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
        const ny = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
        aim(-ny * tiltScale.x, nx * tiltScale.y, ((nx + 1) / 2) * 100, ((ny + 1) / 2) * 100);
      }}
      onPointerDown={() => {
        if (!reduced()) aim(-5, 6, 62, 38);
      }}
      onPointerUp={reset}
      onPointerCancel={reset}
      onLostPointerCapture={reset}
      onPointerLeave={reset}
      onFocus={() => {
        if (!reduced()) aim(-4, 5, 62, 38);
      }}
      onBlur={reset}
    >
      <div className={styles.surfaceClip}>{children}</div>
    </div>
  );
}
