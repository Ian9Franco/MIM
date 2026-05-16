import React, { useState, useEffect } from "react";
import { Download, Loader2, Heart, Spotlight, Clock, Calendar } from "lucide-react";
import { COLORS } from "@/theme/tokens";
import { useSmoothMarquee } from "../../hooks/useSmoothMarquee";
import type { ModHit } from "@/lib/types";

// ── AnimatedHeadline ────────────────────────────────────────────────────────

const HEADLINE_PHRASES = [{ p1: "Explora las", h: "{tendencias}", p2: "de la comunidad" }, { p1: "Y los", h: "{picks}", p2: "mensuales" }];

export function AnimatedHeadline() {
  const [index, setIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [blink, setBlink] = useState(true);

  useEffect(() => {
    const phrase = HEADLINE_PHRASES[index];
    const full = `${phrase.p1}\n${phrase.h}\n${phrase.p2}`;
    if (subIndex === full.length && !isDeleting) { const t = setTimeout(() => setIsDeleting(true), 5000); return () => clearTimeout(t); }
    if (subIndex === 0 && isDeleting) { setIsDeleting(false); setIndex(p => (p + 1) % HEADLINE_PHRASES.length); return; }
    const t = setTimeout(() => setSubIndex(p => p + (isDeleting ? -1 : 1)), isDeleting ? 12 : 32);
    return () => clearTimeout(t);
  }, [subIndex, isDeleting, index]);

  useEffect(() => { const i = setInterval(() => setBlink(p => !p), 500); return () => clearInterval(i); }, []);

  const phrase = HEADLINE_PHRASES[index];
  const lines = `${phrase.p1}\n${phrase.h}\n${phrase.p2}`.substring(0, subIndex).split('\n');

  return (
    <h1 className="font-headline text-4xl xl:text-5xl 2xl:text-6xl leading-[1.1] tracking-tight text-white mb-2 min-h-[110px] xl:min-h-[150px]">
      {lines.map((line, i, arr) => (
        <React.Fragment key={i}>
          {i === 1 ? <span className="italic font-light text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-200">{line}</span> : line}
          {i < arr.length - 1 && <br />}
        </React.Fragment>
      ))}
      <span className={`inline-block w-[4px] h-[0.8em] bg-white ml-2 align-middle ${blink ? 'opacity-100' : 'opacity-0'}`} />
    </h1>
  );
}

// ── SpotlightEditorialCard ──────────────────────────────────────────────────

export function SpotlightEditorialCard({ mod, onOpenVersions, onDownload, isDownloading, accentColor = COLORS.primary, globalLoader, theme, index: cardIndex }: any) {
  const isModern = theme === "modern";
  const num = String((cardIndex % 12) + 1).padStart(3, "0");
  const dls = mod.downloads >= 1_000_000 
    ? `${(mod.downloads / 1_000_000).toFixed(1)}M` 
    : mod.downloads >= 1_000 
    ? `${Math.round(mod.downloads / 1_000)}K` 
    : mod.downloads;

  // Refined Dot-grid background (more dense like the image)
  const dotGridStyle = {
    backgroundImage: `radial-gradient(circle, ${isModern ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.05)"} 1px, transparent 1px)`,
    backgroundSize: "6px 6px",
  };

  return (
    <div
      className="w-[220px] xl:w-[252px] shrink-0 rounded-[1.5rem] relative group cursor-pointer overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl flex flex-col"
      style={{
        background: isModern ? "#f0ede3" : "hsl(220 14% 10%)",
        border: isModern ? "1.5px solid #d4cfc0" : "1.5px solid hsl(220 14% 18%)",
        boxShadow: isModern ? "0 4px 24px rgba(0,0,0,0.10)" : "0 4px 32px rgba(0,0,0,0.5)",
        borderRadius: "24px",
      }}
      onClick={() => onOpenVersions(mod)}
    >
      {/* Top label row */}
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5" style={{ borderBottom: isModern ? "1px solid #d4cfc0" : "1px solid hsl(220 14% 18%)" }}>
        <span className="text-[8px] font-black uppercase tracking-[0.25em]" style={{ color: isModern ? "hsl(30 20% 35%)" : "hsl(220 14% 50%)" }}>
          ◇ Spotlight
        </span>
        <span className="text-[8px] font-black tabular-nums" style={{ color: isModern ? "hsl(30 20% 40%)" : "hsl(220 14% 40%)" }}>
          {num}
        </span>
      </div>

      {/* Visual area — icon with dot grid and bracket corners */}
      <div
        className="relative flex items-center justify-center"
        style={{
          ...dotGridStyle,
          height: "160px",
          backgroundColor: isModern ? "#f0ede3" : "hsl(220 14% 10%)",
          borderBottom: isModern ? "1.5px solid #d4cfc0" : "1.5px solid hsl(220 14% 18%)",
        }}
      >
        {/* Bracket corners */}
        {[["top-2 left-2", "border-t-2 border-l-2"], ["top-2 right-2", "border-t-2 border-r-2"], ["bottom-2 left-2", "border-b-2 border-l-2"], ["bottom-2 right-2", "border-b-2 border-r-2"]].map(([pos, borders], i) => (
          <div key={i} className={`absolute ${pos} w-3 h-3 ${borders}`} style={{ borderColor: isModern ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.2)" }} />
        ))}

        {/* Icon */}
        <div className="relative w-16 h-16 rounded-2xl overflow-hidden border flex items-center justify-center shadow-lg transition-transform duration-500 group-hover:scale-110" style={{ borderColor: isModern ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.1)", background: isModern ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.05)" }}>
          {mod.iconUrl
            ? <img src={mod.iconUrl} alt="" className="w-full h-full object-cover" />
            : <div className="text-2xl font-black" style={{ color: isModern ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.3)" }}>{mod.title.substring(0, 2).toUpperCase()}</div>
          }
        </div>

        {/* Download button (hover) */}
        <button
          onClick={(e) => { e.stopPropagation(); onDownload(mod); }}
          disabled={isDownloading}
          className="absolute bottom-3 right-3 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 active:scale-90"
          style={{ background: isModern ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}
        >
          {isDownloading
            ? <Loader2 className="w-3 h-3 animate-spin" style={{ color: isModern ? "#fff" : "#fff" }} />
            : <Download className="w-3 h-3" style={{ color: isModern ? "#fff" : "#fff" }} />
          }
        </button>
      </div>

      {/* Text area */}
      <div className="flex-1 flex flex-col p-3 gap-1 relative">
        <h3 className="font-headline text-sm leading-tight line-clamp-2" style={{ color: isModern ? "hsl(30 20% 15%)" : "hsl(0 0% 92%)" }}>
          {mod.title}
        </h3>
        <p className="text-[8px] font-black uppercase tracking-[0.2em] mt-0.5" style={{ color: isModern ? "hsl(30 20% 45%)" : "hsl(220 14% 45%)" }}>
          {mod.author}
        </p>
        
        {/* Bottom meta row */}
        <div className="flex items-center justify-between mt-auto pt-2" style={{ borderTop: isModern ? "1px solid #d4cfc0" : "1px solid hsl(220 14% 18%)" }}>
          <span className="text-[7.5px] font-black uppercase tracking-widest" style={{ color: isModern ? "hsl(30 20% 50%)" : "hsl(220 14% 40%)" }}>
            {dls} ↓
          </span>
          <div className="flex gap-0.5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="w-1 h-1 rounded-full" style={{ background: isModern ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.15)" }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SmallSpotlightCard ──────────────────────────────────────────────────────

export function SmallSpotlightCard({ mod, onOpenVersions, accentColor, theme }: any) {
  const isModern = theme === "modern";
  return (
    <div 
      className="w-full shrink-0 relative group cursor-pointer overflow-hidden transition-all duration-300 flex items-center border border-white/5 hover:border-white/20 hover:shadow-xl" 
      style={{ 
        background: isModern ? "rgba(255,255,255,0.8)" : "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
        borderRadius: "12px"
      }} 
      onClick={() => onOpenVersions(mod)}
    >
      {/* Technical Icon Container */}
      <div className="w-14 h-14 shrink-0 relative flex items-center justify-center border-r" style={{ 
        borderColor: isModern ? "#d4cfc0" : "rgba(255,255,255,0.05)",
        backgroundImage: `radial-gradient(circle, ${isModern ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.05)"} 1px, transparent 1px)`,
        backgroundSize: "4px 4px"
      }}>
        {/* Minimal Brackets - Shifted slightly for rounded corners */}
        <div className="absolute top-2 left-2 w-1.5 h-1.5 border-t border-l opacity-30" style={{ borderColor: isModern ? "#000" : "#fff" }} />
        <div className="absolute top-2 right-2 w-1.5 h-1.5 border-t border-r opacity-30" style={{ borderColor: isModern ? "#000" : "#fff" }} />
        <div className="absolute bottom-2 left-2 w-1.5 h-1.5 border-b border-l opacity-30" style={{ borderColor: isModern ? "#000" : "#fff" }} />
        <div className="absolute bottom-2 right-2 w-1.5 h-1.5 border-b border-r opacity-30" style={{ borderColor: isModern ? "#000" : "#fff" }} />

        <div className="w-9 h-9 rounded-lg overflow-hidden bg-black/20 border border-white/5 relative z-10 group-hover:scale-110 transition-transform duration-500 shadow-lg">
          {mod.iconUrl ? (
            <img src={mod.iconUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="text-[10px] font-black text-white/40">{mod.title.substring(0, 2).toUpperCase()}</div>
          )}
        </div>
      </div>

      {/* Info Section */}
      <div className="flex-1 min-w-0 px-3 py-2 flex flex-col gap-0.5">
        <h3 className="font-headline text-[11px] font-bold truncate leading-tight" style={{ color: isModern ? "#1e1b4b" : "#fff" }}>
          {mod.title}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-[7px] font-black uppercase tracking-[0.2em] opacity-40" style={{ color: isModern ? "#333" : "#fff" }}>
            {mod.projectType === "resourcepack" ? "Texture" : "Mod"}
          </span>
          <span className="text-[7px] font-mono opacity-20">#{String(Math.abs(mod.projectId?.split('').reduce((a:any,b:any)=>a+b.charCodeAt(0),0)) % 999).padStart(3, '0')}</span>
        </div>
      </div>
      
      {/* Diagonal Technical Accent */}
      <div className="absolute top-0 right-0 w-4 h-4 overflow-hidden opacity-10">
        <div className="absolute top-0 right-0 w-full h-[1px] bg-white rotate-45 translate-x-1/2 -translate-y-1/2" />
      </div>
    </div>
  );
}

// ── VerticalTicker ──────────────────────────────────────────────────────────

export function VerticalTicker({ mods, onOpenVersions, speed = 1, reverse = false, accentColor, theme }: any) {
  const { containerRef, innerRef, handlers } = useSmoothMarquee(speed, reverse, true);
  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden mask-vertical-edges cursor-grab" {...handlers}>
      <div ref={innerRef} className="flex flex-col gap-3 w-full pb-2">
        {[...mods, ...mods, ...mods, ...mods].map((mod, i) => <SmallSpotlightCard key={`${mod.projectId}-${i}`} mod={mod} onOpenVersions={onOpenVersions} accentColor={accentColor} theme={theme} />)}
      </div>
    </div>
  );
}
