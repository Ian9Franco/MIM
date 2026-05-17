import { useState, useEffect, useCallback } from "react";
import { ModHit } from "@/lib/types";
import { eventBus } from "@/lib/eventBus";

export function useFomoSelection() {
  const [selectedMods, setSelectedMods] = useState<ModHit[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("fomo_selected_mods");
    if (saved) {
      try { setSelectedMods(JSON.parse(saved)); } catch (e) {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("fomo_selected_mods", JSON.stringify(selectedMods));
  }, [selectedMods]);

  useEffect(() => {
    const unsubscribe = eventBus.subscribe("fomo:mod-downloaded", (payload) => {
      setSelectedMods(prev => prev.filter(m => m.projectId !== payload.modId));
    });
    return () => unsubscribe();
  }, []);

  const toggleModSelection = useCallback((mod: ModHit) => {
    setSelectedMods(prev => {
      const exists = prev.some(m => m.projectId === mod.projectId);
      return exists ? prev.filter(m => m.projectId !== mod.projectId) : [...prev, mod];
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedMods([]), []);

  return { selectedMods, toggleModSelection, clearSelection };
}
