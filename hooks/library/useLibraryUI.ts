import { useCallback, useMemo } from "react";
import { LibraryFile } from "@/lib/types";

export function useLibraryUI(modrinthStatus: any, ignoredUpdates: Set<string>, handleDownloadUpdate: any) {
  const getBadge = useCallback((f: LibraryFile) => {
    const s = modrinthStatus[f.path];
    if (!s) return {};
    if (s.status === "update_available" && !ignoredUpdates.has(f.path)) return {
      badgeText: "↑ " + s.latestVersion,
      badgeColor: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
      onDownload: () => handleDownloadUpdate(f.path, s.downloadUrl, f.fileName.replace(f.meta?.modVersion ?? "", s.latestVersion)),
    };
    if (s.status === "updated" || s.status === "updated_downloaded") return {
      badgeText: s.status === "updated" ? "Al día" : "Descargado",
      badgeColor: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
    };
    return { badgeText: "No encontrado", badgeColor: "bg-white/5 text-foreground/40" };
  }, [modrinthStatus, ignoredUpdates, handleDownloadUpdate]);

  const onOpenDetails = useCallback((f: LibraryFile) => {
    const s = modrinthStatus[f.path];
    const isResourcePack = f.meta?.projectType === "resourcepack" || f.fileName.endsWith(".zip");
    const hasRealId = f.meta?.modId && f.meta.modId !== "unknown" && !f.meta.modId.endsWith(".zip");

    if (!hasRealId || isResourcePack) {
      const baseName = f.meta?.modName && f.meta.modName !== "unknown" ? f.meta.modName : f.fileName;
      const query = baseName.replace(/\.(zip|jar)$/i, "").replace(/[_\-][vV]?\d+[\.\d]*.*$/, "");
      
      // Intentamos buscar el proyecto en Modrinth para abrirlo directamente
      fetch(`/api/modrinth/discover?query=${encodeURIComponent(query)}&projectType=resourcepack&page=1`)
        .then(r => r.json())
        .then(data => {
          const hits = data.hits || [];
          if (hits.length > 0) {
            const hit = hits[0];
            const modHit = {
              projectId: hit.project_id || hit.projectId,
              slug: hit.slug,
              title: hit.title,
              iconUrl: hit.icon_url || hit.iconUrl,
              author: hit.author,
              categories: hit.categories,
              projectType: "resourcepack",
              _source: "modrinth",
            };
            window.dispatchEvent(new CustomEvent("fomo-toggle", { detail: true }));
            setTimeout(() => window.dispatchEvent(new CustomEvent("fomo-open-details", { detail: modHit })), 400);
          } else {
            // Si no encuentra nada, fallback al buscador con el nombre limpio
            window.dispatchEvent(new CustomEvent("fomo-toggle", { detail: true }));
            window.dispatchEvent(new CustomEvent("fomo-search-and-open", { detail: { query } }));
          }
        })
        .catch(() => {
          // Fallback al buscador
          window.dispatchEvent(new CustomEvent("fomo-toggle", { detail: true }));
          window.dispatchEvent(new CustomEvent("fomo-search-and-open", { detail: { query } }));
        });
    } else {
      const modHit = {
        projectId: s?.projectId || f.meta?.modId || "",
        slug: s?.slug || f.meta?.modId || f.fileName,
        title: s?.title || f.meta?.modName || f.fileName,
        iconUrl: s?.iconUrl || f.meta?.iconBase64 || null,
        author: s?.author || f.meta?.author || "Unknown",
        categories: s?.categories || f.meta?.categories || [],
        projectType: f.meta?.projectType || "mod",
        url: s?.slug ? `https://modrinth.com/mod/${s.slug}` : `https://modrinth.com/mod/${f.meta?.modId || ""}`,
        _source: (f.meta as any)?.source || "modrinth",
        body: s?.description || ""
      };
      window.dispatchEvent(new CustomEvent("fomo-toggle", { detail: true }));
      setTimeout(() => window.dispatchEvent(new CustomEvent("fomo-open-details", { detail: modHit })), 400);
    }
  }, [modrinthStatus]);

  return { getBadge, onOpenDetails };
}
