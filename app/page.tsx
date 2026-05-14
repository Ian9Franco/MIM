/**
 * @fileoverview Main application page – orchestrates all major sections.
 *
 * State lives in two custom hooks:
 *   - useProjects  → project CRUD + localStorage persistence
 *   - useLibrary   → library load, conflict detection, updates, classification
 *
 * Rendering is delegated entirely to focused section components.
 * This file intentionally contains NO business logic.
 */

"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Package, FolderOpen, Inbox } from "lucide-react";
import { useProjects }        from "../hooks/useProjects";
import { useLibrary }         from "../hooks/useLibrary";
import { CATEGORY_HOTKEYS }   from "../constants/app";
import { SectionHeading, StatusBanner }     from "@/components/ui/primitives";
import { ProjectsSection }    from "@/components/projects/ProjectsSection";
import { LibrarySection }     from "@/components/library/LibrarySection";
import { PendingFilesSection } from "@/components/library/PendingFilesSection";
import { useStatusBanner }   from "../hooks/useStatusBanner";
import { QuickCategorizeSection } from "@/components/library/QuickCategorizeSection";
import { AlertSidebar }       from "@/components/layout/AlertSidebar";
import { DescriptionModal }   from "@/components/ui/DescriptionModal";
import { ConfirmModal }       from "@/components/ui/ConfirmModal";
import { BuildPanel }         from "@/components/projects/BuildPanel";
import type { PendingFile, LibraryFile } from "@/lib/types";
import { LOADER_COLORS } from "../constants/app";

function Divider() {
  return <div className="h-px w-full" style={{ background: "var(--color-border)" }} aria-hidden="true" />;
}

/**
 * Genera un "fingerprint" o huella única para un archivo pendiente
 * basado en sus metadatos. Se utiliza para detectar archivos duplicados
 * en la carpeta de descargas y eliminarlos automáticamente.
 */
function getPendingFingerprint(file: PendingFile): string {
  const meta = file.meta;
  return [
    meta?.modId || "unknown",
    meta?.modName || file.fileName,
    meta?.modVersion || "unknown",
    meta?.gameVersion || "unknown",
    meta?.loader || "unknown",
    meta?.projectType || "unknown",
    meta?.sha1 || "no-sha1",
  ].join("|").toLowerCase();
}

