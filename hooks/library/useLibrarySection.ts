import { useState, useEffect, useRef, useCallback } from "react";
import { Project, LibraryFile } from "@/lib/core/types";

/**
 * Hook para la gestión de la lógica de la sección de librería.
 * Maneja la duplicación de mods entre categorías y los efectos visuales de notificaciones.
 */
export function useLibrarySection(
  activeProject: Project | null,
  selectedLibFiles: LibraryFile[],
  setSelectedLibFiles: (files: LibraryFile[]) => void,
  modrinthStatus: any,
  ignoredUpdates: Set<string>,
  conflicts: any[]
) {
  const [shouldShake, setShouldShake] = useState(false);
  const prevAlertCount = useRef(0);

  // Efecto para animar la campana de notificaciones cuando hay nuevos problemas
  useEffect(() => {
    const updateCount = Object.values(modrinthStatus).filter((s: any) => s.status === "update_available" && !ignoredUpdates.has(s.path)).length;
    const currentCount = conflicts.length + updateCount;

    if (currentCount > prevAlertCount.current) {
      setShouldShake(true);
      const timer = setTimeout(() => setShouldShake(false), 600);
      return () => clearTimeout(timer);
    }
    prevAlertCount.current = currentCount;
  }, [conflicts.length, modrinthStatus, ignoredUpdates]);

  // Lógica para duplicar un mod hacia otra categoría específica (.local, .server, etc)
  const handleDuplicateTo = useCallback(async (targetParentCat: string) => {
    if (selectedLibFiles.length !== 1 || !activeProject) return;
    const f = selectedLibFiles[0];
    try {
      const res = await fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourcePaths: [f.path],
          targetCategory: "auto",
          forceParentCategory: targetParentCat,
          isCopy: true,
          modloader: activeProject.loader,
          version: activeProject.version,
          projectName: activeProject.name
        })
      });
      if (res.ok) {
        setSelectedLibFiles([]); 
        window.dispatchEvent(new CustomEvent("refresh-system"));
      }
    } catch (err) {
      console.error("[LibrarySection] Duplicate failed:", err);
    }
  }, [activeProject, selectedLibFiles, setSelectedLibFiles]);

  return { shouldShake, handleDuplicateTo };
}
