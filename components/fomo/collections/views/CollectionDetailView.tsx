import React from "react";
import { ArrowLeft, Loader2, LayoutGrid, Layers, Glasses, Database, Archive, Puzzle, Trash2, Library } from "lucide-react";
import { COLORS } from "@/theme/tokens";
import { FomoSkeleton } from "@/components/fomo/core/FomoSkeleton";
import { FomoModCard } from "@/components/fomo/discover/FomoModCard";
import type { CollectionEntry, ModHit } from "@/lib/core/types";

interface CollectionDetailViewProps {
  viewing: CollectionEntry;
  setViewing: (val: CollectionEntry | null) => void;
  handleDownloadCollection: (coll: CollectionEntry) => void;
  collDl: string | null;
  viewLoading: boolean;
  viewMods: ModHit[];
  activeCategory: string;
  setActiveCategory: (cat: string) => void;
  isDetailsOpen: boolean;
  isTransitioningColumns: boolean;
  transitionTarget: "two" | "three";
  downloading: Record<string, boolean>;
  onDownloadMod: (mod: ModHit) => void;
  onOpenVersions: (mod: ModHit) => void;
  selectedMods: ModHit[];
  onToggleSelect?: (mod: ModHit) => void;
  sinytraActive?: boolean;
  libraryUpdates: Record<string, any>;
  handleRemoveModFromCollection: (collId: string, mod: ModHit) => void;
}

