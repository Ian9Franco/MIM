"use client";

import React, { useState } from "react";
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
  handleUnclassify, handleDownloadUpdate, autoClassify, setAutoClassify, pendingFiles
}: any) {
  
  const [transferOpen, setTransferOpen] = useState(false);
  const [showDupOptions, setShowDupOptions] = useState(false);
  const [openingFolder, setOpeningFolder] = useState(false);

  const { handleDuplicateTo } = useLibrarySection(
    activeProject, selectedLibFiles, setSelectedLibFiles, 
    modrinthStatus, ignoredUpdates, conflicts
  );

  const handleOpenFolder = async () => {
    setOpeningFolder(true);
    try {
      if (library.length > 0) {
        await fetch("/api/open-folder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folderPath: library[0].path.substring(0, library[0].path.lastIndexOf('\\')) }),
        });
      } else if (activeProject) {
        await fetch("/api/project/open", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectName: activeProject.name, version: activeProject.version }),
        });
      }
    } finally { setOpeningFolder(false); }
  };

  return (
    <section className="animate-fade-up relative">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-headline text-base leading-none">Librería de Source</h2>
            <p className="text-xs opacity-50 mt-1">{library.length} mods instalados</p>
          </div>
        </div>

        <LibraryToolbar 
          selectedLibFiles={selectedLibFiles} showDupOptions={showDupOptions} setShowDupOptions={setShowDupOptions}
          handleDuplicateTo={handleDuplicateTo} handleUnclassify={handleUnclassify}
          autoClassify={autoClassify} setAutoClassify={setAutoClassify}
          setTransferOpen={setTransferOpen} handleOpenFolder={handleOpenFolder} 
          openingFolder={openingFolder} libraryCount={library.length}
        />
      </div>

      {loadingLibrary ? (
        <div className="space-y-3"><SkeletonLoader message="Escaneando librería..." /><SkeletonLoader message="Buscando actualizaciones..." /></div>
      ) : library.length === 0 ? (
        (!pendingFiles || pendingFiles.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center rounded-[2.5rem] border border-dashed border-white/10 bg-white/5">
            <Layers className="w-12 h-12 mb-4 opacity-10 text-emerald-400" />
            <p className="text-sm font-bold opacity-80 mb-2">No hay mods instalados en este proyecto aún</p>
            {activeProject && (
              <button onClick={() => setTransferOpen(true)} className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold bg-primary text-white shadow-lg shadow-primary/20 hover:scale-105 transition-all">
                <ArrowLeftRight className="w-5 h-5" /> Importar desde Librería Global
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center rounded-[2.5rem] border border-dashed border-white/5 bg-white/5 animate-fade-in">
            <Layers className="w-8 h-8 mb-3 opacity-20 text-emerald-400" />
            <p className="text-xs font-medium text-white/50 italic">Librería vacía. Clasificá los mods pendientes de la izquierda para llenar esta sección.</p>
          </div>
        )
      ) : (
        <VirtualizedLibrary
          library={library} selectedLibFiles={selectedLibFiles} setSelectedLibFiles={setSelectedLibFiles}
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
