import React, { useRef, useEffect } from "react";
import type { ModHit } from "@/lib/core/types";
import { SpotlightCollectionCard, SpotlightEditorialCard } from "./SpotlightCards";

function useSmoothMarquee(speed: number, reverse: boolean, isVertical: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const offset = useRef(0);
  const targetOffset = useRef(0);
  const isDragging = useRef(false);
  const startPos = useRef(0);
  const startOffset = useRef(0);
  const isHovered = useRef(false);
  const resizeObserver = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    let animationFrameId = 0;
    const inner = innerRef.current;
    if (!inner) return;

    const getSize = () => (isVertical ? inner.scrollHeight : inner.scrollWidth);
    const resetLoop = () => {
      const size = getSize();
      if (!size) return;
      const half = size / 2;
      if (reverse) {
        if (offset.current <= 0 || offset.current >= half * 2) {
          offset.current = half;
          targetOffset.current = half;
        }
      } else if (offset.current < 0 || offset.current >= half) {
        offset.current = 0;
        targetOffset.current = 0;
      }
    };

    const step = () => {
      const size = getSize();
      const half = size / 2;

      if (!isDragging.current) {
        if (!isHovered.current) {
          targetOffset.current += reverse ? -speed : speed;
        }
        offset.current += (targetOffset.current - offset.current) * 0.08;
      } else {
        offset.current = targetOffset.current;
      }

      if (size > 0) {
        if (reverse && offset.current <= 0) {
          offset.current += half;
          targetOffset.current += half;
        } else if (!reverse && offset.current >= half) {
          offset.current -= half;
          targetOffset.current -= half;
        }

        inner.style.transform = isVertical
          ? `translateY(-${offset.current}px)`
          : `translateX(-${offset.current}px)`;
      }

      animationFrameId = requestAnimationFrame(step);
    };

    resetLoop();
    animationFrameId = requestAnimationFrame(step);

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver.current = new ResizeObserver(() => {
        resetLoop();
      });
      resizeObserver.current.observe(inner);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.current?.disconnect();
      resizeObserver.current = null;
    };
  }, [speed, reverse, isVertical]);

  const handlers = {
    onMouseEnter: () => { isHovered.current = true; },
    onMouseLeave: () => { isDragging.current = false; isHovered.current = false; },
    onMouseDown: (e: React.MouseEvent) => {
      isDragging.current = true;
      startPos.current = isVertical ? e.pageY : e.pageX;
      startOffset.current = offset.current;
    },
    onMouseUp: () => { isDragging.current = false; },
    onMouseMove: (e: React.MouseEvent) => {
      if (!isDragging.current) return;
      e.preventDefault();
      const currentPos = isVertical ? e.pageY : e.pageX;
      const walk = (currentPos - startPos.current) * 1.5;
      targetOffset.current = startOffset.current - walk;
    },
    onWheel: (e: React.WheelEvent) => {
      const delta = isVertical ? e.deltaY : (e.deltaX || e.deltaY);
      targetOffset.current += delta;
    }
  };

  return { containerRef, innerRef, handlers };
}

