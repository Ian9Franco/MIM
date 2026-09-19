"use client";

import React, { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ModHit } from "./SpotlightMarquees";
import { supabase } from "../lib/supabaseClient";
import {
  DraftDetailBanner,
  DraftDetailTabs,
  DraftSummaryTab,
  DraftItemsTab,
  DraftMembersTab,
  DraftInviteModal,
  DraftActivityTab,
  DraftMetadataModal,
  DraftItemEditModal,
  type DraftTab,
} from "./draft-detail";
import { canEditDraft, isDraftOwner } from "../lib/drafts/draftPermissions";

export interface DraftDetailModel {
  id: string;
  name: string;
  minecraft_version?: string;
  loader?: string;
  cover_image?: string | null;
  visibility?: string;
  owner_id?: string;
  [key: string]: unknown;
}

export interface DraftMemberProfile {
  id?: string;
  username?: string | null;
  avatar_url?: string | null;
  color?: string | null;
}

export interface DraftMemberRecord {
  id: string;
  draft_id: string;
  user_id?: string;
  profile_id?: string;
  role: "owner" | "editor" | "viewer" | string;
  profiles?: DraftMemberProfile | null;
  [key: string]: unknown;
}

function sameUserId(left?: string | null, right?: string | null) {
  return String(left || "").trim().toLowerCase() === String(right || "").trim().toLowerCase();
}

type ProfileMap = Record<string, DraftMemberProfile & { id?: string }>;

async function fetchProfilesByIds(ids: string[]): Promise<ProfileMap> {
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  if (!unique.length) return {};
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, color")
    .in("id", unique);
  if (error) {
    console.error("Error loading profiles:", error);
    return {};
  }
  const next: ProfileMap = {};
  for (const row of data || []) {
    next[String((row as { id: string }).id)] = row as DraftMemberProfile & { id?: string };
  }
  return next;
}

export interface DraftActivityRecord {
  id: string;
  draft_id: string;
  action: string;
  created_at: string;
  profiles?: DraftMemberProfile | null;
  [key: string]: unknown;
}

export interface DraftDetailViewProps {
  draft: DraftDetailModel;
  activeCollectionMods: ModHit[];
  loadingActiveMods: boolean;
  session: { user?: { id?: string } } | null;
  onBack: () => void;
  onEditDraft?: (draft: DraftDetailModel) => void;
  handleOpenModDetails: (mod: ModHit) => void;
  onRemoveModFromDraft?: (draftId: string, projectId: string, itemId?: string) => Promise<void>;
  onRefreshDrafts?: () => void;
  onUpdateDraftMetadata?: (draftId: string, updates: Record<string, unknown>) => Promise<boolean>;
  onRecategorizeDraftItem?: (draftId: string, projectId: string, category: string) => Promise<void>;
  onUpdateDraftItemSide?: (draftId: string, projectId: string, side: string, itemId?: string) => Promise<void>;
  onOpenProfile?: (profile: { id: string; username?: string | null; avatar_url?: string | null; color?: string | null }) => void;
}

/**
 * DraftDetailView — Vista detallada y modular de un Draft Modpack (REC-03).
 */
