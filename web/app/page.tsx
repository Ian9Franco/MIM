"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Coffee, Ghost, Share2, Sun, X } from "lucide-react";
import { BottomNav } from "../components/BottomNav";
import ChannelPickerModal from "../components/ChannelPickerModal";
import { DraftPickerModal } from "../components/DraftPickerModal";
import EditProfileModal from "../components/EditProfileModal";
import { MobileFloatingPlayer } from "../components/MobileFloatingPlayer";
import { ModDetailsSheet } from "../components/ModDetailsSheet";
import { CollectionsTab } from "../components/tabs/CollectionsTab";
import { DiscoverTab } from "../components/tabs/DiscoverTab";
import { FeedTab } from "../components/tabs/FeedTab";
import { ProfileTab } from "../components/tabs/ProfileTab";
import { RankingsTab } from "../components/tabs/RankingsTab";
import { SpotlightTab } from "../components/tabs/SpotlightTab";
import { supabase } from "../lib/supabaseClient";
import { playFomoSound } from "../lib/sounds";
import { resizeAndCompressImage, useHomeController } from "../hooks/useHomeController";

const THEMES = [
  { id: "official", label: "FOMO", icon: Coffee },
  { id: "vampire", label: "Vampire", icon: Ghost },
  { id: "modern", label: "Modern", icon: Sun },
] as const;

