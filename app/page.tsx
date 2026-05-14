/**
 * @fileoverview Main application page – orchestrates all major sections.
 * Optimized for v5.9: Business logic extracted to hooks and components.
 */

"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Package, FolderOpen } from "lucide-react";
import { useProjects }        from "../hooks/useProjects";
import { useLibrary }         from "../hooks/useLibrary";
import { useFileWatcher }     from "../hooks/useFileWatcher";
import { useStatusBanner }    from "../hooks/useStatusBanner";
import { CATEGORY_HOTKEYS }   from "../constants/app";
import { SectionHeading, StatusBanner }     from "@/components/ui/primitives";
import { ProjectsSection }    from "@/components/projects/ProjectsSection";
import { LibrarySection }     from "@/components/library/LibrarySection";
import { PendingFilesSection } from "@/components/library/PendingFilesSection";
import { QuickCategorizeSection } from "@/components/library/QuickCategorizeSection";
import { AlertSidebar }       from "@/components/alerts/AlertSidebar";
import { DescriptionModal }   from "@/components/ui/DescriptionModal";
import { ConfirmModal }       from "@/components/ui/ConfirmModal";
import { BuildPanel }         from "@/components/projects/BuildPanel";
import { FomoSidebarPortal }  from "@/components/layout/FomoSidebarPortal";
import { isVersionCompatible, isLoaderCompatible } from "@/lib/version-utils";
import type { PendingFile, LibraryFile } from "@/lib/types";
import { LOADER_COLORS } from "../constants/app";

function Divider() {
  return <div className="h-px w-full" style={{ background: "var(--color-border)" }} aria-hidden="true" />;
}

