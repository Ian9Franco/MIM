"use client";

import { useEffect, useRef } from "react";

export function useSmoothMarquee(speed = 1, reverse = false, isVertical = true) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const offset = useRef(0);
  const targetOffset = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    const inner = innerRef.current;
    if (!container || !inner) return;

    let animationFrame: number;

    const animate = () => {
      // Lerp smooth scroll
      offset.current += (targetOffset.current - offset.current) * 0.1;

      // Natural speed scroll
      const step = speed * (reverse ? -1 : 1);
      
      const size = isVertical ? inner.scrollHeight / 2 : inner.scrollWidth / 2;

      // Handle initial load reverse starting point
      if (reverse && offset.current === 0 && targetOffset.current === 0) {
        offset.current = size;
        targetOffset.current = size;
      }

      offset.current += step;
      targetOffset.current += step;

      if (reverse) {
        if (offset.current <= 0) {
          offset.current = size;
          targetOffset.current = size;
        }
      } else {
        if (Math.abs(offset.current) >= size) {
          offset.current = 0;
          targetOffset.current = 0;
        }
      }

      if (isVertical) {
        inner.style.transform = `translateY(${-offset.current}px)`;
      } else {
        inner.style.transform = `translateX(${-offset.current}px)`;
      }

      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [speed, reverse, isVertical]);

  const handlers = {
    onWheel: (e: React.WheelEvent) => {
      const delta = isVertical ? e.deltaY : (e.deltaX || e.deltaY);
      targetOffset.current += delta * 0.5;
    }
  };

  return { containerRef, innerRef, handlers };
}
