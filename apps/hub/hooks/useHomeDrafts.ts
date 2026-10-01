"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { CollectionItem } from "../app/types";
import type { CommunitySection } from "../components/community/CommunityShell";
import type { ModHit } from "../components/SpotlightMarquees";
import {
  DRAFT_ITEMS_CHANGED_EVENT,
  buildDraftProjectUrl,
  changedDraftMetadata,
  collectDraftItemsForIconFetch,
  decodeHomeDraft,
  decodeHomeDrafts,
  readActiveDraft,
  writeActiveDraft,
  type DraftAddResult,
  type DraftMetadataUpdates,
  type HomeDraft,
  type HomeDraftItem,
} from "../lib/drafts/draftContract";
import {
  fetchDraftIconsFromItems,
  fetchDraftVersions,
  fetchRequiredDependencyProjects,
  resolveDraftModrinthItem,
} from "../lib/drafts/draftRemote";
import { defaultOrgCategoryForDraftItem, normalizeDraftOrgCategory } from "@/lib/fomo/draftMapLayout";
import { clearDraftMapLayoutCache } from "@/lib/fomo/draftMapLayoutCache";
import {
  DraftPendingMutations,
  fingerprintCategorySide,
  mergeModHitFromDraftItemRow,
  patchHomeDraftListItems,
  persistCategoryAssignTargets,
  type CategoryAssignTarget,
} from "@/lib/fomo/draftItemsController";
import { useDraftRealtimeSync } from "@/lib/fomo/useDraftRealtimeSync";
import { draftItemNeedsCategoryRepair } from "../lib/drafts/repairDraftItemCategories";
import { inferSide, normalizeContentType } from "../lib/projectTypes";
import { createDraftRepository, type DraftRepositoryClient } from "../lib/drafts/draftRepository";
import { canEditDraft } from "../lib/drafts/draftPermissions";
import { supabase } from "../lib/supabaseClient";

const draftRepository = createDraftRepository(supabase as unknown as DraftRepositoryClient);

interface UseHomeDraftsOptions {
  userId?: string;
  activeCollectionMods: ModHit[];
  setActiveTab: Dispatch<SetStateAction<string>>;
  setCommunitySection: Dispatch<SetStateAction<CommunitySection>>;
  setActiveCollection: Dispatch<SetStateAction<CollectionItem | null>>;
  setActiveCollectionMods: Dispatch<SetStateAction<ModHit[]>>;
  setLoadingActiveMods: Dispatch<SetStateAction<boolean>>;
  showAlert: (title: string, message: string) => void;
}

export const HOME_DRAFTS_PUBLIC_KEYS = [
  "userDrafts",
  "activeDraft",
  "setActiveDraft",
  "handleEnterDraftCollection",
  "handleExitDraft",
  "createDraft",
  "addModToDraft",
  "removeModFromDraft",
  "recategorizeDraftItem",
  "recategorizeDraftItemsBatch",
  "updateDraftItemContentType",
  "updateDraftItemSide",
  "updateDraftCover",
  "deleteDraft",
  "updateDraftMetadata",
] as const;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Error desconocido";
}

function notifyDraftsChanged(): void {
  window.dispatchEvent(new CustomEvent(DRAFT_ITEMS_CHANGED_EVENT));
}

function draftActivityAction(contentType: string): string {
  if (contentType === "resourcepack") return "añadió una textura";
  if (contentType === "shader") return "añadió un shader";
  if (contentType === "datapack") return "añadió un datapack";
  return "añadió un mod";
}

function requiredDependencyIds(
  dependencies: HomeDraftItem["dependencies"],
  knownIds: Set<string>,
): string[] {
  return dependencies.flatMap((dependency) =>
    dependency.dependency_type === "required" && dependency.project_id && !knownIds.has(dependency.project_id)
      ? [dependency.project_id]
      : [],
  );
}