export default function Page() {
  const projects = useProjects();
  const { status, showStatus, clearStatus } = useStatusBanner();

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("active-project-changed", { detail: projects.activeProject }));
    }
  }, [projects.activeProject]);

  const [pendingFiles,     setPendingFiles]     = useState<PendingFile[]>([]);
  const [selectedFiles,    setSelectedFiles]    = useState<PendingFile[]>([]);
  const [selectedLibFiles, setSelectedLibFiles] = useState<LibraryFile[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [showSubcategories,setShowSubcategories]= useState<string | null>(null);
  const [sidebarOpen,      setSidebarOpen]      = useState(false);
  const [fomoOpen,         setFomoOpen]         = useState(false);
  const [sageOpen,         setSageOpen]         = useState(false);
  const [detailsOpen,      setDetailsOpen]      = useState(false);
  const [downloadsSidebarCollapsed, setDownloadsSidebarCollapsed] = useState(false);
  const prevPendingCountRef = useRef(pendingFiles.length);
  const [mounted,          setMounted]          = useState(false);
  const [autoClassify,     setAutoClassify]     = useState(false);
  const [filesToDelete,    setFilesToDelete]    = useState<PendingFile[]>([]);
  const autoProcessing = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (fomoOpen) {
      setDownloadsSidebarCollapsed(false);
    }
  }, [fomoOpen]);

  useEffect(() => {
    const prevCount = prevPendingCountRef.current;
    prevPendingCountRef.current = pendingFiles.length;

    if (fomoOpen && pendingFiles.length > prevCount) {
      const hadDetailsOpen = detailsOpen;
      if (hadDetailsOpen) {
        setDetailsOpen(false);
      }
      setDownloadsSidebarCollapsed(false);
      
      const timer = setTimeout(() => {
        setDownloadsSidebarCollapsed(true);
        if (hadDetailsOpen) {
          setDetailsOpen(true);
        }
      }, 2000); // Se guarda automáticamente tras 2 segundos y restaura Detalles
      
      return () => clearTimeout(timer);
    }
  }, [pendingFiles.length, fomoOpen, detailsOpen]);



  const lib = useLibrary(
    projects.activeProject,
    pendingFiles,
    setPendingFiles,
    selectedLibFiles,
    setSelectedLibFiles,
  );

  useEffect(() => {
    setMounted(true);
    const handleFomoToggle = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>;
      setFomoOpen(customEvent.detail);
    };
    const handleSageToggle = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>;
      setSageOpen(customEvent.detail);
    };
    const handleDetailsToggle = (e: Event) => {
      const customEvent = e as CustomEvent<{ open: boolean }>;
      setDetailsOpen(customEvent.detail.open);
    };
    const handleAlertToggle = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>;
      setSidebarOpen(customEvent.detail);
    };
    const handleRefreshRequest = async () => {
      lib.refreshLibrary();
      // También re-escanear descargas pendientes
      try {
        const res = await fetch("/api/watcher/rescan");
        const data = await res.json();
        if (data.pending) setPendingFiles(data.pending);
      } catch (_) {}
    };
    window.addEventListener("fomo-toggle", handleFomoToggle)
    window.addEventListener("sage-toggle", handleSageToggle);
    window.addEventListener("alert-sidebar-toggle", handleAlertToggle);
    window.addEventListener("fomo-details-toggle", handleDetailsToggle);
    window.addEventListener("refresh-system", handleRefreshRequest);
    return () => {
      window.removeEventListener("fomo-toggle", handleFomoToggle);
      window.removeEventListener("sage-toggle", handleSageToggle);
      window.removeEventListener("alert-sidebar-toggle", handleAlertToggle);
      window.removeEventListener("fomo-details-toggle", handleDetailsToggle);
      window.removeEventListener("refresh-system", handleRefreshRequest);
    };
  }, [lib]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("alert-sidebar-toggle", { detail: sidebarOpen }));
    }
  }, [sidebarOpen]);

  // Sincronizar actualizaciones de biblioteca con componentes secundarios globales (como Fomo)
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("library-updates-changed", { detail: lib.modrinthStatus }));
    }
  }, [lib.modrinthStatus]);

  useEffect(() => {
    const handleRequest = () => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("library-updates-changed", { detail: lib.modrinthStatus }));
      }
    };
    window.addEventListener("request-library-updates", handleRequest);
    return () => {
      window.removeEventListener("request-library-updates", handleRequest);
    };
  }, [lib.modrinthStatus]);

  // Bloquear scroll de fondo cuando hay sidebars abiertas
  useEffect(() => {
    if (sidebarOpen || fomoOpen || sageOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [sidebarOpen, fomoOpen, sageOpen]);

  const allSelected = [...selectedFiles, ...selectedLibFiles];

  /* ── SSE file watcher ────────────────────────────────────────────────── */
  useEffect(() => {
    setLoading(true);
    const es = new EventSource("/api/watcher");
    es.onopen    = () => setLoading(false);
    es.onerror   = () => setLoading(false);
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        
        // Manejar borrado físico
        if (data.type === "deleted") {
          setPendingFiles((prev) => prev.filter((f) => f.path !== data.path));
          return;
        }

        const pending: PendingFile = data;
        if (pending?.fileName) {
          setPendingFiles((prev) => {
            if (prev.find((f) => f.path === pending.path)) return prev;

            const duplicate = prev.find((f) => getPendingFingerprint(f) === getPendingFingerprint(pending));
            if (duplicate) {
              void fetch("/api/delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ path: pending.path }),
              });
              return prev;
            }

            return [...prev, pending];
          });
          setLoading(false);
        }
      } catch {}
    };
    return () => es.close();
  }, []);

  /* ── Keyboard hotkeys ────────────────────────────────────────────────── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (allSelected.length === 0) return;
      const cat = CATEGORY_HOTKEYS[e.key];
      if (cat) setShowSubcategories(cat);
      if (e.key === "Escape") {
        setShowSubcategories(null);
        setSelectedFiles([]);
        setSelectedLibFiles([]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [allSelected.length]);

  const clearSelected = useCallback(() => {
    setSelectedFiles([]);
    setSelectedLibFiles([]);
    setShowSubcategories(null);
  }, []);

  /* ── Auto-Classification Logic ───────────────────────────────────────── */
  useEffect(() => {
    if (!projects.activeProject) return;

    pendingFiles.forEach(f => {
      if (autoProcessing.current.has(f.path)) return;

      // 1. Automatic Resource Pack / Datapack / Shader Classification (Always active if project selected)
      if (f.meta?.projectType === "resourcepack" || f.meta?.projectType === "datapack" || f.meta?.projectType === "shader") {
        autoProcessing.current.add(f.path);
        // We use a dummy category because /api/classify will override it for these types
        lib.handleClassify(".local", "rendimiento", [f], setPendingFiles, clearSelected);
        return;
      }

      // 2. Regular Mod Auto-Classification (Only if enabled)
      if (!autoClassify) return;

      const activeVer = projects.activeProject?.version || "";
      const activeLdr = projects.activeProject?.loader || "";
      const modVer = f.meta?.gameVersion || "unknown";
      const modLdr = f.meta?.loader || "unknown";

      const isCompatibleRange = (() => {
        if (modVer === "unknown" || modVer === activeVer) return true;
        if (modVer.includes(" - ")) {
          const [start, end] = modVer.split(" - ").map(v => v.trim());
          const toParts = (vStr: string) => vStr.split(".").map(Number);
          const actParts = toParts(activeVer);
          const startParts = toParts(start);
          const endParts = toParts(end);

          const ge = (a: number[], b: number[]) => {
            for (let i = 0; i < Math.max(a.length, b.length); i++) {
              const na = a[i] || 0;
              const nb = b[i] || 0;
              if (na > nb) return true;
              if (na < nb) return false;
            }
            return true;
          };
          const le = (a: number[], b: number[]) => {
            for (let i = 0; i < Math.max(a.length, b.length); i++) {
              const na = a[i] || 0;
              const nb = b[i] || 0;
              if (na < nb) return true;
              if (na > nb) return false;
            }
            return true;
          };
          return ge(actParts, startParts) && le(actParts, endParts);
        }
        if (modVer.endsWith("+")) return activeVer.startsWith(modVer.slice(0, -1));
        if (activeVer.startsWith(modVer + ".")) return true;
        return false;
      })();

      const isCompatibleLoader = (() => {
        if (modLdr === "unknown" || activeLdr === "" || modLdr === activeLdr) return true;
        if (activeVer === "1.20.1") {
          const l = modLdr.toLowerCase();
          const al = activeLdr.toLowerCase();
          if ((l === "forge" && al === "neoforge") || (l === "neoforge" && al === "forge")) return true;
        }
        return false;
      })();

      if (isCompatibleRange && isCompatibleLoader) {
        autoProcessing.current.add(f.path);
        lib.handleClassify("auto", "", [f], setPendingFiles, clearSelected);
      }
    });
  }, [autoClassify, pendingFiles, lib.modrinthStatus, projects.activeProject, lib, setPendingFiles, clearSelected]);

  const handleClassify = useCallback((cat: string, sub: string) => {
    lib.handleClassify(cat, sub, allSelected, setPendingFiles, clearSelected);
  }, [lib, allSelected, clearSelected]);

  const handleDeletePendingFile = useCallback(async (file: PendingFile) => {
    try {
      const res = await fetch("/api/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: file.path }),
      });
      if (res.ok) {
        setPendingFiles(prev => prev.filter(f => f.path !== file.path));
        setSelectedFiles(prev => prev.filter(f => f.path !== file.path));
      } else {
        console.error("Error deleting file:", await res.text());
      }
    } catch (e) {
      console.error("Error deleting file:", e);
    }
  }, []);

  const handleBulkDelete = useCallback(() => {
    if (selectedFiles.length === 0) return;
    setFilesToDelete(selectedFiles);
  }, [selectedFiles]);

  const handleConfirmBulkDelete = useCallback(async () => {
    if (filesToDelete.length === 0) return;
    for (const f of filesToDelete) {
      await handleDeletePendingFile(f);
    }
    setFilesToDelete([]);
    setSelectedFiles([]);
  }, [filesToDelete, handleDeletePendingFile]);

  const handleBulkUnclassify = useCallback(async () => {
    if (selectedLibFiles.length === 0) return;
    await lib.handleUnclassify();
    setSelectedLibFiles([]);
  }, [selectedLibFiles, lib]);

  const handleAutoCategorize = useCallback(async () => {
    if (!projects.activeProject) return;
    try {
      showStatus("Analizando y organizando mods...", "info");
      const res = await fetch("/api/project-config/auto-categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: projects.activeProject.name })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.moves?.length > 0) {
          showStatus(`Reorganizados ${data.moves.length} mods automáticamente`, "success");
        } else {
          showStatus("El proyecto ya está perfectamente organizado", "success");
        }
        window.dispatchEvent(new CustomEvent("refresh-system"));
      }
    } catch (err) {
      showStatus("Error en la auto-categorización", "error");
    }
  }, [projects.activeProject, showStatus]);

  return (
    <div className="transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]">
      <div className="space-y-8 pb-16">

        {/* ── Row 1: Projects + Build ──────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-5 items-start">
          <ProjectsSection
            projects={projects.projects}
            activeProjectId={projects.activeProjectId}
            editingId={projects.editingId}
            creatingNew={projects.creatingNew}
            setActiveProjectId={projects.setActiveProjectId}
            setEditingId={projects.setEditingId}
            setCreatingNew={projects.setCreatingNew}
            handleDeleteProject={projects.handleDeleteProject}
            handleSaveProject={projects.handleSaveProject}
            loaderColors={LOADER_COLORS}
          />

          {projects.activeProject && (
            <section className="animate-fade-up stagger-1 lg:min-w-[420px]">
              <SectionHeading
                icon={<Package className="w-4 h-4" />}
                title="Build"
                sub={`${projects.activeProject.name} · ${projects.activeProject.version} · ${projects.activeProject.loader}`}
                accentColor="var(--color-accent)"
                className="mb-4"
                actions={
                  <button
                    onClick={async () => {
                      try {
                        await fetch("/api/project/open", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ 
                            projectName: projects.activeProject?.name, 
                            version: projects.activeProject?.version 
                          }),
                        });
                      } catch (e) {
                        console.error(e);
                      }
                    }}
                    className="flex items-center gap-3 px-12 py-3.5 rounded-2xl transition-all group active:scale-95"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px dashed var(--color-border-strong)",
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.background = "rgba(255,255,255,0.06)";
                      el.style.borderColor = "var(--color-primary)";
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.background = "rgba(255,255,255,0.03)";
                      el.style.borderColor = "var(--color-border-strong)";
                    }}
                  >
                    <FolderOpen className="w-4.5 h-4.5 transition-colors group-hover:text-primary" style={{ color: "var(--color-muted)" }} />
                    <span className="text-xs font-bold transition-colors group-hover:text-primary" style={{ color: "var(--color-muted)" }}>
                      Abrir carpeta del proyecto (Packs / Config)
                    </span>
                  </button>
                }
              />
              <BuildPanel
                projectName={projects.activeProject.name}
                version={projects.activeProject.version}
                loader={projects.activeProject.loader}
              />
            </section>
          )}
        </div>

        <Divider />

        {/* Global Status Banner for Page level actions */}
        {status && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] w-full max-w-xl px-4 pointer-events-none">
            <div className="pointer-events-auto">
              <StatusBanner text={status.text} type={status.type} onClose={clearStatus} />
            </div>
          </div>
        )}

        {/* ── Row 2: Stable Column Grid (Downloads | Categorization | Library) ── */}
        <div 
          className="grid grid-cols-[1.2fr_320px_2fr] gap-6 items-start mt-6 animate-fade-up"
        >
          
          {/* Column 1: Descargas Pendientes (Hidden but preserving space when FOMO is open) */}
          <div className={`space-y-6 transition-opacity duration-1000 ease-[cubic-bezier(0.6,0.01,-0.05,0.95)] ${fomoOpen ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
            <PendingFilesSection
              pendingFiles={pendingFiles}
              loading={loading}
              selectedFiles={selectedFiles}
              setSelectedFiles={setSelectedFiles}
              activeProject={projects.activeProject}
              onDeleteFile={handleDeletePendingFile}
              layout="main"
              modrinthStatus={lib.modrinthStatus}
            />
          </div>

          {/* Column 2: Categorización Rápida */}
          <div className="space-y-6 min-w-0">
            <QuickCategorizeSection
              allSelected={allSelected}
              activeProject={projects.activeProject}
              showSubcategories={showSubcategories}
              setShowSubcategories={setShowSubcategories}
              handleClassify={handleClassify}
              setSelectedFiles={setSelectedFiles}
              setSelectedLibFiles={setSelectedLibFiles}
              onDeleteSelected={handleBulkDelete}
              onUnclassifySelected={handleBulkUnclassify}
              onAutoCategorize={handleAutoCategorize}
            />
          </div>

          {/* Column 3: Librería de Source */}
          <div className="min-w-0">
            <LibrarySection
              library={lib.library}
              loadingLibrary={lib.loadingLibrary}
              selectedLibFiles={selectedLibFiles}
              setSelectedLibFiles={setSelectedLibFiles}
              activeProject={projects.activeProject}
              projects={projects.projects}
              downloadingMods={lib.downloadingMods}
              modrinthStatus={lib.modrinthStatus}
              ignoredUpdates={lib.ignoredUpdates}
              conflicts={lib.conflicts}
              sidebarOpen={sidebarOpen}
              setSidebarOpen={setSidebarOpen}
              checkingUpdates={lib.checkingUpdates}
              handleCheckUpdates={lib.handleCheckUpdates}
              handleViewDescription={lib.handleViewDescription}
              loadingDescription={lib.loadingDescription}
              handleSyncAllDescriptions={lib.handleSyncAllDescriptions}
              syncingDescriptions={lib.syncingDescriptions}
              handleUnclassify={lib.handleUnclassify}
              handleDownloadUpdate={lib.handleDownloadUpdate}
              autoClassify={autoClassify}
              setAutoClassify={setAutoClassify}
            />
          </div>
        </div>

        {/* ── Modals + Sidebars ────────────────────────────────────────── */}
        {lib.modDescription && (
          <DescriptionModal
            modDescription={lib.modDescription}
            onClose={() => lib.setModDescription(null)}
          />
        )}

        <AlertSidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          conflicts={lib.conflicts}
          bytecodeConflicts={lib.bytecodeConflicts}
          modrinthStatus={lib.modrinthStatus}
          ignoredUpdates={lib.ignoredUpdates}
          library={lib.library}
          downloadingMods={lib.downloadingMods}
          handleResolveConflict={lib.handleResolveConflict}
          handleDownloadUpdate={lib.handleDownloadUpdate}
          handleDismissUpdate={lib.handleDismissUpdate}
          checkingUpdates={lib.checkingUpdates}
          handleCheckUpdates={lib.handleCheckUpdates}
        />

        {/* Right Floating Sidebar for Downloads or Project Details when FOMO is open */}
        {mounted && typeof window !== "undefined" && createPortal(
          (() => {
            const isSidebarVisible = fomoOpen && (detailsOpen || !downloadsSidebarCollapsed);
            return (
              <aside
                className={`fomo-sidebar fomo-sidebar-container fixed top-0 right-0 h-screen z-50 flex flex-col shadow-[0_0_50px_rgba(13,39,80,0.12)] dark:shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-all duration-1000 ease-[cubic-bezier(0.6,0.01,-0.05,0.95)] border-l ${
                  detailsOpen ? "w-[600px] max-w-[90vw]" : "w-[380px]"
                } ${
                  isSidebarVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 pointer-events-none"
                }`}
                style={{
                  background: "var(--fomo-bg, color-mix(in srgb, var(--color-card) 94%, transparent))",
                  borderColor: "var(--fomo-border, var(--color-border))",
                  backdropFilter: "blur(20px)",
                }}
              >
                <div className={`flex-1 flex flex-col min-h-0 ${detailsOpen ? "" : "p-6 overflow-y-auto custom-scrollbar"}`}>
                  {detailsOpen ? (
                    <div id="fomo-details-sidebar-portal" className="flex-1 flex flex-col min-h-0" />
                  ) : (
                    <PendingFilesSection
                      pendingFiles={pendingFiles}
                      loading={loading}
                      selectedFiles={selectedFiles}
                      setSelectedFiles={setSelectedFiles}
                      activeProject={projects.activeProject}
                      onDeleteFile={handleDeletePendingFile}
                      modrinthStatus={lib.modrinthStatus}
                      onCloseSidebar={() => setDownloadsSidebarCollapsed(true)}
                    />
                  )}
                </div>
              </aside>
            );
          })(),
          document.body
        )}

        {/* Floating pill to expand downloads sidebar if manually collapsed */}
        {fomoOpen && !detailsOpen && downloadsSidebarCollapsed && (
          <button
            onClick={() => setDownloadsSidebarCollapsed(false)}
            className="fixed right-5 top-20 z-50 flex items-center gap-2.5 px-4 py-3 rounded-full border bg-card/95 backdrop-blur-md hover:scale-105 active:scale-95 transition-all shadow-[0_10px_30px_rgba(0,0,0,0.5)] animate-fade-in border-primary/30 hover:border-primary/50 text-primary group"
            style={{
              borderColor: "rgba(99, 102, 241, 0.3)",
              background: "color-mix(in srgb, var(--color-card) 95%, transparent)"
            }}
          >
            <div className="relative shrink-0">
              <Inbox className="w-4 h-4 group-hover:animate-pulse text-indigo-400" />
              {pendingFiles.length > 0 && (
                <span className="absolute -top-2 -right-2 w-4.5 h-4.5 rounded-full bg-rose-500 text-white text-[8px] font-extrabold flex items-center justify-center shadow-md animate-pulse">
                  {pendingFiles.length}
                </span>
              )}
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-foreground/70 group-hover:text-indigo-400">
              Ver Descargas
            </span>
          </button>
        )}
      </div>

      <ConfirmModal
        isOpen={filesToDelete.length > 0}
        onClose={() => setFilesToDelete([])}
        onConfirm={handleConfirmBulkDelete}
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
    </div>
  );
}
