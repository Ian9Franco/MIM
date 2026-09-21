"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/core/supabaseClient";
import { useAuth } from "@/components/security/AuthContext";
import { activeDraftManager } from "@/lib/fomo/activeDraftManager";

import { resolveDraftDependencies } from "@/lib/fomo/draftDependencies";

let draftAddQueue = Promise.resolve();

export function CommunityAddToDraftModal() {
  const { user } = useAuth();

  useEffect(() => {
    const handleAdd = async (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || !detail.projectId || !user) return;

      const activeDraft = detail.draft;
      if (!activeDraft) {
        window.dispatchEvent(new CustomEvent("fomo-show-status", {
          detail: { text: "No hay Draft Activo. Selecciona uno en Drafts.", type: "warning" }
        }));
        return;
      }

      try {
        const source = detail.platform === "curseforge" ? "curseforge" : "modrinth";
        window.dispatchEvent(new CustomEvent("fomo-show-status", {
          detail: { text: "Resolviendo dependencias del Draft...", type: "info" }
        }));
        const { data: existing, error: checkError } = await supabase.from("draft_items")
          .select("project_id, version_id").eq("draft_id", activeDraft.id).eq("source", source);
        if (checkError) throw checkError;
        const existingIds = new Set((existing || []).map(item => String(item.project_id)));
        const existingVersions = new Map<string, string>((existing || [])
          .filter(item => item.version_id).map(item => [String(item.project_id), String(item.version_id)]));
        const projects = await resolveDraftDependencies({
          projectId: String(detail.projectId), title: detail.title,
          contentType: detail.contentType || "mod", versionId: detail.versionId,
        }, { source, version: activeDraft.version, loader: activeDraft.loader }, existingVersions);
        const additions = projects.filter(project => !existingIds.has(project.project_id));
        if (additions.length) {
          const { error } = await supabase.from("draft_items").insert(additions.map(project => ({
            ...project, draft_id: activeDraft.id, source, added_by: user.id,
          })));
          if (error) throw error;
          if (activeDraftManager.getActiveDraft()?.id === activeDraft.id) {
            additions.forEach(project => activeDraftManager.addItem({
              projectId: project.project_id, source, addedBy: user.id,
            }));
          }
        }
        window.dispatchEvent(new CustomEvent("fomo-draft-items-changed"));
        window.dispatchEvent(new CustomEvent("fomo-show-status", {
          detail: { text: additions.length ? "Añadidos al Draft: " + additions.length + " proyecto(s), con sus dependencias requeridas." : "El proyecto y sus dependencias ya están en el Draft.", type: "success" }
        }));
      } catch (err: unknown) {
        console.error(err);
        window.dispatchEvent(new CustomEvent("fomo-show-status", {
          detail: { text: err instanceof Error ? err.message : "Error al guardar el draft y sus dependencias.", type: "error" }
        }));
      }
    };
    const enqueueAdd = (event: Event) => {
      // Capture the target before queueing, so a tab/draft change cannot redirect the write.
      const draft = activeDraftManager.getActiveDraft();
      const captured = new CustomEvent("fomo-open-add-to-draft", { detail: { ...(event as CustomEvent).detail, draft } });
      draftAddQueue = draftAddQueue.then(() => handleAdd(captured)).catch(console.error);
    };

    const handleRemove = async (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || !detail.projectId || !user) return;

      const activeDraft = activeDraftManager.getActiveDraft();
      if (!activeDraft) return;

      try {
        // Optimistic update
        // We need to keep the item in case we need to revert
        const itemToRevert = activeDraft.items.find(i => i.projectId === detail.projectId);
        activeDraftManager.removeItem(detail.projectId);

        const { data: existing, error: checkErr } = await supabase
          .from("draft_items")
          .select("id")
          .eq("draft_id", activeDraft.id)
          .eq("project_id", detail.projectId)
          .maybeSingle();

        if (checkErr || !existing) return;

        const { error: deleteErr } = await supabase
          .from("draft_items")
          .delete()
          .eq("id", existing.id);

        if (deleteErr) {
          // Revert optimistic update
          if (itemToRevert) activeDraftManager.addItem(itemToRevert);
          throw deleteErr;
        }

        window.dispatchEvent(new CustomEvent("fomo-show-status", {
          detail: { text: "Eliminado del Draft Activo", type: "info" }
        }));
        window.dispatchEvent(new CustomEvent("fomo-draft-items-changed"));
      } catch (err: any) {
        console.error(err);
      }
    };

    window.addEventListener("fomo-open-add-to-draft", enqueueAdd);
    window.addEventListener("fomo-remove-from-draft", handleRemove);
    return () => {
      window.removeEventListener("fomo-open-add-to-draft", enqueueAdd);
      window.removeEventListener("fomo-remove-from-draft", handleRemove);
    };
  }, [user]);

  return null;
}
