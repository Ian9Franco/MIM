/**
 * MIM — FOMO Version & Details Overlay
 * Optimized for v5.9: Modularized into hooks and components.
 */

import React, { memo, useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X, Download, Info, FileText, ListTree, ExternalLink, Package, Heart, Images, Maximize2, Search, Workflow, Sparkles, Key, Loader2, RotateCcw, Send, MessageSquare } from "lucide-react";
import { openExternal } from "@/utils/format";
import { COLORS } from "@/theme/tokens";
import { markdownToHtml, formatCurseForgeHtml } from "@/utils/markdown";
import { useFomoOverlayManager } from "@/hooks/useFomoOverlayManager";
import { TabButton, DependencyCard, VersionCard, ModHeader, StatsGrid, CompatibilitySection } from "@/components/fomo/core/FomoOverlayComponents";
import { getFirstGalleryUrl } from "@/lib/fomo/fomoModBanner";
import { useModGalleryBanner } from "@/hooks/fomo/useModGalleryBanner";
import { FomoSkeleton } from "@/components/fomo/core/FomoSkeleton";
import type { ModHit, VersionEntry } from "@/lib/core/types";

export type CommunitySharerLite = {
  username: string;
  color?: string | null;
  avatar_url?: string | null;
};

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
  /** Usuarios que compartieron este proyecto en la nube MIM (misma plataforma). */
  communitySharers?: CommunitySharerLite[];
  /** Si el usuario actual ya lo tiene en favorite_mods para esta plataforma. */
  communitySharedByMe?: boolean;
  currentUserCommunityColor?: string | null;
}

