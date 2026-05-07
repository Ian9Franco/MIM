import React, { useState, useEffect, useRef } from "react";
import { Layers, Loader2, BookOpen, RefreshCw, Bell, FolderOpen, ArrowLeftRight, Cpu } from "lucide-react";
import { ModCard } from "@/components/library/ModCard";
import { VirtualizedLibrary } from "@/components/library/VirtualizedLibrary";
import { SkeletonLoader } from "@/components/ui/SkeletonLoader";
import { EmptyState } from "@/components/ui/EmptyState";
import { TransferModal } from "./TransferModal";
import type { LibraryFile, Project } from "@/lib/types";

interface LibrarySectionProps {
  library: LibraryFile[];
  loadingLibrary: boolean;
  selectedLibFiles: LibraryFile[];
  setSelectedLibFiles: React.Dispatch<React.SetStateAction<LibraryFile[]>>;
  activeProject: Project | null;
  projects?: Project[];
  downloadingMods: Record<string, boolean>;
  modrinthStatus: Record<string, any>;
  ignoredUpdates: Set<string>;
  conflicts: any[];
  sidebarOpen: boolean;
  setSidebarOpen: (b: boolean) => void;
  checkingUpdates: boolean;
  handleCheckUpdates: () => void;
  handleViewDescription: () => void;
  loadingDescription: boolean;
  handleSyncAllDescriptions: () => void;
  syncingDescriptions: boolean;
  handleUnclassify: () => void;
  handleDownloadUpdate: (path: string, url: string, filename: string) => void;
  autoClassify: boolean;
  setAutoClassify: (b: boolean) => void;
}

