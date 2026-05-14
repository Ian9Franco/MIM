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
    const modHit = {
      projectId: s?.projectId || f.meta?.modId || "",
      slug: s?.slug || f.meta?.modId || f.fileName,
      title: s?.title || f.meta?.modName || f.fileName,
      iconUrl: s?.iconUrl || f.meta?.iconBase64 || null,
      author: s?.author || f.meta?.author || "Unknown",
      categories: s?.categories || f.meta?.categories || [],
      projectType: f.meta?.projectType || "mod",
      url: s?.slug ? `https://modrinth.com/mod/${s.slug}` : `https://modrinth.com/mod/${f.meta?.modId || ""}`,
      _source: "modrinth",
      body: s?.description || ""
    };
    window.dispatchEvent(new CustomEvent("fomo-open-details", { detail: modHit }));
    window.dispatchEvent(new CustomEvent("fomo-details-toggle", { detail: { open: true } }));
  }, [modrinthStatus]);

  return { getBadge, onOpenDetails };
}
