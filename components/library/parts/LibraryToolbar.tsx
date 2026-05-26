import React from "react";
import { BookOpen, Copy, FolderOpen, Cpu, ArrowLeftRight, Loader2, Trash2, Puzzle, Layers, Database, Glasses } from "lucide-react";

/**
 * @fileoverview Barra de Herramientas de Gestión Masiva (Librería).
 * ─────────────────────────────────────────────────────────────────────────────
 * Panel de acciones dinámicas que responde al estado de selección de la librería.
 * Permite ejecutar acciones por lote (como des-clasificar) o acciones de un solo
 * archivo (como ver detalles en FOMO o duplicar entre entornos).
 * ─────────────────────────────────────────────────────────────────────────────
 */

export function LibraryToolbar({ 
  selectedLibFiles, loadingDescription, showDupOptions, setShowDupOptions, 
  handleDuplicateTo, handleUnclassify, autoClassify, setAutoClassify, 
  setTransferOpen, handleOpenFolder, openingFolder, libraryCount,
  onDeleteSelected, filterType, setFilterType, previewMode, setPreviewMode
}: any) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap xl:justify-end">
      {/* Grupo de Acciones Principales */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Acción 1: Apertura de Detalles en la Ventana Modal de FOMO (Solo 1 archivo) */}
        {selectedLibFiles.length === 1 && (
          <ActionButton
            onClick={() => {
              const f = selectedLibFiles[0];
              const isResourcePack = f.meta?.projectType === "resourcepack" || f.fileName.endsWith(".zip");
              const hasRealId = f.meta?.modId && f.meta.modId !== "unknown" && !f.meta.modId.endsWith(".zip");

              if (!hasRealId || isResourcePack) {
                const baseName = f.meta?.modName && f.meta.modName !== "unknown" ? f.meta.modName : f.fileName;
                const query = baseName.replace(/\.(zip|jar)$/i, "").replace(/[_\-][vV]?\d+[\.\d]*.*$/, "");
                
                // Intentamos buscar el proyecto en Modrinth para abrirlo directamente
                fetch(`/api/modrinth/discover?query=${encodeURIComponent(query)}&projectType=resourcepack&page=1`)
                  .then(r => r.json())
                  .then(data => {
                    const hits = data.hits || [];
                    if (hits.length > 0) {
                      const hit = hits[0];
                      const modHit = {
                        projectId: hit.project_id || hit.projectId,
                        slug: hit.slug,
                        title: hit.title,
                        iconUrl: hit.icon_url || hit.iconUrl,
                        author: hit.author,
                        categories: hit.categories,
                        projectType: "resourcepack",
                        _source: "modrinth",
                      };
                      window.dispatchEvent(new CustomEvent("fomo-open-details", { detail: modHit }));
                    } else {
                      // Si no encuentra nada, fallback al buscador con el nombre limpio
                      window.dispatchEvent(new CustomEvent("fomo-toggle", { detail: true }));
                      window.dispatchEvent(new CustomEvent("fomo-search-and-open", { detail: { query } }));
                    }
                  })
                  .catch(() => {
                    // Fallback al buscador
                    window.dispatchEvent(new CustomEvent("fomo-toggle", { detail: true }));
                    window.dispatchEvent(new CustomEvent("fomo-search-and-open", { detail: { query } }));
                  });
              } else {
                // Si tiene ID real, abrimos detalles directamente
                const modHit = { 
                  projectId: f.meta.modId, 
                  title: f.meta?.modName || f.fileName, 
                  _source: (f.meta as any)?.source || "modrinth" 
                };
                window.dispatchEvent(new CustomEvent("fomo-open-details", { detail: modHit }));
              }
            }}
            disabled={loadingDescription}
            icon={loadingDescription ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BookOpen className="w-3.5 h-3.5" />}
            label="Detalles" color="success"
          />
        )}

        {/* Acción 2: Menú Desplegable para Duplicar a otra Capa (.local, .essential, .server) */}
        {selectedLibFiles.length === 1 && (
          <div className="relative">
            <ActionButton 
              onClick={() => setShowDupOptions(!showDupOptions)} 
              icon={<Copy className="w-3.5 h-3.5" />} 
              label="Duplicar" 
              color="primary" 
              highlighted={showDupOptions} 
            />
            {showDupOptions && (
              <div className="absolute top-full right-0 mt-2 p-2 rounded-2xl glass border border-white/10 z-50 min-w-[160px] flex flex-col gap-1 shadow-2xl">
                <p className="text-[9px] opacity-40 px-2 font-bold uppercase">Copia a:</p>
                {[".local", ".essential", ".server"].filter(c => c !== selectedLibFiles[0].category).map(cat => (
                  <button 
                    key={cat} 
                    onClick={() => handleDuplicateTo(cat)} 
                    className="text-left text-[11px] px-3 py-2 rounded-lg hover:bg-white/5 font-bold transition-all"
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Acción 3: Des-clasificar (Mover archivos a la sección de pendientes) */}
        {selectedLibFiles.length > 0 && (
          <ActionButton 
            onClick={handleUnclassify} 
            icon={<FolderOpen className="w-3.5 h-3.5" />} 
            label="Des-clasificar" 
            color="neutral" 
          />
        )}

        {/* Acción 4: Eliminar (Eliminar permanentemente de la librería) */}
        {selectedLibFiles.length > 0 && onDeleteSelected && (
          <ActionButton 
            onClick={onDeleteSelected} 
            icon={<Trash2 className="w-3.5 h-3.5" />} 
            label="Eliminar" 
            color="danger" 
          />
        )}

        {/* Grupo de Herramientas del Sistema Local */}
        <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/5">
          <ActionButton 
            onClick={() => setTransferOpen(true)} 
            icon={<ArrowLeftRight className="w-3.5 h-3.5" />} 
            label="Transferir" 
            color="primary" 
          />
        </div>

        {/* Acción Directa: Abrir carpeta física en el Explorador de Windows */}
        <ActionButton 
          onClick={handleOpenFolder} 
          disabled={openingFolder || libraryCount === 0} 
          icon={openingFolder ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderOpen className="w-3.5 h-3.5" />} 
          label="Carpeta" 
          color="neutral" 
        />
      </div>

      {/* Grupo de Filtros */}
      <div className="flex flex-wrap items-center gap-2">

      {/* Previsualización de Entorno */}
      <div className="flex flex-wrap items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5 ml-auto">
        <button
          onClick={() => setPreviewMode("all")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${previewMode === "all" ? "bg-emerald-500 text-white" : "text-white/40 hover:text-white"}`}
        >
          Normal
        </button>
        <button
          onClick={() => setPreviewMode("user")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${previewMode === "user" ? "bg-emerald-500 text-white" : "text-white/40 hover:text-white"}`}
        >
          User (Client)
        </button>
        <button
          onClick={() => setPreviewMode("host")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${previewMode === "host" ? "bg-emerald-500 text-white" : "text-white/40 hover:text-white"}`}
        >
          Host (Server)
        </button>
      </div>

      {/* Filtro: Mods / Texturas / Datapacks / Shaders */}
      <div className="flex flex-wrap items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
        <button
          onClick={() => setFilterType("mod")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${filterType === "mod" ? "bg-primary text-white" : "text-white/40 hover:text-white"}`}
        >
          <Puzzle className="w-3.5 h-3.5" />
          Mods
        </button>
        <button
          onClick={() => setFilterType("resourcepack")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${filterType === "resourcepack" ? "bg-primary text-white" : "text-white/40 hover:text-white"}`}
        >
          <Layers className="w-3.5 h-3.5" />
          Texturas
        </button>
        <button
          onClick={() => setFilterType("datapack")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${filterType === "datapack" ? "bg-primary text-white" : "text-white/40 hover:text-white"}`}
        >
          <Database className="w-3.5 h-3.5" />
          Datapacks
        </button>
        <button
          onClick={() => setFilterType("shader")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${filterType === "shader" ? "bg-primary text-white" : "text-white/40 hover:text-white"}`}
        >
          <Glasses className="w-3.5 h-3.5" />
          Shaders
        </button>
      </div>
      </div>
    </div>
  );
}

/**
 * ActionButton: Botón de interfaz estandarizado para la barra de herramientas.
 */
function ActionButton({ onClick, disabled, icon, label, color, highlighted }: any) {
  const styles: any = {
    primary: "bg-primary/10 text-primary border-primary/20",
    success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    danger: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    neutral: "bg-white/5 text-white/70 border-white/10",
  };
  return (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-label text-xs border transition-all ${styles[color] || styles.neutral} ${highlighted ? 'ring-2 ring-primary/30 shadow-lg scale-105' : 'hover:scale-[1.02]'}`}
    >
      {icon} <span>{label}</span>
    </button>
  );
}
