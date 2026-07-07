"use client";

import React from "react";
import { useSmoothMarquee } from "../hooks/useSmoothMarquee";

export interface ModHit {
  projectId: string;
  title: string;
  author: string;
  iconUrl?: string;
  projectType: string;
  categories?: string[];
  description?: string;
  url?: string;
}

interface VerticalTickerProps {
  mods: ModHit[];
  onSelectMod: (mod: ModHit) => void;
  speed?: number;
  color?: string;
  reverse?: boolean;
}

export function VerticalTicker({ mods, onSelectMod, speed = 0.5, color = "text-orange-500", reverse = false }: VerticalTickerProps) {
  // Multiply array to guarantee continuous seamless marquee loop
  const duplicatedMods = [...mods, ...mods, ...mods, ...mods];
  const { containerRef, innerRef } = useSmoothMarquee(speed, reverse, true);

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 overflow-hidden mask-vertical-edges cursor-pointer"
    >
      <div ref={innerRef} className="flex flex-col gap-3.5 w-full px-1 pb-4">
        {duplicatedMods.map((mod, i) => {
          const knownLoaders = ["forge", "fabric", "neoforge", "quilt"];
          const loaderTag = mod.categories?.map((c: any) => {
            if (typeof c === "string") return c;
            if (c && typeof c === "object" && typeof c.name === "string") return c.name;
            return "";
          }).find((c: string) => c && knownLoaders.includes(c.toLowerCase()));
          
          const pType = mod.projectType === "mod" ? "Mod" : mod.projectType === "resourcepack" ? "Texture" : "Shader";

          return (
            <div 
              key={`${mod.projectId}-${i}`} 
              onClick={() => onSelectMod(mod)}
              className="bg-[#151518]/90 border border-white/[0.05] rounded-xl p-3.5 flex gap-3 hover:border-white/10 transition-all duration-300 relative overflow-hidden group active:scale-[0.98]"
            >
              {/* Image box */}
              <div className="w-12 h-12 rounded-lg bg-white/5 overflow-hidden flex items-center justify-center flex-shrink-0 border border-white/[0.05] relative">
                {mod.iconUrl ? (
                  <img src={mod.iconUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white/30 font-bold text-xs uppercase">
                    {mod.title.substring(0, 2)}
                  </span>
                )}
                <span className="absolute bottom-0 right-0 bg-black/60 px-1 rounded-tl text-[8px] font-mono text-white/50">
                  {String((i % mods.length) + 1).padStart(2, "0")}
                </span>
              </div>

              {/* Title & Tags */}
              <div className="flex-1 flex flex-col justify-center min-w-0">
                <p className="text-white font-medium text-xs truncate group-hover:text-orange-500 transition-colors">
                  {mod.title}
                </p>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  {pType && (
                    <span className="bg-white/5 text-white/60 text-[9px] px-1.5 py-0.5 rounded font-medium border border-white/[0.03]">
                      {pType}
                    </span>
                  )}
                  {loaderTag && (
                    <span 
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/5 border border-white/[0.03]" 
                      style={{ 
                        color: loaderTag.toLowerCase() === "fabric" ? "#fbbf24" : 
                               loaderTag.toLowerCase() === "forge" ? "#f87171" : "#38bdf8" 
                      }}
                    >
                      {loaderTag.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              {/* Dot indicators */}
              <div className="flex flex-col justify-center gap-1 opacity-30 group-hover:opacity-60 transition-opacity">
                <span className="w-1 h-1 rounded-full bg-white" />
                <span className="w-1 h-1 rounded-full bg-white" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
