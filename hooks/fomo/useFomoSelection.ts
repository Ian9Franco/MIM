import { useState, useEffect, useCallback } from "react";
import { ModHit } from "@/lib/types";

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

  const toggleModSelection = useCallback((mod: ModHit) => {
    setSelectedMods(prev => {
      const exists = prev.some(m => m.projectId === mod.projectId);
      return exists ? prev.filter(m => m.projectId !== mod.projectId) : [...prev, mod];
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedMods([]), []);

  return { selectedMods, toggleModSelection, clearSelection };
}
