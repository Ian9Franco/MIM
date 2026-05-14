/**
 * MIM — FOMO Version & Details Overlay
 * Optimized for v5.9: Modularized into hooks and components.
 */

import React, { memo, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, X, Download, Info, FileText, ListTree, ExternalLink, Package, Languages, Heart, Search } from "lucide-react";
import { openExternal } from "@/utils/format";
import { COLORS } from "@/theme/tokens";
import { markdownToHtml, formatCurseForgeHtml } from "@/utils/markdown";
import { useFomoOverlayManager } from "@/hooks/useFomoOverlayManager";
import { TabButton, DependencyCard, VersionCard } from "./FomoOverlayComponents";
import { FomoSkeleton } from "./FomoSkeleton";
import type { ModHit, VersionEntry } from "@/lib/types";

interface FomoVersionOverlayProps {
  mod: ModHit;
  versions: VersionEntry[];
  loading: boolean;
  downloading: boolean;
  loader: string;
  gameVersions: string[];
  projectType: string;
  onClose: () => void;
  onDownload: (mod: ModHit, version: VersionEntry) => void;
  onSearchProject?: (title: string) => void;
  onSearchAuthor?: (author: string) => void;
  disablePortal?: boolean;
  hideVersions?: boolean;
}

export const FomoVersionOverlay = memo(function FomoVersionOverlay({
  mod, versions, loading, downloading, loader, gameVersions, projectType, onClose, onDownload, onSearchProject, onSearchAuthor, disablePortal = false, hideVersions = false,
}: FomoVersionOverlayProps) {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const { 
    activeTab, setActiveTab, expandedVersion, setExpandedVersion, depDownloading, setDepDownloading, 
    isTranslating, translatedBody, depSearchQuery, setDepSearchQuery, followedAuthors, followedMods, 
    toggleFollowAuthor, toggleFollowMod, allDependencies, handleTranslate 
  } = useFomoOverlayManager(mod, versions, hideVersions);

  const [selectedVersionFilter, setSelectedVersionFilter] = useState<string | null>(gameVersions[0] || null);

  useEffect(() => {
    if (disablePortal) return;
    const find = () => { const el = document.getElementById("fomo-details-sidebar-portal"); if (el) { setPortalTarget(el); return true; } return false; };
    if (!find()) { const i = setInterval(() => { if (find()) clearInterval(i); }, 50); return () => clearInterval(i); }
  }, [disablePortal]);

  const rawDesc = mod.body?.trim() ? (mod._source === "curseforge" ? formatCurseForgeHtml(mod.body) : markdownToHtml(mod.body)) : "Sin descripción.";
  const descHtml = translatedBody ? `<div class="p-4 rounded-2xl bg-primary/5 border border-primary/20 mb-4">🌐 <b>Traducción:</b> ${translatedBody}</div><div class="opacity-40 grayscale scale-95">${rawDesc}</div>` : rawDesc;

  const content = (
    <div className="flex-1 flex flex-col min-h-0 animate-fade-in text-foreground">
      {loading ? (
        <FomoSkeleton variant="details" message="Cargando detalles..." />
      ) : (
        <>
          <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: "var(--fomo-border)" }}>
            <div className="flex items-center gap-3"><button onClick={onClose} className="p-2 -ml-2 rounded-xl hover:bg-white/10"><ChevronLeft className="w-5 h-5" /></button><h3 className="font-headline text-lg">Detalles</h3></div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10"><X className="w-5 h-5" /></button>
          </div>

          <div className="px-5 py-5 border-b" style={{ background: "var(--fomo-secondary-bg)", borderColor: "var(--fomo-border)" }}>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border">{mod.iconUrl && <img src={mod.iconUrl} alt="" className="w-full h-full object-cover" />}</div>
              <div className="min-w-0 flex-1">
                <p className="font-headline text-lg truncate">{mod.title}</p>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => toggleFollowAuthor(mod.author)} className={`px-2 py-1 rounded-full text-[10px] font-bold border ${followedAuthors.includes(mod.author) ? "bg-pink-500/20 text-pink-400" : "bg-white/5"}`}><Heart className="w-2.5 h-2.5 inline mr-1" />Autor</button>
                  <button onClick={() => toggleFollowMod(mod)} className={`px-2 py-1 rounded-full text-[10px] font-bold border ${followedMods.some(x => x.projectId === mod.projectId) ? "bg-rose-500/20 text-rose-400" : "bg-white/5"}`}><Heart className="w-2.5 h-2.5 inline mr-1" />Mod</button>
                </div>
              </div>
              <button onClick={() => openExternal(mod.url)} className="p-3 rounded-xl border hover:bg-white/10"><ExternalLink className="w-5 h-5 opacity-60" /></button>
            </div>
          </div>

          <div className="flex px-3 pt-2 gap-1 border-b shrink-0 overflow-x-auto" style={{ borderColor: COLORS.border }}>
            {!hideVersions && <TabButton active={activeTab === "versions"} onClick={() => setActiveTab("versions")} icon={<ListTree className="w-3.5 h-3.5" />} label="Versiones" />}
            <TabButton active={activeTab === "dependencies"} onClick={() => setActiveTab("dependencies")} icon={<Package className="w-3.5 h-3.5" />} label="Dependencias" />
            <TabButton active={activeTab === "description"} onClick={() => setActiveTab("description")} icon={<FileText className="w-3.5 h-3.5" />} label="Descripción" />
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
            {activeTab === "description" && (
              <div className="space-y-4">
                <button onClick={handleTranslate} disabled={isTranslating} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[0.65rem] font-bold">{isTranslating ? "Traduciendo..." : "Traducir"}</button>
                <div className="prose prose-invert prose-sm max-w-none text-sm" dangerouslySetInnerHTML={{ __html: descHtml }} />
              </div>
            )}
            {activeTab === "dependencies" && (
              <div className="space-y-4">
                <input type="text" value={depSearchQuery} onChange={e => setDepSearchQuery(e.target.value)} placeholder="Buscar..." className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-2 text-xs" />
                {allDependencies.filter(d => (d.title || d.projectId).toLowerCase().includes(depSearchQuery.toLowerCase())).map(d => (
                  <DependencyCard key={d.projectId} dep={d} source={mod._source} onDownload={() => {}} downloading={depDownloading === d.projectId} onSearch={onSearchProject} />
                ))}
              </div>
            )}
            {activeTab === "versions" && (
              <div className="space-y-2">
                {versions.filter(v => !selectedVersionFilter || v.gameVersions.includes(selectedVersionFilter)).map(v => (
                  <VersionCard key={v.id} v={v} mod={mod} isCompatible={v.gameVersions.some(gv => gameVersions.includes(gv))} isMainVersion={v.gameVersions.includes("1.20.1")} expanded={expandedVersion === v.id} onToggle={() => setExpandedVersion(expandedVersion === v.id ? null : v.id)} onDownload={onDownload} downloading={downloading} gameVersions={gameVersions} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );

  if (portalTarget) return createPortal(content, portalTarget);
  return <div className="absolute inset-0 z-60 flex flex-col backdrop-blur-xl" style={{ background: "rgba(0,0,0,0.8)" }}>{content}</div>;
});
