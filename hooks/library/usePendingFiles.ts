import { useState, useMemo, useCallback } from "react";
import { PendingFile, Project } from "@/lib/types";
import { isVersionCompatible, isLoaderCompatible } from "@/lib/version-utils";

/**
 * @fileoverview Orquestador de Archivos Pendientes (Quarantine & Staging).
 * ─────────────────────────────────────────────────────────────────────────────
 * Evalúa en tiempo real los metadatos de los archivos descargados sin clasificar.
 * Separa los archivos compatibles con el modpack activo de aquellos que no
 * coinciden con el Mod Loader o versión, y detecta colisiones de ModId (duplicados).
 * ─────────────────────────────────────────────────────────────────────────────
 */

export function usePendingFiles(pendingFiles: PendingFile[], activeProject: Project | null, onDeleteFile: any, detectedVersion?: string, modrinthStatus: any = {}) {
  const [deletingFiles, setDeletingFiles] = useState<Record<string, boolean>>({});
  const [filesToDelete, setFilesToDelete] = useState<PendingFile[]>([]);

  /**
   * checkCompatibility
   * Verifica si la versión de Minecraft y el loader declarados en el archivo
   * satisfacen las restricciones del proyecto activo usando las utilidades avanzadas.
   */
  const checkCompatibility = useCallback((f: PendingFile) => {
    const targetVersion = activeProject?.version || detectedVersion || "1.20.1";
    
    let v = f.meta?.gameVersion ?? "unknown";
    if (v === "unknown" || v === "UNKNOWN") {
      const mrVersion = modrinthStatus[f.path]?.gameVersions?.[0];
      if (mrVersion) v = mrVersion;
    }
    
    const versionComp = isVersionCompatible(v, targetVersion);
    
    if (!activeProject) {
      return versionComp; // En modo MIMU solo filtramos por versión
    }
    
    let l = f.meta?.loader ?? "unknown";
    if (l === "unknown" || l === "UNKNOWN") {
      const mrLoader = modrinthStatus[f.path]?.loaders?.[0];
      if (mrLoader) l = mrLoader;
    }
    
    return versionComp && isLoaderCompatible(l, activeProject.loader, activeProject.version);
  }, [activeProject, detectedVersion, modrinthStatus]);

  /**
   * groups: Divide el array de pendientes en compatibles e incompatibles (Quarentena).
   */
  const groups = useMemo(() => {
    const comp: PendingFile[] = [];
    const incomp: PendingFile[] = [];
    pendingFiles.forEach(f => checkCompatibility(f) ? comp.push(f) : incomp.push(f));
    return { compatibleFiles: comp, incompatibleFiles: incomp };
  }, [pendingFiles, checkCompatibility]);

  /**
   * conflicts: Mapeo forense de colisiones.
   * Si dos archivos pendientes declaran el mismo ModId interno, ambos se marcan como duplicados.
   */
  const conflicts = useMemo(() => {
    const map: Record<string, string> = {};
    const modIdToPaths: Record<string, string[]> = {};
    
    pendingFiles.forEach(f => {
      const id = f.meta?.modId;
      if (id && id !== "unknown") {
        if (!modIdToPaths[id]) modIdToPaths[id] = [];
        modIdToPaths[id].push(f.path);
      }
    });

    Object.values(modIdToPaths).forEach(paths => {
      if (paths.length > 1) paths.forEach(p => map[p] = "Duplicado");
    });

    return map;
  }, [pendingFiles]);

  return { ...groups, conflicts, deletingFiles, filesToDelete, setFilesToDelete, setDeletingFiles };
}