export default function Home() {
  const c = useHomeController();
  const [editingDraftId, setEditingDraftId] = React.useState<string | null>(null);
  const activeThemeIndex = Math.max(0, THEMES.findIndex((opt) => opt.id === c.theme));

  /**
   * Fetches the latest MIM release from GitHub and opens it.
   * Falls back to the releases page if the API call fails.
   */
  const handleOpenLatestRelease = React.useCallback(async () => {
    playFomoSound("on");
    const releasesUrl = "https://github.com/Ian9Franco/MIM/releases";
    try {
      const res = await fetch("https://api.github.com/repos/Ian9Franco/MIM/releases/latest", {
        headers: { Accept: "application/vnd.github+json" },
      });
      if (res.ok) {
        const data = await res.json();
        const url = data.html_url || releasesUrl;
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        window.open(releasesUrl, "_blank", "noopener,noreferrer");
      }
    } catch {
      window.open(releasesUrl, "_blank", "noopener,noreferrer");
    }
  }, []);

  const handleOpenDraftEditor = React.useCallback((draft: any) => {
    setEditingDraftId(draft.id);
    c.setPendingMod(null);
    c.setShowDraftPicker(true);
  }, [c]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden px-4 pt-6">
      <header className="flex justify-between items-center mb-6 px-1 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="mim-web-logo mim-web-logo-fomo w-8 h-8 rounded-xl overflow-hidden bg-white/5 border border-white/[0.08] shrink-0">
            <img src="/fomoico.png" alt="" className="w-full h-full object-contain transition-all duration-700 animate-fomo-blink" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-black tracking-tighter leading-none" style={{ color: "var(--color-foreground)" }}>
              FOMO{" "}
              <span className="relative inline-block overflow-hidden align-bottom w-12 h-5">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={c.theme}
                    initial={{ y: "100%", opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: "-100%", opacity: 0 }}
                    transition={{ duration: 0.85, ease: [0.25, 1, 0.5, 1] }}
                    className="mim-hub-word absolute inset-0 flex items-center justify-start"
                  >
                    HUB
                  </motion.span>
                </AnimatePresence>
              </span>
            </h1>
            <p className="text-[10px] font-mono text-white/30 mt-1 uppercase tracking-widest">Mobile Community Hub</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div
            className="mim-theme-toggle relative flex items-center h-9 w-[106px] p-1 rounded-xl transition-all border"
            style={{
              background: "rgba(255,255,255,0.03)",
              borderColor: "var(--color-border)",
            }}
          >
            <div
              className="absolute transition-all duration-500 ease-[cubic-bezier(0.6,0.01,-0.05,0.95)] rounded-lg pointer-events-none inset-y-1"
              style={{
                width: "32px",
                transform: `translateX(${activeThemeIndex * 32}px)`,
                background: "color-mix(in srgb, var(--color-primary) 20%, transparent)",
                border: "1px solid color-mix(in srgb, var(--color-primary) 30%, transparent)",
                boxShadow: "0 0 15px color-mix(in srgb, var(--color-primary) 15%, transparent)",
                left: "4px",
              }}
            />
            {THEMES.map((opt) => {
              const Icon = opt.icon;
              const active = c.theme === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => c.handleThemeChange(opt.id)}
                  data-active={active}
                  className={`mim-theme-option relative z-10 w-8 h-full flex items-center justify-center rounded-lg transition-all duration-300 ${active ? "" : "opacity-40 hover:opacity-100"}`}
                  style={{ color: active ? "var(--color-primary)" : "var(--color-foreground)" }}
                  title={opt.label}
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={handleOpenLatestRelease}
            className="w-9 h-9 rounded-full bg-white/5 border border-white/[0.08] flex items-center justify-center text-white/50 active:scale-95 transition-all"
            title="Descargar MIM — Último Release"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <img src="/icon.png" alt="" className="w-9 h-9 object-contain animate-slime shrink-0" />
        </div>
      </header>

      <main className="flex-1 flex flex-col min-h-0 relative">
        <AnimatePresence mode="wait">
          {c.activeTab === "profile" && (
            <ProfileTab
              session={c.session}
              profile={c.profile}
              email={c.email}
              setEmail={c.setEmail}
              password={c.password}
              setPassword={c.setPassword}
              username={c.username}
              setUsername={c.setUsername}
              isRegistering={c.isRegistering}
              setIsRegistering={c.setIsRegistering}
              authLoading={c.authLoading}
              loadingUserData={c.loadingUserData}
              userDrafts={c.userDrafts}
              userFavorites={c.userFavorites}
              handleAuth={c.handleAuth}
              handleLogout={c.handleLogout}
              handleOpenEditProfile={() => c.setShowEditProfile(true)}
              handleOpenModDetails={c.handleOpenModDetails}
              handleEnterDraftCollection={c.handleEnterDraftCollection}
              onCreateDraft={() => {
                setEditingDraftId(null);
                c.setPendingMod(null);
                c.setShowDraftPicker(true);
              }}
              onEditDraft={handleOpenDraftEditor}
            />
          )}

          {c.activeTab === "spotlight" && (
            <SpotlightTab
              latestCollectionName={c.latestCollectionName}
              curseForgeFeatured={c.curseForgeFeatured}
              activeSpotlightPlatform={c.activeSpotlightPlatform}
              setActiveSpotlightPlatform={c.setActiveSpotlightPlatform}
              loadingLatestMods={c.loadingLatestMods}
              latestFeaturedMods={c.latestFeaturedMods}
              handleOpenModDetails={c.handleOpenModDetails}
              handleEnterCollection={c.handleEnterCollection}
              showcaseChannels={c.showcaseChannels}
              setShowChannelPicker={c.setShowChannelPicker}
              updatedMods={c.updatedMods}
              newestMods={c.newestMods}
            />
          )}

          {c.activeTab === "collections" && (
            <CollectionsTab
              activeCollection={c.activeCollection}
              modrinthFeatured={c.modrinthFeatured}
              curseForgeFeatured={c.curseForgeFeatured}
              activeCollectionMods={c.activeCollectionMods}
              loadingActiveMods={c.loadingActiveMods}
              session={c.session}
              userDrafts={c.userDrafts}
              handleEnterCollection={c.handleEnterCollection}
              handleExitCollection={c.handleExitCollection}
              handleOpenModDetails={c.handleOpenModDetails}
              handleEnterDraftCollection={c.handleEnterDraftCollection}
              onRemoveModFromDraft={c.removeModFromDraft}
              onRefreshDrafts={() => c.refreshUserData()}
              onEditDraft={handleOpenDraftEditor}
            />
          )}

          {c.activeTab === "feed" && (
            <FeedTab
              followedChannels={c.followedChannels}
              currentChannel={c.currentChannel}
              setCurrentChannel={c.setCurrentChannel}
              showChannelManager={c.showChannelManager}
              setShowChannelManager={c.setShowChannelManager}
              newChannelInput={c.newChannelInput}
              setNewChannelInput={c.setNewChannelInput}
              youtubePosts={c.youtubePosts}
              loadingYoutube={c.loadingYoutube}
              handleAddChannel={c.handleAddChannel}
              handleRemoveChannel={c.handleRemoveChannel}
            />
          )}

          {c.activeTab === "rankings" && (
            <RankingsTab rankings={c.rankings} loadingRankings={c.loadingRankings} handleOpenModDetails={c.handleOpenModDetails} />
          )}

          {c.activeTab === "discover" && (
            <DiscoverTab
              discoverQuery={c.discoverQuery}
              setDiscoverQuery={c.setDiscoverQuery}
              discoverType={c.discoverType}
              setDiscoverType={c.setDiscoverType}
              discoverVersion={c.discoverVersion}
              setDiscoverVersion={c.setDiscoverVersion}
              discoverLoader={c.discoverLoader}
              setDiscoverLoader={c.setDiscoverLoader}
              discoverResults={c.discoverResults}
              discoverLoading={c.discoverLoading}
              discoverPage={c.discoverPage}
              discoverTotal={c.discoverTotal}
              setDiscoverResults={c.setDiscoverResults}
              setDiscoverPage={c.setDiscoverPage}
              runDiscoverSearch={c.runDiscoverSearch}
              handleOpenModDetails={c.handleOpenModDetails}
              discoverSource={c.discoverSource}
              setDiscoverSource={c.setDiscoverSource}
              discoverError={c.discoverError}
            />
          )}
        </AnimatePresence>
      </main>

      <BottomNav activeTab={c.activeTab} setActiveTab={c.setActiveTab} />

      <ModDetailsSheet
        selectedMod={c.selectedMod}
        selectedModDetails={c.selectedModDetails}
        selectedModDeps={c.selectedModDeps}
        loadingDetails={c.loadingDetails}
        modStack={c.modStack}
        activeStackIndex={c.activeStackIndex}
        modalTab={c.modalTab}
        setModalTab={c.setModalTab}
        handleCloseModDetails={c.handleCloseModDetails}
        handleGoBackInStack={c.handleGoBackInStack}
        handleSwitchStackIndex={c.handleSwitchStackIndex}
        handleOpenModDetails={c.handleOpenModDetails}
        userDrafts={c.userDrafts}
        session={c.session}
        onAddToDraft={(mod, draftId) => c.addModToDraft(draftId, mod, mod.projectType || "mod").then(() => undefined)}
        onOpenDraftPicker={(mod) => {
          setEditingDraftId(null);
          c.setPendingMod(mod);
          c.setShowDraftPicker(true);
        }}
        userFavorites={c.userFavorites}
        onToggleFavorite={c.onToggleFavorite}
      />

      <DraftPickerModal
        open={c.showDraftPicker}
        initialEditDraftId={editingDraftId}
        pendingMod={c.pendingMod}
        drafts={c.userDrafts}
        onClose={() => {
          setEditingDraftId(null);
          c.setShowDraftPicker(false);
        }}
        onCreateDraft={c.createDraft}
        onAddModToDraft={c.addModToDraft}
        onRemoveModFromDraft={c.removeModFromDraft}
        onRecategorize={c.recategorizeDraftItem}
        onUpdateSide={c.updateDraftItemSide}
        onUpdateDraftCover={c.updateDraftCover}
        onDeleteDraft={c.deleteDraft}
        onRefreshDrafts={() => c.refreshUserData()}
      />

      <EditProfileModal
        show={c.showEditProfile}
        onClose={() => c.setShowEditProfile(false)}
        session={c.session}
        profile={c.profile}
        setProfile={c.setProfile}
        supabase={supabase}
        resizeAndCompressImage={resizeAndCompressImage}
      />

      <ChannelPickerModal
        show={c.showChannelPicker}
        onClose={() => c.setShowChannelPicker(false)}
        showcaseChannels={c.showcaseChannels}
        handleSaveShowcaseChannels={c.handleSaveShowcaseChannels}
      />

      {c.customAlert && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => c.setCustomAlert(null)} />
          <div className="relative z-10 w-full max-w-xs rounded-3xl border border-white/[0.08] bg-surface p-5 shadow-2xl">
            <button className="absolute right-3 top-3 rounded-full p-1 text-white/40 hover:text-white" onClick={() => c.setCustomAlert(null)}>
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-sm font-bold text-white pr-7">{c.customAlert.title}</h3>
            <p className="mt-2 text-xs leading-relaxed text-white/55">{c.customAlert.message}</p>
            <button className="mt-5 w-full rounded-xl bg-orange-600 py-2.5 text-xs font-bold text-white" onClick={() => c.setCustomAlert(null)}>
              Entendido
            </button>
          </div>
        </div>
      )}

      <MobileFloatingPlayer />
    </div>
  );
}
