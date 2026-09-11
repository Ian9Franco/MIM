"use client";

import React, { useRef } from "react";
import styles from "./CollectibleSurface.module.css";

type CollectibleVariant = "card" | "row" | "compact";

/** No pointer capture or preventDefault: the parent retains its mobile swipe gesture. */
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

  const paint = (x: number, y: number, glareX?: number, glareY?: number) => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", `${x}deg`);
    el.style.setProperty("--ry", `${y}deg`);
    if (glareX !== undefined) el.style.setProperty("--glare-x", `${glareX}%`);
    if (glareY !== undefined) el.style.setProperty("--glare-y", `${glareY}%`);
  };

  const reset = () => {
    paint(0, 0, 50, 50);
  };

  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const tiltScale = variant === "row" ? { x: 7, y: 8 } : { x: 10, y: 12 };

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
        paint(-ny * tiltScale.x, nx * tiltScale.y, ((nx + 1) / 2) * 100, ((ny + 1) / 2) * 100);
      }}
      onPointerDown={() => {
        if (!reduced()) paint(-4, 5, 62, 38);
      }}
      onPointerUp={reset}
      onPointerCancel={reset}
      onLostPointerCapture={reset}
      onPointerLeave={reset}
      onFocus={() => {
        if (!reduced()) paint(-4, 5, 62, 38);
      }}
      onBlur={reset}
    >
      {children}
    </div>
  );
}
