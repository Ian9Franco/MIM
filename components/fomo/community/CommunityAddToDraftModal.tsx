"use client";

import React, { useEffect } from "react";
import { supabase } from "@/lib/core/supabaseClient";
import { useAuth } from "@/components/security/AuthContext";
import { activeDraftManager } from "@/lib/fomo/activeDraftManager";

export function CommunityAddToDraftModal() {
  const { user } = useAuth();

  useEffect(() => {
    const handleAdd = async (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || !detail.projectId || !user) return;

      const activeDraft = activeDraftManager.getActiveDraft();
      if (!activeDraft) {
        window.dispatchEvent(new CustomEvent("fomo-show-status", {
          detail: { text: "No hay Draft Activo. Selecciona uno en Drafts.", type: "warning" }
        }));
        return;
      }

      try {
        // Optimistic update
        activeDraftManager.addItem({
          projectId: detail.projectId,
          source: detail.platform,
          addedBy: user.id
        });
        window.dispatchEvent(new CustomEvent("fomo-show-status", {
          detail: { text: "Añadiendo al Draft...", type: "info" }
        }));

        const { data: existing, error: checkErr } = await supabase
          .from("draft_items")
          .select("id")
          .eq("draft_id", activeDraft.id)
          .eq("project_id", detail.projectId)
          .maybeSingle();

        if (checkErr) throw checkErr;
        if (existing) {
          window.dispatchEvent(new CustomEvent("fomo-show-status", {
            detail: { text: "El mod ya está en el Draft.", type: "info" }
          }));
          return;
        }

        const { error: insertErr } = await supabase
          .from("draft_items")
          .insert({
            draft_id: activeDraft.id,
            source: detail.platform === "curseforge" ? "curseforge" : "modrinth",
            project_id: detail.projectId,
            mod_name: detail.title || detail.projectId,
            content_type: detail.contentType || "mod",
            added_by: user.id,
          });

        if (insertErr) throw insertErr;
        
        window.dispatchEvent(new CustomEvent("fomo-show-status", {
          detail: { text: "Añadido al Draft Activo", type: "success" }
        }));
      } catch (err: any) {
        console.error(err);
        // Revert optimistic update
        activeDraftManager.removeItem(detail.projectId);
        window.dispatchEvent(new CustomEvent("fomo-show-status", {
          detail: { text: "Error al añadir al draft.", type: "error" }
        }));
      }
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

    window.addEventListener("fomo-open-add-to-draft", handleAdd);
    window.addEventListener("fomo-remove-from-draft", handleRemove);
    return () => {
      window.removeEventListener("fomo-open-add-to-draft", handleAdd);
      window.removeEventListener("fomo-remove-from-draft", handleRemove);
    };
  }, [user]);

  return null;
}
