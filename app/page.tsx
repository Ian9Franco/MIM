/**
 * @fileoverview Main application page – orchestrates all major sections.
 * Optimized for v5.9: Business logic extracted to hooks and components.
 */

"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Package, FolderOpen, FolderTree, Pickaxe, ArrowBigRight, ArrowBigRightDash } from "lucide-react";
import { useProjects }        from "../hooks/useProjects";
import { useLibrary }         from "../hooks/useLibrary";
import { useFileWatcher }     from "../hooks/useFileWatcher";
import { useStatusBanner }    from "../hooks/useStatusBanner";
import { usePendingFiles }    from "../hooks/library/usePendingFiles";
import { CATEGORY_HOTKEYS }   from "../constants/app";
import { SectionHeading, StatusBanner }     from "@/components/ui/primitives";
import { ProjectsSection }    from "@/components/projects/ProjectsSection";
import { LibrarySection }     from "@/components/library/LibrarySection";
import { WorldsSection }      from "@/components/projects/WorldsSection";
import { InstalledModsSection } from "@/components/projects/InstalledModsSection";
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
import { OnboardingTour } from "@/components/ui/OnboardingTour";

function Divider() {
  return <div className="h-px w-full" style={{ background: "var(--color-border)" }} aria-hidden="true" />;
}

