import { useState, useCallback } from "react";
import { ModHit, VersionEntry } from "@/lib/types";
import { eventBus } from "@/lib/eventBus";
import { DependencyPrompt, PendingDependency } from "./types";

/**
 * @fileoverview Hook de Descarga de Mods desde FOMO.
 * ─────────────────────────────────────────────────────────────────────────────
 * Gestiona el envío de la orden de descarga al servidor para Modrinth o CurseForge.
 * Asegura la transferencia de metadatos completos (incluyendo iconUrl y sha1)
 * para enriquecer la caché remota en el momento de la descarga.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export function useFomoDownload(showStatus: any, loader: string, gameVersions: string[]) {
  const [downloading, setDownloading] = useState<Record<string, boolean>>({});
  const [dependencyPrompt, setDependencyPrompt] = useState<DependencyPrompt | null>(null);

  const executeDownload = useCallback(async (mod: ModHit, url: string, filename: string, hashes?: any, deps?: PendingDependency[]) => {
    setDownloading(prev => ({ ...prev, [mod.projectId]: true }));
    showStatus(`Descargando ${mod.title}...`, "info");
    
    let safeFilename = filename;
    if (!/\.(jar|zip|mrpack)$/i.test(safeFilename)) {
      const pType = mod.projectType || (mod as any).project_type || "mod";
      const ext = pType === "mod" ? ".jar" : pType === "modpack" ? ".mrpack" : ".zip";
      safeFilename = `${safeFilename}${ext}`;
    }
    
    try {
      const res = await fetch(`/api/${mod._source || 'modrinth'}/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          url, 
          filename: safeFilename, 
          hashes, 
          iconUrl: mod.iconUrl, 
          projectId: mod.projectId,
          title: mod.title,
          loader, 
          gameVersion: gameVersions[0],
          projectType: mod.projectType || (mod as any).project_type || "mod"
        })
      });

      if (res.ok) {
        showStatus(`${mod.title} descargado`, "success");
        eventBus.emit("fomo:mod-downloaded", { modId: mod.projectId, fileName: filename, source: mod._source as any });
      } else {
        showStatus("Error en descarga", "error");
      }
    } catch {
      showStatus("Error crítico", "error");
    } finally {
      setDownloading(prev => ({ ...prev, [mod.projectId]: false }));
    }
  }, [showStatus, loader, gameVersions]);

  const handleDownloadDependency = useCallback(async (dep: any) => {
    showStatus(`Descargando dependencia ${dep.title || dep.projectId}`, "info");
  }, [showStatus]);

  return { downloading, dependencyPrompt, setDependencyPrompt, executeDownload, handleDownloadDependency };
}
