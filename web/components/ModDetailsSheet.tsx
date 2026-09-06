"use client";

import React, { useRef, useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence, useDragControls, useReducedMotion } from "framer-motion";
import { useCollectibleTransition } from "./CollectibleTransition";
import type { ModHit } from "./SpotlightMarquees";
import type {
  FomoModDetails,
  FomoDependencyItem,
  FomoUserDraft,
  FomoFollowedAuthor,
  FomoCommunityShare,
  FomoUserSession,
  FomoGalleryItem,
  ModStackItem,
  FomoFavoriteItem,
} from "../types/fomo";
import { playFomoSound } from "../lib/sounds";
import { normalizeDependencyKind, type DependencyKind } from "../lib/dependencies";
import { interpretModEnvironment } from "../lib/projectEnvironment";

import {
  translateDescription,
  communityTypeToBannerType,
  getBannerFallbackStyle,
  releaseGlobalSheetLocks,
  getAvailableLoaders,
  getAvailableContentTypes,
  getSheetTargetHeight,
} from "./mod-details/utils";
import { ModDetailsHeader } from "./mod-details/ModDetailsHeader";
import { ModDetailsTabs, type ModDetailsTabId } from "./mod-details/ModDetailsTabs";
import { ModDetailsSummaryTab } from "./mod-details/ModDetailsSummaryTab";
import { ModDetailsGalleryTab } from "./mod-details/ModDetailsGalleryTab";
import { ModDetailsDescTab } from "./mod-details/ModDetailsDescTab";
import { ModDetailsVersionsTab } from "./mod-details/ModDetailsVersionsTab";
import { ModDetailsDepsTab } from "./mod-details/ModDetailsDepsTab";
import { ModShareModal } from "./mod-details/ModShareModal";
import { ModGalleryLightbox } from "./mod-details/ModGalleryLightbox";
import { ModDetailsFooter } from "./mod-details/ModDetailsFooter";
import { useModExplainer } from "./mod-details/useModExplainer";
import { useModVersions } from "./mod-details/useModVersions";
import { useSheetSounds } from "./mod-details/useSheetSounds";

export interface ModDetailsSheetProps {
  selectedMod: ModHit | null;
  selectedModDetails: FomoModDetails | null;
  selectedModDeps: FomoDependencyItem[];
  loadingDetails: boolean;
  modStack: ModStackItem[];
  activeStackIndex: number;
  modalTab: ModDetailsTabId;
  setModalTab: (t: ModDetailsTabId) => void;
  handleCloseModDetails: () => void;
  handleGoBackInStack: () => void;
  handleSwitchStackIndex: (i: number) => void;
  handleOpenModDetails: (mod: ModHit, isDep?: boolean) => void;
  onSearchAuthor?: (name: string, platform: string) => void;
  onSearchMod?: (title: string) => void;
  /* Draft */
  userDrafts: FomoUserDraft[];
  session: FomoUserSession | null;
  onAddToDraft: (mod: ModHit, draftId: string) => void;
  onOpenDraftPicker: (mod: ModHit) => void;
  /* Favorite (followed_mods) */
  userFavorites: FomoFavoriteItem[];
  onToggleFavorite: (mod: ModHit) => void;
  /* Followed Authors */
  userFollowedAuthors?: FomoFollowedAuthor[];
  onToggleFollowAuthor?: (authorName: string, authorUrl?: string, iconUrl?: string, platform?: string) => void;
  /* Community shares (favorite_mods) */
  userShares?: FomoCommunityShare[];
  refreshUserData?: () => void;
}

/**
 * ModDetailsSheet — bottom sheet modular que muestra detalles completos de un mod.
 * - Drag-to-close integrado con gestos fluidos de Framer Motion.
 * - Arquitectura dividida en submódulos especializados en web/components/mod-details/ (< 450 líneas c/u).
 */
