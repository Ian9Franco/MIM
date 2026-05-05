import React, { useState } from "react";
import { Inbox, FolderOpen, Loader2, Trash2 } from "lucide-react";
import { SectionHeading } from "../ui/SectionHeading";
import { SkeletonLoader } from "../ui/SkeletonLoader";
import { EmptyState } from "../ui/EmptyState";
import { ConfirmModal } from "../ui/ConfirmModal";
import { ModCard } from "./ModCard";
import type { PendingFile, Project } from "@/lib/types";

interface PendingFilesSectionProps {
  pendingFiles: PendingFile[];
  loading: boolean;
  selectedFiles: PendingFile[];
  setSelectedFiles: React.Dispatch<React.SetStateAction<PendingFile[]>>;
  activeProject: Project | null;
  onDeleteFile?: (file: PendingFile) => Promise<void>;
  layout?: "sidebar" | "main";
}

export function PendingFilesSection({
  pendingFiles,
  loading,
  selectedFiles,
  setSelectedFiles,
  activeProject,
  onDeleteFile,
  layout = "sidebar"
}: PendingFilesSectionProps) {
  const [openingFolder, setOpeningFolder] = useState(false);
  const [deletingFiles, setDeletingFiles] = useState<Record<string, boolean>>({});
  const [filesToDelete, setFilesToDelete] = useState<PendingFile[]>([]);

  const handleOpenDownloadsFolder = async () => {
    setOpeningFolder(true);
    try {
      await fetch("/api/open-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderPath: pendingFiles.length > 0 ? pendingFiles[0].path.substring(0, pendingFiles[0].path.lastIndexOf('\\')) : "downloads" }),
      });
    } catch (e) {
      console.error(e);
    }
    setOpeningFolder(false);
  };

  const handleDeleteRequest = (file: PendingFile) => {
    const isSelected = selectedFiles.some(s => s.path === file.path);
    if (isSelected && selectedFiles.length > 1) {
      setFilesToDelete(selectedFiles);
    } else {
      setFilesToDelete([file]);
    }
  };

  const handleConfirmDelete = async () => {
    if (filesToDelete.length === 0 || !onDeleteFile) return;
    const paths = filesToDelete.map(f => f.path);
    setDeletingFiles(prev => {
      const next = { ...prev };
      paths.forEach(p => { next[p] = true; });
      return next;
    });

    try {
      for (const file of filesToDelete) {
        await onDeleteFile(file);
      }
      setSelectedFiles(prev => prev.filter(s => !paths.includes(s.path)));
    } catch (e) {
      console.error("Error deleting files:", e);
    } finally {
      setDeletingFiles(prev => {
        const next = { ...prev };
        paths.forEach(p => { next[p] = false; });
        return next;
      });
      setFilesToDelete([]);
    }
  };

  return (
    <section className="animate-fade-up stagger-2">
      <div className="flex items-start justify-between mb-2">
        <SectionHeading
          icon={<Inbox className="w-4 h-4" />}
          title="Descargas pendientes"
          sub="Archivos detectados en tu carpeta de Descargas"
          badge={pendingFiles.length}
          accentColor="var(--color-primary)"
        />
        <button
          onClick={handleOpenDownloadsFolder}
          disabled={openingFolder}
          className="flex items-center gap-1.5 px-3 py-1.5 mt-1 rounded-xl font-label text-sm transition-all animate-fade-in disabled:opacity-50"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--color-foreground)", fontSize: "0.65rem" }}
          title="Abrir carpeta de origen (Descargas)"
        >
          {openingFolder ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderOpen className="w-3.5 h-3.5" />}
          Carpeta
        </button>
      </div>
      <div className={layout === "main" ? "space-y-2.5 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar p-1" : "space-y-2.5"}>
        {loading ? (
          <SkeletonLoader />
        ) : pendingFiles.length === 0 ? (
          <EmptyState message="Monitoreando Descargas... Descargá un .jar para verlo aquí" />
        ) : (
          pendingFiles.map((f, i) => {
            const isSelected = selectedFiles.some((s) => s.path === f.path);
            const displayName = (f.meta?.modName && f.meta.modName !== "unknown") ? f.meta.modName : f.fileName;
            return (
              <ModCard
                key={f.path}
                index={i}
                name={displayName}
                version={f.meta?.gameVersion ?? "unknown"}
                modVersion={f.meta?.modVersion}
                projectType={f.meta?.projectType}
                iconBase64={f.meta?.iconBase64}
                loader={f.meta?.loader ?? "unknown"}
                isSelected={isSelected}
                onClick={() => setSelectedFiles((prev) =>
                  isSelected ? prev.filter((s) => s.path !== f.path) : [...prev, f]
                )}
                activeVersion={activeProject?.version ?? ""}
                activeLoader={activeProject?.loader ?? ""}
                isPending={true}
                onDelete={onDeleteFile ? () => handleDeleteRequest(f) : undefined}
                isDeleting={deletingFiles[f.path]}
              />
            );
          })
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={filesToDelete.length > 0}
        onClose={() => setFilesToDelete([])}
        onConfirm={handleConfirmDelete}
        title={filesToDelete.length > 1 ? "¿Eliminar archivos seleccionados?" : "¿Eliminar archivo?"}
        message={
          filesToDelete.length > 1
            ? `¿Estás seguro de que querés eliminar los ${filesToDelete.length} archivos seleccionados? Esta acción no se puede deshacer.`
            : filesToDelete.length === 1
            ? `¿Estás seguro de que querés eliminar "${filesToDelete[0].fileName}"? Esta acción no se puede deshacer.`
            : ""
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        type="danger"
      />
    </section>
  );
}
