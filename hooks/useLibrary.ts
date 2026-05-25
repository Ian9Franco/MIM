import { useState, useCallback, useEffect } from "react";
import { Project, LibraryFile, PendingFile } from "@/lib/core/types";
import { useLibraryCore } from "./library/useLibraryCore";
import { useLibraryUpdates } from "./library/useLibraryUpdates";
import { useLibraryConflicts } from "./library/useLibraryConflicts";
import { useLibraryActions } from "./library/useLibraryActions";

/**
 * @fileoverview Orquestador Global de la Librería y Archivos Pendientes.
 * ─────────────────────────────────────────────────────────────────────────────
 * Combina el núcleo de estado, gestión de actualizaciones, detección de
 * conflictos y acciones por lote. Incorpora carga automática de la caché de
 * metadatos e iconos remotos al montar o al recibir nuevos archivos.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export function useLibrary(
  activeProject: Project | null,
  pendingFiles: PendingFile[],
  setPendingFiles: React.Dispatch<React.SetStateAction<PendingFile[]>>,
  selectedLibFiles: LibraryFile[],
  setSelectedLibFiles: React.Dispatch<React.SetStateAction<LibraryFile[]>>,
  appMode: "MIM" | "MIMU" = "MIM"
) {
  const core = useLibraryCore(activeProject, appMode);
  const updates = useLibraryUpdates(activeProject);
  const conflicts = useLibraryConflicts(core.library, pendingFiles);
  const actions = useLibraryActions(activeProject, core.setLibrary, selectedLibFiles, setSelectedLibFiles);

  const [loadingDescription, setLoadingDescription] = useState(false);
  const [modDescription, setModDescription] = useState<any>(null);
  const [syncingDescriptions, setSyncingDescriptions] = useState(false);

  // Verificación explícita de actualizaciones (forzando petición a API)
  const handleCheckUpdates = useCallback(async () => {
    // 1. Chequear mods locales instalados
    updates.checkUpdates([...core.library, ...pendingFiles], true);

    // 2. Chequear canales de YouTube seguidos
    try {
      const channelsRes = await fetch("/api/fomo/youtube-channels");
      if (channelsRes.ok) {
        const { channels } = await channelsRes.json();
        for (const channelUrl of channels) {
          try {
            const scRes = await fetch(
              `/api/fomo/youtube-showcase?channel=${encodeURIComponent(
                channelUrl
              )}&limit=1`
            );
            if (scRes.ok) {
              const scData = await scRes.json();
              const latestVideo = scData.showcases?.[0];
              if (latestVideo?.videoId) {
                const lastVideos = JSON.parse(localStorage.getItem("mim_youtube_last_videos") || "{}");
                if (lastVideos[channelUrl] !== latestVideo.videoId) {
                  lastVideos[channelUrl] = latestVideo.videoId;
                  localStorage.setItem("mim_youtube_last_videos", JSON.stringify(lastVideos));
                  window.dispatchEvent(new CustomEvent("fomo-unread-channels-updated"));
                }
              }
            }
          } catch (err) {
            console.warn("[handleCheckUpdates] Error checking channel", channelUrl, err);
          }
        }
      }
    } catch (err) {
      console.warn("[handleCheckUpdates] Error fetching YouTube channels", err);
    }

    // 3. Chequear autores seguidos
    try {
      const mimDB = (await import("@/lib/storage/indexeddb")).mimDB;
      await mimDB.init();
      const authors = await mimDB.getAllFollowedAuthors();
      const authorNames = authors.map((a: any) => typeof a === "string" ? a : a.name).filter(Boolean);

      for (const author of authorNames) {
        try {
          const res = await fetch(
            `/api/modrinth/discover?q=author:${encodeURIComponent(
              author
            )}&sort=newest&pageSize=1`
          );
          if (res.ok) {
            const data = await res.json();
            const latestMod = data.mods?.[0];
            if (latestMod?.dateCreated) {
              const state = JSON.parse(localStorage.getItem("mim_fomo_last_sync_state") || "{}");
              if (!state.lastModDates) state.lastModDates = {};
              if (state.lastModDates[author] !== latestMod.dateCreated) {
                state.lastModDates[author] = latestMod.dateCreated;
                localStorage.setItem("mim_fomo_last_sync_state", JSON.stringify(state));
                window.dispatchEvent(new CustomEvent("fomo-unread-authors-updated"));
              }
            }
          }
        } catch (err) {
          console.warn("[handleCheckUpdates] Error checking author", author, err);
        }
      }
    } catch (err) {
      console.warn("[handleCheckUpdates] Error checking authors", err);
    }
  }, [core.library, pendingFiles, updates]);

  // Carga automática de metadatos e iconos desde caché local (sin forzar API)
  useEffect(() => {
    if (core.library.length > 0 || pendingFiles.length > 0) {
      updates.checkUpdates([...core.library, ...pendingFiles], false);
    }
  }, [activeProject, core.library, pendingFiles]);

  const refreshLibrary = useCallback(async () => {
    core.setLoadingLibrary(true);
    const r = await fetch(`/api/library?version=${activeProject?.version}&loader=${activeProject?.loader}&project=${activeProject?.name}`);
    if (r.ok) {
      const d = await r.json();
      core.setLibrary(d.library || []);
    }
    core.setLoadingLibrary(false);
  }, [activeProject, core]);

  const handleViewDescription = useCallback(async () => {
    if (selectedLibFiles.length !== 1 || !activeProject) return;
    setLoadingDescription(true);
    try {
      const res = await fetch("/api/modrinth/export-descriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mods: [selectedLibFiles[0]], loader: activeProject.loader, gameVersion: activeProject.version }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.data && data.data[0]) setModDescription(data.data[0]);
      }
    } catch {}
    setLoadingDescription(false);
  }, [selectedLibFiles, activeProject]);

  const handleDownloadUpdate = useCallback(async (path: string, url: string, filename: string) => {
    updates.setDownloadingMods(prev => ({ ...prev, [path]: true }));
    try {
      const res = await fetch("/api/modrinth/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, filename }),
      });
      if (res.ok) updates.setModrinthStatus(prev => ({ ...prev, [path]: { ...prev[path], status: "updated_downloaded" } }));
    } catch {}
    updates.setDownloadingMods(prev => ({ ...prev, [path]: false }));
  }, [updates]);

  return {
    ...core,
    ...updates,
    ...conflicts,
    ...actions,
    loadingDescription,
    modDescription,
    setModDescription,
    handleCheckUpdates,
    refreshLibrary,
    syncingDescriptions,
    handleViewDescription,
    handleDownloadUpdate,
    handleSyncAllDescriptions: async () => {},
    handleResolveConflict: async () => {},
    handleDismissUpdate: () => {},
    ignoredUpdates: new Set<string>()
  };
}