export default function Page() {
  const projects = useProjects();
  const { pendingFiles, setPendingFiles, loading } = useFileWatcher();
  
  const [selectedFiles,    setSelectedFiles]    = useState<PendingFile[]>([]);
  const [selectedLibFiles, setSelectedLibFiles] = useState<LibraryFile[]>([]);
  const [showSubcategories,setShowSubcategories]= useState<string | null>(null);
  const [sidebarOpen,      setSidebarOpen]      = useState(false);
  const [fomoOpen,         setFomoOpen]         = useState(false);
  const [sageOpen,         setSageOpen]         = useState(false);
  const [detailsOpen,      setDetailsOpen]      = useState(false);
  const [downloadsSidebarCollapsed, setDownloadsSidebarCollapsed] = useState(false);
  const [mounted,          setMounted]          = useState(false);
  const [autoClassify,     setAutoClassify]     = useState(false);
  const [filesToDelete,    setFilesToDelete]    = useState<PendingFile[]>([]);
  const [projectToDelete,  setProjectToDelete]  = useState<string | null>(null);
  
  const autoProcessing = useRef<Set<string>>(new Set());
  const prevPendingCountRef = useRef(pendingFiles.length);

  const lib = useLibrary(projects.activeProject, pendingFiles, setPendingFiles, selectedLibFiles, setSelectedLibFiles);
  const { status, showStatus, clearStatus } = useStatusBanner();

  // ── Global Events ──────────────────────────────────────────────────────────
  useEffect(() => {
    setMounted(true);
    const events = {
      "fomo-toggle": (e: any) => setFomoOpen(e.detail),
      "sage-toggle": (e: any) => setSageOpen(e.detail),
      "fomo-details-toggle": (e: any) => setDetailsOpen(e.detail.open),
      "alert-sidebar-toggle": (e: any) => setSidebarOpen(e.detail),
      "refresh-system": () => { lib.refreshLibrary(); fetch("/api/watcher/rescan").then(r => r.json()).then(d => d.pending && setPendingFiles(d.pending)).catch(()=>{}); },
      "active-project-changed": (e: any) => { if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("alert-sidebar-toggle", { detail: sidebarOpen })); }
    };
    Object.entries(events).forEach(([n, h]) => window.addEventListener(n, h as any));
    return () => Object.entries(events).forEach(([n, h]) => window.removeEventListener(n, h as any));
  }, [lib, sidebarOpen, setPendingFiles]);

  // ── FOMO Auto-Collapse Logic ──────────────────────────────────────────────
  useEffect(() => {
    if (fomoOpen) setDownloadsSidebarCollapsed(false);
    const prevCount = prevPendingCountRef.current;
    prevPendingCountRef.current = pendingFiles.length;

    if (fomoOpen && pendingFiles.length > prevCount) {
      const hadDetailsOpen = detailsOpen;
      if (hadDetailsOpen) setDetailsOpen(false);
      setDownloadsSidebarCollapsed(false);
      const timer = setTimeout(() => { setDownloadsSidebarCollapsed(true); if (hadDetailsOpen) setDetailsOpen(true); }, 2000);
      return () => clearTimeout(timer);
    }
  }, [pendingFiles.length, fomoOpen, detailsOpen]);

  // ── Auto-Classification ────────────────────────────────────────────────────
  useEffect(() => {
    if (!projects.activeProject) return;
    pendingFiles.forEach(f => {
      if (autoProcessing.current.has(f.path)) return;
      
      const isMedia = ["resourcepack", "datapack", "shader"].includes(f.meta?.projectType || "");
      if (autoClassify && (isMedia || (isVersionCompatible(f.meta?.gameVersion || "unknown", projects.activeProject!.version) && isLoaderCompatible(f.meta?.loader || "unknown", projects.activeProject!.loader, projects.activeProject!.version)))) {
        autoProcessing.current.add(f.path);
        lib.handleClassify(isMedia ? ".local" : "auto", isMedia ? "rendimiento" : "", [f], setPendingFiles, () => setSelectedFiles([]));
      }
    });
  }, [autoClassify, pendingFiles, projects.activeProject, lib, setPendingFiles]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleClassify = useCallback((cat: string, sub: string) => lib.handleClassify(cat, sub, [...selectedFiles, ...selectedLibFiles], setPendingFiles, () => { setSelectedFiles([]); setSelectedLibFiles([]); setShowSubcategories(null); }), [lib, selectedFiles, selectedLibFiles, setPendingFiles]);
  
  const handleDeleteFile = useCallback(async (file: PendingFile) => {
    const res = await fetch("/api/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path: file.path }) });
    if (res.ok) { setPendingFiles(prev => prev.filter(f => f.path !== file.path)); setSelectedFiles(prev => prev.filter(f => f.path !== file.path)); }
  }, [setPendingFiles]);

  const handleBulkDelete = async () => { for (const f of filesToDelete) await handleDeleteFile(f); setFilesToDelete([]); setSelectedFiles([]); };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;
    const pObj = projects.projects.find(p => p.id === projectToDelete);
    if (pObj) {
      await fetch("/api/project/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectName: pObj.name }) });
    }
    projects.handleDeleteProject(projectToDelete);
    setProjectToDelete(null);
  };

  const handleAutoCategorize = async () => {
    if (!projects.activeProject) return;
    try {
      showStatus("Analizando y organizando mods...", "info");
      const res = await fetch("/api/project-config/auto-categorize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ project: projects.activeProject.name }) });
      if (res.ok) {
        const data = await res.json();
        showStatus(data.moves?.length > 0 ? `Reorganizados ${data.moves.length} mods automáticamente` : "El proyecto ya está perfectamente organizado", "success");
        window.dispatchEvent(new CustomEvent("refresh-system"));
      }
    } catch { showStatus("Error en la auto-categorización", "error"); }
  };

  const pObjToDelete = projects.projects.find(p => p.id === projectToDelete);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="transition-all duration-500 ease-out">
      <div className="space-y-8 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-5 items-start">
          <ProjectsSection projects={projects.projects} activeProjectId={projects.activeProjectId} editingId={projects.editingId} creatingNew={projects.creatingNew} setActiveProjectId={projects.setActiveProjectId} setEditingId={projects.setEditingId} setCreatingNew={projects.setCreatingNew} handleDeleteProject={(id) => setProjectToDelete(id)} handleSaveProject={projects.handleSaveProject} loaderColors={LOADER_COLORS} />
          {projects.activeProject && (
            <section className="animate-fade-up lg:min-w-[420px]">
              <SectionHeading icon={<Package className="w-4 h-4" />} title="Build" sub={`${projects.activeProject.name} · ${projects.activeProject.version} · ${projects.activeProject.loader}`} accentColor="var(--color-accent)" className="mb-4" actions={<button onClick={() => fetch("/api/project/open", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectName: projects.activeProject?.name, version: projects.activeProject?.version }) })} className="flex items-center gap-3 px-12 py-3.5 rounded-2xl bg-white/5 border border-dashed border-white/10 hover:border-primary transition-all active:scale-95 text-[10px] font-bold uppercase text-muted group hover:text-primary"><FolderOpen className="w-4 h-4" /> Abrir Carpeta</button>} />
              <BuildPanel projectName={projects.activeProject.name} version={projects.activeProject.version} loader={projects.activeProject.loader} />
            </section>
          )}
        </div>

        <Divider />

        {/* Global Status Banner */}
        {status && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] w-full max-w-xl px-4 pointer-events-none">
            <div className="pointer-events-auto">
              <StatusBanner text={status.text} type={status.type} onClose={clearStatus} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-[1.2fr_320px_2fr] gap-6 items-start mt-6 animate-fade-up">
          <div className={`${fomoOpen ? "opacity-0 pointer-events-none" : "opacity-100"} transition-opacity duration-700`}><PendingFilesSection pendingFiles={pendingFiles} loading={loading} selectedFiles={selectedFiles} setSelectedFiles={setSelectedFiles} activeProject={projects.activeProject} onDeleteFile={handleDeleteFile} layout="main" modrinthStatus={lib.modrinthStatus} /></div>
          <QuickCategorizeSection allSelected={[...selectedFiles, ...selectedLibFiles]} activeProject={projects.activeProject} showSubcategories={showSubcategories} setShowSubcategories={setShowSubcategories} handleClassify={handleClassify} setSelectedFiles={setSelectedFiles} setSelectedLibFiles={setSelectedLibFiles} onDeleteSelected={() => setFilesToDelete(selectedFiles)} onUnclassifySelected={() => { lib.handleUnclassify(); setSelectedLibFiles([]); }} onAutoCategorize={handleAutoCategorize} autoClassify={autoClassify} setAutoClassify={setAutoClassify} />
          <LibrarySection library={lib.library} loadingLibrary={lib.loadingLibrary} selectedLibFiles={selectedLibFiles} setSelectedLibFiles={setSelectedLibFiles} activeProject={projects.activeProject} projects={projects.projects} downloadingMods={lib.downloadingMods} modrinthStatus={lib.modrinthStatus} ignoredUpdates={lib.ignoredUpdates} conflicts={lib.conflicts} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} checkingUpdates={lib.checkingUpdates} handleCheckUpdates={lib.handleCheckUpdates} handleViewDescription={lib.handleViewDescription} loadingDescription={lib.loadingDescription} handleSyncAllDescriptions={lib.handleSyncAllDescriptions} syncingDescriptions={lib.syncingDescriptions} handleUnclassify={lib.handleUnclassify} handleDownloadUpdate={lib.handleDownloadUpdate} autoClassify={autoClassify} setAutoClassify={setAutoClassify} pendingFiles={pendingFiles} />
        </div>

        {lib.modDescription && <DescriptionModal modDescription={lib.modDescription} onClose={() => lib.setModDescription(null)} />}
        <AlertSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} conflicts={lib.conflicts} bytecodeConflicts={lib.bytecodeConflicts} modrinthStatus={lib.modrinthStatus} ignoredUpdates={lib.ignoredUpdates} library={lib.library} downloadingMods={lib.downloadingMods} handleResolveConflict={lib.handleResolveConflict} handleDownloadUpdate={lib.handleDownloadUpdate} handleDismissUpdate={lib.handleDismissUpdate} checkingUpdates={lib.checkingUpdates} handleCheckUpdates={lib.handleCheckUpdates} />

        {mounted && createPortal(<FomoSidebarPortal fomoOpen={fomoOpen} detailsOpen={detailsOpen} downloadsSidebarCollapsed={downloadsSidebarCollapsed} setDownloadsSidebarCollapsed={setDownloadsSidebarCollapsed} pendingFiles={pendingFiles} loading={loading} selectedFiles={selectedFiles} setSelectedFiles={setSelectedFiles} activeProject={projects.activeProject} onDeleteFile={handleDeleteFile} modrinthStatus={lib.modrinthStatus} />, document.body)}
      </div>

      <ConfirmModal isOpen={filesToDelete.length > 0} onClose={() => setFilesToDelete([])} onConfirm={handleBulkDelete} title={filesToDelete.length > 1 ? "¿Eliminar seleccionados?" : "¿Eliminar archivo?"} message={`¿Estás seguro? Esta acción no se puede deshacer.`} confirmLabel="Eliminar" cancelLabel="Cancelar" type="danger" />
      {pObjToDelete && (
        <ConfirmModal isOpen={!!projectToDelete} onClose={() => setProjectToDelete(null)} onConfirm={confirmDeleteProject} title={`¿Eliminar proyecto "${pObjToDelete.name}"?`} message="Se eliminarán físicamente todos sus archivos de configuración, recursos y carpetas en disco. Esta acción no se puede deshacer." confirmLabel="Eliminar Proyecto" cancelLabel="Cancelar" type="danger" />
      )}
    </div>
  );
}
