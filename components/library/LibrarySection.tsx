"use client";

import React, { useState, useEffect } from "react";
import { Layers, ArrowLeftRight } from "lucide-react";
import { VirtualizedLibrary } from "@/components/library/VirtualizedLibrary";
import { SkeletonLoader } from "@/components/ui/SkeletonLoader";
import { TransferModal } from "./TransferModal";
import { LibraryToolbar } from "./parts/LibraryToolbar";
import { useLibrarySection } from "@/hooks/library/useLibrarySection";

/**
 * LibrarySection — Contenedor principal de la librería de mods del proyecto activo.
 * Gestiona el toolbar de acciones, el estado de carga y la integración con la lista virtualizada.
 */
export function LibrarySection({
  library, loadingLibrary, selectedLibFiles, setSelectedLibFiles, activeProject,
  projects = [], downloadingMods, modrinthStatus, ignoredUpdates, conflicts,
  handleUnclassify, handleDownloadUpdate, autoClassify, setAutoClassify, pendingFiles,
  onDeleteFile
}: any) {
  
  const [transferOpen, setTransferOpen] = useState(false);
  const [showDupOptions, setShowDupOptions] = useState(false);
  const [openingFolder, setOpeningFolder] = useState(false);
  const [filterType, setFilterType] = useState<"mod" | "resourcepack" | "datapack" | "shader">("mod");
  const [previewMode, setPreviewMode] = useState<"all" | "user" | "host">("all");

  const { handleDuplicateTo } = useLibrarySection(
    activeProject, selectedLibFiles, setSelectedLibFiles, 
    modrinthStatus, ignoredUpdates, conflicts
  );

  useEffect(() => {
    const label = filterType === "mod" ? "Mods" : filterType === "resourcepack" ? "Texturas" : filterType === "shader" ? "Shaders" : "Datapacks";
    window.dispatchEvent(new CustomEvent("watcher-status-change", { detail: `Librería: ${label}` }));
    return () => {
      window.dispatchEvent(new CustomEvent("watcher-status-change", { detail: "Watcher" }));
    };
  }, [filterType]);

  const handleOpenFolder = async () => {
    setOpeningFolder(true);
    try {
      if (filterType === "resourcepack") {
        await fetch("/api/open-folder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folderPath: "resourcepacks" }),
        });
      } else {
        // Buscamos un archivo del tipo actual para abrir su carpeta
        const fileOfType = library.find((f: any) => {
          if (filterType === "mod") return !f.meta?.projectType || f.meta?.projectType === "mod";
          return f.meta?.projectType === filterType;
        });

        if (fileOfType) {
          await fetch("/api/open-folder", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ folderPath: fileOfType.path.substring(0, fileOfType.path.lastIndexOf('\\')) }),
          });
        } else if (activeProject) {
          // Si no hay archivos de ese tipo, abrimos la carpeta del proyecto
          await fetch("/api/project/open", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ projectName: activeProject.name, version: activeProject.version }),
          });
        }
      }
    } finally { setOpeningFolder(false); }
  };

  const filteredLibrary = library.filter((f: any) => {
    // Primero filtrar por tipo
    let matchType = false;
    if (filterType === "mod") {
      matchType = !f.meta?.projectType || f.meta?.projectType === "mod";
    } else {
      matchType = f.meta?.projectType === filterType;
    }
    
    if (!matchType) return false;

    // Luego filtrar por previsualización de entorno
    if (previewMode === "all") return true;
    
    const isEssential = f.path.includes(".essential");
    const isLocal = f.path.includes(".local");
    const isServer = f.path.includes(".server");

    if (previewMode === "user") {
      return isEssential || isLocal;
    }
    if (previewMode === "host") {
      return isEssential || isServer;
    }
    
    return true;
  });

  const handleDeleteSelected = async () => {
    if (selectedLibFiles.length === 0 || !onDeleteFile) return;
    if (confirm(`¿Estás seguro de que querés eliminar ${selectedLibFiles.length} archivos de la librería?`)) {
      for (const file of selectedLibFiles) {
        await onDeleteFile(file);
      }
      setSelectedLibFiles([]);
      // Force refresh library
      window.dispatchEvent(new CustomEvent("refresh-system"));
    }
  };

  const typeLabels: Record<string, string> = {
    mod: "mods",
    resourcepack: "texturas",
    datapack: "datapacks",
    shader: "shaders",
  };

  return (
    <section className="animate-fade-up relative">
      <div className="flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-5 mb-6">
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-headline text-base leading-none">Librería de Source</h2>
            <p className="text-xs opacity-50 mt-1">
              {filteredLibrary.length} {typeLabels[filterType] || filterType} en lista
            </p>
          </div>
        </div>

        <LibraryToolbar 
          selectedLibFiles={selectedLibFiles} showDupOptions={showDupOptions} setShowDupOptions={setShowDupOptions}
          handleDuplicateTo={handleDuplicateTo} handleUnclassify={handleUnclassify}
          autoClassify={autoClassify} setAutoClassify={setAutoClassify}
          setTransferOpen={setTransferOpen} handleOpenFolder={handleOpenFolder} 
          openingFolder={openingFolder} libraryCount={library.length}
          onDeleteSelected={handleDeleteSelected} filterType={filterType} setFilterType={setFilterType}
          previewMode={previewMode} setPreviewMode={setPreviewMode}
        />
      </div>

      {loadingLibrary ? (
        <div className="space-y-3"><SkeletonLoader message="Escaneando librería..." /><SkeletonLoader message="Buscando actualizaciones..." /></div>
      ) : filteredLibrary.length === 0 ? (
        (!pendingFiles || pendingFiles.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center rounded-[2.5rem] border border-dashed" style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}>
            <Layers className="w-12 h-12 mb-4 opacity-10 text-emerald-400" />
            <p className="text-sm font-bold opacity-80 mb-2">No hay {typeLabels[filterType] || filterType} instalados en este proyecto aún</p>
            {activeProject && filterType === "mod" && (
              <button onClick={() => setTransferOpen(true)} className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold bg-primary text-white shadow-lg shadow-primary/20 hover:scale-105 transition-all">
                <ArrowLeftRight className="w-5 h-5" /> Importar desde Librería Global
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center rounded-[2.5rem] border border-dashed animate-fade-in" style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}>
            <Layers className="w-8 h-8 mb-3 opacity-20 text-emerald-400" />
            <p className="text-xs font-medium text-white/50 italic">No hay {typeLabels[filterType] || filterType} en la librería. Clasificá archivos pendientes para llenar esta sección.</p>
          </div>
        )
      ) : (
        <VirtualizedLibrary
          library={filteredLibrary} selectedLibFiles={selectedLibFiles} setSelectedLibFiles={setSelectedLibFiles}
          activeProject={activeProject} downloadingMods={downloadingMods} modrinthStatus={modrinthStatus}
          ignoredUpdates={ignoredUpdates} handleDownloadUpdate={handleDownloadUpdate}
        />
      )}

      {activeProject && transferOpen && (
        <TransferModal activeProject={activeProject} projects={projects} onClose={() => setTransferOpen(false)} />
      )}
    </section>
  );
}
