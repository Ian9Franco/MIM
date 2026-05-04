import React from "react";
import { Inbox } from "lucide-react";
import { SectionHeading } from "./SectionHeading";
import { SkeletonLoader } from "./SkeletonLoader";
import { EmptyState } from "./EmptyState";
import { ModCard } from "./ModCard";
import type { PendingFile, Project } from "@/lib/types";

interface PendingFilesSectionProps {
  pendingFiles: PendingFile[];
  loading: boolean;
  selectedFiles: PendingFile[];
  setSelectedFiles: React.Dispatch<React.SetStateAction<PendingFile[]>>;
  activeProject: Project | null;
}

export function PendingFilesSection({
  pendingFiles,
  loading,
  selectedFiles,
  setSelectedFiles,
  activeProject
}: PendingFilesSectionProps) {
  return (
    <section className="animate-fade-up stagger-2">
      <SectionHeading
        icon={<Inbox className="w-4 h-4" />}
        title="Ingresos Pendientes"
        sub="Archivos detectados en tu carpeta de Descargas"
        badge={pendingFiles.length}
        accentColor="var(--color-primary)"
      />
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
              />
            );
          })
        )}
      </div>
    </section>
  );
}
