"use client";

import { useCallback, useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { CollectionItem } from "../app/types";
import type { ModHit } from "../components/SpotlightMarquees";
import {
  DRAFT_ITEMS_CHANGED_EVENT,
  buildDraftProjectUrl,
  changedDraftMetadata,
  collectDraftProjectIds,
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
  fetchDraftIcons,
  fetchDraftVersions,
  fetchRequiredDependencyProjects,
  resolveDraftModrinthItem,
} from "../lib/drafts/draftRemote";
import { inferSide, normalizeContentType } from "../lib/projectTypes";
import { supabase } from "../lib/supabaseClient";

interface UseHomeDraftsOptions {
  userId?: string;
  setActiveTab: Dispatch<SetStateAction<string>>;
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
  "createDraft",
  "addModToDraft",
  "removeModFromDraft",
  "recategorizeDraftItem",
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
    author: "Comunidad",
    projectType: item.content_type || item.category || "mod",
    categories: [item.category || item.content_type].filter(Boolean),
    url: buildDraftProjectUrl(item),
    _source: "modrinth",
    gameVersions: actualVersion?.game_versions || item.game_versions || [draft.minecraft_version].filter(Boolean),
    loaders: actualVersion?.loaders || item.loaders || [draft.loader].filter(Boolean),
    side: item.side || "both",
    versionId: item.version_id || null,
  };
}

