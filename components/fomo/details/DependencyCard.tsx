import React from "react";
import { ExternalLink, Download, Loader2 } from "lucide-react";
import { COLORS } from "@/theme/tokens";
import { openExternal } from "@/utils/format";
import type { FomoDependencyItem } from "@/types/fomo";

interface DependencyCardProps {
  dep: FomoDependencyItem;
  source?: string;
  onDownload?: (id: string, title: string) => void;
  downloading?: boolean;
  onSearch?: (q: string) => void;
  typeColor?: string;
}

export function DependencyCard({ dep, source, onDownload, downloading, onSearch, typeColor }: DependencyCardProps) {
  const depUrl = dep.url || (source === "modrinth" ? `https://modrinth.com/project/${dep.projectId}` : `https://www.curseforge.com/projects/${dep.projectId}`);

  const typeConfig: Record<string, { label: string; bg: string; color: string; border: string }> = {
    required:     { label: "Requerida",    bg: "rgba(239,68,68,0.12)",   color: "#f87171",  border: "rgba(239,68,68,0.3)" },
    optional:     { label: "Opcional",     bg: "rgba(99,179,237,0.12)",  color: "#63b3ed",  border: "rgba(99,179,237,0.3)" },
    incompatible: { label: "Incompatible", bg: "rgba(249,115,22,0.12)",  color: "#fb923c",  border: "rgba(249,115,22,0.3)" },
    embedded:     { label: "Incluida",     bg: "rgba(52,211,153,0.12)",  color: "#34d399",  border: "rgba(52,211,153,0.3)" },
  };
  const dtKey = dep.dependencyType || "embedded";
  const tc = typeConfig[dtKey] ?? { label: dtKey, bg: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)", border: "rgba(255,255,255,0.1)" };

  const depTitle = dep.title || dep.projectId || "";
  const depId = dep.projectId || "";

  return (
    <div className="flex items-center justify-between p-3 rounded-2xl border transition-colors hover:bg-white/5" style={{ background: "var(--color-secondary-bg)", borderColor: COLORS.border }}>
      <div onClick={() => onSearch?.(depTitle)} className={`min-w-0 flex-1 pr-2 ${onSearch ? "cursor-pointer group/dep" : ""}`}>
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-bold truncate transition-colors" style={{ color: COLORS.foreground }}>{depTitle}</p>
          <span className="shrink-0 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border" style={{ background: tc.bg, color: tc.color, borderColor: tc.border }}>
            {tc.label}
          </span>
        </div>
        <p className="text-[0.6rem] flex items-center gap-1.5" style={{ color: COLORS.muted }}><span>ID: {depId}</span></p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button onClick={() => openExternal(depUrl)} className="p-2 rounded-xl bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-colors"><ExternalLink className="w-4 h-4" /></button>
        {onDownload && dep.dependencyType !== "incompatible" && (
          <button onClick={() => onDownload(depId, depTitle)} disabled={downloading} className="p-2 rounded-xl transition-colors disabled:opacity-30" style={{ background: tc.bg, color: tc.color }}>
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
}
