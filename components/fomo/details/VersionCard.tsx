import React from "react";
import { Download, Loader2, CheckCircle2, ChevronDown, ChevronUp, Package, Workflow } from "lucide-react";
import { COLORS } from "@/theme/tokens";

import type { ModHit } from "@/lib/core/types";
import type { FomoVersion, FomoDependencyItem } from "@/types/fomo";

interface VersionCardProps {
  v: FomoVersion;
  mod: ModHit;
  isCompatible: boolean;
  isMainVersion: boolean;
  expanded: boolean;
  onToggle: () => void;
  onDownload: (mod: ModHit, v: FomoVersion) => void;
  downloading: boolean;
  gameVersions: string[];
  activeLoader: string;
  selectedProjectType?: string;
}

export function VersionCard({ v, mod, isCompatible, isMainVersion, expanded, onToggle, onDownload, downloading, gameVersions, activeLoader, selectedProjectType }: VersionCardProps) {
  const modLoaders = v.loaders || [v.loader];
  
  // Robust detection for non-mod projects
  const pType = selectedProjectType || mod.projectType || "";
  const isNotMod = ["resourcepack", "shader", "datapack", "plugin"].includes(pType.toLowerCase());
  const isMod = !isNotMod && (!pType || pType.toLowerCase() === "mod");
  
  const isCompatibleLoader = !isMod || !activeLoader || activeLoader === "all" || activeLoader === "unknown" || modLoaders.some((l) => Boolean(l && l.toLowerCase().includes(activeLoader.toLowerCase())));
  const canDownload = isCompatibleLoader;

  const [translatedChangelog, setTranslatedChangelog] = React.useState<string | null>(null);
  const [isTranslating, setIsTranslating] = React.useState(false);

  const handleTranslateChangelog = async () => {
    if (!v.changelog || isTranslating) return;
    if (translatedChangelog) { setTranslatedChangelog(null); return; }
    setIsTranslating(true);
    try {
      const text = v.changelog.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/!\[([^\]]*)\]\([^)]*\)/g, "");
      const temp = document.createElement("div"); temp.innerHTML = text;
      const full = temp.innerText.trim();
      if (!full) throw new Error("Texto vacío");

      const lines = full.split(/\n/).filter(l => l.trim().length > 0);
      let interleavedHTML = "";

      for (const line of lines) {
        const cleanLine = line.trim();
        let translatedLine = "";
        try {
          const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanLine)}&langpair=en|es`);
          if (res.ok) {
            const d = await res.json();
            translatedLine = d.responseData?.translatedText || cleanLine;
          } else {
            translatedLine = cleanLine;
          }
        } catch (e) {
          translatedLine = cleanLine;
        }

        interleavedHTML += `
          <div class="mb-2">
            <p class="text-white/40 text-xs">${cleanLine}</p>
            <p class="text-primary text-xs font-medium">🌐 ${translatedLine}</p>
          </div>
        `;
      }

      setTranslatedChangelog(interleavedHTML);
    } catch (e) {
      console.error("[Translate Changelog] Failed:", e);
    } finally {
      setIsTranslating(false);
    }
  };

  // Project type badge
  const typeLabel = pType === "resourcepack" ? "TEXTURA" : pType.toUpperCase();
  const showTypeBadge = pType && pType !== "mod";

  return (
    <div className={`rounded-2xl border transition-all ${!isCompatible || !isCompatibleLoader ? "opacity-60" : ""} ${isMainVersion ? "ring-2 ring-primary/40" : ""}`} style={{ background: isMainVersion ? "rgba(var(--color-primary-rgb), 0.08)" : (expanded ? "var(--fomo-pill-inactive-bg, var(--color-hover))" : "var(--fomo-card-bg, var(--color-secondary-bg))"), borderColor: isMainVersion ? "var(--color-primary)" : (expanded ? "var(--fomo-card-hover-border, var(--color-border-strong))" : "var(--fomo-border, var(--color-border))") }}>
      <div className="p-4 flex items-center justify-between cursor-pointer" onClick={onToggle}>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-headline text-sm font-bold truncate text-white">{v.name || v.versionNumber}</p>
            {showTypeBadge && <span className="px-1.5 py-0.5 rounded-md bg-white/10 text-white/60 text-[8px] font-black border border-white/5 uppercase">{typeLabel}</span>}
            {isMainVersion && <span className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest bg-primary text-white shadow-lg shadow-primary/30">Latest</span>}
            {v.versionType === "release" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-500 border border-amber-500/20 uppercase">{v.versionType}</span>}
            {!isCompatibleLoader && isMod && <span className="px-1.5 py-0.5 rounded-md bg-red-500/20 text-red-400 text-[8px] font-black uppercase tracking-tighter border border-red-500/20">Modloader Incorrecto</span>}
          </div>
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-md bg-white/5 border border-white/5 text-white/40 text-[9px] font-bold">
               <Package className="w-3 h-3 text-primary" />
               <span>{v.gameVersions?.join(', ') || v.gameVersion}</span>
             </div>
             {modLoaders.length > 0 && isMod && (
                <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-md bg-white/5 border border-white/5 text-white/40 text-[9px] font-bold">
                  <Workflow className="w-3 h-3" />
                  <span className="uppercase">{modLoaders.join(', ')}</span>
                </div>
             )}
             <span className="text-[10px] opacity-30 font-medium">
               {(v.datePublished || v.date_published) ? new Date(v.datePublished || v.date_published || "").toLocaleDateString() : ""}
             </span>
          </div>
        </div>
        <div className="flex items-center gap-3 ml-4">
          <button 
            onClick={(e) => { e.stopPropagation(); onDownload(mod, v); }} 
            disabled={downloading || !canDownload} 
            className={`flex items-center gap-2 h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${isCompatible && canDownload ? "bg-primary text-white shadow-lg shadow-primary/20 hover:scale-105 active:scale-95" : "bg-white/5 text-white/20 border border-white/5 hover:bg-white/10 opacity-50 cursor-not-allowed"}`}
          >
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {!canDownload ? "Incompatible" : (isCompatible ? "Instalar" : "Bajar")}
          </button>
          <div className="p-1 rounded-full hover:bg-white/5 transition-colors">
            {expanded ? <ChevronUp className="w-4 h-4 opacity-40" /> : <ChevronDown className="w-4 h-4 opacity-40" />}
          </div>
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-white/5 space-y-4 animate-in slide-in-from-top-2">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[0.65rem] font-bold uppercase tracking-wider" style={{ color: COLORS.muted }}>Changelog</p>
              {v.changelog && (
                <button 
                  onClick={handleTranslateChangelog} 
                  disabled={isTranslating} 
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md border text-[0.65rem] font-bold hover:bg-white/5 transition-colors"
                >
                  {isTranslating ? "..." : (translatedChangelog ? "Original" : "Traducir")}
                </button>
              )}
            </div>
            <div className="text-xs leading-relaxed p-3 rounded-lg border max-h-40 overflow-y-auto custom-scrollbar" style={{ background: "rgba(0,0,0,0.05)", borderColor: COLORS.border, color: COLORS.foreground }}>
              {translatedChangelog ? (
                <div dangerouslySetInnerHTML={{ __html: translatedChangelog }} />
              ) : (
                v.changelog?.trim() || "Sin changelog."
              )}
            </div>
          </div>
          {(v.dependencies?.length ?? 0) > 0 && (
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-wider mb-2" style={{ color: COLORS.muted }}>Dependencias</p>
              <div className="flex flex-col gap-1.5">
                {(v.dependencies || []).map((dep: FomoDependencyItem) => {
                  const depTypeMap: Record<string, { label: string; color: string; bg: string }> = {
                    required:     { label: "Requerida",    color: "#f87171", bg: "rgba(239,68,68,0.12)" },
                    optional:     { label: "Opcional",     color: "#63b3ed", bg: "rgba(99,179,237,0.12)" },
                    incompatible: { label: "Incompatible", color: "#fb923c", bg: "rgba(249,115,22,0.12)" },
                    embedded:     { label: "Incluida",     color: "#34d399", bg: "rgba(52,211,153,0.12)" },
                  };
                  const dtKey = dep.dependencyType || "embedded";
                  const dt = depTypeMap[dtKey] ?? { label: dtKey, color: "rgba(255,255,255,0.4)", bg: "rgba(255,255,255,0.05)" };
                  return (
                    <div key={dep.projectId} className="flex items-center justify-between px-3 py-2 rounded-xl border" style={{ background: "var(--color-secondary-bg)", borderColor: COLORS.border }}>
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dt.color }} />
                        <span className="text-xs font-medium truncate" style={{ color: COLORS.foreground }}>{dep.title || dep.projectId}</span>
                      </div>
                      <span className="shrink-0 ml-2 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest" style={{ background: dt.bg, color: dt.color }}>{dt.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