export function LibrarySection({
  library,
  loadingLibrary,
  selectedLibFiles,
  setSelectedLibFiles,
  activeProject,
  projects = [],
  downloadingMods,
  modrinthStatus,
  ignoredUpdates,
  conflicts,
  sidebarOpen,
  setSidebarOpen,
  checkingUpdates,
  handleCheckUpdates,
  handleViewDescription,
  loadingDescription,
  handleSyncAllDescriptions,
  syncingDescriptions,
  handleUnclassify,
  handleDownloadUpdate,
  autoClassify,
  setAutoClassify
}: LibrarySectionProps) {
  const [transferOpen, setTransferOpen] = useState(false);
  const [shouldShake, setShouldShake] = useState(false);
  const prevAlertCount = useRef(0);

  // Detectar nuevas alertas para sacudir la campana
  useEffect(() => {
    const updateCount = Object.values(modrinthStatus).filter(s => s.status === "update_available" && !ignoredUpdates.has(s.path)).length;
    const currentCount = conflicts.length + updateCount;

    if (currentCount > prevAlertCount.current) {
      setShouldShake(true);
      const timer = setTimeout(() => setShouldShake(false), 600);
      return () => clearTimeout(timer);
    }
    prevAlertCount.current = currentCount;
  }, [conflicts.length, modrinthStatus, ignoredUpdates]);

  const transferCandidates = activeProject
    ? projects.filter((p) => p.id !== activeProject.id && p.version === activeProject.version)
    : [];

  // We now always have at least the "__global__" source available
  const hasCandidates = true;

  function getBadge(f: LibraryFile) {
    const s = modrinthStatus[f.path];
    if (!s) return {};
    if (s.status === "update_available" && !ignoredUpdates.has(f.path)) return {
      badgeText: "↑ " + s.latestVersion,
      badgeColor: "bg-[rgba(250,204,21,0.15)] text-[#facc15] border border-[rgba(250,204,21,0.3)]",
      onDownload: () => handleDownloadUpdate(f.path, s.downloadUrl, f.fileName.replace(f.meta?.modVersion ?? "", s.latestVersion)),
    };
    if (s.status === "updated") return { badgeText: "Al día", badgeColor: "bg-[rgba(102,200,160,0.15)] text-[#66C8A0] border border-[rgba(102,200,160,0.25)]" };
    if (s.status === "updated_downloaded") return { badgeText: "Descargado", badgeColor: "bg-[rgba(102,200,160,0.15)] text-[#66C8A0] border border-[rgba(102,200,160,0.25)]" };
    return { badgeText: "No encontrado", badgeColor: "bg-white/8 text-foreground/40" };
  }

  const [openingFolder, setOpeningFolder] = useState(false);

  const handleOpenLibraryFolder = async () => {
    if (!activeProject) return;
    setOpeningFolder(true);
    try {
      // Path based on constants logic (approximated here via API to be safe)
      // Actually we need to send the path or let the API deduce it.
      // But we can just send the path of the first mod in the library if exists,
      // or the base library path. The backend doesn't know activeProject's SOURCE_BASE unless we tell it.
      // Let's send a generic request to open the active project's mods folder.
      await fetch("/api/open-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // If library has files, use the directory of the first file. Otherwise just open the downloads.
        body: JSON.stringify({ folderPath: library.length > 0 ? library[0].path.substring(0, library[0].path.lastIndexOf('\\')) : "" }),
      });
    } catch (e) {
      console.error(e);
    }
    setOpeningFolder(false);
  };

  return (
    <section className="animate-fade-up relative" style={{ animationDelay: "0.18s" }}>
      {/* Library header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(102,200,160,0.1)", border: "1px solid rgba(102,200,160,0.2)", color: "#66C8A0" }}
          >
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-headline text-base leading-none" style={{ color: "var(--color-foreground)" }}>
              Librería de Source
            </h2>
            <p className="font-caption mt-0.5" style={{ color: "var(--color-muted)" }}>
              {library.length > 0 ? `${library.length} mods instalados` : "Mods instalados en este proyecto"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View Description - Solo cuando hay 1 seleccionado */}
          {selectedLibFiles.length === 1 && (
            <ActionButton
              onClick={() => {
                const f = selectedLibFiles[0];
                const modHit: any = {
                  projectId: f.meta?.modId || "",
                  slug: f.meta?.modId || f.fileName,
                  title: f.meta?.modName || f.fileName,
                  description: "",
                  iconUrl: f.meta?.iconBase64 || null,
                  author: f.meta?.author || "Unknown",
                  downloads: 0,
                  follows: 0,
                  latestVersion: null,
                  categories: f.meta?.categories || [],
                  dateCreated: "",
                  url: `https://modrinth.com/mod/${f.meta?.modId || ""}`,
                  _source: f.meta?.modId?.match(/^[0-9]+$/) ? "curseforge" : "modrinth"
                };

                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("fomo-toggle", { detail: true }));
                  setTimeout(() => {
                    window.dispatchEvent(new CustomEvent("fomo-open-details", { detail: modHit }));
                  }, 300);
                }
              }}
              disabled={loadingDescription}
              icon={loadingDescription ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BookOpen className="w-3.5 h-3.5" />}
              label={loadingDescription ? "Cargando..." : "Ver Detalles"}
              color="success"
            />
          )}

          {/* Unclassify - Cuando hay seleccionados */}
          {selectedLibFiles.length > 0 && (
            <ActionButton
              onClick={handleUnclassify}
              icon={<FolderOpen className="w-3.5 h-3.5" />}
              label="Mover a Descargas"
              color="danger"
              title="Mover mods seleccionados de vuelta a la carpeta de Descargas"
            />
          )}

          {/* Transfer Mods */}
          {activeProject && (
            <div className="flex items-center gap-2">
              <ActionButton
                onClick={() => setAutoClassify(!autoClassify)}
                icon={<Cpu className={`w-3.5 h-3.5 ${autoClassify ? "animate-pulse text-emerald-400" : ""}`} />}
                label="Auto"
                color={autoClassify ? "success" : "neutral"}
                title={autoClassify ? "Clasificación automática activa" : "Activar clasificación automática"}
                highlighted={autoClassify}
              />
              <ActionButton
                onClick={() => setTransferOpen(true)}
                icon={<ArrowLeftRight className="w-3.5 h-3.5" />}
                label="Transferir Local"
                color="primary"
                title="Copiar mods desde la librería global o desde otro proyecto"
              />
            </div>
          )}

          {/* Open Folder */}
          <ActionButton
            onClick={handleOpenLibraryFolder}
            disabled={openingFolder || library.length === 0}
            icon={openingFolder ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderOpen className="w-3.5 h-3.5" />}
            label="Abrir Carpeta"
            color="neutral"
            title="Abrir la carpeta de mods en el explorador de archivos"
          />

        </div>
      </div>

      {/* Library grouped by category */}
      {loadingLibrary ? (
        <div className="space-y-4">
          <SkeletonLoader message="Escaneando librería..." />
          <SkeletonLoader message="Analizando metadatos..." />
          <SkeletonLoader message="Buscando actualizaciones..." />
        </div>
      ) : library.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center rounded-[2.5rem] border border-dashed transition-all shadow-inner" style={{ background: "var(--color-secondary-bg)", borderColor: "var(--color-border)" }}>
          <Layers className="w-12 h-12 mb-4 opacity-20" style={{ color: "var(--color-accent)" }} />
          <p className="font-subhead text-sm text-white/70 mb-2">No hay mods instalados en este proyecto aún</p>
          <p className="text-xs text-white/40 max-w-sm mb-5">
            Puedes buscar y descargar mods desde el menú FOMO, o importar de forma instantánea tu colección desde la librería global o desde otro proyecto compatible.
          </p>
          {activeProject && (
            <button
              onClick={() => setTransferOpen(true)}
              type="button"
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all text-white hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: "var(--color-accent)",
                boxShadow: "0 8px 24px var(--color-accent-bg)",
              }}
            >
              <ArrowLeftRight className="w-5 h-5" />
              <span>Importar desde Librería Global / Proyecto ({activeProject.version})</span>
            </button>
          )}
        </div>
      ) : (
        <VirtualizedLibrary
          library={library}
          selectedLibFiles={selectedLibFiles}
          setSelectedLibFiles={setSelectedLibFiles}
          activeProject={activeProject}
          downloadingMods={downloadingMods}
          modrinthStatus={modrinthStatus}
          ignoredUpdates={ignoredUpdates}
          handleDownloadUpdate={handleDownloadUpdate}
        />
      )}

      {activeProject && transferOpen && (
        <TransferModal
          activeProject={activeProject}
          projects={projects}
          onClose={() => setTransferOpen(false)}
        />
      )}
    </section>
  );
}

