import { useState, useCallback } from "react";
import { Project } from "@/lib/types";

export function useLibraryUpdates(activeProject: Project | null) {
  const [modrinthStatus, setModrinthStatus] = useState<Record<string, any>>({});
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [downloadingMods, setDownloadingMods] = useState<Record<string, boolean>>({});

  const checkUpdates = useCallback(async (localMods: any[], force = false) => {
    if (!activeProject || localMods.length === 0) return;
    setCheckingUpdates(true);
    try {
      const res = await fetch("/api/modrinth/check-updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          mods: localMods, 
          loader: activeProject.loader, 
          gameVersion: activeProject.version,
          forceRefresh: force
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setModrinthStatus(data.updates || {});
      }
    } catch {}
    setCheckingUpdates(false);
  }, [activeProject]);

  return { modrinthStatus, setModrinthStatus, checkingUpdates, downloadingMods, setDownloadingMods, checkUpdates };
}
