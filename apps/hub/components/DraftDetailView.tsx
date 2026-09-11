"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ModHit } from "./SpotlightMarquees";
import { supabase } from "../lib/supabaseClient";
import {
  DraftDetailBanner,
  DraftDetailTabs,
  DraftSummaryTab,
  DraftItemsTab,
  DraftMembersTab,
  DraftActivityTab,
  DraftMetadataModal,
  DraftItemEditModal,
  type DraftTab,
} from "./draft-detail";

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
  username?: string | null;
  avatar_url?: string | null;
  color?: string | null;
}

export interface DraftMemberRecord {
  id: string;
  draft_id: string;
  profile_id: string;
  role: "owner" | "editor" | "viewer" | string;
  profiles?: DraftMemberProfile | null;
  [key: string]: unknown;
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
  const creatorUsername = ownerMember?.profiles?.username || null;

  // Metadata modal state
  const [showMetadataModal, setShowMetadataModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editVersion, setEditVersion] = useState("");
  const [editLoader, setEditLoader] = useState("");
  const [editCoverImage, setEditCoverImage] = useState("");
  const [editVisibility, setEditVisibility] = useState("private");
  const [savingMetadata, setSavingMetadata] = useState(false);

  // Item edit modal state
  const [editingItem, setEditingItem] = useState<ModHit | null>(null);
  const [itemType, setItemType] = useState("");
  const [itemSide, setItemSide] = useState("");
  const [savingItem, setSavingItem] = useState(false);

  // Sync draft prop
  useEffect(() => {
    setDraft(initialDraft);
    setEditName(initialDraft?.name || "");
    setEditVersion(initialDraft?.minecraft_version || "");
    setEditLoader(initialDraft?.loader || "");
    setEditCoverImage(initialDraft?.cover_image || "");
    setEditVisibility(initialDraft?.visibility || "private");
  }, [initialDraft]);

  // Reset state on draft change
  useEffect(() => {
    setTab("items");
    setTypeFilter("all");
    setRemovedIds(new Set());
    setMembers([]);
    setActivity([]);
  }, [draft?.id]);

  const loadMembers = () => {
    if (!draft?.id) return;
    setLoadingMembers(true);
    supabase
      .from("draft_members")
      .select("*, profiles(username, avatar_url, color)")
      .eq("draft_id", draft.id)
      .then(({ data }) => {
        setMembers(data || []);
        setLoadingMembers(false);
      });
  };

  const loadActivity = () => {
    if (!draft?.id) return;
    setLoadingActivity(true);
    supabase
      .from("draft_activity")
      .select("*, profiles(username, avatar_url, color)")
      .eq("draft_id", draft.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setActivity(data || []);
        setLoadingActivity(false);
      });
  };

  useEffect(() => {
    if (draft?.id) {
      loadMembers();
    }
  }, [draft?.id]);

  useEffect(() => {
    if (tab === "activity" && activity.length === 0) {
      loadActivity();
    }
  }, [tab, draft?.id]);

  const visibleMods = activeCollectionMods.filter((mod: ModHit) => {
    const key = mod.itemId || mod.projectId;
    if (removedIds.has(key)) return false;
    if (typeFilter === "all") return true;
    return (mod.projectType || "mod") === typeFilter;
  });

  const handleSaveMetadata = async () => {
    if (!draft?.id || !onUpdateDraftMetadata) return;
    setSavingMetadata(true);
    const ok = await onUpdateDraftMetadata(draft.id, {
      name: editName,
      minecraft_version: editVersion,
      loader: editLoader,
      cover_image: editCoverImage || null,
      visibility: editVisibility,
    });
    if (ok) {
      setDraft((prev) => ({
        ...prev,
        name: editName,
        minecraft_version: editVersion,
        loader: editLoader,
        cover_image: editCoverImage || null,
        visibility: editVisibility,
      }));
      setShowMetadataModal(false);
      onRefreshDrafts?.();
      loadActivity();
    }
    setSavingMetadata(false);
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
        onOpenEditMetadata={onUpdateDraftMetadata ? () => {
          setEditName(draft?.name || "");
          setEditVersion(draft?.minecraft_version || "");
          setEditLoader(draft?.loader || "");
          setEditCoverImage(draft?.cover_image || "");
          setShowMetadataModal(true);
        } : undefined}
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
            />
          )}

          {tab === "items" && (
            <DraftItemsTab
              key="items"
              typeFilter={typeFilter}
              setTypeFilter={setTypeFilter}
              loadingActiveMods={loadingActiveMods}
              visibleMods={visibleMods}
              handleOpenModDetails={handleOpenModDetails}
              onOpenEditItem={(mod) => {
                setEditingItem(mod);
                setItemType(mod.projectType || "mod");
                setItemSide(mod.side || "both");
              }}
              onRemoveItem={onRemoveModFromDraft ? handleRemoveMod : undefined}
            />
          )}

          {tab === "members" && (
            <DraftMembersTab
              key="members"
              loadingMembers={loadingMembers}
              members={members}
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
        savingMetadata={savingMetadata}
        onSave={handleSaveMetadata}
        isOwner={draft?.owner_id === session?.user?.id}
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
