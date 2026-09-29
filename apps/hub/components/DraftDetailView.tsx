"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import {
  childCategoryId,
  fixedOrgParentForContentType,
  orgParentForItem,
  parseChildCategoryId,
  remapOrgCategoryToParent,
  resolveItemChildId,
  withItemsAssignedToCategory,
  type DraftMapLayout,
  type MapParentId,
} from "@/lib/fomo/draftMapLayout";
import { resolveSessionMapLayout, writeDraftMapLayoutCache } from "@/lib/fomo/draftMapLayoutCache";
import { canEditDraft, isDraftOwner } from "../lib/drafts/draftPermissions";
import { DRAFT_ITEMS_CHANGED_EVENT } from "../lib/drafts/draftContract";

const DRAFT_ACTIVITY_LIMIT = 5;

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
  onRecategorizeDraftItem?: (draftId: string, projectId: string, category: string, itemId?: string, side?: string) => Promise<void>;
  onUpdateDraftItemContentType?: (
    draftId: string,
    projectId: string,
    contentType: string,
    itemId?: string,
    extras?: { versionId?: string | null; category?: string; side?: string },
  ) => Promise<void>;
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
  onUpdateDraftItemContentType,
  onUpdateDraftItemSide,
  onOpenProfile,
}: DraftDetailViewProps) {
  const [draft, setDraft] = useState<DraftDetailModel>(initialDraft);
  const [tab, setTab] = useState<DraftTab>("items");

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
  const [itemCategory, setItemCategory] = useState("");
  const [savingItem, setSavingItem] = useState(false);
  const [savingBulkRecategorize, setSavingBulkRecategorize] = useState(false);
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

  const resolvedMapLayout = useMemo(
    () => resolveSessionMapLayout(draft.map_layout, draft.id),
    [draft.id, draft.map_layout],
  );

  const [editMapLayout, setEditMapLayout] = useState<DraftMapLayout>(resolvedMapLayout);

  useEffect(() => {
    setEditMapLayout(resolvedMapLayout);
  }, [resolvedMapLayout]);

  const persistMapLayout = useCallback((next: DraftMapLayout) => {
    if (!draft?.id) return;
    setEditMapLayout(next);
    writeDraftMapLayoutCache(draft.id, next);
    setDraft((prev) => ({ ...prev, map_layout: next }));
    void supabase.from("drafts").update({ map_layout: next }).eq("id", draft.id);
  }, [draft?.id]);

  const usedChildIds = useMemo(
    () => activeCollectionMods.map((mod) => resolveItemChildId({
      side: mod.side,
      category: mod.orgCategory,
      projectType: mod.projectType,
    })),
    [activeCollectionMods],
  );

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

  const loadActivity = useCallback(async (silent = false) => {
    if (!draft?.id) return;
    if (!silent) setLoadingActivity(true);
    const { data, error } = await supabase
      .from("draft_activity")
      .select("*")
      .eq("draft_id", draft.id)
      .order("created_at", { ascending: false })
      .limit(DRAFT_ACTIVITY_LIMIT);
    if (error) {
      console.error("Error loading draft activity:", error);
      setActivity([]);
      if (!silent) setLoadingActivity(false);
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
    if (!silent) setLoadingActivity(false);
  }, [draft?.id]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    if (!draft?.id) return;
    void loadActivity(false);

    const refresh = () => {
      void loadActivity(true);
    };
    window.addEventListener(DRAFT_ITEMS_CHANGED_EVENT, refresh);

    const channel = supabase
      .channel(`draft-activity:${draft.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "draft_activity",
          filter: `draft_id=eq.${draft.id}`,
        },
        refresh,
      )
      .subscribe();

    return () => {
      window.removeEventListener(DRAFT_ITEMS_CHANGED_EVENT, refresh);
      void supabase.removeChannel(channel);
    };
  }, [draft?.id, loadActivity]);

  const visibleMods = activeCollectionMods.filter((mod: ModHit) => {
    const key = mod.itemId || mod.projectId;
    return !removedIds.has(key);
  });

  const handleSaveMetadata = async () => {
    if (!draft?.id || !onUpdateDraftMetadata) return;
    setSavingMetadata(true);
    const description = editDescription.trim().slice(0, 100);
    // Invited editors can update title/cover/description; owner-only fields stay gated.
    const updates = isOwner
      ? {
          name: editName,
          minecraft_version: editVersion,
          loader: editLoader,
          cover_image: editCoverImage || null,
          visibility: editVisibility,
          description,
        }
      : {
          name: editName,
          cover_image: editCoverImage || null,
          description,
        };
    const ok = await onUpdateDraftMetadata(draft.id, updates);
    if (ok) {
      setDraft((prev) => ({
        ...prev,
        ...updates,
      }));
      setShowMetadataModal(false);
      onRefreshDrafts?.();
      void loadActivity(true);
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
      const fixedSide = fixedOrgParentForContentType(itemType);
      const nextSide = fixedSide || itemSide;
      const nextCategory = remapOrgCategoryToParent(itemCategory, orgParentForItem({
        projectType: itemType,
        content_type: itemType,
        side: nextSide,
      }));
      const typeChanged = itemType !== editingItem.projectType;
      const sideChanged = nextSide !== editingItem.side;
      const categoryChanged = nextCategory !== (editingItem.orgCategory || "");
      if (typeChanged || sideChanged || categoryChanged) {
        if (onUpdateDraftItemContentType) {
          await onUpdateDraftItemContentType(draft.id, editingItem.projectId, itemType, editingItem.itemId, {
            category: nextCategory,
            side: nextSide,
            versionId: editingItem.formatVersionIds?.[itemType] ?? undefined,
          });
        } else if (categoryChanged && onRecategorizeDraftItem) {
          await onRecategorizeDraftItem(draft.id, editingItem.projectId, nextCategory, editingItem.itemId, nextSide);
        } else if (sideChanged && onUpdateDraftItemSide) {
          await onUpdateDraftItemSide(draft.id, editingItem.projectId, nextSide, editingItem.itemId);
        }
      }
      setEditingItem(null);
      onRefreshDrafts?.();
      const idx = activeCollectionMods.findIndex(m => m.itemId === editingItem.itemId);
      if (idx !== -1) {
        activeCollectionMods[idx].projectType = itemType;
        activeCollectionMods[idx].side = nextSide;
        activeCollectionMods[idx].orgCategory = nextCategory;
      }
      void loadActivity(true);
    } catch (e) {
      console.error(e);
    } finally {
      setSavingItem(false);
    }
  };

  const handleBulkRecategorize = async (
    mods: ModHit[],
    chosenBranch: MapParentId,
    pickedCategoryId: string,
  ) => {
    if (!draft?.id || mods.length === 0 || !onRecategorizeDraftItem) return;
    setSavingBulkRecategorize(true);
    try {
      const slug = parseChildCategoryId(pickedCategoryId)?.slug ?? "other";
      let nextLayout = editMapLayout;
      for (const mod of mods) {
        const parent = fixedOrgParentForContentType(mod.projectType) ?? chosenBranch;
        const category = childCategoryId(parent, slug);
        const itemKey = String(mod.itemId || mod.projectId);
        nextLayout = withItemsAssignedToCategory(nextLayout, category, [itemKey]);
        await onRecategorizeDraftItem(draft.id, mod.projectId, category, mod.itemId, parent);
        const idx = activeCollectionMods.findIndex(
          (entry) => entry.itemId === mod.itemId || entry.projectId === mod.projectId,
        );
        if (idx !== -1) {
          activeCollectionMods[idx].orgCategory = category;
          activeCollectionMods[idx].side = parent;
        }
      }
      persistMapLayout(nextLayout);
      onRefreshDrafts?.();
      void loadActivity(true);
    } catch (e) {
      console.error(e);
    } finally {
      setSavingBulkRecategorize(false);
    }
  };

  const handleRemoveMod = async (mod: ModHit) => {
    if (!onRemoveModFromDraft || !draft?.id) return;
    const itemId = mod.itemId || mod.projectId;
    await onRemoveModFromDraft(draft.id, mod.projectId, itemId);
    setRemovedIds((prev) => new Set(prev).add(itemId || mod.projectId));
    onRefreshDrafts?.();
    void loadActivity(true);
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
      <div className="flex-1 min-h-0 overflow-hidden pb-24">
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
              draftId={draft.id}
              mapLayout={draft.map_layout}
              loadingActiveMods={loadingActiveMods}
              visibleMods={visibleMods}
              draftVersion={draft.minecraft_version}
              onChangeItemFormat={canEditItems && onUpdateDraftItemContentType ? async (mod, contentType, extras) => {
                await onUpdateDraftItemContentType(draft.id, mod.projectId, contentType, mod.itemId, extras);
                const idx = activeCollectionMods.findIndex((entry) => entry.itemId === mod.itemId || entry.projectId === mod.projectId);
                if (idx !== -1) {
                  activeCollectionMods[idx].projectType = contentType;
                  if (extras?.category) activeCollectionMods[idx].orgCategory = extras.category;
                  if (extras?.side) activeCollectionMods[idx].side = extras.side;
                  if (extras && "versionId" in extras) activeCollectionMods[idx].versionId = extras.versionId ?? null;
                }
                onRefreshDrafts?.();
              } : undefined}
              canEditItems={canEditItems}
              isPublic={isPublic}
              handleOpenModDetails={handleOpenModDetails}
              onOpenEditItem={(mod) => {
                setEditingItem(mod);
                setItemType(mod.projectType || "mod");
                setItemSide(mod.side || "both");
                setItemCategory(resolveItemChildId({
                  side: mod.side,
                  category: mod.orgCategory,
                  projectType: mod.projectType,
                }));
                setEditMapLayout(resolvedMapLayout);
              }}
              onRemoveItem={canEditItems && onRemoveModFromDraft ? handleRemoveMod : undefined}
              onAssignOrgCategory={canEditItems && onRecategorizeDraftItem ? async (mod, categoryId, side) => {
                await onRecategorizeDraftItem(draft.id, mod.projectId, categoryId, mod.itemId, side);
                const idx = activeCollectionMods.findIndex((entry) => entry.itemId === mod.itemId || entry.projectId === mod.projectId);
                if (idx !== -1) {
                  activeCollectionMods[idx].orgCategory = categoryId;
                  activeCollectionMods[idx].side = side;
                }
                onRefreshDrafts?.();
              } : undefined}
              onBulkRelocate={(fromId, otherId, parent) => {
                for (const mod of activeCollectionMods) {
                  if (mod.orgCategory === fromId) {
                    mod.orgCategory = otherId;
                    mod.side = parent;
                  }
                }
                onRefreshDrafts?.();
              }}
              onBulkRecategorize={canEditItems && onRecategorizeDraftItem ? handleBulkRecategorize : undefined}
              savingBulkRecategorize={savingBulkRecategorize}
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
        draftId={draft.id}
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
        itemCategory={itemCategory}
        setItemCategory={setItemCategory}
        mapLayout={editMapLayout}
        onMapLayoutChange={persistMapLayout}
        savingItem={savingItem}
        onSave={handleSaveItemEdit}
        availableFormats={editingItem?.availableFormats}
        usedChildIds={usedChildIds}
      />
    </motion.div>
  );
}
