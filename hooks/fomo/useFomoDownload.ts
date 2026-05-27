import { useState, useCallback } from "react";
import { ModHit, VersionEntry } from "@/lib/core/types";
import { eventBus } from "@/lib/events/eventBus";
import { DependencyPrompt, PendingDependency } from "./types";

/**
 * @fileoverview Hook de Descarga de Mods desde FOMO.
 * ─────────────────────────────────────────────────────────────────────────────
 * Gestiona el envío de la orden de descarga al servidor para Modrinth o CurseForge.
 * Asegura la transferencia de metadatos completos (incluyendo iconUrl y sha1)
 * para enriquecer la caché remota en el momento de la descarga.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export function useFomoDownload(showStatus: any, loader: string, gameVersions: string[], projectName?: string) {
  const [downloading, setDownloading] = useState<Record<string, boolean>>({});
  const [dependencyPrompt, setDependencyPrompt] = useState<DependencyPrompt | null>(null);

  const executeDownload = useCallback(async (mod: ModHit, url: string, filename: string, hashes?: any, deps?: PendingDependency[], projectTypeOverride?: string) => {
    let safeFilename = filename;
    if (!/\.(jar|zip|mrpack)$/i.test(safeFilename)) {
      const pType = mod.projectType || (mod as any).project_type || "mod";
      const ext = pType === "mod" ? ".jar" : pType === "modpack" ? ".mrpack" : ".zip";
      safeFilename = `${safeFilename}${ext}`;
    }

    const versionId = hashes?.sha1 || hashes?.sha512 || url;

    try {
      const checkRes = await fetch(`/api/fomo/registry?projectId=${encodeURIComponent(mod.projectId)}&versionId=${encodeURIComponent(versionId)}&projectName=${encodeURIComponent(projectName || '')}&fileName=${encodeURIComponent(safeFilename)}`);
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        if (checkData.exists) {
          showStatus(`Ya está descargado en tu entorno`, "success");
          return;
        }
      }
    } catch (e) {
      console.error("Error checking registry", e);
    }
    
    setDownloading(prev => ({ ...prev, [mod.projectId]: true }));
    showStatus(`Descargando ${mod.title}...`, "info");
    
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
          projectType: projectTypeOverride || mod.projectType || (mod as any).project_type || "mod"
        })
      });

      if (res.ok) {
        const resData = await res.json();

        // El archivo fue encontrado por la aduana en el sistema
        if (resData.skipped) {
          if (resData.reason === "already_installed_minecraft") {
            // Ya está instalado en .minecraft (MIMu)
            showStatus(`${mod.title} ya está instalado en Minecraft`, "success");
          } else {
            // already_in_downloads: ya estaba en Downloads, el watcher lo reasignó al proyecto activo
            showStatus(`${mod.title} reasignado al proyecto activo`, "success");
          }
        } else {
          showStatus(`${mod.title} descargado`, "success");
        }

        eventBus.emit("fomo:mod-downloaded", { modId: mod.projectId, fileName: filename, source: mod._source as any });

        try {
          fetch("/api/fomo/registry", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ projectId: mod.projectId, versionId, projectName })
          }).catch(e => console.error("Error saving registry", e));
        } catch (e) {
          console.error("Error saving registry block", e);
        }
        
        // Guardar en el historial de descargas (archivo físico en disco)
        try {
          fetch("/api/fomo/download-history", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectId: mod.projectId,
              title: mod.title,
              author: mod.author,
              iconUrl: mod.iconUrl,
              categories: mod.categories || [],
              _source: mod._source,
              url: mod.url,
              projectType: projectTypeOverride || mod.projectType || (mod as any).project_type || "mod",
              fileName: safeFilename,
              loader: loader,
              gameVersion: gameVersions[0]
            })
          }).catch(e => console.error("Error calling download history API", e));
        } catch (e) {
          console.error("Error in history fetch block", e);
        }
      } else {
        showStatus("Error en descarga", "error");
      }
    } catch {
      showStatus("Error crítico", "error");
    } finally {
      setDownloading(prev => ({ ...prev, [mod.projectId]: false }));
    }
  }, [showStatus, loader, gameVersions, projectName]);

  const handleDownloadDependency = useCallback(async (dep: any) => {
    showStatus(`Descargando dependencia ${dep.title || dep.projectId}`, "info");
  }, [showStatus]);

  return { downloading, dependencyPrompt, setDependencyPrompt, executeDownload, handleDownloadDependency };
}