export function ModDetailsSheet({
  selectedMod,
  selectedModDetails,
  selectedModDeps,
  loadingDetails,
  modStack,
  activeStackIndex,
  modalTab,
  setModalTab,
  handleCloseModDetails,
  handleGoBackInStack,
  handleSwitchStackIndex,
  handleOpenModDetails,
  session,
  onOpenDraftPicker,
  userFavorites,
  onToggleFavorite,
  userShares = [],
  refreshUserData,
  userFollowedAuthors = [],
  onToggleFollowAuthor,
  onSearchAuthor,
  onSearchMod,
}: ModDetailsSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();

  // Basic sheet & translation states
  const [translatedBody, setTranslatedBody] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedSummary, setTranslatedSummary] = useState<string | null>(null);
  const [isTranslatingSummary, setIsTranslatingSummary] = useState(false);

  // Gallery & Share modal states
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [, setDragEnabled] = useState(true);

  const reducedMotion = useReducedMotion();
  const { source } = useCollectibleTransition();
  const sharedCard = source?.project === `${selectedMod?._source || "modrinth"}:${selectedMod?.projectId}`;
  const { muted, isClosing, handleToggleMute, closeWithSound, resetCloseState } =
    useSheetSounds(handleCloseModDetails);

  const descriptionBody = selectedModDetails?.body || selectedMod?.description || "";
  const galleryImages = Array.isArray(selectedModDetails?.gallery) ? selectedModDetails.gallery : [];
  const isSheetOpen = !!selectedMod;
  const isReadingTab = modalTab === "versions" || modalTab === "deps";

  // Specialized hooks for Explainer/Mini-Chat and Version filtering
  const explainer = useModExplainer({ selectedMod, descriptionBody, galleryImages });
  const versions = useModVersions({ selectedMod, selectedModDetails });

  const sheetTargetHeight = getSheetTargetHeight(modalTab, selectedModDeps?.length > 0);
  const availableLoaders = getAvailableLoaders(selectedModDetails);
  const availableContentTypes = getAvailableContentTypes(selectedModDetails, selectedMod);

  // Reset translations and close cycle on project switch
  useEffect(() => {
    if (selectedMod) {
      resetCloseState();
      playFomoSound("on");
    }
    setTranslatedBody(null);
    setTranslatedSummary(null);
    setIsTranslating(false);
    setIsTranslatingSummary(false);
    setActiveImageIndex(null);
  }, [selectedMod?.projectId, resetCloseState]);

  // Lock scroll
  useEffect(() => {
    if (isSheetOpen) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overscrollBehavior = "none";
    } else {
      releaseGlobalSheetLocks();
    }
    return releaseGlobalSheetLocks;
  }, [isSheetOpen]);

  // Reset active image when changing tabs or project
  useEffect(() => {
    setActiveImageIndex(null);
  }, [modalTab]);

  const handleTabChange = useCallback(
    (nextTab: ModDetailsTabId) => {
      setActiveImageIndex(null);
      setModalTab(nextTab);
    },
    [setModalTab]
  );

  const isFavorited = userFavorites.some(
    (f) => ((f as any).mod_id || (f as any).project_id || (f as any).projectId || (f as any).id) === selectedMod?.projectId
  );

  const handleShareClick = useCallback(() => {
    if (!session?.user?.id) {
      alert("Debes iniciar sesión para compartir en la Comunidad.");
      return;
    }
    setShowShareModal(true);
  }, [session]);

  const handleGalleryWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY !== 0) {
      e.preventDefault();
      e.currentTarget.scrollLeft += e.deltaY;
    }
  }, []);

  const handleTranslate = useCallback(async () => {
    if (!selectedMod || !descriptionBody || isTranslating) return;
    if (translatedBody) {
      setTranslatedBody(null);
      return;
    }
    setIsTranslating(true);
    try {
      setTranslatedBody(await translateDescription(selectedMod.projectId, descriptionBody));
    } finally {
      setIsTranslating(false);
    }
  }, [descriptionBody, isTranslating, selectedMod, translatedBody]);

  const handleTranslateSummary = useCallback(async () => {
    const textToTranslate = selectedMod?.description || "";
    if (!textToTranslate || isTranslatingSummary) return;
    if (translatedSummary) {
      setTranslatedSummary(null);
      return;
    }
    setIsTranslatingSummary(true);
    try {
      const res = await fetch("/api/fomo/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToTranslate.substring(0, 1000) }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTranslatedSummary(data.translatedText || "");
    } catch {
    } finally {
      setIsTranslatingSummary(false);
    }
  }, [selectedMod?.description, isTranslatingSummary, translatedSummary]);

  const bannerUrl =
    selectedModDetails?.gallery?.find((g: FomoGalleryItem) => g.featured)?.url ||
    selectedModDetails?.gallery?.find((g: FomoGalleryItem) => g.featured)?.raw_url ||
    selectedModDetails?.gallery?.[0]?.raw_url ||
    selectedModDetails?.gallery?.[0]?.url ||
    selectedMod?.iconUrl ||
    undefined;
  const projectType = selectedMod?.projectType || "mod";
  const bannerType = communityTypeToBannerType(projectType);
  const { bannerBgColor, fallbackTexture } = getBannerFallbackStyle(bannerType);
  const environment = interpretModEnvironment(
    selectedModDetails?.client_side || selectedModDetails?.clientSide,
    selectedModDetails?.server_side || selectedModDetails?.serverSide
  );

  const dependencyGroups = selectedModDeps.reduce<Record<DependencyKind, FomoDependencyItem[]>>(
    (groups, dep) => {
      groups[normalizeDependencyKind(dep)].push(dep);
      return groups;
    },
    { required: [], optional: [], incompatible: [], embedded: [] }
  );
  const visibleDependencyKinds = (["required", "optional", "incompatible", "embedded"] as DependencyKind[]).filter(
    (kind) => dependencyGroups[kind].length > 0
  );
  const communitySharedByMe = (userShares || []).some(
    (f) => (f.mod_id || f.projectId || (f as Record<string, unknown>).project_id || f.id) === selectedMod?.projectId
  );

  const projectPlatformUrl = selectedMod
    ? selectedMod._source === "curseforge"
      ? `https://www.curseforge.com/projects/${selectedMod.projectId}`
      : `https://modrinth.com/project/${selectedMod.projectId}`
    : "#";

  return (
    <>
      <AnimatePresence>
      {selectedMod && (
        <motion.div
          key="mod-details-backdrop"
          className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-end justify-center z-50"
          style={{ pointerEvents: !selectedMod || isClosing ? "none" : "auto" }}
          onClick={closeWithSound}
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          <motion.div
            ref={sheetRef}
            layout="position"
            initial={{ y: reducedMotion || sharedCard ? 0 : "112%", scale: reducedMotion || sharedCard ? 1 : 0.96, opacity: 0, height: sheetTargetHeight }}
            animate={{ y: 0, scale: 1, opacity: 1, height: sheetTargetHeight }}
            exit={{ y: reducedMotion || sharedCard ? 0 : "108%", scale: 1, opacity: 0 }}
            transition={{
              duration: reducedMotion ? .1 : .36,
              type: "tween",
              stiffness: 150,
              damping: 24,
              mass: 1.0,
              layout: {
                type: "spring",
                stiffness: 160,
                damping: 26,
                mass: 1.0,
              },
            }}
            className="bg-surface border-t border-border rounded-t-3xl w-full max-w-md pb-2 shadow-[0_-10px_40px_rgba(0,0,0,0.6)] flex flex-col gap-0 relative max-h-[96dvh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_e, info) => {
              if (info.offset.y > 80) closeWithSound();
            }}
          >
            {/* Modular Header */}
            <ModDetailsHeader
              selectedMod={selectedMod}
              selectedModDetails={selectedModDetails}
              isReadingTab={isReadingTab}
              bannerUrl={bannerUrl}
              bannerBgColor={bannerBgColor}
              fallbackTexture={fallbackTexture}
              dragControls={dragControls}
              muted={muted}
              handleToggleMute={handleToggleMute}
              closeWithSound={closeWithSound}
              modStack={modStack}
              activeStackIndex={activeStackIndex}
              handleGoBackInStack={handleGoBackInStack}
              handleSwitchStackIndex={handleSwitchStackIndex}
              session={session}
              communitySharedByMe={communitySharedByMe}
              handleShareClick={handleShareClick}
              isFavorited={isFavorited}
              onToggleFavorite={onToggleFavorite}
              projectPlatformUrl={projectPlatformUrl}
              onSearchAuthor={onSearchAuthor}
              onSearchMod={onSearchMod}
              userFollowedAuthors={userFollowedAuthors}
              onToggleFollowAuthor={onToggleFollowAuthor}
            />

            {/* Body Content Area (Tabs + Scrollable Content) */}
            <div className={`flex flex-col flex-1 min-h-0 ${isReadingTab ? "gap-1.5 px-3 pt-2 pb-2" : "gap-2.5 px-4 pt-3 pb-3"}`}>
              {/* Modular Animated Tabs */}
              <ModDetailsTabs
                modalTab={modalTab}
                setModalTab={handleTabChange}
                hasGallery={galleryImages.length > 0}
              />

              {/* Scrollable content container */}
              <div
                className="relative w-full flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-none touch-pan-y"
                style={{ overscrollBehaviorY: "contain", WebkitOverflowScrolling: "touch" }}
                onWheel={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
              >
                <AnimatePresence mode="wait">
                  {modalTab === "summary" && (
                    <ModDetailsSummaryTab
                      selectedMod={selectedMod}
                      selectedModDetails={selectedModDetails}
                      environment={environment}
                      availableLoaders={availableLoaders}
                      availableContentTypes={availableContentTypes}
                      galleryImages={galleryImages}
                      explainedBody={explainer.explainedBody}
                      isExplaining={explainer.isExplaining}
                      handleExplain={explainer.handleExplain}
                      setModalTab={setModalTab}
                      translatedSummary={translatedSummary}
                      isTranslatingSummary={isTranslatingSummary}
                      handleTranslateSummary={handleTranslateSummary}
                      handleGalleryWheel={handleGalleryWheel}
                      setDragEnabled={setDragEnabled}
                      setActiveImageIndex={setActiveImageIndex}
                    />
                  )}

                  {modalTab === "gallery" && (
                    <ModDetailsGalleryTab
                      galleryImages={galleryImages}
                      activeImageIndex={activeImageIndex}
                      setActiveImageIndex={setActiveImageIndex}
                      setDragEnabled={setDragEnabled}
                    />
                  )}

                  {modalTab === "desc" && (
                    <ModDetailsDescTab
                      selectedMod={selectedMod}
                      descriptionBody={descriptionBody}
                      explainedBody={explainer.explainedBody}
                      isExplaining={explainer.isExplaining}
                      handleExplain={explainer.handleExplain}
                      handleTogglePersonality={explainer.handleTogglePersonality}
                      botPersonality={explainer.botPersonality}
                      explanationSources={explainer.explanationSources}
                      explanationSearchUsed={explainer.explanationSearchUsed}
                      explanationImagesAnalyzed={explainer.explanationImagesAnalyzed}
                      showGeminiKeyInput={explainer.showGeminiKeyInput}
                      setShowGeminiKeyInput={explainer.setShowGeminiKeyInput}
                      geminiKeyVal={explainer.geminiKeyVal}
                      setGeminiKeyVal={explainer.setGeminiKeyVal}
                      handleSaveGeminiKey={explainer.handleSaveGeminiKey}
                      explainError={explainer.explainError}
                      translatedBody={translatedBody}
                      isTranslating={isTranslating}
                      handleTranslate={handleTranslate}
                      chatMessages={explainer.chatMessages}
                      chatInput={explainer.chatInput}
                      setChatInput={explainer.setChatInput}
                      isChatSending={explainer.isChatSending}
                      handleSendChatMessage={explainer.handleSendChatMessage}
                      chatBottomRef={explainer.chatBottomRef}
                    />
                  )}

                  {modalTab === "versions" && (
                    <ModDetailsVersionsTab
                      loadingDetails={loadingDetails}
                      versionRows={versions.versionRows}
                      filteredVersionRows={versions.filteredVersionRows}
                      availableGameVersionFilters={versions.availableGameVersionFilters}
                      selectedGameVersionFilters={versions.selectedGameVersionFilters}
                      handleToggleGameVersionFilter={versions.handleToggleGameVersionFilter}
                      availableVersionLoaderFilters={versions.availableVersionLoaderFilters}
                      selectedLoaderFilters={versions.selectedLoaderFilters}
                      handleToggleLoaderFilter={versions.handleToggleLoaderFilter}
                      expandedVersionId={versions.expandedVersionId}
                      handleToggleVersion={versions.handleToggleVersion}
                      versionChangelogs={versions.versionChangelogs}
                      loadingVersionChangelog={versions.loadingVersionChangelog}
                      translatedVersionChangelogs={versions.translatedVersionChangelogs}
                      translatingVersionChangelog={versions.translatingVersionChangelog}
                      handleTranslateVersionChangelog={versions.handleTranslateVersionChangelog}
                      modSource={selectedMod?._source}
                    />
                  )}

                  {modalTab === "deps" && (
                    <ModDetailsDepsTab
                      loadingDetails={loadingDetails}
                      selectedModDeps={selectedModDeps}
                      dependencyGroups={dependencyGroups}
                      visibleDependencyKinds={visibleDependencyKinds}
                      handleOpenModDetails={handleOpenModDetails}
                      selectedMod={selectedMod}
                    />
                  )}
                </AnimatePresence>
              </div>

              {/* Modular Footer Actions */}
              <ModDetailsFooter
                modalTab={modalTab}
                setModalTab={setModalTab}
                isReadingTab={isReadingTab}
                session={session}
                selectedMod={selectedMod}
                selectedModDetails={selectedModDetails}
                onOpenDraftPicker={onOpenDraftPicker}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Modular Share Opinion Modal */}
      <ModShareModal
        showShareModal={showShareModal}
        setShowShareModal={setShowShareModal}
        selectedMod={selectedMod}
        session={session}
        userShares={userShares}
        refreshUserData={refreshUserData}
      />

      {/* Portaled Fullscreen Gallery Lightbox */}
      <ModGalleryLightbox
        galleryImages={galleryImages}
        activeImageIndex={activeImageIndex}
        setActiveImageIndex={setActiveImageIndex}
        projectTitle={selectedMod?.title}
      />
    </>
  );
}
