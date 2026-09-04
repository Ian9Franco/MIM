"use client";

import React from "react";
import { motion } from "framer-motion";
import type { ProfileTabProps } from "../profile/types";
import {
  projectUpdateKey,
  isUpdatedInLastMonth,
  fetchProjectUpdatedAt,
  readFavoriteMeta,
  getCreatedTime,
  parseShareMeta,
  CACHE_EXPIRY_MS,
  globalRecentUpdatesCache,
  globalRecentUpdatesFetchedAt,
} from "../profile/utils";
import { useProfileVault } from "../profile/useProfileVault";
import { ProfileAuthForm } from "../profile/ProfileAuthForm";
import { ProfileHeader } from "../profile/ProfileHeader";
import { ProfileDraftsSection } from "../profile/ProfileDraftsSection";
import { ProfileFavoritesSection } from "../profile/ProfileFavoritesSection";
import { ProfileSharesSection } from "../profile/ProfileSharesSection";
import { ProfileFollowedAuthorsSection } from "../profile/ProfileFollowedAuthorsSection";
import { ProfileSovereignVaultCard } from "../profile/ProfileSovereignVaultCard";
import { ProfileVaultModals } from "../profile/ProfileVaultModals";

export type { ProfileTabProps };

/**
 * ProfileTab — Orquestador modular para login/registro y perfil del usuario.
 * Integra borradores, favoritos, recomendados, creadores seguidos y Bóveda Soberana.
 */
