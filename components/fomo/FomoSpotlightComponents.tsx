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

export function SpotlightEditorialCard({ mod, onOpenVersions, onDownload, isDownloading, accentColor = COLORS.primary, globalLoader, theme }: any) {
  const isModern = theme === "modern";
  return (
    <div className="w-[220px] xl:w-[260px] h-[240px] sm:h-[300px] shrink-0 rounded-[2.5rem] relative group cursor-pointer overflow-hidden backdrop-blur-xl transition-all duration-500 spotlight-animate-float" style={{ background: isModern ? "rgba(255,255,255,0.95)" : "var(--glass-bg)", border: isModern ? "1px solid #fff" : "1px solid rgba(255,255,255,0.05)", boxShadow: isModern ? "0 12px 32px rgba(0,0,0,0.08)" : "var(--shadow-drop)" }} onClick={() => onOpenVersions(mod)}>
      <div className="p-6 flex flex-col h-full items-center text-center relative z-10">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl overflow-hidden bg-black/40 border border-white/10 flex items-center justify-center mb-4 transition-transform group-hover:-translate-y-2">
          {mod.iconUrl ? <img src={mod.iconUrl} alt="" className="w-full h-full object-cover" /> : <div className="text-2xl font-black text-white/40">{mod.title.substring(0, 2).toUpperCase()}</div>}
          <button onClick={(e) => { e.stopPropagation(); onDownload(mod); }} disabled={isDownloading} className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">{isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}</button>
        </div>
        <h3 className="font-headline text-base sm:text-lg text-white line-clamp-2">{mod.title}</h3>
        <div className="mt-auto pt-4 w-full flex items-center justify-between text-[9px] font-subhead uppercase opacity-40 border-t border-white/5"><span className="font-bold">{mod.author}</span></div>
      </div>
    </div>
  );
}

// ── SmallSpotlightCard ──────────────────────────────────────────────────────

export function SmallSpotlightCard({ mod, onOpenVersions, accentColor, theme }: any) {
  const isModern = theme === "modern";
  return (
    <div className="w-full shrink-0 rounded-2xl relative group cursor-pointer overflow-hidden backdrop-blur-xl transition-all p-3 flex items-center gap-3" style={{ background: isModern ? "rgba(255,255,255,0.95)" : "var(--glass-bg)", border: isModern ? "1px solid #fff" : "1px solid rgba(255,255,255,0.05)" }} onClick={() => onOpenVersions(mod)}>
      <div className="w-10 h-10 rounded-xl overflow-hidden bg-black/40 border border-white/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
        {mod.iconUrl ? <img src={mod.iconUrl} alt="" className="w-full h-full object-cover" /> : <div className="text-sm font-black text-white/40">{mod.title.substring(0, 2).toUpperCase()}</div>}
      </div>
      <div className="flex-1 min-w-0"><h3 className="font-headline text-sm text-white truncate">{mod.title}</h3><p className="text-[7px] font-black uppercase opacity-60">{mod.projectType}</p></div>
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