export function useHomeDrafts({
  userId,
  setActiveTab,
  setActiveCollection,
  setActiveCollectionMods,
  setLoadingActiveMods,
  showAlert,
}: UseHomeDraftsOptions) {
  const [userDrafts, setUserDrafts] = useState<HomeDraft[]>([]);
  const [activeDraft, setActiveDraft] = useState<HomeDraft | null>(null);
  const [activeDraftHydrated, setActiveDraftHydrated] = useState(false);
  const [loadingDrafts, setLoadingDrafts] = useState(false);

  useEffect(() => {
    setActiveDraft(readActiveDraft(localStorage));
    setActiveDraftHydrated(true);
  }, []);

  useEffect(() => {
    if (activeDraftHydrated) writeActiveDraft(localStorage, activeDraft);
  }, [activeDraft, activeDraftHydrated]);

  const refreshDrafts = useCallback(async (silent = false): Promise<void> => {
    if (!userId) {
      setUserDrafts([]);
      return;
    }

    try {
      if (!silent) setLoadingDrafts(true);
      const { data, error } = await supabase
        .from("drafts")
        .select("*, draft_items (id, project_id, mod_name, source, category, content_type, side, version_id, dependencies)")
        .eq("owner_id", userId);
      if (error) throw error;
      const icons = await fetchDraftIcons(collectDraftProjectIds(data));
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
    setActiveDraft(draft);
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
      let items = draft.items;
      if (!items) {
        const { data, error } = await supabase.from("draft_items").select("*").eq("draft_id", draft.id);
        if (error) throw error;
        const icons = await fetchDraftIcons(collectDraftProjectIds([{ draft_items: data }]));
        items = decodeHomeDraft({ ...draft, draft_items: data }, icons)?.items ?? [];
      } else {
        const missingIds = items
          .filter((item) => item.project_id && !item.icon_url && !item.iconUrl)
          .map((item) => item.project_id);
        if (missingIds.length > 0) {
          const icons = await fetchDraftIcons(missingIds);
          items = items.map((item) => ({
            ...item,
            icon_url: item.icon_url || item.iconUrl || icons[item.project_id],
          }));
        }
      }

      const versionIds = items.flatMap((item) => item.version_id ? [item.version_id] : []);
      const versions = await fetchDraftVersions(versionIds);
      setActiveCollectionMods(items.map((item) => draftItemToModHit(item, draft, versions)));
    } catch (error) {
      console.error("Error loading draft collection:", error);
    } finally {
      setLoadingActiveMods(false);
    }
    setActiveTab("collections");
  }, [setActiveCollection, setActiveCollectionMods, setActiveTab, setLoadingActiveMods]);

  const createDraft = useCallback(async (
    name: string,
    version: string,
    loader: string,
  ): Promise<HomeDraft | null> => {
    if (!userId) return null;
    try {
      const { data, error } = await supabase.from("drafts").insert({
        owner_id: userId,
        name,
        minecraft_version: version,
        loader,
        visibility: "private",
      }).select().single();
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
      const { error } = await supabase.from("draft_items").insert({
        draft_id: draftId,
        source: mod._source || "modrinth",
        project_id: mod.projectId,
        version_id: versionId,
        mod_name: mod.title || mod.projectId,
        added_by: userId,
        content_type: contentType,
        category: contentType,
        side,
        dependencies,
      });
      if (error) throw error;

      await supabase.from("draft_activity").insert({
        draft_id: draftId,
        profile_id: userId,
        action: draftActivityAction(contentType),
        payload: { name: mod.title || mod.projectId, type: contentType, project_id: mod.projectId },
      });

      const knownIds = new Set([mod.projectId, ...(draft?.items || []).map((item) => item.project_id)]);
      const missingIds = requiredDependencyIds(dependencies, knownIds);
      const requiredProjects = await fetchRequiredDependencyProjects(missingIds);
      if (requiredProjects.length > 0) {
        await supabase.from("draft_items").insert(requiredProjects.map((project) => {
          const projectType = normalizeContentType(project);
          return {
            draft_id: draftId,
            source: "modrinth",
            project_id: project.id,
            version_id: null,
            mod_name: project.title || project.id,
            added_by: userId,
            content_type: projectType,
            category: projectType,
            side: inferSide(projectType, project),
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
    const query = supabase.from("draft_items").delete();
    const { error } = itemId
      ? await query.eq("id", itemId)
      : await query.eq("draft_id", draftId).eq("project_id", projectId);
    if (error) showAlert("Error", `Error al eliminar del draft: ${error.message}`);
    else {
      await supabase.from("draft_activity").insert({
        draft_id: draftId,
        profile_id: userId,
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
  ): Promise<void> => {
    if (!userId) return;
    const { error } = await supabase.from("draft_items").update({ category, content_type: category })
      .eq("draft_id", draftId).eq("project_id", projectId);
    if (error) showAlert("Error", `Error al recategorizar: ${error.message}`);
    notifyDraftsChanged();
    await refreshDrafts();
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
    notifyDraftsChanged();
    await refreshDrafts();
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
    const { error } = await supabase.from("drafts").delete().eq("id", draftId);
    if (error) showAlert("Error", `Error al eliminar el draft: ${error.message}`);
    notifyDraftsChanged();
    await refreshDrafts();
  }, [refreshDrafts, showAlert, userId]);

  const updateDraftMetadata = useCallback(async (
    draftId: string,
    updates: DraftMetadataUpdates,
  ): Promise<boolean> => {
    if (!userId) return false;
    const { error } = await supabase.from("drafts")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", draftId);
    if (error) {
      showAlert("Error", `No se pudo guardar la configuración: ${error.message}`);
      return false;
    }

    const changedFields = changedDraftMetadata(updates);
    await supabase.from("draft_activity").insert({
      draft_id: draftId,
      profile_id: userId,
      action: changedFields.length > 0
        ? `actualizó la configuración (${changedFields.join(", ")})`
        : "actualizó el draft",
      payload: updates,
    });
    await refreshDrafts();
    return true;
  }, [refreshDrafts, showAlert, userId]);

  return {
    userDrafts,
    activeDraft,
    setActiveDraft,
    handleEnterDraftCollection,
    createDraft,
    addModToDraft,
    removeModFromDraft,
    recategorizeDraftItem,
    updateDraftItemSide,
    updateDraftCover,
    deleteDraft,
    updateDraftMetadata,
    refreshDrafts,
    loadingDrafts,
  };
}
