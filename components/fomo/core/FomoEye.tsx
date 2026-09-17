"use client";

import React, { useEffect, useRef } from "react";

interface FomoEyeProps {
  className?: string;
}

/** FOMO eye — static PNG with CSS side-to-side gaze (no blink). */
export function FomoEye({ className = "h-full w-full" }: FomoEyeProps) {
  const eyeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const eye = eyeRef.current;
    if (!eye) return;

    eye.style.setProperty("--fomo-eye-duration", `${(6.1 + Math.random() * 3.8).toFixed(2)}s`);
    eye.style.setProperty("--fomo-eye-delay", `-${(Math.random() * 6).toFixed(2)}s`);
  }, []);

  return (
    <div
      ref={eyeRef}
      className="mim-fomo-eye"
      aria-hidden
    >
      <img
        src="/fomoico.png"
        alt=""
        className={`mim-fomo-eye-gaze object-contain ${className}`}
        draggable={false}
      />
    </div>
  );
}
