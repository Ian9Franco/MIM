"use client";

import React, { useMemo } from "react";

interface FomoEyeProps {
  className?: string;
}

/** FOMO eye — static PNG with CSS side-to-side gaze (no blink). */
export function FomoEye({ className = "h-full w-full" }: FomoEyeProps) {
  const anim = useMemo(
    () => ({
      fomoDuration: `${(6.1 + Math.random() * 3.8).toFixed(2)}s`,
      fomoDelay: `-${(Math.random() * 6).toFixed(2)}s`,
    }),
    []
  );

  return (
    <div
      className="mim-fomo-eye"
      aria-hidden
      style={{
        ["--fomo-eye-duration" as string]: anim.fomoDuration,
        ["--fomo-eye-delay" as string]: anim.fomoDelay,
      }}
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
