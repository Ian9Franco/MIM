import React from "react";
import { Layers, Loader2, BookOpen, RefreshCw, Bell } from "lucide-react";
import { ModCard } from "./ModCard";
import { SkeletonLoader } from "./SkeletonLoader";
import { EmptyState } from "./EmptyState";
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

        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncAllDescriptions}
            disabled={syncingDescriptions || library.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-label text-sm transition-all animate-fade-in disabled:opacity-50"
            style={{ background: "rgba(187,150,228,0.1)", border: "1px solid rgba(187,150,228,0.25)", color: "var(--color-primary)", fontSize: "0.65rem" }}
            title="Sincronizar info de Modrinth para toda la librería"
          >
            {syncingDescriptions ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Sync Info
          </button>

          {selectedLibFiles.length === 1 && (
            <button
              onClick={handleViewDescription}
              disabled={loadingDescription}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-label text-sm transition-all animate-fade-in disabled:opacity-50"
              style={{ background: "rgba(102,200,160,0.1)", border: "1px solid rgba(102,200,160,0.25)", color: "#66C8A0", fontSize: "0.65rem" }}
            >
              {loadingDescription ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BookOpen className="w-3.5 h-3.5" />}
              Ver Descripción
            </button>
          )}
          {selectedLibFiles.length > 0 && (
            <button
              onClick={handleUnclassify}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-label text-sm transition-all animate-fade-in"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171", fontSize: "0.65rem" }}
            >
              Mover a Descargas
            </button>
          )}
          <button
            onClick={handleCheckUpdates}
            disabled={checkingUpdates}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-label transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: "rgba(187,150,228,0.08)",
              border: "1px solid var(--color-border-strong)",
              color: "var(--color-primary)",
              fontSize: "0.62rem",
            }}
            onMouseEnter={(e) => { if (!checkingUpdates) (e.currentTarget as HTMLElement).style.background = "rgba(187,150,228,0.14)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(187,150,228,0.08)"; }}
          >
            <RefreshCw className={`w-3 h-3 ${checkingUpdates ? "animate-spin" : ""}`} />
            {checkingUpdates ? "Buscando..." : "Buscar Updates"}
          </button>
          
          <button
            onClick={() => setSidebarOpen(true)}
            className="relative flex items-center justify-center w-8 h-8 rounded-xl transition-all"
            style={{ background: "rgba(255,208,102,0.1)", border: "1px solid rgba(255,208,102,0.25)", color: "var(--color-accent)" }}
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