export default function Page() {
  const projects = useProjects();
  const { pendingFiles, setPendingFiles, loading } = useFileWatcher();
  const [detectedVersion, setDetectedVersion] = useState("1.20.1");
  const [isHoveredMimu, setIsHoveredMimu] = useState(false);
  const [keepOpenMimu, setKeepOpenMimu] = useState(false);

  useEffect(() => {
    const fetchVersion = () => {
      fetch("/api/minecraft/mods")
        .then(res => res.json())
        .then(data => {
          if (data.detectedVersion) setDetectedVersion(data.detectedVersion);
        })
        .catch(err => console.error("Failed to detect version:", err));
    };
    
    fetchVersion();
    window.addEventListener("refresh-system", fetchVersion);
    return () => window.removeEventListener("refresh-system", fetchVersion);
  }, []);
  
  const [selectedFiles,    setSelectedFiles]    = useState<PendingFile[]>([]);
  const [appMode,          setAppMode]          = useState<"MIM" | "MIMU">("MIMU");
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(appMode === "MIMU" ? "onboarding_mimu" : "onboarding_main");
    const guidesEnabled = localStorage.getItem("guides_enabled") === "true";
    if (!seen || guidesEnabled) {
      setShowOnboarding(true);
    } else {
      setShowOnboarding(false);
    }
  }, [appMode]);

  useEffect(() => {
    const handleShowOnboarding = (e: any) => {
      setShowOnboarding(e.detail);
    };
    window.addEventListener("show-onboarding", handleShowOnboarding as any);
    return () => window.removeEventListener("show-onboarding", handleShowOnboarding as any);
  }, []);

  const onboardingSteps = [
    {
      target: '#onboarding-projects',
      title: 'Selección de Proyectos',
      content: 'Acá podés crear nuevos proyectos o seleccionar en cuál querés trabajar.'
    },
    {
      target: '#onboarding-downloads',
      title: 'Descargas Pendientes',
      content: 'Acá vas a ver los archivos que descargues. Podés seleccionarlos para clasificarlos o borrarlos.'
    },
    {
      target: '#onboarding-categorize',
      title: 'Categorización Rápida',
      content: 'Arrastrá los archivos acá para moverlos a las carpetas específicas de tu proyecto.'
    },
    {
      target: '#onboarding-library',
      title: 'Librería de Source',
      content: 'La lista completa de todos tus recursos categorizados. Desde acá los podés gestionar.'
    },
    {
      target: '#onboarding-build',
      title: 'Panel de Build',
      content: 'Acá podés ver el estado de tu build y abrir la carpeta del proyecto.'
    }
  ];

  const mimuOnboardingSteps = [
    {
      target: '#onboarding-slime',
      title: 'El Slime de MIM',
      content: 'Este es el logo de la app. Si lo ves saltando, significa que MIM está activo y listo para la acción.'
    },
    {
      target: '#onboarding-watcher',
      title: 'Estado del Watcher',
      content: 'Te indica qué carpeta está vigilando MIMu en tiempo real (Mods, Texturas, etc.).'
    },
    {
      target: '#onboarding-fomo-button',
      title: 'Modo FOMO',
      content: 'Hacé clic acá para abrir la búsqueda de mods en Modrinth y CurseForge.'
    },
    {
      target: '#onboarding-header-tools',
      title: 'Otras Herramientas',
      content: 'Fijate qué más hay: Tweak, ALRT, Sage, Gate y Ajustes.'
    },
    {
      target: '#onboarding-mimu-send',
      title: 'Enviar Todo al Juego',
      content: 'Este botón procesa y manda todas las descargas compatibles derecho a la carpeta de tu juego.'
    },
    {
      target: '#onboarding-mimu-actions',
      title: 'Accesos Rápidos',
      content: 'Botones para abrir al toque las carpetas de descargas, del juego, mods y texturas.'
    },
    {
      target: '#onboarding-mimu-downloads',
      title: 'Descargas Pendientes',
      content: 'Acá ves los archivos que descargaste y que ya están listos para mandar al juego.'
    },
    {
      target: '#onboarding-mimu-installed',
      title: 'Mods Instalados',
      content: 'La lista de los mods que ya tenés activos en tu juego.'
    },
    {
      target: '#onboarding-mimu-worlds',
      title: 'Mundos Guardados',
      content: 'Acá ves tus mundos guardados. Podés hacer backups o abrirlos directamente.'
    },
    {
      target: '#onboarding-refresh',
      title: 'Sincronizar con Disco',
      content: 'Hacé clic acá para refrescar los archivos de tu computadora si hiciste cambios por fuera.'
    },
    {
      target: '#onboarding-theme',
      title: 'Cambiar Tema',
      content: 'Podés alternar entre el modo Brutalista (oficial) y el modo Moderno (glassmorphism).'
    },
    {
      target: '#onboarding-footer',
      title: 'Pie de Página',
      content: 'Acá tenés los links al repositorio, el desarrollador y un mensaje de Ian.'
    }
  ];

  const [selectedLibFiles, setSelectedLibFiles] = useState<LibraryFile[]>([]);
  const [showSubcategories,setShowSubcategories]= useState<string | null>(null);
  const [sidebarOpen,      setSidebarOpen]      = useState(false);
  const [fomoOpen,         setFomoOpen]         = useState(false);
  const [sageOpen,         setSageOpen]         = useState(false);
  const [detailsOpen,      setDetailsOpen]      = useState(false);
  const [downloadsSidebarCollapsed, setDownloadsSidebarCollapsed] = useState(true);
  const [mounted,          setMounted]          = useState(false);
  const [autoClassify,     setAutoClassify]     = useState(false);
  const [filesToDelete,    setFilesToDelete]    = useState<PendingFile[]>([]);
  const [projectToDelete,  setProjectToDelete]  = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("mim_app_mode") as "MIM" | "MIMU";
    if (saved) setAppMode(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("mim_app_mode", appMode);
    window.dispatchEvent(new CustomEvent("mim-mode-changed", { detail: appMode }));
  }, [appMode]);
  
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth > 1400) {
      setDownloadsSidebarCollapsed(false);
    }
  }, []);
  const autoProcessing = useRef<Set<string>>(new Set());
  const prevPendingCountRef = useRef(pendingFiles.length);

  const lib = useLibrary(projects.activeProject, pendingFiles, setPendingFiles, selectedLibFiles, setSelectedLibFiles, appMode);
  const { status, showStatus, clearStatus } = useStatusBanner();
  
  const { compatibleFiles } = usePendingFiles(pendingFiles, projects.activeProject, () => {}, detectedVersion, lib.modrinthStatus);

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

  // ── Sync Details State with Global Events ──────────────────────────────────
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("fomo-details-toggle", { detail: { open: detailsOpen } }));
  }, [detailsOpen]);

  // ── Sync Pending Count with Global Events ──────────────────────────────────
  useEffect(() => {
    const dispatchCount = () => {
      window.dispatchEvent(new CustomEvent("fomo-pending-count", { detail: { count: pendingFiles.length } }));
      window.dispatchEvent(new CustomEvent("fomo-pending-files-update", { detail: { files: pendingFiles } }));
    };
    dispatchCount();
    
    window.addEventListener("fomo-request-pending-count", dispatchCount);
    return () => window.removeEventListener("fomo-request-pending-count", dispatchCount);
  }, [pendingFiles.length]);

  // ── FOMO Auto-Collapse Logic ──────────────────────────────────────────────
  useEffect(() => {
    const prevCount = prevPendingCountRef.current;
    prevPendingCountRef.current = pendingFiles.length;

    // Detect new downloads while FOMO is open
    if (fomoOpen && pendingFiles.length > prevCount) {
      const wasOpen = detailsOpen;
      
      // 1. Hide details and show downloads
      if (wasOpen) setDetailsOpen(false);
      setDownloadsSidebarCollapsed(false);

      // 2. After 2 seconds, collapse downloads and restore details
      const timer = setTimeout(() => {
        setDownloadsSidebarCollapsed(true);
        if (wasOpen) setDetailsOpen(true);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [pendingFiles.length, fomoOpen]);

  // ── Auto-Classification ────────────────────────────────────────────────────
  useEffect(() => {
    if (!projects.activeProject) return;
    
    const runAutoClassify = async () => {
      let worldName = "";
      if (appMode === "MIMU") {
        try {
          const res = await fetch("/api/minecraft/worlds");
          const data = await res.json();
          const worlds = data.worlds || [];
          if (worlds.length > 0) {
            worlds.sort((a: any, b: any) => (b.lastPlayed || 0) - (a.lastPlayed || 0));
            worldName = worlds[0].folderName;
          }
        } catch (e) {
          console.error("Failed to fetch worlds for auto-classification:", e);
        }
      }

      pendingFiles.forEach(f => {
        if (autoProcessing.current.has(f.path)) return;
        
        const isMedia = ["resourcepack", "datapack", "shader"].includes(f.meta?.projectType || "");
        if (autoClassify && (isMedia || (isVersionCompatible(f.meta?.gameVersion || "unknown", projects.activeProject!.version) && isLoaderCompatible(f.meta?.loader || "unknown", projects.activeProject!.loader, projects.activeProject!.version)))) {
          autoProcessing.current.add(f.path);
          // Usamos "auto" para todo, el backend sabrá qué hacer según el tipo de proyecto real
          lib.handleClassify("auto", "", [f], setPendingFiles, () => setSelectedFiles([]), appMode === "MIMU", worldName);
        }
      });
    };

    runAutoClassify();
  }, [autoClassify, pendingFiles, projects.activeProject, lib, setPendingFiles, appMode]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleClassify = useCallback(async (cat: string, sub: string) => {
    const filesToProcess = selectedFiles.length > 0 || selectedLibFiles.length > 0 
      ? [...selectedFiles, ...selectedLibFiles] 
      : compatibleFiles;
    
    let worldName = "";
    if (appMode === "MIMU") {
      try {
        const res = await fetch("/api/minecraft/worlds");
        const data = await res.json();
        const worlds = data.worlds || [];
        if (worlds.length > 0) {
          worlds.sort((a: any, b: any) => (b.lastPlayed || 0) - (a.lastPlayed || 0));
          worldName = worlds[0].folderName;
          console.log(`[MIMU] Auto-selected last played world: ${worldName}`);
        }
      } catch (e) {
        console.error("Failed to fetch worlds for auto-classification:", e);
      }
    }

    lib.handleClassify(cat, sub, filesToProcess, setPendingFiles, () => { setSelectedFiles([]); setSelectedLibFiles([]); setShowSubcategories(null); }, appMode === "MIMU", worldName);
  }, [lib, selectedFiles, selectedLibFiles, compatibleFiles, setPendingFiles, appMode]);
  
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
          <div id="onboarding-projects">
            <ProjectsSection projects={projects.projects} activeProjectId={projects.activeProjectId} editingId={projects.editingId} creatingNew={projects.creatingNew} setActiveProjectId={projects.setActiveProjectId} setEditingId={projects.setEditingId} setCreatingNew={projects.setCreatingNew} handleDeleteProject={(id) => setProjectToDelete(id)} handleSaveProject={projects.handleSaveProject} loaderColors={LOADER_COLORS} appMode={appMode} setAppMode={setAppMode} />
          </div>
          {appMode === "MIM" && projects.activeProject && (
            <section id="onboarding-build" className="animate-fade-up lg:min-w-[420px]">
              <SectionHeading icon={<Pickaxe className="w-4 h-4" />} title="Build" sub={`${projects.activeProject.name} · ${projects.activeProject.version} · ${projects.activeProject.loader}`} accentColor="var(--color-accent)" className="mb-4" actions={<button onClick={() => fetch("/api/project/open", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectName: projects.activeProject?.name, version: projects.activeProject?.version }) })} className="flex items-center gap-3 px-12 py-3.5 rounded-2xl bg-white/5 border border-dashed border-white/10 hover:border-primary transition-all active:scale-95 text-[10px] font-bold uppercase text-muted group hover:text-primary"><FolderOpen className="w-4 h-4" /> Abrir Carpeta</button>} />
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

        {appMode === "MIMU" ? (
          <div className="max-w-7xl mx-auto mt-6 animate-fade-up space-y-6">
            {/* Header / Top Bar */}
            <div className="flex items-center justify-between p-6 rounded-2xl backdrop-blur-md" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
              <div>
                <h2 className="font-headline text-2xl text-foreground">Modo Usuario (MIMU)</h2>
                <p className="text-sm text-muted mt-1">Las descargas se mandan derecho a tu juego.</p>
              </div>
              <button
                id="onboarding-mimu-send"
                onClick={() => {
                  handleClassify("auto", "");
                  setKeepOpenMimu(true);
                  setTimeout(() => setKeepOpenMimu(false), 5000);
                }}
                onMouseEnter={() => setIsHoveredMimu(true)}
                onMouseLeave={() => setIsHoveredMimu(false)}
                className="flex items-center gap-3 px-6 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/25 transition-all active:scale-95 hover:shadow-emerald-500/40 border border-emerald-400/20"
              >
                {isHoveredMimu || keepOpenMimu ? <ArrowBigRightDash className="w-5 h-5" /> : <ArrowBigRight className="w-5 h-5" />} Enviar Todo al Juego
              </button>
            </div>

            {/* Bento Grid */}
            <div className="grid grid-cols-[240px_1.5fr_1fr] gap-6 items-start">
              {/* Left Card - Quick Actions */}
              <div id="onboarding-mimu-actions" className="p-5 rounded-[2rem] backdrop-blur-xl space-y-4" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
                <h3 className="font-headline text-sm uppercase tracking-wider text-muted flex items-center gap-2"><FolderTree className="w-4 h-4" />Accesos Rápidos</h3>
                <div className="flex flex-col gap-2">
                  <button onClick={() => fetch("/api/open-folder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ folderPath: "downloads" }) })} className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium bg-white/5 border border-white/5 hover:bg-white/10 hover:border-primary/20 hover:text-primary transition-all active:scale-95 text-foreground/80">
                    <FolderOpen className="w-4 h-4 text-primary" /> Descargas
                  </button>
                  <button onClick={() => fetch("/api/open-folder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ folderPath: "minecraft" }) })} className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium bg-white/5 border border-white/5 hover:bg-white/10 hover:border-primary/20 hover:text-primary transition-all active:scale-95 text-foreground/80">
                    <FolderOpen className="w-4 h-4 text-primary" /> Carpeta Juego
                  </button>
                  <button onClick={() => fetch("/api/open-folder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ folderPath: "mods" }) })} className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium bg-white/5 border border-white/5 hover:bg-white/10 hover:border-primary/20 hover:text-primary transition-all active:scale-95 text-foreground/80">
                    <FolderOpen className="w-4 h-4 text-primary" /> Mods
                  </button>
                  <button onClick={() => fetch("/api/open-folder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ folderPath: "resourcepacks" }) })} className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium bg-white/5 border border-white/5 hover:bg-white/10 hover:border-primary/20 hover:text-primary transition-all active:scale-95 text-foreground/80">
                    <FolderOpen className="w-4 h-4 text-primary" /> Texturas
                  </button>
                </div>
              </div>

              {/* Middle Card - Pending Files */}
              <div id="onboarding-mimu-downloads" className={`${fomoOpen ? "opacity-0 pointer-events-none" : "opacity-100"} transition-opacity duration-700 p-6 rounded-[2rem] backdrop-blur-xl`} style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
                <PendingFilesSection pendingFiles={pendingFiles} loading={loading} selectedFiles={selectedFiles} setSelectedFiles={setSelectedFiles} activeProject={null} onDeleteFile={handleDeleteFile} layout="main" modrinthStatus={lib.modrinthStatus} detectedVersion={detectedVersion} />
              </div>

              {/* Right Card - Installed Mods (Tall) */}
              <div id="onboarding-mimu-installed" className="p-6 rounded-[2rem] backdrop-blur-xl h-full" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
                <InstalledModsSection />
              </div>
            </div>

            {/* Bottom Card - Worlds */}
            <div id="onboarding-mimu-worlds" className="p-6 rounded-[2rem] backdrop-blur-xl" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
              <WorldsSection pendingFiles={pendingFiles} />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-[1.2fr_320px_2fr] gap-6 items-start mt-6 animate-fade-up">
            <div id="onboarding-downloads" className={`${fomoOpen ? "opacity-0 pointer-events-none" : "opacity-100"} transition-opacity duration-700 p-6 rounded-[2rem] backdrop-blur-xl`} style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
              <PendingFilesSection pendingFiles={pendingFiles} loading={loading} selectedFiles={selectedFiles} setSelectedFiles={setSelectedFiles} activeProject={projects.activeProject} onDeleteFile={handleDeleteFile} layout="main" modrinthStatus={lib.modrinthStatus} detectedVersion={detectedVersion} />
            </div>
            <div id="onboarding-categorize" className="p-6 rounded-[2rem] backdrop-blur-xl" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
              <QuickCategorizeSection allSelected={[...selectedFiles, ...selectedLibFiles]} activeProject={projects.activeProject} showSubcategories={showSubcategories} setShowSubcategories={setShowSubcategories} handleClassify={handleClassify} setSelectedFiles={setSelectedFiles} setSelectedLibFiles={setSelectedLibFiles} onDeleteSelected={() => setFilesToDelete(selectedFiles)} onUnclassifySelected={() => { lib.handleUnclassify(); setSelectedLibFiles([]); }} onAutoCategorize={handleAutoCategorize} autoClassify={autoClassify} setAutoClassify={setAutoClassify} />
            </div>
            <div id="onboarding-library" className="p-6 rounded-[2rem] backdrop-blur-xl" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
              <LibrarySection library={lib.library} loadingLibrary={lib.loadingLibrary} selectedLibFiles={selectedLibFiles} setSelectedLibFiles={setSelectedLibFiles} activeProject={projects.activeProject} projects={projects.projects} downloadingMods={lib.downloadingMods} modrinthStatus={lib.modrinthStatus} ignoredUpdates={lib.ignoredUpdates} conflicts={lib.conflicts} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} checkingUpdates={lib.checkingUpdates} handleCheckUpdates={lib.handleCheckUpdates} handleViewDescription={lib.handleViewDescription} loadingDescription={lib.loadingDescription} handleSyncAllDescriptions={lib.handleSyncAllDescriptions} syncingDescriptions={lib.syncingDescriptions} handleUnclassify={lib.handleUnclassify} handleDownloadUpdate={lib.handleDownloadUpdate} autoClassify={autoClassify} setAutoClassify={setAutoClassify} pendingFiles={pendingFiles} onDeleteFile={handleDeleteFile} />
            </div>
          </div>
        )}

        {lib.modDescription && <DescriptionModal modDescription={lib.modDescription} onClose={() => lib.setModDescription(null)} />}
        <AlertSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} conflicts={lib.conflicts} bytecodeConflicts={lib.bytecodeConflicts} modrinthStatus={lib.modrinthStatus} ignoredUpdates={lib.ignoredUpdates} library={lib.library} downloadingMods={lib.downloadingMods} handleResolveConflict={lib.handleResolveConflict} handleDownloadUpdate={lib.handleDownloadUpdate} handleDismissUpdate={lib.handleDismissUpdate} checkingUpdates={lib.checkingUpdates} handleCheckUpdates={lib.handleCheckUpdates} />

        {mounted && createPortal(<FomoSidebarPortal fomoOpen={fomoOpen} detailsOpen={detailsOpen} downloadsSidebarCollapsed={downloadsSidebarCollapsed} setDownloadsSidebarCollapsed={setDownloadsSidebarCollapsed} pendingFiles={pendingFiles} loading={loading} selectedFiles={selectedFiles} setSelectedFiles={setSelectedFiles} activeProject={projects.activeProject} onDeleteFile={handleDeleteFile} modrinthStatus={lib.modrinthStatus} detectedVersion={detectedVersion} />, document.body)}
      </div>

      <ConfirmModal isOpen={filesToDelete.length > 0} onClose={() => setFilesToDelete([])} onConfirm={handleBulkDelete} title={filesToDelete.length > 1 ? "¿Eliminar seleccionados?" : "¿Eliminar archivo?"} message={`¿Estás seguro? Esta acción no se puede deshacer.`} confirmLabel="Eliminar" cancelLabel="Cancelar" type="danger" />
      {pObjToDelete && (
        <ConfirmModal isOpen={!!projectToDelete} onClose={() => setProjectToDelete(null)} onConfirm={confirmDeleteProject} title={`¿Eliminar proyecto "${pObjToDelete.name}"?`} message="Se eliminarán físicamente todos sus archivos de configuración, recursos y carpetas en disco. Esta acción no se puede deshacer." confirmLabel="Eliminar Proyecto" cancelLabel="Cancelar" type="danger" />
      )}

      {showOnboarding && (
        <OnboardingTour 
          steps={appMode === "MIMU" ? mimuOnboardingSteps : onboardingSteps} 
          onComplete={() => {
            setShowOnboarding(false);
            localStorage.setItem(appMode === "MIMU" ? "onboarding_mimu" : "onboarding_main", "true");
            window.dispatchEvent(new CustomEvent("show-onboarding", { detail: false }));
          }} 
        />
      )}
    </div>
  );
}
