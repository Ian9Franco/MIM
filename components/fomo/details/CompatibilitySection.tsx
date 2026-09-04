import React from "react";
import { Download, Heart } from "lucide-react";
import type { ModHit } from "@/lib/core/types";
import type { FomoCategory } from "@/types/fomo";

export interface CompatibilitySectionProps {
  mod: ModHit;
  onSelectLoader?: (l: string) => void;
  selectedLoader?: string | null;
}

export function CompatibilitySection({ mod, onSelectLoader, selectedLoader }: CompatibilitySectionProps) {
  // Intelligent Loader Detection (Modrinth & CurseForge fallback)
  const loaderSet = new Set<string>(mod.loaders || []);
  
  // If no loaders found (common in CurseForge hits), check categories
  if (loaderSet.size === 0 || (loaderSet.size === 1 && loaderSet.has("datapack"))) {
    const loaderKeywords = ["fabric", "forge", "neoforge", "quilt", "bukkit", "spigot", "paper"];
    mod.categories?.forEach((c: FomoCategory) => {
      const cat = typeof c === "string" 
        ? c.toLowerCase() 
        : (c && typeof c === "object" && typeof c.name === "string" ? c.name.toLowerCase() : "");
      if (!cat) return;
      loaderKeywords.forEach(k => {
        if (cat.includes(k)) loaderSet.add(k);
      });
    });
  }

  // Remove "datapack" from loaders as it's a project type
  loaderSet.delete("datapack");

  const platforms = Array.from(loaderSet).filter(p => ["fabric", "forge", "neoforge", "quilt", "bukkit", "spigot", "paper"].includes(p.toLowerCase()));

  const cs = mod.client_side || (mod as any).clientSide;
  const ss = mod.server_side || (mod as any).serverSide;

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-4 py-3 border-y border-white/5 my-2">
      <div className="space-y-1">
        <h4 className="text-[8px] font-black uppercase tracking-widest opacity-30">Etiquetas</h4>
        <div className="flex flex-wrap gap-1 max-w-[160px]">
          {(() => {
            const noise = ["fabric", "forge", "neoforge", "quilt", "datapack", "mod", "client", "server", "universal", "locale", "minecraft", "modded", "babric"];
            const filtered = mod.categories?.filter((c: FomoCategory) => {
              const cat = typeof c === "string" 
                ? c.toLowerCase() 
                : (c && typeof c === "object" && typeof c.name === "string" ? c.name.toLowerCase() : "");
              return cat && !noise.includes(cat);
            }).map((c: FomoCategory) => typeof c === "string" ? c : (c.name || "")) || [];
            
            return (
              <>
                {filtered.slice(0, 6).map((cat: string) => (
                  <span key={cat} className="text-[9px] font-bold text-[var(--fomo-text-primary)] opacity-60 bg-white/5 px-1.5 py-0.5 rounded capitalize truncate max-w-[85px]">
                    {cat}
                  </span>
                ))}
                {filtered.length > 6 && <span className="text-[8px] opacity-30 font-black">+{filtered.length - 6}</span>}
                {filtered.length === 0 && <span className="text-[10px] opacity-20 italic">Sin etiquetas</span>}
              </>
            );
          })()}
        </div>
      </div>
      <div className="space-y-1">
        <h4 className="text-[8px] font-black uppercase tracking-widest opacity-30">Popularidad</h4>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-[var(--fomo-text-primary)] flex items-center gap-1">
            <Download className="w-3 h-3 opacity-40 text-primary" />
            {Number(mod.downloads || 0) >= 1000000 ? (Number(mod.downloads || 0) / 1000000).toFixed(1) + "M" : (Number(mod.downloads || 0) / 1000).toFixed(1) + "K"}
          </span>
          <span className="text-[10px] font-bold text-[var(--fomo-text-primary)] opacity-60 flex items-center gap-1">
            <Heart className="w-3 h-3 opacity-40" />
            {mod.follows >= 1000 ? (mod.follows / 1000).toFixed(1) + "K" : mod.follows || 0}
          </span>
        </div>
      </div>
      <div className="space-y-1">
        <h4 className="text-[8px] font-black uppercase tracking-widest opacity-30">Loaders</h4>
        <div className="flex flex-wrap gap-1">
          {platforms.length > 0 ? platforms.map((p: string) => {
            const isActive = selectedLoader?.toLowerCase() === p.toLowerCase();
            return (
              <button 
                key={p} 
                onClick={() => onSelectLoader?.(p)}
                className={`px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase border transition-all ${
                  isActive 
                    ? "bg-primary text-white border-primary shadow-[0_0_10px_rgba(var(--color-primary-rgb),0.3)] scale-110 z-10" 
                    : "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                }`}
              >
                {p}
              </button>
            );
          }) : (
            <span className="px-1.5 py-0.5 rounded-md bg-white/5 text-white/30 text-[8px] font-black uppercase border border-white/5">Universal</span>
          )}
        </div>
      </div>
      <div className="space-y-1">
        <h4 className="text-[8px] font-black uppercase tracking-widest opacity-30">Entorno</h4>
        <div className="flex gap-1 flex-wrap">
          {(cs === "required" || cs === "optional") && <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase border ${cs === "required" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-white/5 text-white/50 border-white/10"}`}>Cliente {cs === "optional" && "(Opc)"}</span>}
          {(ss === "required" || ss === "optional") && <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase border ${ss === "required" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-white/5 text-white/50 border-white/10"}`}>Servidor {ss === "optional" && "(Opc)"}</span>}
          {!cs && !ss && <span className="px-1.5 py-0.5 rounded-md bg-white/5 text-white/30 text-[8px] font-black uppercase border border-white/5">Universal</span>}
        </div>
      </div>
    </div>
  );
}
