import { useState, useCallback } from "react";
import { Project, LibraryFile } from "@/lib/types";

/**
 * @fileoverview Hook de Acciones Masivas y de Gestión de la Librería.
 * ─────────────────────────────────────────────────────────────────────────────
 * Contiene los manejadores de eventos para clasificar, des-clasificar, eliminar
 * y sincronizar descripciones de la librería de mods.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export function useLibraryActions(
  activeProject: Project | null,
  setLibrary: React.Dispatch<React.SetStateAction<LibraryFile[]>>,
  selectedLibFiles?: LibraryFile[],
  setSelectedLibFiles?: any
) {
  const [checkingUpdates, setCheckingUpdates] = useState(false);

  const handleClassify = useCallback(async (
    cat: string,
    sub: string,
    files: any[],
    setPendingFiles: any,
    onSuccess: () => void,
    toGame: boolean = false
  ) => {
    if (!files || files.length === 0) return;
    if (!toGame && !activeProject) return;

    const res = await fetch("/api/classify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourcePaths: files.map(f => f.path),
        targetCategory: cat === "auto" ? "auto" : `${cat}\\${sub}`,
        targetSub: sub,
        modloader: activeProject?.loader || "forge",
        version: activeProject?.version || "1.20.1",
        projectName: activeProject?.name,
        toGame
      })
    });

    if (res.ok) {
      if (onSuccess) onSuccess();
      // Pequeña pausa para asegurar sincronización de I/O en NTFS antes de refrescar el estado
      setTimeout(async () => {
        try {
          if (!activeProject) return;
          const pRes = await fetch(`/api/pending-files?projectName=${activeProject.name}`);
          const pData = await pRes.json();
          setPendingFiles(pData.pendingFiles || []);

          const lRes = await fetch(`/api/library?version=${activeProject.version}&loader=${activeProject.loader}&project=${activeProject.name}`);
          const lData = await lRes.json();
          setLibrary(lData.library || []);

          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("refresh-system"));
          }
        } catch (err) {
          console.warn("Error refreshing state after classify", err);
        }
      }, 250);
    }
  }, [activeProject, setLibrary]);

  const handleUnclassify = useCallback(async (customFiles?: LibraryFile[], customSetSelected?: any) => {
    const filesToProcess = (customFiles && Array.isArray(customFiles)) ? customFiles : selectedLibFiles;
    const setSel = customSetSelected || setSelectedLibFiles;
    if (!filesToProcess || !Array.isArray(filesToProcess) || filesToProcess.length === 0 || !activeProject) return;
    
    const res = await fetch("/api/unclassify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourcePaths: filesToProcess.map((f: any) => f.path) })
    });

    if (res.ok) {
      if (setSel) setSel([]);
      try {
        const r = await fetch(`/api/library?version=${activeProject.version}&loader=${activeProject.loader}&project=${activeProject.name}`);
        const d = await r.json();
        setLibrary(d.library || []);
      } catch (err) {
        console.warn("Error refreshing library after unclassify", err);
      }
    }
  }, [activeProject, setLibrary, selectedLibFiles, setSelectedLibFiles]);

  return { handleClassify, handleUnclassify, checkingUpdates, setCheckingUpdates };
}
