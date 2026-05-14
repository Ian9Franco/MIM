import React from "react";
import { ListTree, Download, ExternalLink, Loader2, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { COLORS } from "@/theme/tokens";
import { formatSize, openExternal } from "@/utils/format";

// ── TabButton ───────────────────────────────────────────────────────────────

export function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-2 text-xs font-bold rounded-t-lg transition-all flex items-center gap-1.5 shrink-0 ${active ? "border-b-2" : "opacity-40 hover:opacity-100"}`}
      style={{ 
        background: active ? "var(--fomo-card-bg, var(--color-secondary-bg))" : "transparent",
        borderColor: COLORS.primary,
        color: active ? COLORS.primary : "var(--fomo-text-subtle, var(--color-muted))"
      }}
    >
      {icon}
      {label}
    </button>
  );
}

// ── DependencyCard ──────────────────────────────────────────────────────────

interface DependencyCardProps {
  dep: any;
  source?: string;
  onDownload?: (id: string, title: string) => void;
  downloading?: boolean;
  onSearch?: (q: string) => void;
  typeColor?: string;
}

export function DependencyCard({ dep, source, onDownload, downloading, onSearch, typeColor }: DependencyCardProps) {
  const depUrl = dep.url || (source === "modrinth" ? `https://modrinth.com/project/${dep.projectId}` : `https://www.curseforge.com/projects/${dep.projectId}`);
  return (
    <div className="flex items-center justify-between p-3 rounded-2xl border transition-colors hover:bg-white/5" style={{ background: "var(--color-secondary-bg)", borderColor: COLORS.border }}>
      <div onClick={() => onSearch?.(dep.title || dep.projectId)} className={`min-w-0 flex-1 pr-2 ${onSearch ? "cursor-pointer group/dep" : ""}`}>
        <p className={`text-sm font-bold truncate transition-colors ${onSearch && typeColor ? `group-hover/dep:text-[${typeColor}]` : ""}`} style={{ color: COLORS.foreground }}>{dep.title || dep.projectId}</p>
        <p className="text-[0.6rem] mt-0.5 flex items-center gap-1.5" style={{ color: COLORS.muted }}><span>ID: {dep.projectId}</span></p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button onClick={() => openExternal(depUrl)} className="p-2 rounded-xl bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-colors"><ExternalLink className="w-4 h-4" /></button>
        {onDownload && (
          <button onClick={() => onDownload(dep.projectId, dep.title || dep.projectId)} disabled={downloading} className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-30">
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
}

// ── VersionCard ─────────────────────────────────────────────────────────────

interface VersionCardProps {
  v: any;
  mod: any;
  isCompatible: boolean;
  isMainVersion: boolean;
  expanded: boolean;
  onToggle: () => void;
  onDownload: (mod: any, v: any) => void;
  downloading: boolean;
  gameVersions: string[];
}

export function VersionCard({ v, mod, isCompatible, isMainVersion, expanded, onToggle, onDownload, downloading, gameVersions }: VersionCardProps) {
  return (
    <div className={`rounded-2xl border transition-all ${!isCompatible ? "opacity-60" : ""} ${isMainVersion ? "ring-1 ring-primary/30" : ""}`} style={{ background: isMainVersion ? "var(--fomo-secondary-bg, rgba(187,150,228,0.05))" : (expanded ? "var(--fomo-pill-inactive-bg, var(--color-hover))" : "var(--fomo-card-bg, var(--color-secondary-bg))"), borderColor: isMainVersion ? "var(--color-primary)" : (expanded ? "var(--fomo-card-hover-border, var(--color-border-strong))" : "var(--fomo-border, var(--color-border))") }}>
      <div className="p-4 flex items-center justify-between cursor-pointer" onClick={onToggle}>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-headline text-sm truncate" style={{ color: COLORS.foreground }}>{v.name || v.versionNumber}</p>
            {isMainVersion && <span className="px-1.5 py-0.5 rounded text-[0.6rem] font-bold uppercase bg-primary text-white">Main</span>}
            {v.versionType === "release" ? <CheckCircle2 className="w-3 h-3 text-green-400" /> : <span className="text-[0.6rem] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-500 uppercase">{v.versionType}</span>}
            {!isCompatible && <span className="text-[0.6rem] font-bold px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 uppercase">Incompatible</span>}
          </div>
          <p className="text-[0.65rem] mt-1" style={{ color: COLORS.muted }}>{new Date(v.datePublished).toLocaleDateString()} • {formatSize(v.primaryFile?.size ?? 0)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); onDownload(mod, v); }} disabled={downloading} className={`p-2 rounded-xl transition-colors ${isCompatible ? "bg-primary/20 text-primary hover:bg-primary/30" : "bg-white/5 text-white/20 hover:bg-white/10"}`}>
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          </button>
          {expanded ? <ChevronUp className="w-4 h-4 opacity-40" /> : <ChevronDown className="w-4 h-4 opacity-40" />}
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-white/5 space-y-4 animate-in slide-in-from-top-2">
          <div><p className="text-[0.65rem] font-bold uppercase tracking-wider mb-2" style={{ color: COLORS.muted }}>Changelog</p><div className="text-xs leading-relaxed p-3 rounded-lg border max-h-40 overflow-y-auto custom-scrollbar" style={{ background: "rgba(0,0,0,0.05)", borderColor: COLORS.border, color: COLORS.foreground }}>{v.changelog?.trim() || "Sin changelog."}</div></div>
          {v.dependencies?.length > 0 && (
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-wider mb-2" style={{ color: COLORS.muted }}>Dependencias</p>
              <div className="flex flex-col gap-1.5">
                {v.dependencies.map((dep: any) => (
                  <div key={dep.projectId} className="flex items-center justify-between px-3 py-2 rounded-xl border" style={{ background: "var(--color-secondary-bg)", borderColor: COLORS.border }}>
                    <div className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full" style={{ background: dep.dependencyType === "required" ? COLORS.red : dep.dependencyType === "incompatible" ? "#f97316" : dep.dependencyType === "embedded" ? "#34d399" : COLORS.primary }} /><span className="text-xs font-medium" style={{ color: COLORS.foreground }}>{dep.title}</span></div>
                    <span className="text-[0.6rem] uppercase tracking-widest opacity-30 font-bold">{dep.dependencyType}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
