"use client";

import { useEffect, useRef } from "react";

export function useSmoothMarquee(speed = 1, reverse = false, isVertical = true, paused = false) {
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

      // A paused marquee keeps its exact offset while another surface crossfades in.
      const step = paused ? 0 : speed * (reverse ? -1 : 1);
      
      const size = isVertical ? inner.scrollHeight / 2 : inner.scrollWidth / 2;

      if (size <= 0) {
        animationFrame = requestAnimationFrame(animate);
        return;
      }

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
  });

  const isDragging = useRef(false);
  const hasDragged = useRef(false);
  const suppressClick = useRef(false);
  const startPos = useRef(0);
  const startCrossPos = useRef(0);
  const startOffset = useRef(0);

  const handlers = {
    onWheel: (e: React.WheelEvent) => {
      if (isVertical) {
        if (!e.deltaY || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

        e.preventDefault();
        e.stopPropagation();
        targetOffset.current += e.deltaY * 0.5;
        return;
      }

      const delta = e.shiftKey ? e.deltaY : e.deltaX;
      const isHorizontalIntent = e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY);
      if (!delta || !isHorizontalIntent) return;

      e.preventDefault();
      e.stopPropagation();
      targetOffset.current += delta * 0.5;
    },
    onPointerDown: (e: React.PointerEvent) => {
      e.stopPropagation();
      isDragging.current = true;
      hasDragged.current = false;
      startPos.current = isVertical ? e.clientY : e.clientX;
      startCrossPos.current = isVertical ? e.clientX : e.clientY;
      startOffset.current = offset.current;
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      const currentPos = isVertical ? e.clientY : e.clientX;
      const currentCrossPos = isVertical ? e.clientX : e.clientY;
      const diff = startPos.current - currentPos;
      const crossDiff = startCrossPos.current - currentCrossPos;

      if (!isVertical && !hasDragged.current && Math.abs(crossDiff) > Math.abs(diff) && Math.abs(crossDiff) > 5) {
        isDragging.current = false;
        return;
      }

      if (Math.abs(diff) < 5 && !hasDragged.current) return;
      hasDragged.current = true;
      e.preventDefault();
      e.stopPropagation();
      targetOffset.current = startOffset.current + diff;
    },
    onPointerUp: (e: React.PointerEvent) => {
      if (hasDragged.current) {
        e.stopPropagation();
        suppressClick.current = true;
        window.setTimeout(() => {
          suppressClick.current = false;
        }, 0);
      }
      isDragging.current = false;
      hasDragged.current = false;
    },
    onPointerCancel: (e: React.PointerEvent) => {
      e.stopPropagation();
      isDragging.current = false;
      hasDragged.current = false;
    },
    onClickCapture: (e: React.MouseEvent) => {
      if (!suppressClick.current) return;
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return { containerRef, innerRef, handlers };
}
