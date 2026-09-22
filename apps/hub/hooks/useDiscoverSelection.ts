"use client";

import { useCallback, useState } from "react";
import type { ModHit } from "../components/SpotlightMarquees";

export function useDiscoverSelection() {
  const [selectedMods, setSelectedMods] = useState<ModHit[]>([]);

  const isModSelected = useCallback(
    (mod: ModHit) => selectedMods.some((m) => m.projectId === mod.projectId),
    [selectedMods],
  );

  const toggleModSelection = useCallback((mod: ModHit) => {
    setSelectedMods((prev) => {
      const exists = prev.some((m) => m.projectId === mod.projectId);
      return exists ? prev.filter((m) => m.projectId !== mod.projectId) : [...prev, mod];
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedMods([]), []);

  return { selectedMods, isModSelected, toggleModSelection, clearSelection };
}