export const FomoVersionOverlay = memo(function FomoVersionOverlay({
  mod, versions, loading, downloading, loader, gameVersions, projectType, onClose, onDownload, onSearchProject, onSearchAuthor, onSearchMod, disablePortal = false, hideVersions = false,
  pendingFilesCount = 0, onOpenDownloads,
  communitySharers = [], communitySharedByMe = false, currentUserCommunityColor = null,
}: FomoVersionOverlayProps) {
  if (!mod) return null;

  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const { 
    activeTab, setActiveTab, expandedVersion, setExpandedVersion, depDownloading, setDepDownloading, 
    isTranslating, translatedBody, fullBody, depSearchQuery, setDepSearchQuery, followedAuthors, followedMods, 
    toggleFollowAuthor, toggleFollowMod, allDependencies, handleTranslate, gallery, loadingGallery,
    explainedBody, setExplainedBody, isExplaining, explanationSources, explanationSearchUsed,
    explanationImagesAnalyzed,
    explainError, showGeminiKeyInput, setShowGeminiKeyInput, handleExplain,
    chatMessages, chatInput, setChatInput, isChatSending, handleSendChatMessage,
  } = useFomoOverlayManager(mod, versions, hideVersions);

  useEffect(() => {
    if (chatMessages.length > 0) {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isChatSending]);

  const [geminiKeyVal, setGeminiKeyVal] = useState("");
  const handleSaveGeminiKey = () => {
    if (!geminiKeyVal.trim()) return;
    const clean = geminiKeyVal.trim();
    try {
      localStorage.setItem("mim_gemini_api_key", clean);
    } catch {}
    handleExplain(clean);
  };

  const galleryBanner = useModGalleryBanner(mod);
  const detailsBannerUrl =
    gallery[0]?.url || galleryBanner || getFirstGalleryUrl(mod.gallery);

  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [isFullView, setIsFullView] = useState(false);
  const [selectedVersionFilter, setSelectedVersionFilter] = useState<string | null>(gameVersions[0] || null);
  const [selectedLoaderFilter, setSelectedLoaderFilter] = useState<string | null>(loader || null);
  const [selectedProjectType, setSelectedProjectType] = useState<string>(mod.projectType || projectType || "mod");

  useEffect(() => {
    setSelectedProjectType(mod.projectType || projectType || "mod");
  }, [mod.projectId, mod.projectType, projectType]);

  // Sincronizar con cambios en el sidebar (Filtros externos)
  useEffect(() => {
    if (gameVersions.length > 0) {
      setSelectedVersionFilter(gameVersions[0]);
    }
    setSelectedLoaderFilter(loader || null);
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

  const handleDownloadWrapper = (v?: any) => {
    // 1. Ocultar temporalmente
    window.dispatchEvent(new CustomEvent("fomo-details-toggle", { detail: { open: false } }));
    
    // 2. Ejecutar descarga
    onDownload(mod, v);

    // 3. Volver después de 2 segundos
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("fomo-details-toggle", { detail: { open: true } }));
    }, 2000);
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

  const descText = fullBody || mod.body || mod.description || "";
  const rawDesc = descText.trim() ? (mod._source === "curseforge" ? formatCurseForgeHtml(descText) : markdownToHtml(descText)) : "Sin descripción.";
  const descHtml = translatedBody ? translatedBody : rawDesc;

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
            bannerUrl={detailsBannerUrl}
            bannerProjectType={selectedProjectType || projectType}
            onSearchAuthor={onSearchAuthor} 
            onSearchMod={onSearchMod} 
            followedAuthors={followedAuthors} 
            followedMods={followedMods}
            toggleFollowAuthor={toggleFollowAuthor} 
            toggleFollowMod={toggleFollowMod}
            selectedProjectType={selectedProjectType}
            onSelectProjectType={setSelectedProjectType}
            communitySharers={communitySharers}
            communitySharedByMe={communitySharedByMe}
            currentUserCommunityColor={currentUserCommunityColor}
          />
          <div className="px-6 py-2 fomo-scroll shrink-0 overflow-y-auto max-h-[400px]">
            <StatsGrid mod={mod} />
            <CompatibilitySection 
              mod={mod} 
              selectedLoader={selectedLoaderFilter}
              onSelectLoader={(l) => setSelectedLoaderFilter(prev => prev === l ? null : l)}
            />
          </div>

          <div className="flex px-3 pt-2 gap-1 border-b shrink-0 overflow-x-auto items-center justify-between" style={{ borderColor: "var(--fomo-border)" }}>
            <div className="flex gap-1">
              {!hideVersions && <TabButton active={activeTab === "versions"} onClick={() => setActiveTab("versions")} icon={<ListTree className="w-3.5 h-3.5" />} label="Versiones" />}
              <TabButton active={activeTab === "dependencies"} onClick={() => setActiveTab("dependencies")} icon={<Package className="w-3.5 h-3.5" />} label="Dependencias" />
              <TabButton active={activeTab === "gallery"} onClick={() => setActiveTab("gallery")} icon={<Images className="w-3.5 h-3.5" />} label="Galería" count={gallery.length || undefined} />
              <TabButton active={activeTab === "description"} onClick={() => setActiveTab("description")} icon={<FileText className="w-3.5 h-3.5" />} label="Descripción" />
            </div>
            <button
              onClick={() => {
                if (!explainedBody) handleExplain();
                setActiveTab("description");
              }}
              disabled={isExplaining}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[0.65rem] font-bold transition-all active:scale-95 disabled:opacity-50 text-purple-300 bg-purple-500/10 border-purple-500/25 hover:bg-purple-500/20 mr-1"
              title="Explicar e interactuar con MIM-Bot"
            >
              {isExplaining ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <img src="/icon.png" alt="" className="w-3.5 h-3.5 object-contain animate-slime shrink-0" />
              )}
              <span>{isExplaining ? "Sintetizando..." : "MIM-Bot"}</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
            {activeTab === "description" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleExplain()}
                      disabled={isExplaining}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[0.65rem] font-bold transition-all active:scale-95 disabled:opacity-50"
                      style={{
                        color: "#c084fc",
                        background: "rgba(192, 132, 252, 0.12)",
                        borderColor: "rgba(192, 132, 252, 0.28)",
                      }}
                      title="Explicar e investigar este proyecto con MIM-Bot"
                    >
                      {isExplaining ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <img src="/icon.png" alt="" className="w-3.5 h-3.5 object-contain animate-slime shrink-0" />
                      )}
                      {isExplaining ? "Sintetizando..." : explainedBody ? "Original" : "MIM-Bot"}
                    </button>
                    <button
                      onClick={handleTranslate}
                      disabled={isTranslating || !rawDesc}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[0.65rem] font-bold transition-all active:scale-95 disabled:opacity-50"
                      style={{
                        borderColor: "var(--fomo-border)",
                        background: "rgba(255,255,255,0.03)",
                      }}
                    >
                      {isTranslating ? "Traduciendo..." : (translatedBody ? "Original" : "Traducir")}
                    </button>
                  </div>
                </div>

                {/* Gemini API Key Dialog */}
                {showGeminiKeyInput && (
                  <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/30 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-purple-300 flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5" /> Clave de Gemini API Requerida
                      </span>
                      <button
                        onClick={() => setShowGeminiKeyInput(false)}
                        className="text-white/40 hover:text-white text-[10px]"
                      >
                        Cancelar
                      </button>
                    </div>
                    <p className="text-[11px] text-white/60 leading-relaxed">
                      Para investigar y sintetizar proyectos sin servidor propio, se utiliza la API pública gratuita de Google Gemini.
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="password"
                        value={geminiKeyVal}
                        onChange={(e) => setGeminiKeyVal(e.target.value)}
                        placeholder="AIzaSy..."
                        className="flex-1 px-2.5 py-1.5 rounded-lg bg-black/40 border border-purple-500/30 text-xs text-white placeholder-white/20 focus:outline-none focus:border-purple-400 font-mono"
                      />
                      <button
                        onClick={handleSaveGeminiKey}
                        disabled={!geminiKeyVal.trim() || isExplaining}
                        className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs disabled:opacity-50 transition-all active:scale-95 whitespace-nowrap"
                      >
                        Guardar y Explicar
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-[10px] pt-1">
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noreferrer"
                        className="text-purple-400 hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" /> Obtener clave gratuita en Google AI Studio
                      </a>
                    </div>
                  </div>
                )}

                {explainError && !showGeminiKeyInput && (
                  <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] flex items-center justify-between gap-2">
                    <span>{explainError}</span>
                    <button
                      onClick={() => setShowGeminiKeyInput(true)}
                      className="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-[10px] font-bold text-white whitespace-nowrap"
                    >
                      Configurar Key
                    </button>
                  </div>
                )}

                {/* Empty description prompt */}
                {!rawDesc && !explainedBody && (
                  <div className="p-4 rounded-xl bg-purple-900/10 border border-purple-500/20 text-center space-y-3 my-2">
                    <div className="w-9 h-9 rounded-full bg-purple-500/15 text-purple-300 mx-auto flex items-center justify-center border border-purple-500/30">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-white/90">Este proyecto no incluye descripción del autor</p>
                      <p className="text-[11px] text-white/50 leading-relaxed max-w-sm mx-auto">
                        Gemini AI puede buscar en Google Search (GitHub, foros y wikis) para averiguar qué hace y resumírtelo en segundos.
                      </p>
                    </div>
                    <button
                      onClick={() => handleExplain()}
                      disabled={isExplaining}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {isExplaining ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <img src="/icon.png" alt="" className="w-3.5 h-3.5 object-contain animate-slime shrink-0" />
                      )}
                      {isExplaining ? "Sintetizando..." : "MIM-Bot"}
                    </button>
                  </div>
                )}

                {/* Explanation Output */}
                {explainedBody ? (
                  <div className="space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-purple-950/40 border border-purple-500/25 text-[10px] flex-wrap gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1.5 text-purple-300 font-bold">
                          <img src="/icon.png" alt="" className="w-3.5 h-3.5 object-contain animate-slime shrink-0" />
                          <span>MIM-Bot · Análisis de Proyecto</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleExplain(undefined, true)}
                          disabled={isExplaining}
                          title="Volver a generar explicación completa con MIM-Bot"
                          className="p-1 rounded hover:bg-purple-500/20 text-purple-300 hover:text-white transition-all active:scale-95 disabled:opacity-50"
                        >
                          <RotateCcw className={`w-3 h-3 ${isExplaining ? "animate-spin" : ""}`} />
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {explanationImagesAnalyzed > 0 && (
                          <span className="flex items-center gap-1 text-sky-400 font-medium text-[9px] bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
                            <Images className="w-2.5 h-2.5" /> {explanationImagesAnalyzed} capturas analizadas
                          </span>
                        )}
                        {explanationSearchUsed && (
                          <span className="flex items-center gap-1 text-emerald-400 font-medium text-[9px] bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            <Search className="w-2.5 h-2.5" /> Google Search Grounding
                          </span>
                        )}
                      </div>
                    </div>

                    <div
                      className="prose prose-invert prose-sm max-w-none text-sm bg-black/20 p-3 rounded-xl border border-white/5 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: markdownToHtml(explainedBody) }}
                    />

                    {explanationSources.length > 0 && (
                      <div className="pt-2 border-t border-white/5 space-y-1.5">
                        <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider block">
                          Fuentes de Google Search consultadas:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {explanationSources.map((src, i) => (
                            <a
                              key={i}
                              href={src.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[9px] text-white/60 hover:text-white transition-colors border border-white/5"
                            >
                              <ExternalLink className="w-2.5 h-2.5 text-purple-400" />
                              <span className="max-w-[160px] truncate">{src.title}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ── Mini-Chat Interactivo MIM-Bot ── */}
                    <div className="mt-4 pt-3.5 border-t border-purple-500/20 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-purple-300 font-bold text-xs">
                          <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                          <span>Preguntale a MIM-Bot sobre este proyecto</span>
                        </div>
                        <span className="inline-flex items-center gap-1.5 text-[9px] font-mono text-purple-300 bg-purple-500/15 px-2 py-0.5 rounded-full border border-purple-500/30 font-bold">
                          <img src="/icon.png" alt="" className="w-3.5 h-3.5 object-contain animate-slime shrink-0" />
                          <span>MIM-Bot</span>
                        </span>
                      </div>

                      {/* Historial de mensajes */}
                      {chatMessages.length > 0 && (
                        <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1 scrollbar-thin">
                          {chatMessages.map((msg, idx) => (
                            <div
                              key={idx}
                              className={`flex flex-col text-xs rounded-2xl p-3 max-w-[90%] shadow-sm ${
                                msg.role === "user"
                                  ? "ml-auto bg-purple-600/30 text-purple-100 border border-purple-500/30 rounded-br-sm"
                                  : "mr-auto bg-black/40 text-white/90 border border-white/5 rounded-bl-sm"
                              }`}
                            >
                              <span className="text-[9px] font-mono uppercase text-white/40 mb-1 flex items-center gap-1.5">
                                {msg.role === "user" ? (
                                  "Vos"
                                ) : (
                                  <>
                                    <img src="/icon.png" alt="" className="w-3.5 h-3.5 object-contain animate-slime shrink-0" />
                                    <span className="text-purple-300 font-bold">MIM-Bot</span>
                                  </>
                                )}
                              </span>
                              <div
                                className="prose prose-invert prose-sm max-w-none text-xs leading-relaxed space-y-1.5 break-words"
                                dangerouslySetInnerHTML={{ __html: markdownToHtml(msg.text) }}
                              />
                            </div>
                          ))}
                          {isChatSending && (
                            <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-black/30 border border-white/5 text-xs text-purple-300 w-fit">
                              <img src="/icon.png" alt="" className="w-3.5 h-3.5 object-contain animate-slime shrink-0" />
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                              <span>Pensando la forreada...</span>
                            </div>
                          )}
                          <div ref={chatBottomRef} />
                        </div>
                      )}

                      {/* Chips de sugerencias rápidas */}
                      {chatMessages.length === 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {[
                            "¿Es compatible con Create y Sodium?",
                            "¿Tiene comandos útiles o configuración?",
                            "¿Añade nuevas dimensiones o biomas?",
                          ].map((chip, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleSendChatMessage(chip)}
                              disabled={isChatSending}
                              className="text-[10px] px-2.5 py-1 rounded-full bg-white/[0.03] hover:bg-purple-500/20 border border-white/5 hover:border-purple-500/30 text-white/60 hover:text-purple-200 transition-all active:scale-95 disabled:opacity-50"
                            >
                              💡 {chip}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Input y botón enviar */}
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          placeholder="Hacé tu pregunta a MIM-Bot..."
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSendChatMessage();
                            }
                          }}
                          disabled={isChatSending}
                          className="flex-1 bg-black/40 border border-white/10 focus:border-purple-500/50 rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => handleSendChatMessage()}
                          disabled={!chatInput.trim() || isChatSending}
                          className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition-all active:scale-95 disabled:opacity-30 shrink-0 shadow-lg shadow-purple-600/20"
                        >
                          {isChatSending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Send className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="prose prose-invert prose-sm max-w-none text-sm" dangerouslySetInnerHTML={{ __html: descHtml }} />
                )}
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
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/5"><Images className="w-8 h-8 opacity-20" /></div>
                    <div>
                      <p className="text-sm font-headline opacity-60">Este proyecto aún no tiene capturas de pantalla públicas.</p>
                      <p className="text-[10px] opacity-30 mt-1 uppercase tracking-widest">Galería Vacía</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {(() => {
                      try {
                        console.log('[Gallery Render] activeTab, loadingGallery, gallery.length:', activeTab, loadingGallery, gallery.length);
                        console.log('[Gallery Render] gallery URLs:', gallery.map(g => g.url));
                      } catch (e) {
                        console.warn('[Gallery Render] logging failed', e);
                      }
                      return null;
                    })()}
                    {gallery.map((img, i) => (
                      <div key={i} onClick={() => setSelectedImageIndex(i)} className="group relative rounded-2xl overflow-hidden border border-white/10 bg-black/40 aspect-video cursor-zoom-in hover:border-primary/50 transition-all">
                        <img 
                          src={img.thumbnailUrl || img.url} 
                          alt={img.title || ""} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                          loading="lazy"
                          onError={(e) => {
                            console.warn(`[Gallery] Failed to load image at index ${i}:`, img.url);
                            (e.currentTarget as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23333' width='100' height='100'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='%23999' font-size='12'%3EImage Error%3C/text%3E%3C/svg%3E";
                          }}
                          onLoad={() => {
                            console.log(`[Gallery] Loaded image at index ${i}:`, img.url);
                          }}
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
                <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none sticky top-[-16px] z-20 bg-[var(--fomo-bg)] -mx-4 px-4 pt-4 shadow-[0_10px_20px_-10px_rgba(0,0,0,0.5)]">
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
                        {versions
                          .filter(v => {
                            const isNotMod = ["resourcepack", "shader", "datapack", "plugin"].includes(selectedProjectType);
                            const isMod = !isNotMod && (!selectedProjectType || selectedProjectType === "mod");
                            
                            if (!isMod) return true; // Don't filter datapacks by loader
                            
                            if (!selectedLoaderFilter || selectedLoaderFilter === "all") return true;
                            const modLoaders = v.loaders || (v as any).loader || [];
                            return modLoaders.some((l: string) => l.toLowerCase().includes(selectedLoaderFilter.toLowerCase()));
                          })
                          .slice(0, 2).map((v, idx) => (
                          <VersionCard 
                            key={`latest-${v.id || idx}`} 
                            v={v} 
                            mod={mod} 
                            isCompatible={v.gameVersions.some(gv => gameVersions.includes(gv))} 
                            isMainVersion={true} // Usamos esto para el badge LATEST
                            expanded={expandedVersion === v.id} 
                            onToggle={() => setExpandedVersion(expandedVersion === v.id ? null : v.id)} 
                            onDownload={handleDownloadWrapper} 
                            downloading={downloading} 
                            gameVersions={gameVersions} 
                            activeLoader={selectedLoaderFilter || "all"}
                            selectedProjectType={selectedProjectType}
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
                        .filter(v => {
                          const matchesVersion = !selectedVersionFilter || v.gameVersions.includes(selectedVersionFilter);
                          const isNotMod = ["resourcepack", "shader", "datapack", "plugin"].includes(selectedProjectType);
                          const isMod = !isNotMod && (!selectedProjectType || selectedProjectType === "mod");

                          const matchesLoader = !isMod || !selectedLoaderFilter || selectedLoaderFilter === "all" || 
                            (v.loaders || (v as any).loader || []).some((l: string) => l.toLowerCase().includes(selectedLoaderFilter.toLowerCase()));
                          
                          // Heurística Inteligente para Datapacks vs Mods
                          const nameLower = (v.name || v.versionNumber || "").toLowerCase();
                          
                          // Verificamos si AL MENOS UNA versión del proyecto tiene la palabra "datapack"
                          const hasSpecificDatapackVersions = versions.some(ver => 
                            (ver.name || ver.versionNumber || "").toLowerCase().includes("datapack")
                          );
                          
                          let matchesType = true;
                          if (hasSpecificDatapackVersions) {
                            // Si el proyecto separa las versiones, aplicamos el filtro estricto
                            matchesType = selectedProjectType === "datapack" 
                              ? nameLower.includes("datapack") 
                              : (selectedProjectType === "mod" ? !nameLower.includes("datapack") : true);
                          } else {
                            const isHybrid = mod.categories?.map((c: any) => {
                              if (typeof c === "string") return c.toLowerCase();
                              if (c && typeof c === "object") {
                                if (typeof c.name === "string") return c.name.toLowerCase();
                                if (typeof c.slug === "string") return c.slug.toLowerCase();
                              }
                              return "";
                            }).includes("datapack");
                            if (isHybrid && selectedProjectType === "datapack") {
                              matchesType = true; // Mostramos todas porque el archivo sirve para ambos
                            }
                          }
                          
                          return matchesVersion && matchesLoader && matchesType;
                        })
                        // Si no hay filtro, ocultamos los 2 de arriba para no repetir
                        .slice(!selectedVersionFilter && !selectedLoaderFilter ? 2 : 0)
                        .map((v, idx) => (
                           <VersionCard 
                             key={v.id || idx} 
                             v={v} 
                             mod={mod} 
                             isCompatible={v.gameVersions.some(gv => gameVersions.includes(gv))} 
                             isMainVersion={false} 
                             expanded={expandedVersion === v.id} 
                             onToggle={() => setExpandedVersion(expandedVersion === v.id ? null : v.id)} 
                             onDownload={handleDownloadWrapper} 
                             downloading={downloading} 
                             gameVersions={gameVersions} 
                             activeLoader={selectedLoaderFilter || "all"}
                             selectedProjectType={selectedProjectType}
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