export function ProfileTab({
  session,
  profile,
  email,
  setEmail,
  password,
  setPassword,
  username,
  setUsername,
  isRegistering,
  setIsRegistering,
  authLoading,
  loadingUserData,
  userDrafts,
  userFavorites,
  userShares = [],
  userFollowedAuthors = [],
  handleAuth,
  handleLogout,
  handleOpenEditProfile,
  handleOpenModDetails,
  handleEnterDraftCollection,
  onCreateDraft,
  onEditDraft,
  onSearchAuthor,
  onRemoveShare,
  onUpdateSharePriority,
}: ProfileTabProps) {
  const [recentUpdates, setRecentUpdates] = React.useState<Record<string, boolean>>({});

  // Vault state & handlers
  const vault = useProfileVault({
    session,
    profile,
    username,
    userDrafts,
    userFavorites,
    userFollowedAuthors,
  });

  // Ordenamiento de favoritos priorizando mods con actualizaciones recientes
  const sortedUserFavorites = React.useMemo(() => {
    return [...userFavorites].sort((a, b) => {
      const aKey = projectUpdateKey(a.platform || a.source || "modrinth", a.mod_id || a.project_id || a.id);
      const bKey = projectUpdateKey(b.platform || b.source || "modrinth", b.mod_id || b.project_id || b.id);
      const updateOrder = Number(!!recentUpdates[bKey]) - Number(!!recentUpdates[aKey]);
      return updateOrder || getCreatedTime(b) - getCreatedTime(a);
    });
  }, [userFavorites, recentUpdates]);

  // Ordenamiento de recomendados (prioridad / fijados > recientemente actualizados > fecha)
  const sortedUserShares = React.useMemo(() => {
    return [...userShares].sort((a, b) => {
      const aPriority = a.pinned === true ? true : (a.pinned == null && !!parseShareMeta(a.summary).priority);
      const bPriority = b.pinned === true ? true : (b.pinned == null && !!parseShareMeta(b.summary).priority);

      if (aPriority !== bPriority) {
        return bPriority ? 1 : -1;
      }

      const aKey = projectUpdateKey(a.platform || "modrinth", a.mod_id || a.project_id || a.id);
      const bKey = projectUpdateKey(b.platform || "modrinth", b.mod_id || b.project_id || b.id);
      const aUpdated = !aKey.startsWith("youtube:") && !!recentUpdates[aKey];
      const bUpdated = !bKey.startsWith("youtube:") && !!recentUpdates[bKey];

      if (aUpdated !== bUpdated) {
        return bUpdated ? 1 : -1;
      }

      return getCreatedTime(b) - getCreatedTime(a);
    });
  }, [userShares, recentUpdates]);

  // Fetching batch de actualizaciones recientes (Modrinth & CurseForge)
  React.useEffect(() => {
    let cancelled = false;
    const entries = [...userFavorites, ...userShares]
      .map((item) => {
        const meta = item.summary?.trim?.().startsWith("{") ? readFavoriteMeta(item) : {};
        const projectId = item.mod_id || item.project_id || item.id;
        const source = item.platform || item.source || "modrinth";
        const projectType = item.project_type || meta.project_type || meta.projectType || "mod";
        return { projectId, source, projectType };
      })
      .filter((item) => item.projectId && item.source !== "youtube" && !String(item.projectId).startsWith("youtube:"));
    const unique = Array.from(new Map(entries.map((item) => [projectUpdateKey(item.source, item.projectId), item])).values());

    if (!unique.length) {
      setRecentUpdates({});
      return;
    }

    const needsFetch = unique.filter((item) => {
      const key = projectUpdateKey(item.source, item.projectId);
      const cachedTime = globalRecentUpdatesFetchedAt[key];
      return !cachedTime || Date.now() - cachedTime > CACHE_EXPIRY_MS;
    });

    const initialFromCache: Record<string, boolean> = {};
    unique.forEach((item) => {
      const key = projectUpdateKey(item.source, item.projectId);
      if (globalRecentUpdatesCache[key] !== undefined) {
        initialFromCache[key] = globalRecentUpdatesCache[key];
      }
    });

    if (Object.keys(initialFromCache).length > 0) {
      setRecentUpdates((prev) => ({ ...prev, ...initialFromCache }));
    }

    if (!needsFetch.length) return;

    (async () => {
      const pairs: [string, boolean][] = [];
      const modrinthIds = needsFetch.filter((item) => item.source === "modrinth").map((item) => item.projectId);

      if (modrinthIds.length > 0) {
        try {
          const res = await fetch(`/api/modrinth/projects?ids=${encodeURIComponent(JSON.stringify(modrinthIds))}`);
          if (res.ok) {
            const projects = await res.json();
            if (Array.isArray(projects)) {
              projects.forEach((proj: any) => {
                const key = projectUpdateKey("modrinth", proj.id);
                const updated = isUpdatedInLastMonth(proj.updated_at || proj.published);
                globalRecentUpdatesCache[key] = updated;
                globalRecentUpdatesFetchedAt[key] = Date.now();
                pairs.push([key, updated]);
              });
            }
          }
        } catch (err) {
          console.error("Error batch fetching Modrinth updates:", err);
        }
      }

      const curseforgeItems = needsFetch.filter((item) => item.source === "curseforge");
      if (curseforgeItems.length > 0) {
        await Promise.all(
          curseforgeItems.map(async (item) => {
            const key = projectUpdateKey(item.source, item.projectId);
            try {
              const updatedAt = await fetchProjectUpdatedAt(item.source, item.projectId);
              const updated = isUpdatedInLastMonth(updatedAt);
              globalRecentUpdatesCache[key] = updated;
              globalRecentUpdatesFetchedAt[key] = Date.now();
              pairs.push([key, updated]);
            } catch {
              globalRecentUpdatesCache[key] = false;
              globalRecentUpdatesFetchedAt[key] = Date.now();
              pairs.push([key, false]);
            }
          })
        );
      }

      if (!cancelled && pairs.length > 0) {
        setRecentUpdates((prev) => ({
          ...prev,
          ...Object.fromEntries(pairs),
        }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userFavorites, userShares]);

  return (
    <motion.div
      key="profile"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="flex-1 flex flex-col min-h-0 overflow-y-auto pb-24 scrollbar-none"
    >
      {!session ? (
        <ProfileAuthForm
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          username={username}
          setUsername={setUsername}
          isRegistering={isRegistering}
          setIsRegistering={setIsRegistering}
          authLoading={authLoading}
          handleAuth={handleAuth}
        />
      ) : (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }}
          className="flex flex-col gap-6"
        >
          {/* Profile Card */}
          <ProfileHeader
            session={session}
            profile={profile}
            handleLogout={handleLogout}
            handleOpenEditProfile={handleOpenEditProfile}
          />

          {/* Drafts Section */}
          <ProfileDraftsSection
            userDrafts={userDrafts}
            loadingUserData={loadingUserData}
            onCreateDraft={onCreateDraft}
            handleEnterDraftCollection={handleEnterDraftCollection}
            onEditDraft={onEditDraft}
          />

          {/* Favorites Section */}
          <ProfileFavoritesSection
            sortedUserFavorites={sortedUserFavorites}
            recentUpdates={recentUpdates}
            loadingUserData={loadingUserData}
            handleOpenModDetails={handleOpenModDetails}
          />

          {/* Shared Mods Section */}
          <ProfileSharesSection
            sortedUserShares={sortedUserShares}
            recentUpdates={recentUpdates}
            loadingUserData={loadingUserData}
            handleOpenModDetails={handleOpenModDetails}
            onUpdateSharePriority={onUpdateSharePriority}
            onRemoveShare={onRemoveShare}
          />

          {/* Followed Authors Section */}
          <ProfileFollowedAuthorsSection
            userFollowedAuthors={userFollowedAuthors}
            onSearchAuthor={onSearchAuthor}
          />

          {/* Sovereign Vault Card */}
          <ProfileSovereignVaultCard
            isExportingVault={vault.isExportingVault}
            onOpenExportModal={() => vault.setShowExportModal(true)}
            fileInputRef={vault.fileInputRef}
            onFilePicked={vault.handleFilePicked}
          />

          {/* Sovereign Vault Modals */}
          <ProfileVaultModals
            showExportModal={vault.showExportModal}
            setShowExportModal={vault.setShowExportModal}
            isExportingVault={vault.isExportingVault}
            encryptVaultCheckbox={vault.encryptVaultCheckbox}
            setEncryptVaultCheckbox={vault.setEncryptVaultCheckbox}
            vaultPassphrase={vault.vaultPassphrase}
            setVaultPassphrase={vault.setVaultPassphrase}
            handleExportVault={vault.handleExportVault}
            userDraftsCount={userDrafts?.length || 0}
            userFavoritesCount={userFavorites?.length || 0}
            userFollowedAuthorsCount={userFollowedAuthors?.length || 0}
            showImportModal={vault.showImportModal}
            setShowImportModal={vault.setShowImportModal}
            importFileName={vault.importFileName}
            isEncryptedVault={vault.isEncryptedVault}
            importPassphrase={vault.importPassphrase}
            setImportPassphrase={vault.setImportPassphrase}
            importPassError={vault.importPassError}
            handleDecryptVault={vault.handleDecryptVault}
            importValidation={vault.importValidation}
            parsedVault={vault.parsedVault}
            isImporting={vault.isImporting}
            importResult={vault.importResult}
            handleExecuteImport={vault.handleExecuteImport}
          />
        </motion.div>
      )}
    </motion.div>
  );
}
