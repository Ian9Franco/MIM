/**
 * MIM — FOMO Version & Details Overlay
 * Optimized for v5.9: Modularized into hooks and components.
 */

import React, { memo, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X, Download, Info, FileText, ListTree, ExternalLink, Package, Heart, Image as ImageIcon, Maximize2, Search, Workflow } from "lucide-react";
import { openExternal } from "@/utils/format";
import { COLORS } from "@/theme/tokens";
import { markdownToHtml, formatCurseForgeHtml } from "@/utils/markdown";
import { useFomoOverlayManager } from "@/hooks/useFomoOverlayManager";
import { TabButton, DependencyCard, VersionCard, ModHeader, StatsGrid } from "./FomoOverlayComponents";
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
  onSearchMod?: (title: string) => void;
  disablePortal?: boolean;
  hideVersions?: boolean;
  pendingFilesCount?: number;
  onOpenDownloads?: () => void;
}

export const FomoVersionOverlay = memo(function FomoVersionOverlay({
  mod, versions, loading, downloading, loader, gameVersions, projectType, onClose, onDownload, onSearchProject, onSearchAuthor, onSearchMod, disablePortal = false, hideVersions = false,
  pendingFilesCount = 0, onOpenDownloads
}: FomoVersionOverlayProps) {
  if (!mod) return null;

  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const { 
    activeTab, setActiveTab, expandedVersion, setExpandedVersion, depDownloading, setDepDownloading, 
    isTranslating, translatedBody, depSearchQuery, setDepSearchQuery, followedAuthors, followedMods, 
    toggleFollowAuthor, toggleFollowMod, allDependencies, handleTranslate, gallery, loadingGallery 
  } = useFomoOverlayManager(mod, versions, hideVersions);

  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [isFullView, setIsFullView] = useState(false);
  const [selectedVersionFilter, setSelectedVersionFilter] = useState<string | null>(gameVersions[0] || null);

  // Sincronizar con cambios en el sidebar (Filtros externos)
  useEffect(() => {
    if (gameVersions.length > 0) {
      setSelectedVersionFilter(gameVersions[0]);
    }
  }, [gameVersions, loader]);

  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const handleCount = (e: any) => setPendingCount(e.detail.count);
    window.addEventListener("fomo-pending-count", handleCount);
    // Pedir el conteo actual al montar
    window.dispatchEvent(new CustomEvent("fomo-request-pending-count"));
    return () => window.removeEventListener("fomo-pending-count", handleCount);
  }, []);

  const handleOpenDownloads = () => {
    // 1. Ocultar detalles para permitir ver descargas
    window.dispatchEvent(new CustomEvent("fomo-details-toggle", { detail: { open: false } }));
    // 2. Abrir el panel de descargas
    window.dispatchEvent(new CustomEvent("toggle-downloads", { detail: { collapsed: false } }));
  };

  const [showSkeleton, setShowSkeleton] = useState(false);

  useEffect(() => {
    let timer: any;
    if (loadingGallery) {
      timer = setTimeout(() => setShowSkeleton(true), 250);
    } else {
      setShowSkeleton(false);
    }
    return () => timer && clearTimeout(timer);
  }, [loadingGallery]);

  const handlePrev = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedImageIndex === null) return;
    setSelectedImageIndex(selectedImageIndex === 0 ? gallery.length - 1 : selectedImageIndex - 1);
  }, [selectedImageIndex, gallery.length]);

  const handleNext = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedImageIndex === null) return;
    setSelectedImageIndex(selectedImageIndex === gallery.length - 1 ? 0 : selectedImageIndex + 1);
  }, [selectedImageIndex, gallery.length]);

  useEffect(() => {
    if (disablePortal) return;
    
    const updatePortal = () => {
      const el = document.getElementById("fomo-details-sidebar-portal");
      if (el) {
        setPortalTarget(el);
        return true;
      }
      return false;
    };

    if (!updatePortal()) {
      const interval = setInterval(() => {
        if (updatePortal()) clearInterval(interval);
      }, 50);
      return () => clearInterval(interval);
    }
  }, [disablePortal, mod.projectId]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (selectedImageIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") setSelectedImageIndex(prev => prev === 0 ? gallery.length - 1 : (prev !== null ? prev - 1 : 0));
      if (e.key === "ArrowRight") setSelectedImageIndex(prev => prev === gallery.length - 1 ? 0 : (prev !== null ? prev + 1 : 0));
      if (e.key === "Escape") { setSelectedImageIndex(null); setIsFullView(false); }
      if (e.key === "f") setIsFullView(prev => !prev);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedImageIndex, gallery.length]);

  const descText = mod.body || mod.description || "";
  const rawDesc = descText.trim() ? (mod._source === "curseforge" ? formatCurseForgeHtml(descText) : markdownToHtml(descText)) : "Sin descripción.";
  const descHtml = translatedBody ? `<div class="p-4 rounded-2xl bg-primary/5 border border-primary/20 mb-4">🌐 <b>Traducción:</b> ${translatedBody}</div><div class="opacity-40 grayscale scale-95">${rawDesc}</div>` : rawDesc;

  const mainContent = (
    <div className="flex-1 flex flex-col min-h-0 animate-fade-in text-foreground relative">
      {loading ? (
        <FomoSkeleton variant="details" message="Cargando detalles..." />
      ) : (
        <>
          <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: "var(--fomo-border)" }}>
            <div className="flex items-center gap-3"><button onClick={onClose} className="p-2 -ml-2 rounded-xl hover:bg-white/10"><ChevronLeft className="w-5 h-5" /></button><h3 className="font-headline text-lg">Detalles</h3></div>
            <div className="flex items-center gap-2">
              {pendingCount > 0 && (
                <button 
                  onClick={handleOpenDownloads}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-all group"
                >
                  <div className="relative">
                    <Download className="w-4 h-4 group-hover:animate-bounce" />
                    <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-rose-500 text-white text-[7px] font-bold flex items-center justify-center shadow-sm">
                      {pendingCount}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-tight">Descargas</span>
                </button>
              )}
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 text-foreground/50 hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <ModHeader 
            mod={mod} 
            bannerUrl={gallery[0]?.url}
            onSearchAuthor={onSearchAuthor} 
            onSearchMod={onSearchMod} 
            followedAuthors={followedAuthors} 
            followedMods={followedMods}
            toggleFollowAuthor={toggleFollowAuthor} 
            toggleFollowMod={toggleFollowMod}
          />
          <div className="px-6 py-2 fomo-scroll shrink-0">
            <StatsGrid mod={mod} />
          </div>

          <div className="flex px-3 pt-2 gap-1 border-b shrink-0 overflow-x-auto" style={{ borderColor: "var(--fomo-border)" }}>
            {!hideVersions && <TabButton active={activeTab === "versions"} onClick={() => setActiveTab("versions")} icon={<ListTree className="w-3.5 h-3.5" />} label="Versiones" />}
            <TabButton active={activeTab === "dependencies"} onClick={() => setActiveTab("dependencies")} icon={<Package className="w-3.5 h-3.5" />} label="Dependencias" />
            <TabButton active={activeTab === "gallery"} onClick={() => setActiveTab("gallery")} icon={<ImageIcon className="w-3.5 h-3.5" />} label="Galería" count={gallery.length || undefined} />
            <TabButton active={activeTab === "description"} onClick={() => setActiveTab("description")} icon={<FileText className="w-3.5 h-3.5" />} label="Descripción" />
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
            {activeTab === "description" && (
              <div className="space-y-4">
                <button onClick={handleTranslate} disabled={isTranslating} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[0.65rem] font-bold">{isTranslating ? "Traduciendo..." : "Traducir"}</button>
                <div className="prose prose-invert prose-sm max-w-none text-sm" dangerouslySetInnerHTML={{ __html: descHtml }} />
              </div>
            )}
            {activeTab === "gallery" && (
              <div className="space-y-4 animate-fade-in">
                {showSkeleton ? (
                  <div className="grid grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-white/5 animate-pulse rounded-2xl border border-white/5" />)}
                  </div>
                ) : !loadingGallery && gallery.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/5"><ImageIcon className="w-8 h-8 opacity-20" /></div>
                    <div>
                      <p className="text-sm font-headline opacity-60">Este proyecto aún no tiene capturas de pantalla públicas.</p>
                      <p className="text-[10px] opacity-30 mt-1 uppercase tracking-widest">Galería Vacía</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {gallery.map((img, i) => (
                      <div key={i} onClick={() => setSelectedImageIndex(i)} className="group relative rounded-2xl overflow-hidden border border-white/10 bg-black/40 aspect-video cursor-zoom-in hover:border-primary/50 transition-all">
                        <img 
                          src={img.thumbnailUrl || img.url} 
                          alt="" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <Maximize2 className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity scale-50 group-hover:scale-100 duration-300" />
                        </div>
                        {img.title && (
                          <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                            {img.title}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
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
              <div className="space-y-4">
                {/* Barra de Toggles de Versión de Minecraft - Basada en DATOS REALES del mod */}
                <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none sticky top-0 z-10 bg-[var(--fomo-bg)] -mx-4 px-4 pt-1">
                  <button 
                    onClick={() => setSelectedVersionFilter(null)}
                    className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${!selectedVersionFilter ? "bg-primary text-white border-primary shadow-[0_0_15px_rgba(187,150,228,0.3)]" : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10"}`}
                  >
                    Todas
                  </button>
                  {(() => {
                    const uniqueVersions = Array.from(new Set(versions.flatMap(v => v.gameVersions)))
                      .filter(gv => {
                        if (!gv) return false;
                        // Filtrar ruido de CurseForge: Solo permitimos versiones que empiecen por número (Minecraft)
                        // y excluimos tags de loader o entorno que a veces se cuelan
                        const isNumericVersion = /^\d+(\.\d+)*$/.test(gv);
                        const isNoise = ["forge", "fabric", "neoforge", "quilt", "client", "server"].includes(gv.toLowerCase());
                        return isNumericVersion && !isNoise;
                      })
                      .sort((a, b) => b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' }));

                    return uniqueVersions.map(gv => {
                      const isTarget = gameVersions.includes(gv);
                      const active = selectedVersionFilter === gv;
                      return (
                        <button 
                          key={gv} 
                          onClick={() => setSelectedVersionFilter(gv)}
                          className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${active ? "bg-primary text-white border-primary shadow-[0_0_15px_rgba(187,150,228,0.3)]" : isTarget ? "bg-primary/10 border-primary/20 text-primary" : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10"}`}
                        >
                          {gv}
                        </button>
                      );
                    });
                  })()}
                </div>

                <div className="space-y-8 pb-10">
                  {/* SECCIÓN 1: ÚLTIMOS 2 LANZAMIENTOS (Prioridad Global) */}
                  {!selectedVersionFilter && versions.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 opacity-30 px-1">
                        <span className="text-[9px] font-black uppercase tracking-[0.3em]">Lanzamientos Recientes</span>
                        <div className="h-[1px] flex-1 bg-white/10" />
                      </div>
                      <div className="space-y-2">
                        {versions.slice(0, 2).map((v, idx) => (
                          <VersionCard 
                            key={`latest-${v.id || idx}`} 
                            v={v} 
                            mod={mod} 
                            isCompatible={v.gameVersions.some(gv => gameVersions.includes(gv))} 
                            isMainVersion={true} // Usamos esto para el badge LATEST
                            expanded={expandedVersion === v.id} 
                            onToggle={() => setExpandedVersion(expandedVersion === v.id ? null : v.id)} 
                            onDownload={onDownload} 
                            downloading={downloading} 
                            gameVersions={gameVersions} 
                            activeLoader={loader}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SECCIÓN 2: HISTORIAL FILTRADO O RESTO DEL MUNDO */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 opacity-30 px-1">
                      <span className="text-[9px] font-black uppercase tracking-[0.3em]">
                        {selectedVersionFilter ? `Archivos para Minecraft ${selectedVersionFilter}` : "Historial de Versiones"}
                      </span>
                      <div className="h-[1px] flex-1 bg-white/10" />
                    </div>
                    <div className="space-y-2">
                      {versions
                        .filter(v => !selectedVersionFilter || v.gameVersions.includes(selectedVersionFilter))
                        // Si no hay filtro, ocultamos los 2 de arriba para no repetir
                        .slice(!selectedVersionFilter ? 2 : 0)
                        .map((v, idx) => (
                          <VersionCard 
                            key={v.id || idx} 
                            v={v} 
                            mod={mod} 
                            isCompatible={v.gameVersions.some(gv => gameVersions.includes(gv))} 
                            isMainVersion={false} 
                            expanded={expandedVersion === v.id} 
                            onToggle={() => setExpandedVersion(expandedVersion === v.id ? null : v.id)} 
                            onDownload={onDownload} 
                            downloading={downloading} 
                            gameVersions={gameVersions} 
                            activeLoader={loader}
                          />
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );

  const lightbox = selectedImageIndex !== null && (
    <FomoLightbox 
      images={gallery} 
      index={selectedImageIndex} 
      onClose={() => { setSelectedImageIndex(null); setIsFullView(false); }}
      onNext={handleNext}
      onPrev={handlePrev}
      isFullView={isFullView}
      setIsFullView={setIsFullView}
    />
  );

  // Render directly when portal is disabled (native sidebar mode)
  if (disablePortal) {
    return (
      <>
        <div className="flex flex-col h-full overflow-hidden">
          {mainContent}
        </div>
        {lightbox}
      </>
    );
  }

  // Portal mode: inject into the portal target element
  if (portalTarget) {
    return (
      <>
        {createPortal(mainContent, portalTarget)}
        {lightbox}
      </>
    );
  }

  // Portal not found yet — wait for it (renders nothing briefly)
  return null;
});

// ── FomoLightbox ──────────────────────────────────────────────────────────

function FomoLightbox({ images, index, onClose, onNext, onPrev, isFullView, setIsFullView }: any) {
  if (typeof document === "undefined") return null;
  
  return createPortal(
    <div className="lightbox-overlay fixed inset-0 z-[9999] flex items-center justify-center p-8 bg-black/95 backdrop-blur-3xl animate-fade-in" style={{ animationDuration: '400ms' }} onClick={onClose}>
      <div className="absolute top-6 right-6 flex items-center gap-2 z-50">
        <button 
          onClick={(e) => { e.stopPropagation(); setIsFullView(!isFullView); }}
          className={`p-3 rounded-full transition-all active:scale-95 ${isFullView ? "bg-primary text-white" : "bg-white/5 text-white/50 hover:bg-white/10"}`}
          title={isFullView ? "Contraer" : "Expandir"}
        >
          <Maximize2 className="w-5 h-5" />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="p-3 rounded-full bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-all active:scale-95"
        >
          <X className="w-6 h-6" />
        </button>
      </div>
      
      <button onClick={onPrev} className="absolute left-0 top-0 bottom-0 w-[40%] z-10 cursor-pointer opacity-0" aria-label="Anterior" />
      <button onClick={onNext} className="absolute right-0 top-0 bottom-0 w-[40%] z-10 cursor-pointer opacity-0" aria-label="Siguiente" />
      
      <div className="relative flex flex-col items-center justify-center pointer-events-none w-full h-full p-4">
        <div className={`flex flex-col items-center gap-4 pointer-events-auto transition-all duration-500 ease-out ${isFullView ? "scale-105" : "scale-100"}`}>
          <img 
            src={images[index].url} 
            alt="" 
            className={`object-contain block rounded-2xl transition-all duration-500 shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-white/10 animate-zoom-in ${isFullView ? "w-[94vw] h-[90vh]" : "max-w-[90vw] h-[75vh] w-auto"}`}
            onClick={e => e.stopPropagation()} 
          />
          
          {!isFullView && (
            <div className="flex flex-col items-center gap-2 pointer-events-none animate-fade-in">
              {images[index].title && (
                <div className="px-5 py-2 rounded-2xl bg-white/10 border border-white/20 text-xs font-bold text-white backdrop-blur-xl shadow-2xl">
                  {images[index].title}
                </div>
              )}
              <div className="px-3 py-1 rounded-full bg-black/40 border border-white/5 text-[10px] text-white/40 uppercase tracking-[0.3em] font-headline backdrop-blur-md">
                {index + 1} <span className="mx-1 opacity-20">/</span> {images.length}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
