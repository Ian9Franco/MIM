import { useEffect, useRef } from "react";

export function useSmoothMarquee(speed: number, reverse: boolean, isVertical: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const offset = useRef(0);
  const targetOffset = useRef(0);
  const isDragging = useRef(false);
  const startPos = useRef(0);
  const startOffset = useRef(0);
  const isHovered = useRef(false);

  useEffect(() => {
    let frame: number;
    const inner = innerRef.current;
    if (!inner) return;

    const step = () => {
      const size = isVertical ? inner.scrollHeight : inner.scrollWidth;
      const half = size / 2;
      if (!isDragging.current) {
        if (!isHovered.current) targetOffset.current += reverse ? -speed : speed;
        offset.current += (targetOffset.current - offset.current) * 0.08;
      } else offset.current = targetOffset.current;

      if (reverse && offset.current <= 0) { offset.current += half; targetOffset.current += half; }
      else if (!reverse && offset.current >= half) { offset.current -= half; targetOffset.current -= half; }

      inner.style.transform = isVertical ? `translateY(-${offset.current}px)` : `translateX(-${offset.current}px)`;
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [speed, reverse, isVertical]);

  const handlers = {
    onMouseEnter: () => { isHovered.current = true; },
    onMouseLeave: () => { isDragging.current = false; isHovered.current = false; },
    onMouseDown: (e: any) => { isDragging.current = true; startPos.current = isVertical ? e.pageY : e.pageX; startOffset.current = offset.current; },
    onMouseUp: () => { isDragging.current = false; },
    onMouseMove: (e: any) => { if (!isDragging.current) return; e.preventDefault(); const current = isVertical ? e.pageY : e.pageX; targetOffset.current = startOffset.current - (current - startPos.current) * 1.5; },
    onWheel: (e: any) => { targetOffset.current += isVertical ? e.deltaY : (e.deltaX || e.deltaY); }
  };

  return { containerRef, innerRef, handlers };
}