// ── Helper Component ─────────────────────────────────────────────────────────────

interface ActionButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  label: string;
  color: "primary" | "success" | "danger" | "neutral" | "accent";
  title?: string;
  highlighted?: boolean;
}

function ActionButton({ onClick, disabled, icon, label, color, title, highlighted }: ActionButtonProps) {
  const colorStyles = {
    primary: { bg: "rgba(187,150,228,0.12)", border: "rgba(187,150,228,0.3)", color: "#BB96E4" },
    success: { bg: "rgba(102,200,160,0.12)", border: "rgba(102,200,160,0.3)", color: "#66C8A0" },
    danger: { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)", color: "#f87171" },
    neutral: { bg: "var(--color-secondary-bg)", border: "var(--color-border)", color: "var(--color-foreground)" },
    accent: { bg: "var(--color-accent-bg)", border: "var(--color-accent-border)", color: "var(--color-accent)" },
  };
  const style = colorStyles[color];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-label text-xs transition-all disabled:opacity-50 ${highlighted ? "shadow-lg" : ""}`}
      style={{
        background: style.bg,
        border: `1px solid ${style.border}`,
        color: style.color,
        boxShadow: highlighted ? `0 0 12px ${style.bg}` : undefined,
      }}
    >
      {icon}
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}
