/**
 * MIM — FOMO Version & Details Overlay
 * Optimized for v5.9+: Modularized into dedicated tab components under components/fomo/details/ (REC-03).
 */

import React, { memo, useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ListTree, Package, Images, FileText, Loader2 } from "lucide-react";
import { renderBodyText } from "@/web/components/mod-details/utils";
import { useFomoOverlayManager } from "@/hooks/useFomoOverlayManager";
import {
  TabButton,
  ModHeader,
  StatsGrid,
  CompatibilitySection,
  FomoOverlayTopBar,
  FomoDescriptionTab,
  FomoGalleryTab,
  FomoDependenciesTab,
  FomoVersionsTab,
  FomoLightbox,
} from "@/components/fomo/core/FomoOverlayComponents";
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
  communitySharers?: CommunitySharerLite[];
  communitySharedByMe?: boolean;
  currentUserCommunityColor?: string | null;
}

export const FomoVersionOverlay = memo(function FomoVersionOverlay({
  mod, versions, loading, downloading, loader, gameVersions, projectType, onClose, onDownload,
  onSearchProject, onSearchAuthor, onSearchMod, disablePortal = false, hideVersions = false,
  pendingFilesCount: _pendingFilesCount = 0, onOpenDownloads,
  communitySharers = [], communitySharedByMe = false, currentUserCommunityColor = null,
}: FomoVersionOverlayProps) {
  if (!mod) return null;

  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const { 
    activeTab, setActiveTab, expandedVersion, setExpandedVersion, depDownloading,
    isTranslating, translatedBody, fullBody, depSearchQuery, setDepSearchQuery, followedAuthors, followedMods, 
    toggleFollowAuthor, toggleFollowMod, allDependencies, handleTranslate, gallery, loadingGallery,
    explainedBody, isExplaining, explanationSources, explanationSearchUsed,
    explanationImagesAnalyzed,
    explainError, showGeminiKeyInput, setShowGeminiKeyInput, handleExplain,
    botPersonality, handleTogglePersonality,
    chatMessages, chatInput, setChatInput, isChatSending, handleSendChatMessage,
  } = useFomoOverlayManager(mod, versions, hideVersions);

  useEffect(() => {
    if (chatMessages.length > 0) {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isChatSending]);

  const [geminiKeyVal, setGeminiKeyVal] = useState("");
  const handleSaveGeminiKey = async () => {
    if (!geminiKeyVal.trim()) return;
    const clean = geminiKeyVal.trim();
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ geminiApiKey: clean }),
      });
      if (!response.ok) throw new Error("No se pudo guardar la clave de forma segura");
      setGeminiKeyVal("");
      handleExplain(undefined, true);
    } catch (e) {
      console.warn("[FomoVersionOverlay] Error saving Gemini API key:", e);
    }
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
    window.dispatchEvent(new CustomEvent("fomo-request-pending-count"));
    return () => window.removeEventListener("fomo-pending-count", handleCount);
  }, []);

  const handleOpenDownloadsWrapper = () => {
    if (onOpenDownloads) {
      onOpenDownloads();
      return;
    }
    window.dispatchEvent(new CustomEvent("fomo-details-toggle", { detail: { open: false } }));
    window.dispatchEvent(new CustomEvent("toggle-downloads", { detail: { collapsed: false } }));
  };

  const handleDownloadWrapper = (v?: any) => {
    window.dispatchEvent(new CustomEvent("fomo-details-toggle", { detail: { open: false } }));
    onDownload(mod, v);
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
  const descSource = mod._source === "curseforge" ? "curseforge" : "modrinth";

  const handleFomoLinkClick = (e: React.MouseEvent) => {
    const target = (e.target as HTMLElement).closest("[data-fomo-query]") as HTMLElement;
    if (target) {
      e.preventDefault();
      e.stopPropagation();
      const query = target.getAttribute("data-fomo-query");
      if (query) {
        window.dispatchEvent(new CustomEvent("fomo-search-and-open", { detail: { query: query.trim() } }));
      }
    }
  };

  const renderStyledBody = (
    body: string,
    source: string,
    className: string,
    onClick?: React.MouseEventHandler<HTMLDivElement>,
  ) =>
    React.cloneElement(renderBodyText(body, source), {
      className,
      onClick,
    } as React.HTMLAttributes<HTMLDivElement>);

  const descriptionHtmlNode = renderStyledBody(
    translatedBody ?? descText,
    translatedBody ? "curseforge" : descSource,
    "prose prose-invert prose-sm max-w-none text-sm text-foreground",
  );

  const explainedHtmlNode = explainedBody
    ? renderStyledBody(
        explainedBody,
        "modrinth",
        "prose prose-invert prose-sm max-w-none text-sm bg-black/20 p-3 rounded-xl border border-white/5 leading-relaxed cursor-pointer",
        handleFomoLinkClick,
      )
    : null;

  const renderChatMessageHtml = (text: string) =>
    renderStyledBody(
      text,
      "modrinth",
      "prose prose-invert prose-sm max-w-none text-xs leading-relaxed space-y-1.5 break-words",
      handleFomoLinkClick,
    );

  const mainContent = (
    <div className="flex-1 flex flex-col min-h-0 animate-fade-in text-foreground relative">
      {loading ? (
        <FomoSkeleton variant="details" message="Cargando detalles..." />
      ) : (
        <>
          <FomoOverlayTopBar
            onClose={onClose}
            pendingCount={pendingCount}
            onOpenDownloads={handleOpenDownloadsWrapper}
          />

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
              type="button"
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
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src="/icon.png" alt="" className="w-3.5 h-3.5 object-contain animate-slime shrink-0" />
              )}
              <span>{isExplaining ? "Sintetizando..." : "MIM-Bot"}</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
            {activeTab === "description" && (
              <FomoDescriptionTab
                descText={descText}
                translatedBody={translatedBody}
                isTranslating={isTranslating}
                handleTranslate={handleTranslate}
                isExplaining={isExplaining}
                explainedBody={explainedBody}
                handleExplain={handleExplain}
                showGeminiKeyInput={showGeminiKeyInput}
                setShowGeminiKeyInput={setShowGeminiKeyInput}
                geminiKeyVal={geminiKeyVal}
                setGeminiKeyVal={setGeminiKeyVal}
                handleSaveGeminiKey={handleSaveGeminiKey}
                explainError={explainError}
                explanationSources={explanationSources}
                explanationImagesAnalyzed={explanationImagesAnalyzed}
                explanationSearchUsed={explanationSearchUsed}
                botPersonality={botPersonality}
                handleTogglePersonality={handleTogglePersonality}
                chatMessages={chatMessages}
                chatInput={chatInput}
                setChatInput={setChatInput}
                isChatSending={isChatSending}
                handleSendChatMessage={handleSendChatMessage}
                chatBottomRef={chatBottomRef}
                descriptionHtmlNode={descriptionHtmlNode}
                explainedHtmlNode={explainedHtmlNode}
                renderChatMessageHtml={renderChatMessageHtml}
              />
            )}
            {activeTab === "gallery" && (
              <FomoGalleryTab
                showSkeleton={showSkeleton}
                loadingGallery={loadingGallery}
                gallery={gallery}
                onSelectImage={(idx) => setSelectedImageIndex(idx)}
              />
            )}
            {activeTab === "dependencies" && (
              <FomoDependenciesTab
                depSearchQuery={depSearchQuery}
                setDepSearchQuery={setDepSearchQuery}
                allDependencies={allDependencies}
                source={mod._source}
                depDownloading={depDownloading}
                onSearchProject={onSearchProject}
              />
            )}
            {activeTab === "versions" && (
              <FomoVersionsTab
                versions={versions}
                mod={mod}
                gameVersions={gameVersions}
                selectedVersionFilter={selectedVersionFilter}
                setSelectedVersionFilter={setSelectedVersionFilter}
                selectedLoaderFilter={selectedLoaderFilter}
                selectedProjectType={selectedProjectType}
                expandedVersion={expandedVersion}
                setExpandedVersion={setExpandedVersion}
                handleDownloadWrapper={handleDownloadWrapper}
                downloading={downloading}
              />
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

  if (portalTarget) {
    return (
      <>
        {createPortal(mainContent, portalTarget)}
        {lightbox}
      </>
    );
  }

  return null;
});
