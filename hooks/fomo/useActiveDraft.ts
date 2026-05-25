"use client";

import { useState, useEffect } from "react";
import { activeDraftManager, ActiveDraftState } from "@/lib/fomo/activeDraftManager";

export function useActiveDraft() {
  const [activeDraft, setActiveDraft] = useState<ActiveDraftState | null>(null);

  useEffect(() => {
    const unsubscribe = activeDraftManager.subscribe(setActiveDraft);
    return () => unsubscribe();
  }, []);

  return {
    activeDraft,
    setActiveDraft: (state: ActiveDraftState) => activeDraftManager.setActiveDraft(state),
    clearActiveDraft: () => activeDraftManager.clearActiveDraft(),
    isProjectInDraft: (projectId: string) => {
      if (!activeDraft) return false;
      return activeDraft.items.some(i => i.projectId === projectId);
    },
    getDraftItem: (projectId: string) => {
      if (!activeDraft) return null;
      return activeDraft.items.find(i => i.projectId === projectId) || null;
    }
  };
}
