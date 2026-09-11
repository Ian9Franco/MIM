"use client";

import React, { useRef } from "react";
import styles from "./CollectibleSurface.module.css";

/** No pointer capture or preventDefault: the parent retains its mobile swipe gesture. */
export function CollectibleSurface({ children, className = "", detail = false, onClick, label }: {
  children: React.ReactNode; className?: string; detail?: boolean;
  onClick?: () => void; label?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const paint = (x: number, y: number) => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", `${x}deg`);
    el.style.setProperty("--ry", `${y}deg`);
  };
  const reset = () => paint(0, 0);
  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return (
    <div ref={ref} className={`${styles.surface} ${detail ? styles.detail : ""} ${className}`}
      role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined}
      aria-label={label} onClick={onClick}
      onKeyDown={e => {
        if (onClick && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onClick(); }
      }}
      onPointerMove={e => {
        if (e.pointerType !== "mouse" || e.buttons || reduced()) return;
        const r = e.currentTarget.getBoundingClientRect();
        const x = Math.max(-1, Math.min(1, (e.clientX - r.left) / r.width * 2 - 1));
        const y = Math.max(-1, Math.min(1, (e.clientY - r.top) / r.height * 2 - 1));
        paint(-y * 5, x * 6);
      }}
      onPointerDown={() => { if (!reduced()) paint(-3, 4); }}
      onPointerUp={reset} onPointerCancel={reset} onLostPointerCapture={reset}
      onPointerLeave={reset} onFocus={() => { if (!reduced()) paint(-3, 4); }} onBlur={reset}>
      {children}
    </div>
  );
}
