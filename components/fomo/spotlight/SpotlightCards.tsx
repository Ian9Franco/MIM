import React from "react";
import { Download, Loader2, CirclePlay } from "lucide-react";
import { COLORS } from "@/theme/tokens";
import type { ModHit, CollectionEntry } from "@/lib/core/types";

export function SpotlightCollectionCard({
  collection,
  onClick,
  accentColor = COLORS.primary,
  index = 0,
  theme
}: {
  collection: CollectionEntry;
  onClick: () => void;
  accentColor?: string;
  index?: number;
  theme?: string;
}) {
  const [imgError, setImgError] = React.useState(false);
  const cardNum = String((index % 999) + 1).padStart(3, "0");
  const isCurseForge = collection.source === "curseforge";
  const isModern = theme === "modern";
  const isVampire = theme === "vampire";

  const cardBg = isModern ? "#f0ede3" : isVampire ? "#1a1525" : "hsl(220 14% 10%)";
  const cardBorder = isModern ? "1.5px solid #d4cfc0" : isVampire ? "1.5px solid rgba(187, 150, 228, 0.15)" : "1.5px solid hsl(220 14% 18%)";
  const cardShadow = isModern ? "0 10px 40px rgba(0,0,0,0.08)" : isVampire ? "0 4px 32px rgba(187, 150, 228, 0.1)" : "0 4px 32px rgba(0,0,0,0.5)";

  const sepColor = isModern ? "1px solid #d4cfc0" : isVampire ? "1px solid rgba(187, 150, 228, 0.15)" : "1px solid hsl(220 14% 18%)";
  const numColor = isModern ? "hsl(30 20% 40%)" : isVampire ? "rgba(187, 150, 228, 0.5)" : "hsl(220 14% 40%)";
  const sepColorThick = isModern ? "1.5px solid #d4cfc0" : isVampire ? "1.5px solid rgba(187, 150, 228, 0.15)" : "1.5px solid hsl(220 14% 18%)";
  
  const bracketColor = isModern ? "rgba(0,0,0,0.25)" : isVampire ? "rgba(187, 150, 228, 0.3)" : "rgba(255,255,255,0.2)";
  const iconBorder = isModern ? "rgba(0,0,0,0.12)" : isVampire ? "rgba(187, 150, 228, 0.2)" : "rgba(255,255,255,0.1)";
  const iconBg = isModern ? "rgba(0,0,0,0.06)" : isVampire ? "rgba(187, 150, 228, 0.05)" : "rgba(255,255,255,0.05)";
  const iconFallback = isModern ? "rgba(0,0,0,0.3)" : isVampire ? "rgba(187, 150, 228, 0.3)" : "rgba(255,255,255,0.3)";
  
  const titleColor = isModern ? "hsl(30 20% 15%)" : isVampire ? "#DEDEDE" : "hsl(0 0% 92%)";
  const authorColor = isModern ? "hsl(30 20% 45%)" : isVampire ? "#BB96E4" : "hsl(220 14% 45%)";
  const statColor = isModern ? "hsl(30 20% 50%)" : isVampire ? "rgba(187, 150, 228, 0.6)" : "hsl(220 14% 40%)";
  const dotColor = isModern ? "rgba(0,0,0,0.2)" : isVampire ? "rgba(187, 150, 228, 0.3)" : "rgba(255,255,255,0.15)";

  return (
    <div
      className="w-[min(210px,calc(100vw-4rem))] xl:w-[210px] h-[320px] shrink-0 rounded-[1.5rem] relative group cursor-pointer overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl flex flex-col"
      style={{
        background: cardBg,
        border: cardBorder,
        boxShadow: cardShadow,
      }}
      onClick={onClick}
    >
      {/* Top label row */}
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5" style={{ borderBottom: sepColor }}>
        <span 
          className="text-[8px] font-black uppercase tracking-[0.25em] flex items-center gap-1" 
          style={{ color: isCurseForge ? "#f87171" : "#4ade80" }}
        >
          <CirclePlay className="w-2 h-2" />
          {isCurseForge ? "CurseForge" : "Modrinth"}
        </span>
        <span className="text-[8px] font-black tabular-nums" style={{ color: numColor }}>
          {cardNum}
        </span>
      </div>

      {/* Visual area */}
      <div
        className="relative flex items-center justify-center"
        style={{ height: "175px", borderBottom: sepColorThick }}
      >
        {/* Bracket corners */}
        {[["top-2 left-2", "border-t-2 border-l-2"], ["top-2 right-2", "border-t-2 border-r-2"], ["bottom-2 left-2", "border-b-2 border-l-2"], ["bottom-2 right-2", "border-b-2 border-r-2"]].map(([pos, borders], i) => (
          <div key={i} className={`absolute ${pos} w-3 h-3 ${borders}`} style={{ borderColor: bracketColor }} />
        ))}

        <div className="relative w-32 h-32 rounded-2xl overflow-hidden border flex items-center justify-center shadow-lg transition-transform duration-500 group-hover:scale-110" style={{ borderColor: iconBorder, background: iconBg }}>
          {!imgError && collection.iconUrl ? (
            <img src={collection.iconUrl} alt="" className="w-full h-full object-cover" onError={() => setImgError(true)} />
          ) : (
            <div className="text-2xl font-black" style={{ color: iconFallback }}>
              {collection.name.substring(0, 2).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* Text area */}
      <div className="flex-1 flex flex-col p-3 gap-1 relative">
        <h3 className="font-headline text-sm leading-tight line-clamp-2" style={{ color: titleColor }}>
          {collection.name}
        </h3>
        <p className="text-[8px] font-black uppercase tracking-[0.2em] mt-0.5" style={{ color: authorColor }}>
          {collection.projectCount || 0} PROYECTOS
        </p>

        <div className="flex items-center justify-between mt-auto pt-2" style={{ borderTop: sepColor }}>
          <span className="text-[7.5px] font-black uppercase tracking-widest" style={{ color: statColor }}>
            Colección
          </span>
          <div className="flex gap-0.5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="w-1 h-1 rounded-full" style={{ background: dotColor }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SpotlightEditorialCard({ 
  mod, 
  onOpenVersions, 
  onDownload, 
  isDownloading,
  accentColor = COLORS.primary,
  globalLoader,
  index = 0,
  theme
}: { 
  mod: ModHit & { versions?: string[] }; 
  onOpenVersions: (m: ModHit) => void;
  onDownload: (m: ModHit) => void;
  isDownloading: boolean;
  accentColor?: string;
  globalLoader?: string;
  index?: number;
  theme?: string;
}) {
  const cardNum = String((index % 999) + 1).padStart(3, "0");
  const isCurseForge = mod.url?.includes("curseforge.com") || mod._source === "curseforge";
  const isModern = theme === "modern";
  const isVampire = theme === "vampire";

  const dls = mod.downloads >= 1_000_000 
    ? `${(mod.downloads / 1_000_000).toFixed(1)}M` 
    : mod.downloads >= 1_000 
    ? `${Math.round(mod.downloads / 1_000)}K` 
    : mod.downloads;

  const cardBg = isModern ? "#f0ede3" : isVampire ? "#1a1525" : "hsl(220 14% 10%)";
  const cardBorder = isModern ? "1.5px solid #d4cfc0" : isVampire ? "1.5px solid rgba(187, 150, 228, 0.15)" : "1.5px solid hsl(220 14% 18%)";
  const cardShadow = isModern ? "0 10px 40px rgba(0,0,0,0.08)" : isVampire ? "0 4px 32px rgba(187, 150, 228, 0.1)" : "0 4px 32px rgba(0,0,0,0.5)";

  const sepColor = isModern ? "1px solid #d4cfc0" : isVampire ? "1px solid rgba(187, 150, 228, 0.15)" : "1px solid hsl(220 14% 18%)";
  const numColor = isModern ? "hsl(30 20% 40%)" : isVampire ? "rgba(187, 150, 228, 0.5)" : "hsl(220 14% 40%)";
  const sepColorThick = isModern ? "1.5px solid #d4cfc0" : isVampire ? "1.5px solid rgba(187, 150, 228, 0.15)" : "1.5px solid hsl(220 14% 18%)";
  
  const bracketColor = isModern ? "rgba(0,0,0,0.25)" : isVampire ? "rgba(187, 150, 228, 0.3)" : "rgba(255,255,255,0.2)";
  const iconBorder = isModern ? "rgba(0,0,0,0.12)" : isVampire ? "rgba(187, 150, 228, 0.2)" : "rgba(255,255,255,0.1)";
  const iconBg = isModern ? "rgba(0,0,0,0.06)" : isVampire ? "rgba(187, 150, 228, 0.05)" : "rgba(255,255,255,0.05)";
  const iconFallback = isModern ? "rgba(0,0,0,0.3)" : isVampire ? "rgba(187, 150, 228, 0.3)" : "rgba(255,255,255,0.3)";
  
  const titleColor = isModern ? "hsl(30 20% 15%)" : isVampire ? "#DEDEDE" : "hsl(0 0% 92%)";
  const authorColor = isModern ? "hsl(30 20% 45%)" : isVampire ? "#BB96E4" : "hsl(220 14% 45%)";
  const statColor = isModern ? "hsl(30 20% 50%)" : isVampire ? "rgba(187, 150, 228, 0.6)" : "hsl(220 14% 40%)";
  const dotColor = isModern ? "rgba(0,0,0,0.2)" : isVampire ? "rgba(187, 150, 228, 0.3)" : "rgba(255,255,255,0.15)";
  const dlBtnBg = isModern ? "rgba(0,0,0,0.7)" : isVampire ? "rgba(187, 150, 228, 0.2)" : "rgba(255,255,255,0.15)";

  return (
    <div
      className="w-[min(210px,calc(100vw-4rem))] xl:w-[210px] h-[340px] shrink-0 rounded-[1.5rem] relative group cursor-pointer overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl flex flex-col"
      style={{
        background: cardBg,
        border: cardBorder,
        boxShadow: cardShadow,
      }}
      onClick={() => onOpenVersions(mod)}
    >
      {/* Top label row */}
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5" style={{ borderBottom: sepColor }}>
        <span 
          className="text-[8px] font-black uppercase tracking-[0.25em] flex items-center gap-1" 
          style={{ color: isCurseForge ? "#f87171" : "#4ade80" }}
        >
          <CirclePlay className="w-2 h-2" />
          {isCurseForge ? "CurseForge" : "Modrinth"}
        </span>
        <span className="text-[8px] font-black tabular-nums" style={{ color: numColor }}>
          {cardNum}
        </span>
      </div>

      {/* Visual area */}
      <div
        className="relative flex items-center justify-center"
        style={{ height: "175px", borderBottom: sepColorThick }}
      >
        {/* Bracket corners */}
        {[["top-2 left-2", "border-t-2 border-l-2"], ["top-2 right-2", "border-t-2 border-r-2"], ["bottom-2 left-2", "border-b-2 border-l-2"], ["bottom-2 right-2", "border-b-2 border-r-2"]].map(([pos, borders], i) => (
          <div key={i} className={`absolute ${pos} w-3 h-3 ${borders}`} style={{ borderColor: bracketColor }} />
        ))}

        <div className="relative w-32 h-32 rounded-2xl overflow-hidden border flex items-center justify-center shadow-lg transition-transform duration-500 group-hover:scale-110" style={{ borderColor: iconBorder, background: iconBg }}>
          {mod.iconUrl ? (
            <img src={mod.iconUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="text-2xl font-black" style={{ color: iconFallback }}>
              {mod.title.substring(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        {/* Download button */}
        <button
          onClick={(e) => { e.stopPropagation(); onDownload(mod); }}
          disabled={isDownloading}
          className="absolute bottom-3 right-3 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 active:scale-90"
          style={{ background: dlBtnBg, backdropFilter: "blur(8px)" }}
        >
          {isDownloading ? <Loader2 className="w-3 h-3 animate-spin text-white" /> : <Download className="w-3 h-3 text-white" />}
        </button>
      </div>

      {/* Text area */}
      <div className="flex-1 flex flex-col p-3 gap-1 relative">
        <h3 className="font-headline text-sm leading-tight line-clamp-2" style={{ color: titleColor }}>
          {mod.title}
        </h3>
        <p className="text-[8px] font-black uppercase tracking-[0.2em] mt-0.5" style={{ color: authorColor }}>
          {mod.author}
        </p>

        <div className="flex items-center justify-between mt-auto pt-2" style={{ borderTop: sepColor }}>
          <span className="text-[7.5px] font-black uppercase tracking-widest" style={{ color: statColor }}>
            {dls} ↓
          </span>
          <div className="flex gap-0.5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="w-1 h-1 rounded-full" style={{ background: dotColor }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