function draftItemToModHit(
  item: HomeDraftItem,
  draft: HomeDraft,
  versions: Record<string, { game_versions: string[]; loaders: string[] }>,
): ModHit {
  const actualVersion = item.version_id ? versions[item.version_id] : undefined;
  return {
    itemId: item.id,
    projectId: item.project_id,
    title: item.name || item.mod_name || item.project_id,
    description: "",
    iconUrl: item.icon_url || item.iconUrl,
    author: "",
    projectType: item.content_type || item.project_type || "mod",
    categories: [item.content_type || "mod"].filter(Boolean),
    orgCategory: item.category,
    url: buildDraftProjectUrl(item),
    _source: item.source === "curseforge" ? "curseforge" : "modrinth",
    gameVersions: actualVersion?.game_versions || item.game_versions || [draft.minecraft_version].filter(Boolean),
    loaders: actualVersion?.loaders || item.loaders || [draft.loader].filter(Boolean),
    side: item.side || "both",
    versionId: item.version_id || null,
  };
}

export function useHomeDrafts({
  userId,
  activeCollectionMods,
  setActiveTab,
  setCommunitySection,
  setActiveCollection,
  setActiveCollectionMods,
  setLoadingActiveMods,
  showAlert,
}: UseHomeDraftsOptions) {
  const [userDrafts, setUserDrafts] = useState<HomeDraft[]>([]);
  const [activeDraft, setActiveDraft] = useState<HomeDraft | null>(null);
  const [activeDraftHydrated, setActiveDraftHydrated] = useState(false);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const pendingMutationsRef = useRef(new DraftPendingMutations());
  const activeModsRef = useRef(activeCollectionMods);
  const activeDraftIdRef = useRef<string | null>(null);

  useEffect(() => {
    activeModsRef.current = activeCollectionMods;
    activeDraftIdRef.current = activeDraft?.id ?? null;
  }, [activeCollectionMods, activeDraft?.id]);

  useDraftRealtimeSync({
    draftId: activeDraft?.id,
    enabled: Boolean(activeDraft?.id),
    pendingRef: pendingMutationsRef,
    getItems: () => activeModsRef.current,
    onItemsChange: setActiveCollectionMods,
    mergeRemote: (mods, event, row) => {
      const draftId = activeDraftIdRef.current;
      if (draftId && row?.id) {
        setUserDrafts((prev) =>
          prev.map((draft) => {
            if (draft.id !== draftId) return draft;
            const items = draft.items || [];
            if (event === "DELETE") {
              return {
                ...draft,
                items: items.filter((item) => item.id !== row.id),
              };
            }
            const idx = items.findIndex((item) => item.id === row.id);
            const nextItem = {
              ...(idx >= 0 ? items[idx] : {}),
              id: String(row.id),
              project_id: String(row.project_id || ""),
              mod_name: String(row.mod_name || row.name || row.project_id || ""),
              category: String(row.category || ""),
              side: String(row.side || "both"),
              content_type: String(row.content_type || "mod"),
              version_id: row.version_id ?? null,
            } as HomeDraftItem;
            if (idx === -1) return { ...draft, items: [...items, nextItem] };
            return {
              ...draft,
              items: items.map((item, index) => (index === idx ? { ...item, ...nextItem } : item)),
            };
          }),
        );
      }
      return mergeModHitFromDraftItemRow(mods, event, row);
    },
    onMapLayoutChange: (mapLayout) => {
      const draftId = activeDraftIdRef.current;
      if (!draftId) return;
      setActiveDraft((prev) => (prev?.id === draftId ? { ...prev, map_layout: mapLayout } : prev));
      setUserDrafts((prev) =>
        prev.map((draft) =>
          draft.id === draftId ? { ...draft, map_layout: mapLayout } : draft,
        ),
      );
    },
  });

  useEffect(() => {
    setActiveDraft(readActiveDraft(localStorage));
    setActiveDraftHydrated(true);
  }, []);

  useEffect(() => {
    if (activeDraftHydrated) writeActiveDraft(localStorage, activeDraft);
  }, [activeDraft, activeDraftHydrated]);

  useEffect(() => {
    if (!activeDraft?.id) return;
    const fresh = userDrafts.find((draft) => draft.id === activeDraft.id);
    if (!fresh) return;
    setActiveDraft((prev) => {
      if (!prev || prev.id !== fresh.id) return prev;
      return {
        ...prev,
        ...fresh,
        map_layout: fresh.map_layout ?? prev.map_layout,
      };
    });
  }, [userDrafts, activeDraft?.id]);

  const refreshDrafts = useCallback(async (silent = false): Promise<void> => {
    try {
      if (!silent) setLoadingDrafts(true);
      const { data, error } = await draftRepository.listDrafts(userId);
      if (error) throw error;
      const icons = await fetchDraftIconsFromItems(collectDraftItemsForIconFetch(data));
      setUserDrafts(decodeHomeDrafts(data, icons));
    } catch (error) {
      console.error("Error loading user drafts:", error);
    } finally {
      if (!silent) setLoadingDrafts(false);
    }
  }, [userId]);

  useEffect(() => {
    void refreshDrafts();
  }, [refreshDrafts]);

  useEffect(() => {
    const refresh = () => void refreshDrafts();
    window.addEventListener(DRAFT_ITEMS_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(DRAFT_ITEMS_CHANGED_EVENT, refresh);
  }, [refreshDrafts]);

  const handleEnterDraftCollection = useCallback(async (draft: HomeDraft): Promise<void> => {
    setActiveCollection({
      id: draft.id,
      name: draft.name,
      description: draft.description || `Draft Modpack (${draft.minecraft_version} · ${draft.loader})`,
      projectCount: draft.items?.length || 0,
      source: "draft",
    });
    setActiveCollectionMods([]);
    setLoadingActiveMods(true);

    try {
      const { data: draftRow, error: draftMetaError } = await supabase
        .from("drafts")
        .select("id, name, description, minecraft_version, loader, visibility, cover_image, owner_id, map_layout, updated_at")
        .eq("id", draft.id)
        .single();
      if (draftMetaError) console.error("Error loading draft metadata:", draftMetaError);
      const hydratedDraft: HomeDraft = {
        ...draft,
        ...(draftRow && typeof draftRow === "object" ? (draftRow as HomeDraft) : {}),
      };
      clearDraftMapLayoutCache(draft.id);
      setActiveDraft(hydratedDraft);

      const { data, error } = await supabase.from("draft_items").select("*").eq("draft_id", draft.id);
      if (error) throw error;
      const icons = await fetchDraftIconsFromItems(collectDraftItemsForIconFetch(data));
      const rawRows = Array.isArray(data) ? data : [];
      await Promise.all(
        rawRows.map(async (row) => {
          if (!row || typeof row !== "object") return;
          const record = row as Record<string, unknown>;
          const id = typeof record.id === "string" ? record.id : "";
          const rawCategory = typeof record.category === "string" ? record.category : undefined;
          if (!id || !draftItemNeedsCategoryRepair(rawCategory)) return;
          const contentType = typeof record.content_type === "string" ? record.content_type : "mod";
          const side = record.side === "client" || record.side === "server" ? record.side : "both";
          const category = normalizeDraftOrgCategory(rawCategory, { content_type: contentType, side });
          await supabase.from("draft_items").update({ category }).eq("id", id);
        }),
      );

      const items = decodeHomeDraft({ ...hydratedDraft, draft_items: data }, icons)?.items ?? hydratedDraft.items ?? [];

      const versionIds = items.flatMap((item) => item.version_id ? [item.version_id] : []);
      const versions = await fetchDraftVersions(versionIds);
      setActiveCollectionMods(items.map((item) => draftItemToModHit(item, hydratedDraft, versions)));
    } catch (error) {
      console.error("Error loading draft collection:", error);
    } finally {
      setLoadingActiveMods(false);
    }
    setActiveTab("rankings");
    setCommunitySection("drafts");
  }, [setActiveCollection, setActiveCollectionMods, setActiveTab, setCommunitySection, setLoadingActiveMods]);

  const handleExitDraft = useCallback(() => {
    setActiveDraft(null);
    setActiveCollection(null);
    setActiveCollectionMods([]);
    setActiveTab("rankings");
    setCommunitySection("drafts");
  }, [setActiveCollection, setActiveCollectionMods, setActiveTab, setCommunitySection]);

  const createDraft = useCallback(async (
    name: string,
    version: string,
    loader: string,
    visibility: "public" | "private" = "private",
    description = "",
  ): Promise<HomeDraft | null> => {
    if (!userId) return null;
    try {
      const { data, error } = await draftRepository.createDraft({
        ownerId: userId,
        name,
        minecraftVersion: version,
        loader,
        visibility,
        description: description.trim().slice(0, 100),
      });
      if (error) throw error;
      notifyDraftsChanged();
      await refreshDrafts();
      return decodeHomeDraft(data);
    } catch (error) {
      showAlert("Error", `Error al crear el draft: ${errorMessage(error)}`);
      return null;
    }
  }, [refreshDrafts, showAlert, userId]);

  const addModToDraft = useCallback(async (
    draftId: string,
    mod: ModHit,
    category: string,
  ): Promise<DraftAddResult> => {
    if (!userId) return { ok: false, status: "error", message: "Necesitás iniciar sesión para editar Drafts." };
    const draft = userDrafts.find((candidate) => candidate.id === draftId);
    if (draft && !canEditDraft({ userId, ownerId: draft.owner_id, members: draft.members })) {
      return { ok: false, status: "error", message: "Solo el dueño o un invitado puede editar este draft." };
    }
    const draftVersion = draft?.minecraft_version || "1.20.1";
    const draftLoader = draft?.loader || "fabric";
    const contentType = normalizeContentType({ ...mod, projectType: category || mod.projectType });

    try {
      const { data: existing, error: checkError } = await supabase
        .from("draft_items")
        .select("id")
        .eq("draft_id", draftId)
        .eq("project_id", mod.projectId)
        .eq("content_type", contentType)
        .maybeSingle();
      if (checkError) throw checkError;
      if (existing) {
        showAlert("Ya existe", "Ese contenido ya está en este Draft.");
        return { ok: false, status: "exists", message: `${mod.title} ya estaba en este Draft.`, contentType };
      }

      const resolved = await resolveDraftModrinthItem(mod, draftVersion, draftLoader, contentType);
      const dependencies = resolved.version?.dependencies ?? [];
      const versionId = resolved.version?.id ?? null;
      const compatible = (mod._source || "modrinth") === "curseforge" || Boolean(versionId);
      const side = inferSide(contentType, resolved.project);
      const orgCategory = defaultOrgCategoryForDraftItem(contentType, side);
      const { error } = await supabase.from("draft_items").insert({
        draft_id: draftId,
        source: mod._source || "modrinth",
        project_id: mod.projectId,
        version_id: versionId,
        mod_name: mod.title || mod.projectId,
        added_by: userId,
        content_type: contentType,
        category: orgCategory,
        side,
        dependencies,
      });
      if (error) throw error;

      await supabase.from("draft_activity").insert({
        draft_id: draftId,
        user_id: userId,
        action: draftActivityAction(contentType),
        payload: { name: mod.title || mod.projectId, type: contentType, project_id: mod.projectId },
      });

      const knownIds = new Set([mod.projectId, ...(draft?.items || []).map((item) => item.project_id)]);
      const missingIds = requiredDependencyIds(dependencies, knownIds);
      const requiredProjects = await fetchRequiredDependencyProjects(missingIds);
      if (requiredProjects.length > 0) {
        await supabase.from("draft_items").insert(requiredProjects.map((project) => {
          const projectType = normalizeContentType(project);
          const depSide = inferSide(projectType, project);
          return {
            draft_id: draftId,
            source: "modrinth",
            project_id: project.id,
            version_id: null,
            mod_name: project.title || project.id,
            added_by: userId,
            content_type: projectType,
            category: defaultOrgCategoryForDraftItem(projectType, depSide),
            side: depSide,
            dependencies: [],
          };
        }));
      }

      notifyDraftsChanged();
      await refreshDrafts();
      const label = contentType === "resourcepack" ? "textura/resourcepack" : contentType;
      const dependencyText = missingIds.length > 0
        ? ` Se agregaron ${missingIds.length} dependencia(s) requeridas.`
        : "";
      return {
        ok: true,
        status: compatible ? "compatible" : "warning",
        contentType,
        message: compatible
          ? `${mod.title} agregado como ${label}. Compatible con ${draftLoader} ${draftVersion}.${dependencyText}`
          : `${mod.title} agregado como ${label}, pero no encontré versión para ${draftLoader} ${draftVersion}. Revisalo antes de descargar.${dependencyText}`,
      };
    } catch (error) {
      const message = errorMessage(error);
      showAlert("Error", `Error al añadir al draft: ${message}`);
      return { ok: false, status: "error", message: `No se pudo agregar: ${message}`, contentType };
    }
  }, [refreshDrafts, showAlert, userDrafts, userId]);

  const removeModFromDraft = useCallback(async (
    draftId: string,
    projectId: string,
    itemId?: string,
  ): Promise<void> => {
    if (!userId) return;
    const item = userDrafts.find((draft) => draft.id === draftId)?.items?.find(
      (candidate) => (itemId && candidate.id === itemId) || candidate.project_id === projectId,
    );
    const { error } = await draftRepository.deleteDraftItem({ draftId, projectId, itemId });
    if (error) showAlert("Error", `Error al eliminar del draft: ${error.message}`);
    else {
      await draftRepository.recordDraftActivity({
        draftId,
        profileId: userId,
        action: "eliminó un ítem",
        payload: {
          name: item?.name || item?.mod_name || projectId,
          type: item?.content_type || item?.category || "mod",
          project_id: projectId,
        },
      });
    }
    notifyDraftsChanged();
    await refreshDrafts();
  }, [refreshDrafts, showAlert, userDrafts, userId]);

  const recategorizeDraftItem = useCallback(async (
    draftId: string,
    projectId: string,
    category: string,
    itemId?: string,
    side?: string,
  ): Promise<void> => {
    if (!userId) return;
    const resolvedSide = side || "both";
    const itemIds = itemId ? [itemId] : activeModsRef.current
      .filter((mod) => mod.projectId === projectId)
      .map((mod) => String(mod.itemId || ""))
      .filter(Boolean);

    if (itemId) {
      pendingMutationsRef.current.track(itemIds, fingerprintCategorySide(category, resolvedSide));
    }

    setActiveCollectionMods((prev) =>
      prev.map((mod) => {
        const matches = itemId
          ? mod.itemId === itemId
          : mod.projectId === projectId;
        if (!matches) return mod;
        return { ...mod, orgCategory: category, side: resolvedSide };
      }),
    );
    setUserDrafts((prev) =>
      prev.map((draft) => {
        if (draft.id !== draftId || !draft.items?.length) return draft;
        return {
          ...draft,
          items: draft.items.map((item) => {
            const matches = itemId
              ? item.id === itemId
              : item.project_id === projectId;
            if (!matches) return item;
            return { ...item, category, side: resolvedSide as HomeDraftItem["side"] };
          }),
        };
      }),
    );

    const payload: Record<string, string> = { category, side: resolvedSide };
    const query = supabase.from("draft_items").update(payload);
    const { error } = itemId
      ? await query.eq("id", itemId)
      : await query.eq("draft_id", draftId).eq("project_id", projectId);
    if (error) {
      pendingMutationsRef.current.clear(itemIds);
      showAlert("Error", `Error al recategorizar: ${error.message}`);
      void refreshDrafts(true);
      return;
    }
    pendingMutationsRef.current.clear(itemIds);
  }, [refreshDrafts, showAlert, userId]);

  const recategorizeDraftItemsBatch = useCallback(async (
    draftId: string,
    mods: ModHit[],
  ): Promise<void> => {
    if (!userId || mods.length === 0) return;
    const targetsMap = new Map<string, CategoryAssignTarget>();
    for (const mod of mods) {
      const id = String(mod.itemId || mod.projectId);
      const category = String(mod.orgCategory || "");
      const side = String(mod.side || "both");
      if (!category) continue;
      const key = fingerprintCategorySide(category, side);
      const existing = targetsMap.get(key);
      if (existing) existing.ids.push(id);
      else targetsMap.set(key, { ids: [id], category, side });
    }
    const targets = [...targetsMap.values()];
    if (!targets.length) return;

    for (const target of targets) {
      pendingMutationsRef.current.track(
        target.ids,
        fingerprintCategorySide(target.category, target.side),
      );
    }

    const idSet = new Set(
      mods.map((mod) => String(mod.itemId || mod.projectId)),
    );
    setActiveCollectionMods((prev) =>
      prev.map((mod) => {
        const key = String(mod.itemId || mod.projectId);
        if (!idSet.has(key)) return mod;
        const normalized = mods.find((entry) => String(entry.itemId || entry.projectId) === key);
        if (!normalized?.orgCategory) return mod;
        return {
          ...mod,
          orgCategory: normalized.orgCategory,
          side: normalized.side || mod.side,
        };
      }),
    );
    setUserDrafts((prev) => {
      let next = prev;
      for (const target of targets) {
        next = patchHomeDraftListItems(next, draftId, target.ids, {
          category: target.category,
          side: target.side,
        });
      }
      return next;
    });

    const { error } = await persistCategoryAssignTargets(supabase, targets);
    if (error) {
      for (const target of targets) pendingMutationsRef.current.clear(target.ids);
      showAlert("Error", `Error al recategorizar: ${error.message}`);
      void refreshDrafts(true);
      return;
    }
    for (const target of targets) pendingMutationsRef.current.clear(target.ids);
  }, [refreshDrafts, showAlert, userId]);

  const updateDraftItemContentType = useCallback(async (
    draftId: string,
    projectId: string,
    contentType: string,
    itemId?: string,
    extras?: { versionId?: string | null; category?: string; side?: string },
  ): Promise<void> => {
    if (!userId) return;
    const payload: Record<string, string | null> = { content_type: contentType };
    if (typeof extras?.versionId === "string" && extras.versionId) payload.version_id = extras.versionId;
    if (extras?.category) payload.category = extras.category;
    if (extras?.side) payload.side = extras.side;
    const query = supabase.from("draft_items").update(payload);
    const { error } = itemId
      ? await query.eq("id", itemId)
      : await query.eq("draft_id", draftId).eq("project_id", projectId);
    if (error) showAlert("Error", `Error al actualizar tipo: ${error.message}`);
    else notifyDraftsChanged();
    void refreshDrafts(true);
  }, [refreshDrafts, showAlert, userId]);

  const updateDraftItemSide = useCallback(async (
    draftId: string,
    projectId: string,
    side: string,
    itemId?: string,
  ): Promise<void> => {
    if (!userId) return;
    const query = supabase.from("draft_items").update({ side });
    const { error } = itemId
      ? await query.eq("id", itemId)
      : await query.eq("draft_id", draftId).eq("project_id", projectId);
    if (error) showAlert("Error", `Error al actualizar lado: ${error.message}`);
    else notifyDraftsChanged();
    void refreshDrafts(true);
  }, [refreshDrafts, showAlert, userId]);

  const updateDraftCover = useCallback(async (draftId: string, coverImage: string | null): Promise<void> => {
    if (!userId) return;
    const { error } = await supabase.from("drafts").update({
      cover_image: coverImage,
      updated_at: new Date().toISOString(),
    }).eq("id", draftId);
    if (error) showAlert("Error", `Error al actualizar banner: ${error.message}`);
    await refreshDrafts();
  }, [refreshDrafts, showAlert, userId]);

  const deleteDraft = useCallback(async (draftId: string): Promise<void> => {
    if (!userId) return;
    const { error } = await draftRepository.deleteDraft(draftId);
    if (error) showAlert("Error", `Error al eliminar el draft: ${error.message}`);
    notifyDraftsChanged();
    await refreshDrafts();
  }, [refreshDrafts, showAlert, userId]);

  const updateDraftMetadata = useCallback(async (
    draftId: string,
    updates: DraftMetadataUpdates,
  ): Promise<boolean> => {
    if (!userId) return false;
    const nextUpdates = {
      ...updates,
      ...(typeof updates.description === "string"
        ? { description: updates.description.trim().slice(0, 100) }
        : {}),
      updated_at: new Date().toISOString(),
    };
    const { error } = await draftRepository.updateDraftMetadata(draftId, nextUpdates);
    if (error) {
      showAlert("Error", `No se pudo guardar la configuración: ${error.message}`);
      return false;
    }

    const changedFields = changedDraftMetadata(updates);
    await draftRepository.recordDraftActivity({
      draftId,
      profileId: userId,
      action: changedFields.length > 0
        ? `actualizó la configuración (${changedFields.join(", ")})`
        : "actualizó el draft",
      payload: { ...updates },
    });
    await refreshDrafts();
    setActiveDraft((current) => current?.id === draftId ? { ...current, ...updates } : current);
    return true;
  }, [refreshDrafts, showAlert, userId]);

  return {
    userDrafts,
    activeDraft,
    setActiveDraft,
    handleEnterDraftCollection,
    handleExitDraft,
    createDraft,
    addModToDraft,
    removeModFromDraft,
    recategorizeDraftItem,
    recategorizeDraftItemsBatch,
    updateDraftItemContentType,
    updateDraftItemSide,
    updateDraftCover,
    deleteDraft,
    updateDraftMetadata,
    refreshDrafts,
    loadingDrafts,
  };
}
