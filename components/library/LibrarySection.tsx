import React, { useState } from "react";
import { Layers, Loader2, BookOpen, RefreshCw, Bell, FolderOpen } from "lucide-react";
import { ModCard } from "@/components/library/ModCard";
import { SkeletonLoader } from "@/components/ui/SkeletonLoader";
import { EmptyState } from "@/components/ui/EmptyState";
import type { LibraryFile, Project } from "@/lib/types";

interface LibrarySectionProps {
  library: LibraryFile[];
  loadingLibrary: boolean;
  selectedLibFiles: LibraryFile[];
  setSelectedLibFiles: React.Dispatch<React.SetStateAction<LibraryFile[]>>;
  activeProject: Project | null;
  downloadingMods: Record<string, boolean>;
  modrinthStatus: Record<string, any>;
  ignoredUpdates: Set<string>;
  conflicts: any[];
  setSidebarOpen: (b: boolean) => void;
  checkingUpdates: boolean;
  handleCheckUpdates: () => void;
  handleViewDescription: () => void;
  loadingDescription: boolean;
  handleSyncAllDescriptions: () => void;
  syncingDescriptions: boolean;
  handleUnclassify: () => void;
  handleDownloadUpdate: (path: string, url: string, filename: string) => void;
}

export function LibrarySection({
  library,
  loadingLibrary,
  selectedLibFiles,
  setSelectedLibFiles,
  activeProject,
  downloadingMods,
  modrinthStatus,
  ignoredUpdates,
  conflicts,
  setSidebarOpen,
  checkingUpdates,
  handleCheckUpdates,
  handleViewDescription,
  loadingDescription,
  handleSyncAllDescriptions,
  syncingDescriptions,
  handleUnclassify,
  handleDownloadUpdate
}: LibrarySectionProps) {

  function getBadge(f: LibraryFile) {
    const s = modrinthStatus[f.path];
    if (!s) return {};
    if (s.status === "update_available" && !ignoredUpdates.has(f.path)) return {
      badgeText: "↑ " + s.latestVersion,
      badgeColor: "bg-[rgba(255,208,102,0.15)] text-[#FFD066] border border-[rgba(255,208,102,0.3)]",
      onDownload: () => handleDownloadUpdate(f.path, s.downloadUrl, f.fileName.replace(f.meta?.modVersion ?? "", s.latestVersion)),
    };
    if (s.status === "updated")           return { badgeText: "Al día",             badgeColor: "bg-[rgba(102,200,160,0.15)] text-[#66C8A0] border border-[rgba(102,200,160,0.25)]" };
    if (s.status === "updated_downloaded") return { badgeText: "Descargado",         badgeColor: "bg-[rgba(102,200,160,0.15)] text-[#66C8A0] border border-[rgba(102,200,160,0.25)]" };
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
    <section className="animate-fade-up" style={{ animationDelay: "0.18s" }}>
      {/* Library header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(102,200,160,0.1)", border: "1px solid rgba(102,200,160,0.2)", color: "#66C8A0" }}
          >
            <Layers className="w-4 h-4" />
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
              onClick={handleViewDescription}
              disabled={loadingDescription}
              icon={loadingDescription ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BookOpen className="w-3.5 h-3.5" />}
              label={loadingDescription ? "Cargando..." : "Ver Info"}
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

          {/* Open Folder */}
          <ActionButton
            onClick={handleOpenLibraryFolder}
            disabled={openingFolder || library.length === 0}
            icon={openingFolder ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderOpen className="w-3.5 h-3.5" />}
            label="Abrir Carpeta"
            color="neutral"
            title="Abrir la carpeta de mods en el explorador de archivos"
          />

          {/* Check Updates - Destacado */}
          <ActionButton
            onClick={handleCheckUpdates}
            disabled={checkingUpdates}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${checkingUpdates ? "animate-spin" : ""}`} />}
            label={checkingUpdates ? "Buscando..." : "Buscar Updates"}
            color="accent"
            title="Verificar si hay actualizaciones disponibles en Modrinth"
            highlighted
          />
          
          {/* Alert Center Button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="relative flex items-center justify-center w-9 h-9 rounded-xl transition-all hover:scale-105"
            style={{ background: "rgba(255,208,102,0.15)", border: "1px solid rgba(255,208,102,0.35)", color: "var(--color-accent)" }}
            title="Abrir Centro de Alertas"
          >
            <Bell className="w-4 h-4" />
            {(conflicts.length > 0 || Object.entries(modrinthStatus).some(([p, s]) => s.status === "update_available" && !ignoredUpdates.has(p))) && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f87171] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#f87171]"></span>
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Library grouped by category */}
      {loadingLibrary ? (
        <SkeletonLoader />
      ) : library.length === 0 ? (
        <EmptyState message="No hay mods instalados en este proyecto aún" />
      ) : (
        <div className="space-y-8">
          {Object.entries(
            library.reduce((acc, mod) => {
              const cat = mod.category || "Otros";
              if (!acc[cat]) acc[cat] = {};
              const sub = mod.sub || "general";
              if (!acc[cat][sub]) acc[cat][sub] = [];
              acc[cat][sub].push(mod);
              return acc;
            }, {} as Record<string, Record<string, LibraryFile[]>>)
          ).map(([category, subGroups]) => (
            <div key={category} className="animate-fade-up mb-8">
              <div className="flex items-center gap-2 mb-4 px-1 border-b border-white/5 pb-2">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: category === ".essential" ? "var(--color-primary)" : category === ".local" ? "var(--color-accent)" : "#66C8A0" }} />
                <h3 className="font-headline text-sm uppercase tracking-wider opacity-80">
                  {category}
                </h3>
              </div>
              <div className="space-y-6 pl-2">
                {Object.entries(subGroups).map(([sub, mods]) => (
                  <div key={sub}>
                    <h4 className="font-subhead text-xs tracking-widest opacity-40 mb-2.5 uppercase flex items-center gap-2">
                      {sub} <span className="px-1.5 py-0.5 rounded-md bg-white/5 text-[9px]">{mods.length}</span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {mods.map((f, i) => {
                        const displayName = (f.meta?.modName && f.meta.modName !== "unknown") ? f.meta.modName : f.fileName;
                        const isSelected  = selectedLibFiles.some((s) => s.path === f.path);
                        const badge       = getBadge(f);
                        return (
                          <ModCard
                            key={f.path}
                            index={i}
                            name={displayName}
                            version={f.meta?.gameVersion ?? f.meta?.version ?? "unknown"}
                            modVersion={f.meta?.modVersion}
                            projectType={f.meta?.projectType}
                            iconBase64={f.meta?.iconBase64}
                            author={f.meta?.author}
                            loader={f.meta?.loader ?? "unknown"}
                            isSelected={isSelected}
                            onClick={() => setSelectedLibFiles((prev) =>
                              isSelected ? prev.filter((s) => s.path !== f.path) : [...prev, f]
                            )}
                            activeVersion={activeProject?.version ?? ""}
                            activeLoader={activeProject?.loader ?? ""}
                            badgeText={badge.badgeText}
                            badgeColor={badge.badgeColor}
                            onDownload={badge.onDownload}
                            isDownloading={downloadingMods[f.path]}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
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
    danger:  { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)", color: "#f87171" },
    neutral: { bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.15)", color: "var(--color-foreground)" },
    accent:  { bg: "rgba(255,208,102,0.15)", border: "rgba(255,208,102,0.35)", color: "#FFD066" },
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
