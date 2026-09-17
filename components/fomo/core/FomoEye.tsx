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

    const randomValues = crypto.getRandomValues(new Uint32Array(2));
    const duration = 6.1 + (randomValues[0] / 2 ** 32) * 3.8;
    const delay = (randomValues[1] / 2 ** 32) * 6;
    eye.style.setProperty("--fomo-eye-duration", `${duration.toFixed(2)}s`);
    eye.style.setProperty("--fomo-eye-delay", `-${delay.toFixed(2)}s`);
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
