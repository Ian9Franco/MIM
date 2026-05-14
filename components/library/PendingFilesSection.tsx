import React, { useState } from "react";
import { Inbox, FolderOpen, Loader2, Trash2, X, AlertTriangle, ChevronDown, ChevronUp, Info } from "lucide-react";
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
  modrinthStatus?: Record<string, any>;
  onCloseSidebar?: () => void;
}

export function PendingFilesSection({
  pendingFiles,
  loading,
  selectedFiles,
  setSelectedFiles,
  activeProject,
  onDeleteFile,
  layout = "sidebar",
  modrinthStatus = {},
  onCloseSidebar
}: PendingFilesSectionProps) {
  const [openingFolder, setOpeningFolder] = useState(false);
  const [deletingFiles, setDeletingFiles] = useState<Record<string, boolean>>({});
  const [filesToDelete, setFilesToDelete] = useState<PendingFile[]>([]);
  const [showIncompatible, setShowIncompatible] = useState(false);

  // ── Compatibility Check Helper ──────────────────────────────────────────────
  const checkCompatibility = React.useCallback((f: PendingFile, activeVersion: string, activeLoader: string) => {
    if (!activeVersion || !activeLoader) return true;

    const version = f.meta?.gameVersion ?? "unknown";
    const loader = f.meta?.loader ?? "unknown";

    let isCompatibleRange = false;
    if (!version || version === "unknown") {
      isCompatibleRange = true;
    } else if (version === activeVersion) {
      isCompatibleRange = true;
    } else if (version.endsWith("+")) {
      isCompatibleRange = activeVersion.startsWith(version.slice(0, -1));
    } else if (activeVersion.startsWith(version + ".")) {
      isCompatibleRange = true;
    } else if (version.includes(" - ")) {
      const [start, end] = version.split(" - ");
      isCompatibleRange = activeVersion.startsWith(start) || activeVersion.startsWith(end);
    }

    const isVersionError = version !== "unknown" && version !== activeVersion && !isCompatibleRange;

    let isLoaderError = false;
    if (loader !== "unknown" && loader !== activeLoader) {
      isLoaderError = true;
      if (activeVersion === "1.20.1" || activeVersion === "1.20") {
        const l = loader.toLowerCase();
        const al = activeLoader.toLowerCase();
        const forgeFamily = ["forge", "neoforge"];
        const fabricFamily = ["fabric", "quilt"];
        
        if (forgeFamily.includes(l) && forgeFamily.includes(al)) {
          isLoaderError = false;
        } else if (fabricFamily.includes(l) && forgeFamily.includes(al)) {
          // Allow Fabric/Quilt mods in Forge projects for Sinytra Connector
          isLoaderError = false;
        }
      }
    }

    return !(isVersionError || isLoaderError);
  }, []);

  const { compatibleFiles, incompatibleFiles } = React.useMemo(() => {
    const comp: PendingFile[] = [];
    const incomp: PendingFile[] = [];

    const activeVer = activeProject?.version ?? "";
    const activeLd = activeProject?.loader ?? "";

    pendingFiles.forEach(f => {
      if (checkCompatibility(f, activeVer, activeLd)) {
        comp.push(f);
      } else {
        incomp.push(f);
      }
    });

    return { compatibleFiles: comp, incompatibleFiles: incomp };
  }, [pendingFiles, activeProject, checkCompatibility]);

  // ── Conflict Detection Logic ───────────────────────────────────────────────
  const conflicts = React.useMemo(() => {
    const map: Record<string, string> = {};
    const modIdToPaths: Record<string, string[]> = {};

    const SYSTEM_IDS = ["minecraft", "forge", "neoforge", "fabric", "quilt", "java", "fabricloader", "quiltloader", "loader"];
    // 1. Group by modId to find duplicates (including provided aliases/stubs)
    pendingFiles.forEach(f => {
      const allIds = Array.from(new Set([
        f.meta?.modId,
        ...(f.meta?.providedIds || [])
      ])).filter(id => id && id !== "unknown" && !SYSTEM_IDS.includes(id.toLowerCase())) as string[];

      allIds.forEach(id => {
        const key = `${id.toLowerCase()}-${f.meta?.gameVersion || "unknown"}-${f.meta?.loader || "unknown"}`;
        if (!modIdToPaths[key]) modIdToPaths[key] = [];
        if (!modIdToPaths[key].includes(f.path)) {
          modIdToPaths[key].push(f.path);
        }
      });
    });

    Object.entries(modIdToPaths).forEach(([mid, paths]) => {
      if (paths.length > 1) {
        paths.forEach(p => {
          map[p] = "Duplicado";
        });
      }
    });

    // 2. Check for explicit conflicts/breaks
    pendingFiles.forEach(f => {
      const allConflictIds = [
        ...(f.meta?.conflicts || []),
        ...(f.meta?.breaks || [])
      ];

      if (allConflictIds.length > 0) {
        pendingFiles.forEach(other => {
          if (f.path === other.path) return;
          const otherId = other.meta?.modId;
          if (otherId && allConflictIds.includes(otherId)) {
            const otherName = other.meta?.modName || otherId;
            map[f.path] = `Conflicto con ${otherName}`;
            map[other.path] = `Conflicto con ${f.meta?.modName || f.meta?.modId || f.fileName}`;
          }
        });
      }
    });

    return map;
  }, [pendingFiles]);

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
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex-1 min-w-0">
          <SectionHeading
            icon={<Inbox className="w-4 h-4" />}
            title="Descargas pendientes"
            sub="Archivos detectados en tu carpeta de Descargas"
            badge={pendingFiles.length}
            accentColor="var(--color-primary)"
          />
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleOpenDownloadsFolder}
            disabled={openingFolder}
            className="flex items-center gap-1.5 px-3 py-1.5 mt-1 rounded-xl font-label text-sm transition-all animate-fade-in disabled:opacity-50 shrink-0"
            style={{ 
              background: "var(--fomo-pill-inactive-bg, rgba(255,255,255,0.05))", 
              border: "1px solid var(--fomo-pill-inactive-border, rgba(255,255,255,0.1))", 
              color: "var(--color-foreground)", 
              fontSize: "0.65rem" 
            }}
            title="Abrir carpeta de origen (Descargas)"
          >
            {openingFolder ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderOpen className="w-3.5 h-3.5" />}
            Carpeta
          </button>
          {onCloseSidebar && (
            <button
              onClick={onCloseSidebar}
              className="flex items-center justify-center w-7 h-7 mt-1 rounded-xl transition-all hover:bg-white/10 hover:scale-105 active:scale-95 shrink-0 border border-white/10 bg-white/5 text-foreground/50 hover:text-foreground"
              title="Ocultar descargas"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      <div 
        className={layout === "main" ? "space-y-2.5 max-h-[590px] overflow-y-auto pr-2 custom-scrollbar p-1 snap-y snap-mandatory scroll-pt-1 scroll-pb-1" : "space-y-2.5"}
        style={layout === "main" ? {
          WebkitMaskImage: "linear-gradient(to bottom, transparent, black 3px, black calc(100% - 3px), transparent)",
          maskImage: "linear-gradient(to bottom, transparent, black 3px, black calc(100% - 3px), transparent)",
        } : {}}
      >
        {loading ? (
          <div className="space-y-3">
            <SkeletonLoader message="Buscando archivos..." />
            <SkeletonLoader message="Analizando metadatos..." />
          </div>
        ) : pendingFiles.length === 0 ? (
          <EmptyState message="Monitoreando Descargas... Descargá un .jar para verlo aquí" />
        ) : (
          <>
            {/* 1. COMPATIBLE FILES SECTION */}
            {compatibleFiles.length === 0 && incompatibleFiles.length > 0 ? (
              <div 
                className="flex flex-col items-center justify-center p-6 text-center border rounded-2xl animate-fade-in"
                style={{ 
                  background: "var(--fomo-input-bg, rgba(255,255,255,0.02))", 
                  borderColor: "var(--fomo-input-border, rgba(255,255,255,0.05))" 
                }}
              >
                <Info className="w-5 h-5 mb-2" style={{ color: "var(--color-foreground-muted)" }} />
                <p className="text-xs font-semibold" style={{ color: "var(--color-foreground)" }}>No hay descargas compatibles</p>
                <p className="text-[10px] mt-1 max-w-[200px]" style={{ color: "var(--color-foreground-muted)" }}>
                  Los mods descargados pertenecen a otros proyectos o versiones. Se agruparon abajo.
                </p>
              </div>
            ) : (
              compatibleFiles
                .filter(f => !selectedFiles.some(s => s.path === f.path))
                .map((f, i) => {
                  const displayName = (f.meta?.modName && f.meta.modName !== "unknown") ? f.meta.modName : f.fileName;
                  return (
                    <ModCard
                      key={f.path}
                      index={i}
                      name={displayName}
                      version={f.meta?.gameVersion ?? "unknown"}
                      modVersion={f.meta?.modVersion}
                      projectType={f.meta?.projectType}
                      iconBase64={f.meta?.iconBase64 || modrinthStatus[f.path]?.iconUrl}
                      loader={f.meta?.loader ?? "unknown"}
                      isSelected={false}
                      onClick={() => setSelectedFiles((prev) => [...prev, f])}
                      activeVersion={activeProject?.version ?? ""}
                      activeLoader={activeProject?.loader ?? ""}
                      isPending={true}
                      onDelete={onDeleteFile ? () => handleDeleteRequest(f) : undefined}
                      isDeleting={deletingFiles[f.path]}
                      categories={modrinthStatus[f.path]?.categories || f.meta?.categories}
                      conflict={conflicts[f.path]}
                    />
                  );
                })
            )}

            {/* 2. INCOMPATIBLE / OTHER PROJECTS FILES SECTION */}
            {incompatibleFiles.length > 0 && (
              <div className="mt-4 pt-3" style={{ borderTop: "1px dashed var(--fomo-border, rgba(255,255,255,0.1))" }}>
                <button
                  onClick={() => setShowIncompatible(!showIncompatible)}
                  className="flex items-center justify-between w-full px-3 py-2 rounded-xl text-foreground transition-all duration-200 text-xs font-semibold"
                  style={{ 
                    background: "var(--fomo-pill-inactive-bg, rgba(255,255,255,0.03))", 
                    border: "1px solid var(--fomo-pill-inactive-border, rgba(255,255,255,0.06))" 
                  }}
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-yellow-500/80 shrink-0" />
                    <span>Incompatibles / Otros proyectos</span>
                    <span 
                      className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                      style={{ 
                        background: "var(--fomo-pill-inactive-bg, rgba(255,255,255,0.08))", 
                        color: "var(--color-muted, rgba(255,255,255,0.6))" 
                      }}
                    >
                      {incompatibleFiles.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {showIncompatible ? <ChevronUp className="w-3 h-3 text-foreground/40" /> : <ChevronDown className="w-3 h-3 text-foreground/40" />}
                  </div>
                </button>
                
                {showIncompatible && (
                  <div className="mt-2.5 space-y-2.5 animate-fade-down duration-200">
                    {incompatibleFiles
                      .filter(f => !selectedFiles.some(s => s.path === f.path))
                      .map((f, i) => {
                        const displayName = (f.meta?.modName && f.meta.modName !== "unknown") ? f.meta.modName : f.fileName;
                        return (
                          <div key={f.path} className="opacity-70 hover:opacity-100 transition-opacity">
                            <ModCard
                              index={i + compatibleFiles.length}
                              name={displayName}
                              version={f.meta?.gameVersion ?? "unknown"}
                              modVersion={f.meta?.modVersion}
                              projectType={f.meta?.projectType}
                              iconBase64={f.meta?.iconBase64 || modrinthStatus[f.path]?.iconUrl}
                              loader={f.meta?.loader ?? "unknown"}
                              isSelected={false}
                              onClick={() => setSelectedFiles((prev) => [...prev, f])}
                              activeVersion={activeProject?.version ?? ""}
                              activeLoader={activeProject?.loader ?? ""}
                              isPending={true}
                              onDelete={onDeleteFile ? () => handleDeleteRequest(f) : undefined}
                              isDeleting={deletingFiles[f.path]}
                              categories={modrinthStatus[f.path]?.categories || f.meta?.categories}
                              conflict={conflicts[f.path]}
                            />
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}
          </>
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
