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
}

export function PendingFilesSection({
  pendingFiles,
  loading,
  selectedFiles,
  setSelectedFiles,
  activeProject,
  onDeleteFile
}: PendingFilesSectionProps) {
  const [openingFolder, setOpeningFolder] = useState(false);
  const [deletingFiles, setDeletingFiles] = useState<Record<string, boolean>>({});
  const [fileToDelete, setFileToDelete] = useState<PendingFile | null>(null);

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
    setFileToDelete(file);
  };

  const handleConfirmDelete = async () => {
    if (!fileToDelete || !onDeleteFile) return;
    setDeletingFiles(prev => ({ ...prev, [fileToDelete.path]: true }));
    try {
      await onDeleteFile(fileToDelete);
    } catch (e) {
      console.error("Error deleting file:", e);
    } finally {
      setDeletingFiles(prev => ({ ...prev, [fileToDelete.path]: false }));
      setFileToDelete(null);
    }
  };

  return (
    <section className="animate-fade-up stagger-2">
      <div className="flex items-start justify-between mb-2">
        <SectionHeading
          icon={<Inbox className="w-4 h-4" />}
          title="Ingresos Pendientes"
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
      <div className="space-y-2">
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
        isOpen={!!fileToDelete}
        onClose={() => setFileToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="¿Eliminar archivo?"
        message={fileToDelete ? `¿Estás seguro de que querés eliminar "${fileToDelete.fileName}"? Esta acción no se puede deshacer.` : ""}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        type="danger"
      />
    </section>
  );
}