export function CollectionDetailView({
  viewing,
  setViewing,
  handleDownloadCollection,
  collDl,
  viewLoading,
  viewMods,
  activeCategory,
  setActiveCategory,
  isDetailsOpen,
  isTransitioningColumns,
  transitionTarget,
  downloading,
  onDownloadMod,
  onOpenVersions,
  selectedMods,
  onToggleSelect,
  sinytraActive,
  libraryUpdates,
  handleRemoveModFromCollection
}: CollectionDetailViewProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 p-4 border-b shrink-0" style={{ borderColor: COLORS.border }}>
        <button onClick={() => setViewing(null)} aria-label="Volver a colecciones" className="p-1.5 rounded-lg hover:bg-white/10">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h3 className="font-headline text-sm truncate flex-1">{viewing.name}</h3>
        <button
          onClick={() => handleDownloadCollection(viewing)}
          disabled={!!collDl}
          aria-label="Descargar todos los mods"
          className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
          style={{ background: "rgba(102,200,160,0.15)", color: COLORS.emerald, border: "1px solid rgba(102,200,160,0.3)" }}
        >
          {collDl === viewing.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "↓ Descargar todos"}
        </button>
      </div>
      
      {/* Filtros por categoría */}
      {!viewLoading && viewMods.length > 0 && (
        <div className="flex items-center gap-2 px-6 py-2 border-b shrink-0 overflow-x-auto custom-scrollbar" style={{ borderColor: COLORS.border }}>
          <button
            onClick={() => setActiveCategory("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${activeCategory === "all" ? "bg-white/10 text-white" : "opacity-40 hover:opacity-100"}`}
            style={{ color: activeCategory === "all" ? "white" : COLORS.muted }}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Todos</span>
          </button>
          {Array.from(new Set(viewMods.map(m => m.projectType || "mod"))).map((type) => {
            const typeConfig: Record<string, { label: string, icon: React.ReactNode }> = {
              "resourcepack": { label: "Texturas", icon: <Layers className="w-3.5 h-3.5" /> },
              "shader": { label: "Shaders", icon: <Glasses className="w-3.5 h-3.5" /> },
              "datapack": { label: "Datapacks", icon: <Database className="w-3.5 h-3.5" /> },
              "modpack": { label: "Modpacks", icon: <Archive className="w-3.5 h-3.5" /> },
              "mod": { label: "Mods", icon: <Puzzle className="w-3.5 h-3.5" /> }
            };
            const config = typeConfig[type] || { label: type, icon: <Library className="w-3.5 h-3.5" /> };
            return (
              <button
                key={type}
                onClick={() => setActiveCategory(type)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${activeCategory === type ? "bg-white/10 text-white" : "opacity-40 hover:opacity-100"}`}
                style={{ color: activeCategory === type ? "white" : COLORS.muted }}
              >
                {config.icon}
                <span>{config.label}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className={`flex-1 overflow-y-auto custom-scrollbar px-6 pb-6 pt-2 grid grid-cols-1 ${isDetailsOpen ? "lg:grid-cols-2" : "lg:grid-cols-2 xl:grid-cols-3"} gap-2 content-start transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]`}>
        {viewLoading ? (
          <div className="col-span-full">
            <FomoSkeleton variant="card" message="Cargando mods..." count={6} />
          </div>
        ) : (
          <>
            {isTransitioningColumns ? (
              <div className="col-span-full animate-fade-in">
                <FomoSkeleton 
                  variant="card"
                  message={transitionTarget === "two" ? "Adaptando columnas..." : "Expandiendo catálogo..."} 
                  count={transitionTarget === "two" ? 6 : 9} 
                />
              </div>
            ) : (() => {
              const typeLabels: Record<string, string> = {
                "resourcepack": "Texturas",
                "shader": "Shaders",
                "datapack": "Datapacks",
                "modpack": "Modpacks",
                "mod": "Mods"
              };

              const filteredMods = activeCategory === "all" 
                ? viewMods 
                : viewMods.filter(m => (m.projectType || "mod") === activeCategory);

              if (activeCategory !== "all") {
                return filteredMods.map((mod) => (
                  <div key={mod.projectId} className="p-2 bg-transparent overflow-visible relative group">
                    <FomoModCard 
                      mod={mod} 
                      isDownloading={!!downloading[mod.projectId]} 
                      onDownload={onDownloadMod} 
                      onOpenVersions={onOpenVersions} 
                      onAddToCollection={() => {}} 
                      isSelected={selectedMods.some(m => m.projectId === mod.projectId)}
                      onToggleSelect={onToggleSelect}
                      sinytraActive={sinytraActive}
                      hasUpdateAvailable={Object.values(libraryUpdates).some(
                        (s: any) => s.projectId === mod.projectId && s.status === "update_available"
                      )}
                    />
                    <button 
                      onClick={() => handleRemoveModFromCollection(viewing.id, mod)}
                      className="absolute top-4 right-4 p-1.5 rounded-full bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-lg"
                      title="Eliminar de la colección"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ));
              }

              // Si es "todos", los agrupamos con títulos
              const groupedMods = viewMods.reduce((acc, mod) => {
                const type = mod.projectType || "mod";
                if (!acc[type]) acc[type] = [];
                acc[type].push(mod);
                return acc;
              }, {} as Record<string, any[]>);

              return Object.entries(groupedMods).map(([type, mods]) => (
                <React.Fragment key={type}>
                  <div className="col-span-full mt-4 first:mt-0">
                    <h4 className="font-headline text-xs uppercase tracking-wider opacity-40 mb-2" style={{ color: COLORS.foreground }}>
                      {typeLabels[type] || "Otros"}
                    </h4>
                  </div>
                  {mods.map((mod) => (
                    <div key={mod.projectId} className="p-2 bg-transparent overflow-visible relative group">
                      <FomoModCard 
                        mod={mod} 
                        isDownloading={!!downloading[mod.projectId]} 
                        onDownload={onDownloadMod} 
                        onOpenVersions={onOpenVersions} 
                        onAddToCollection={() => {}} 
                        isSelected={selectedMods.some(m => m.projectId === mod.projectId)}
                        onToggleSelect={onToggleSelect}
                        sinytraActive={sinytraActive}
                        hasUpdateAvailable={Object.values(libraryUpdates).some(
                          (s: any) => s.projectId === mod.projectId && s.status === "update_available"
                        )}
                      />
                      <button 
                        onClick={() => handleRemoveModFromCollection(viewing.id, mod)}
                        className="absolute top-4 right-4 p-1.5 rounded-full bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-lg"
                        title="Eliminar de la colección"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </React.Fragment>
              ));
            })()}
          </>
        )}
      </div>
    </div>
  );
}
