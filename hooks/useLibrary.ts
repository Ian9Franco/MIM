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
  const handleCheckUpdates = useCallback(() => {
    updates.checkUpdates([...core.library, ...pendingFiles], true);
  }, [core.library, pendingFiles, updates]);

  // Carga automática de metadatos e iconos desde caché local (sin forzar API)
  useEffect(() => {
    if (activeProject && (core.library.length > 0 || pendingFiles.length > 0)) {
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
