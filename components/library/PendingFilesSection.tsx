"use client";

import React, { useState } from "react";
import { Inbox, FolderOpen, Loader2, X, Info } from "lucide-react";
import { SectionHeading } from "../ui/SectionHeading";
import { SkeletonLoader } from "../ui/SkeletonLoader";
import { EmptyState } from "../ui/EmptyState";
import { ConfirmModal } from "../ui/ConfirmModal";
import { ModCard } from "./ModCard";
import { PendingIncompatibleGroup } from "./parts/PendingIncompatibleGroup";
import { usePendingFiles } from "@/hooks/library/usePendingFiles";

/**
 * PendingFilesSection — Gestiona los archivos detectados en la carpeta de Descargas.
 * Clasifica los archivos en compatibles e incompatibles y permite su eliminación o selección para clasificación.
 */
export function PendingFilesSection({
  pendingFiles, loading, selectedFiles, setSelectedFiles, activeProject, onDeleteFile, layout = "sidebar", modrinthStatus = {}, onCloseSidebar
}: any) {
  
  const [openingFolder, setOpeningFolder] = useState(false);
  const { compatibleFiles, incompatibleFiles, conflicts, deletingFiles, filesToDelete, setFilesToDelete, setDeletingFiles } = usePendingFiles(pendingFiles, activeProject, onDeleteFile);

  const handleOpenDownloadsFolder = async () => {
    setOpeningFolder(true);
    try {
      await fetch("/api/open-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderPath: pendingFiles.length > 0 ? pendingFiles[0].path.substring(0, pendingFiles[0].path.lastIndexOf('\\')) : "" }),
      });
    } finally { setOpeningFolder(false); }
  };

  const handleConfirmDelete = async () => {
    if (filesToDelete.length === 0 || !onDeleteFile) return;
    const paths = filesToDelete.map((f: any) => f.path);
    paths.forEach((p: string) => setDeletingFiles((prev: any) => ({ ...prev, [p]: true })));
    try {
      for (const file of filesToDelete) await onDeleteFile(file);
      setSelectedFiles((prev: any) => prev.filter((s: any) => !paths.includes(s.path)));
    } finally {
      paths.forEach((p: string) => setDeletingFiles((prev: any) => ({ ...prev, [p]: false })));
      setFilesToDelete([]);
    }
  };

  return (
    <section className="animate-fade-up">
      <div className="flex items-start justify-between gap-4 mb-4">
        <SectionHeading icon={<Inbox className="w-4 h-4" />} title="Descargas" sub="Detectados en Descargas" badge={pendingFiles.length} accentColor="var(--color-primary)" />
        <div className="flex items-center gap-1.5 mt-1">
          {layout !== "main" && (
            <button onClick={handleOpenDownloadsFolder} disabled={openingFolder} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-label text-[10px] uppercase font-bold border border-white/10 bg-white/5 hover:bg-white/10 transition-all">
              {openingFolder ? <Loader2 className="w-3 h-3 animate-spin" /> : <FolderOpen className="w-3 h-3" />} Carpeta
            </button>
          )}
          {onCloseSidebar && <button onClick={onCloseSidebar} className="p-1.5 rounded-xl border border-white/10 bg-white/5 text-foreground/50 hover:text-white"><X className="w-3.5 h-3.5" /></button>}
        </div>
      </div>

      <div className={layout === "main" ? "space-y-2.5 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar" : "space-y-2.5"}>
        {loading ? (
          <div className="space-y-3"><SkeletonLoader message="Buscando archivos..." /><SkeletonLoader message="Analizando metadatos..." /></div>
        ) : pendingFiles.length === 0 ? (
          <EmptyState message="Monitoreando Descargas..." />
        ) : (
          <>
            {compatibleFiles.length === 0 && incompatibleFiles.length > 0 ? (
              <div className="p-6 text-center border border-dashed border-white/10 rounded-2xl bg-white/5">
                <Info className="w-5 h-5 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-bold opacity-60">No hay descargas compatibles</p>
              </div>
            ) : (
              compatibleFiles.filter(f => !selectedFiles.some((s: any) => s.path === f.path)).map((f, i) => (
                <ModCard
                  key={f.path} index={i}
                  name={(() => {
                    const raw = f.meta?.modName;
                    if (raw && raw !== "unknown") return raw;
                    return f.fileName.replace(/\.(jar|zip|mrpack)$/i, "").replace(/[-_]/g, " ").replace(/\s+v?\d[\d.]*[\w.-]*$/i, "").replace(/\s+/g, " ").trim() || f.fileName;
                  })()}
                  version={f.meta?.gameVersion && f.meta.gameVersion !== "unknown" ? f.meta.gameVersion : modrinthStatus[f.path]?.gameVersions?.[0] || "unknown"}
                  modVersion={f.meta?.modVersion}
                  iconBase64={f.meta?.iconBase64 || modrinthStatus[f.path]?.iconUrl}
                  loader={f.meta?.loader && f.meta.loader !== "unknown" ? f.meta.loader : modrinthStatus[f.path]?.loaders?.[0] || "unknown"}
                  projectType={f.meta?.projectType}
                  isSelected={selectedFiles.some((p: any) => p.path === f.path)} 
                  onClick={() => setSelectedFiles((prev: any) => prev.find((p: any) => p.path === f.path) ? prev.filter((p: any) => p.path !== f.path) : [...prev, f])}
                  activeVersion={activeProject?.version} activeLoader={activeProject?.loader} isPending={true}
                  onDelete={() => setFilesToDelete([f])} isDeleting={deletingFiles[f.path]} conflict={conflicts[f.path]}
                  confidence={f.meta?.confidence} warnings={f.meta?.warnings}
                />
              ))
            )}
            <PendingIncompatibleGroup 
              files={incompatibleFiles} activeProject={activeProject} modrinthStatus={modrinthStatus}
              conflicts={conflicts} onDeleteRequest={(f: any) => setFilesToDelete([f])} deletingFiles={deletingFiles}
              onSelect={(f: any) => setSelectedFiles((prev: any) => prev.find((p: any) => p.path === f.path) ? prev.filter((p: any) => p.path !== f.path) : [...prev, f])}
              selectedFiles={selectedFiles}
            />
          </>
        )}
      </div>

      <ConfirmModal
        isOpen={filesToDelete.length > 0} onClose={() => setFilesToDelete([])} onConfirm={handleConfirmDelete}
        title={filesToDelete.length > 1 ? "¿Eliminar archivos?" : "¿Eliminar archivo?"}
        message={`¿Estás seguro de que querés eliminar ${filesToDelete.length > 1 ? "los archivos seleccionados" : `"${filesToDelete[0]?.fileName}"`}?`}
        confirmLabel="Eliminar" type="danger"
      />
    </section>
  );
}