export function DraftDetailView({
  draft: initialDraft,
  activeCollectionMods,
  loadingActiveMods,
  session,
  onBack,
  handleOpenModDetails,
  onRemoveModFromDraft,
  onRefreshDrafts,
  onUpdateDraftMetadata,
  onRecategorizeDraftItem,
  onUpdateDraftItemSide,
  onOpenProfile,
}: DraftDetailViewProps) {
  const [draft, setDraft] = useState<DraftDetailModel>(initialDraft);
  const [tab, setTab] = useState<DraftTab>("items");
  const [typeFilter, setTypeFilter] = useState("all");

  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [members, setMembers] = useState<DraftMemberRecord[]>([]);
  const [activity, setActivity] = useState<DraftActivityRecord[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingActivity, setLoadingActivity] = useState(false);

  const ownerMember = members.find((m) => m.role === "owner");

  // Metadata modal state
  const [showMetadataModal, setShowMetadataModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editVersion, setEditVersion] = useState("");
  const [editLoader, setEditLoader] = useState("");
  const [editCoverImage, setEditCoverImage] = useState("");
  const [editVisibility, setEditVisibility] = useState("private");
  const [editDescription, setEditDescription] = useState("");
  const [savingMetadata, setSavingMetadata] = useState(false);

  // Item edit modal state
  const [editingItem, setEditingItem] = useState<ModHit | null>(null);
  const [itemType, setItemType] = useState("");
  const [itemSide, setItemSide] = useState("");
  const [savingItem, setSavingItem] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [ownerUsername, setOwnerUsername] = useState<string | null>(null);
  const ownerId = String(draft?.owner_id || ownerMember?.user_id || "");
  const isOwner = isDraftOwner(session?.user?.id, ownerId);
  const isPublic = draft?.visibility === "public";
  const canEditItems = canEditDraft({
    userId: session?.user?.id,
    ownerId,
    members,
  });
  const canEditSettings = Boolean(onUpdateDraftMetadata) && canEditItems;
  const creatorUsername = ownerMember?.profiles?.username || ownerUsername;

  const openSettings = () => {
    setEditName(draft?.name || "");
    setEditVersion(draft?.minecraft_version || "");
    setEditLoader(draft?.loader || "");
    setEditCoverImage(draft?.cover_image || "");
    setEditVisibility(draft?.visibility || "private");
    setEditDescription(String(draft?.description || "").slice(0, 100));
    setShowMetadataModal(true);
  };

  // Sync draft prop
  useEffect(() => {
    setDraft(initialDraft);
    setEditName(initialDraft?.name || "");
    setEditVersion(initialDraft?.minecraft_version || "");
    setEditLoader(initialDraft?.loader || "");
    setEditCoverImage(initialDraft?.cover_image || "");
    setEditVisibility(initialDraft?.visibility || "private");
    setEditDescription(String(initialDraft?.description || "").slice(0, 100));
  }, [initialDraft]);

  // Reset state on draft change
  useEffect(() => {
    setTab("items");
    setTypeFilter("all");
    setRemovedIds(new Set());
    setMembers([]);
    setActivity([]);
    setOwnerUsername(null);
    setMembersError(null);
  }, [draft?.id]);

  const loadMembers = useCallback(async () => {
    if (!draft?.id) return;
    setLoadingMembers(true);
    const { data, error } = await supabase
      .from("draft_members")
      .select("*")
      .eq("draft_id", draft.id);
    if (error) {
      console.error("Error loading draft members:", error);
      setMembersError(error.message);
    } else {
      setMembersError(null);
    }
    const rows = ((data || []) as DraftMemberRecord[]).map((row) => ({
      ...row,
      user_id: String(row.user_id || row.profile_id || ""),
    }));
    const ownerKey = String(draft.owner_id || "");
    const profiles = await fetchProfilesByIds([
      ...rows.map((row) => String(row.user_id || "")),
      ownerKey,
    ]);
    if (ownerKey && !rows.some((row) => sameUserId(row.user_id, ownerKey))) {
      rows.unshift({
        id: `owner-${ownerKey}`,
        draft_id: draft.id,
        user_id: ownerKey,
        role: "owner",
      });
    }
    setMembers(
      rows.map((row) => ({
        ...row,
        profiles: profiles[String(row.user_id || "")] || row.profiles || null,
      })),
    );
    setOwnerUsername(profiles[ownerKey]?.username || null);
    setLoadingMembers(false);
  }, [draft?.id, draft?.owner_id]);

  const loadActivity = useCallback(async () => {
    if (!draft?.id) return;
    setLoadingActivity(true);
    const { data, error } = await supabase
      .from("draft_activity")
      .select("*")
      .eq("draft_id", draft.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      console.error("Error loading draft activity:", error);
      setActivity([]);
      setLoadingActivity(false);
      return;
    }
    const rows = (data || []) as DraftActivityRecord[];
    const profiles = await fetchProfilesByIds(
      rows.map((row) => String(row.profile_id || row.user_id || "")),
    );
    setActivity(
      rows.map((row) => ({
        ...row,
        profiles: profiles[String(row.profile_id || row.user_id || "")] || null,
      })),
    );
    setLoadingActivity(false);
  }, [draft?.id]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    void loadActivity();
  }, [loadActivity]);

  const visibleMods = activeCollectionMods.filter((mod: ModHit) => {
    const key = mod.itemId || mod.projectId;
    if (removedIds.has(key)) return false;
    if (typeFilter === "all") return true;
    return (mod.projectType || "mod") === typeFilter;
  });

  const handleSaveMetadata = async () => {
    if (!draft?.id || !onUpdateDraftMetadata) return;
    setSavingMetadata(true);
    const description = editDescription.trim().slice(0, 100);
    const ok = await onUpdateDraftMetadata(draft.id, isOwner ? {
      name: editName,
      minecraft_version: editVersion,
      loader: editLoader,
      cover_image: editCoverImage || null,
      visibility: editVisibility,
      description,
    } : { description });
    if (ok) {
      setDraft((prev) => ({
        ...prev,
        ...(isOwner ? {
          name: editName,
          minecraft_version: editVersion,
          loader: editLoader,
          cover_image: editCoverImage || null,
          visibility: editVisibility,
        } : {}),
        description,
      }));
      setShowMetadataModal(false);
      onRefreshDrafts?.();
      loadActivity();
    }
    setSavingMetadata(false);
  };

  const handleToggleVisibility = async () => {
    if (!draft?.id || !onUpdateDraftMetadata || !isOwner) return;
    const nextVisibility = draft.visibility === "public" ? "private" : "public";
    const ok = await onUpdateDraftMetadata(draft.id, { visibility: nextVisibility });
    if (ok) {
      setDraft((prev) => ({ ...prev, visibility: nextVisibility }));
      onRefreshDrafts?.();
    }
  };

  const handleRemoveMember = async (member: { id: string; role: string }) => {
    if (!isOwner || member.role === "owner") return;
    const { error } = await supabase.from("draft_members").delete().eq("id", member.id);
    if (error) {
      setMembersError(error.message);
      return;
    }
    setMembersError(null);
    loadMembers();
  };

  const handleSaveItemEdit = async () => {
    if (!draft?.id || !editingItem) return;
    setSavingItem(true);
    try {
      if (onRecategorizeDraftItem && itemType !== editingItem.projectType) {
        await onRecategorizeDraftItem(draft.id, editingItem.projectId, itemType);
      }
      if (onUpdateDraftItemSide && itemSide !== editingItem.side) {
        await onUpdateDraftItemSide(draft.id, editingItem.projectId, itemSide, editingItem.itemId);
      }
      setEditingItem(null);
      onRefreshDrafts?.();
      const idx = activeCollectionMods.findIndex(m => m.itemId === editingItem.itemId);
      if (idx !== -1) {
        activeCollectionMods[idx].projectType = itemType;
        activeCollectionMods[idx].side = itemSide;
      }
      loadActivity();
    } catch (e) {
      console.error(e);
    } finally {
      setSavingItem(false);
    }
  };

  const handleRemoveMod = async (mod: ModHit) => {
    if (!onRemoveModFromDraft || !draft?.id) return;
    const itemId = mod.itemId || mod.projectId;
    await onRemoveModFromDraft(draft.id, mod.projectId, itemId);
    setRemovedIds((prev) => new Set(prev).add(itemId || mod.projectId));
    onRefreshDrafts?.();
    loadActivity();
  };

  return (
    <motion.div
      key="draft-detail"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.22 }}
      className="flex-1 flex flex-col min-h-0"
    >
      {/* Banner */}
      <DraftDetailBanner
        draft={draft}
        activeItemsCount={activeCollectionMods.length}
        creatorUsername={creatorUsername}
        onBack={onBack}
        isOwner={isOwner}
        onToggleVisibility={isOwner ? () => { void handleToggleVisibility(); } : undefined}
        onOpenEditMetadata={canEditSettings ? openSettings : undefined}
      />

      {/* Tabs */}
      <DraftDetailTabs tab={tab} setTab={setTab} />

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto scrollbar-none pb-24">
        <AnimatePresence mode="wait">
          {tab === "summary" && (
            <DraftSummaryTab
              key="summary"
              draft={draft}
              activeCollectionMods={activeCollectionMods}
              creatorUsername={creatorUsername}
              loadingActiveMods={loadingActiveMods}
            />
          )}

          {tab === "items" && (
            <DraftItemsTab
              key="items"
              typeFilter={typeFilter}
              setTypeFilter={setTypeFilter}
              loadingActiveMods={loadingActiveMods}
              visibleMods={visibleMods}
              canEditItems={canEditItems}
              isPublic={isPublic}
              handleOpenModDetails={handleOpenModDetails}
              onOpenEditItem={(mod) => {
                setEditingItem(mod);
                setItemType(mod.projectType || "mod");
                setItemSide(mod.side || "both");
              }}
              onRemoveItem={canEditItems && onRemoveModFromDraft ? handleRemoveMod : undefined}
            />
          )}

          {tab === "members" && (
            <DraftMembersTab
              key="members"
              loadingMembers={loadingMembers}
              members={members}
              isOwner={isOwner}
              currentUserId={session?.user?.id}
              error={membersError}
              onInvite={() => {
                setShowInviteModal(true);
              }}
              onRemoveMember={(member) => {
                void handleRemoveMember(member);
              }}
              onOpenProfile={onOpenProfile}
            />
          )}

          {tab === "activity" && (
            <DraftActivityTab
              key="activity"
              loadingActivity={loadingActivity}
              activity={activity}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Modales */}
      <DraftMetadataModal
        isOpen={showMetadataModal}
        onClose={() => {
          setShowMetadataModal(false);
        }}
        editName={editName}
        setEditName={setEditName}
        editVersion={editVersion}
        setEditVersion={setEditVersion}
        editLoader={editLoader}
        setEditLoader={setEditLoader}
        editCoverImage={editCoverImage}
        setEditCoverImage={setEditCoverImage}
        editVisibility={editVisibility}
        setEditVisibility={setEditVisibility}
        editDescription={editDescription}
        setEditDescription={setEditDescription}
        savingMetadata={savingMetadata}
        onSave={handleSaveMetadata}
        isOwner={isOwner}
      />

      <DraftInviteModal
        isOpen={showInviteModal}
        draftId={draft.id}
        currentUserId={session?.user?.id}
        onClose={() => {
          setShowInviteModal(false);
        }}
        onInvited={() => {
          loadMembers();
        }}
      />

      <DraftItemEditModal
        editingItem={editingItem}
        onClose={() => {
          setEditingItem(null);
        }}
        itemType={itemType}
        setItemType={setItemType}
        itemSide={itemSide}
        setItemSide={setItemSide}
        savingItem={savingItem}
        onSave={handleSaveItemEdit}
      />
    </motion.div>
  );
}