export function VerticalTicker({ mods, onOpenVersions, speed = 1, color, reverse = false, globalLoader, theme }: { mods: ModHit[], onOpenVersions: (m: ModHit) => void, speed?: number, color?: string, reverse?: boolean, globalLoader?: string, theme?: string }) {
  const duplicatedMods = [...mods, ...mods, ...mods, ...mods, ...mods, ...mods, ...mods, ...mods];
  const { containerRef, innerRef, handlers } = useSmoothMarquee(speed, reverse, true);

  return (
    <div 
      ref={containerRef}
      className="relative h-full w-full overflow-hidden mask-vertical-edges cursor-grab active:cursor-grabbing"
      {...handlers}
    >
      <div ref={innerRef} className="flex flex-col gap-3 w-full px-2 pb-2">
        {duplicatedMods.map((mod, i) => {
          const knownLoaders = ["forge", "fabric", "neoforge", "quilt"];
          const loaderTag = mod.categories?.map((c: any) => {
            if (typeof c === "string") return c;
            if (c && typeof c === "object" && typeof c.name === "string") return c.name;
            return "";
          }).find((c: string) => c && knownLoaders.includes(c.toLowerCase())) || globalLoader;
          const pType = mod.projectType === "mod" ? "Mod" : mod.projectType === "resourcepack" ? "Texture" : mod.projectType === "shader" ? "Shader" : mod.projectType;

          return (
            <div 
              key={`${mod.projectId}-${i}`} 
              className="spotlight-ec-mini-card group" 
              onClick={() => onOpenVersions(mod)}
            >
              {/* Corner brackets at the card level */}
              <span className="spotlight-ec-mini-bracket spotlight-ec-mini-bracket--tl" />
              <span className="spotlight-ec-mini-bracket spotlight-ec-mini-bracket--bl" />

              <div className="spotlight-ec-mini-image-zone">
                <span className="spotlight-ec-mini-number">{String((i % 99) + 1).padStart(2, "0")}</span>
                
                {mod.iconUrl ? (
                  <img src={mod.iconUrl} alt="" className="w-full h-full object-cover rounded-md" />
                ) : (
                  <span className="font-headline text-[10px] font-black text-white/30 uppercase">
                    {mod.title.substring(0, 2)}
                  </span>
                )}
              </div>
              
              <div className="spotlight-ec-mini-text-zone">
                <p className={`spotlight-ec-mini-title transition-colors group-hover:${color}`}>
                  {mod.title}
                </p>
                <div className="spotlight-ec-mini-meta">
                  {pType && <span className="spotlight-ec-mini-badge">{pType}</span>}
                  {loaderTag && (
                    <span 
                      className="spotlight-ec-mini-badge" 
                      style={{ 
                        color: loaderTag.toLowerCase() === "fabric" ? "#fbbf24" : 
                               loaderTag.toLowerCase() === "forge" ? "#f87171" : "#38bdf8" 
                      }}
                    >
                      {loaderTag}
                    </span>
                  )}
                  {!pType && !loaderTag && (
                    <span className="font-caption text-[8px] truncate opacity-50">
                      {mod.author}
                    </span>
                  )}
                </div>
              </div>
              <div className="spotlight-ec-mini-dots" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function HorizontalEditorialMarquee({ 
  title, 
  items, 
  type = "mod",
  onOpenVersions, 
  onOpenCollection,
  onDownload, 
  downloading, 
  speed = 1, 
  reverse = false, 
  accentColor, 
  globalLoader,
  theme
}: any) {
  // Para un loop infinito seamless: exactamente 2 copias.
  // El hook resetea al llegar a halfSize (mitad del contenido = 1 copia).
  // Como copia1 = copia2, el salte es invisible.
  const duplicatedItems = [...items, ...items];
  const { containerRef, innerRef, handlers } = useSmoothMarquee(speed, reverse, false);

  return (
    <div className="relative w-full h-full flex flex-col group/marquee">
      {/* Title */}
      {title && (
        <div className="px-8 mb-3 flex items-center gap-3">
          <span className="px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase bg-white/5 text-white/80 border border-white/10 shadow-sm backdrop-blur-md">
            {title}
          </span>
        </div>
      )}

      <div 
        ref={containerRef}
        className="relative w-full flex-1 overflow-hidden mask-horizontal-edges cursor-grab active:cursor-grabbing"
        {...handlers}
      >
        <div ref={innerRef} className="flex gap-6 w-max min-w-full px-4 py-2 h-full">
          {duplicatedItems.map((item: any, i: number) => (
            type === "collection" ? (
              <SpotlightCollectionCard
                key={`${item.id}-${i}`}
                collection={item}
                onClick={() => onOpenCollection?.(item)}
                accentColor={accentColor}
                index={i % items.length}
                theme={theme}
              />
            ) : (
              <SpotlightEditorialCard
                key={`${item.projectId}-${i}`}
                mod={item}
                onOpenVersions={onOpenVersions}
                onDownload={onDownload}
                isDownloading={!!downloading[item.projectId]}
                accentColor={item.color || accentColor}
                globalLoader={globalLoader}
                index={i % items.length}
                theme={theme}
              />
            )
          ))}
        </div>
      </div>
    </div>
  );
}
