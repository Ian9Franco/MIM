"use client";

import React, { useRef } from "react";
import styles from "./CollectibleSurface.module.css";

type Vector = [number, number, number];
const normalize = (v: Vector): Vector => v.map(n => n / Math.hypot(...v)) as Vector;
const dot = (a: Vector, b: Vector) => a.reduce((sum, n, i) => sum + n * b[i], 0);
const light = normalize([-0.15, -0.2, 1]);
const half = normalize([light[0], light[1], light[2] + 1]);
function rotate([x, y, z]: Vector, rx: number, ry: number): Vector {
  const a = rx * Math.PI / 180, b = ry * Math.PI / 180;
  const xx = x * Math.cos(b) + z * Math.sin(b);
  const zz = -x * Math.sin(b) + z * Math.cos(b);
  return [xx, y * Math.cos(a) - zz * Math.sin(a), y * Math.sin(a) + zz * Math.cos(a)];
}

/** No pointer capture or preventDefault: the parent retains its mobile swipe gesture. */
export function CollectibleSurface({ children, className = "", detail = false, onClick, label }: {
  children: React.ReactNode; className?: string; detail?: boolean;
  onClick?: () => void; label?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const paint = (x: number, y: number) => {
    const el = ref.current;
    if (!el) return;
    const n = rotate([0, 0, 1], x, y);
    const u = rotate([1, 0, 0], x, y), v = rotate([0, 1, 0], x, y);
    // The light and half-vector stay in viewer space; only the material rotates.
    const values = {
      "--rx": `${x}deg`, "--ry": `${y}deg`,
      "--hx": `${50 + dot(half, u) * 170}%`, "--hy": `${50 + dot(half, v) * 170}%`,
      "--gloss": `${Math.pow(Math.max(0, dot(n, half)), 4) * .25}`,
      "--dark": `${(1 - Math.max(0, dot(n, light))) * .7}`,
    };
    Object.entries(values).forEach(([key, value]) => el.style.setProperty(key, value));
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
      <span className={styles.foil} aria-hidden="true" />
      <span className={styles.gloss} aria-hidden="true" />
      {children}
    </div>
  );
}
