"use client";

import { useEffect, useRef, useState } from "react";

function getScrollTop(target: EventTarget | null): number | null {
  if (target === document || target === document.documentElement || target === document.body) {
    return window.scrollY;
  }
  if (!(target instanceof HTMLElement)) return null;
  const style = window.getComputedStyle(target);
  const canScrollY =
    /(auto|scroll|overlay)/.test(style.overflowY) || /(auto|scroll|overlay)/.test(style.overflow);
  if (!canScrollY || target.scrollHeight <= target.clientHeight + 1) return null;
  return target.scrollTop;
}

/** Collapses chrome when the user scrolls down in any scrollable region. */
export function useNavScrollCompress(threshold = 8) {
  const [compressed, setCompressed] = useState(false);
  const positions = useRef(new WeakMap<EventTarget, number>());

  useEffect(() => {
    const onScroll = (event: Event) => {
      const target = event.target;
      if (!target) return;

      const top = getScrollTop(target);
      if (top === null) return;

      const previous = positions.current.get(target) ?? top;
      positions.current.set(target, top);

      const delta = top - previous;
      if (Math.abs(delta) < threshold) return;

      setCompressed(delta > 0);
    };

    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => document.removeEventListener("scroll", onScroll, { capture: true });
  }, [threshold]);

  return compressed;
}
