import React from "react";
import {
  ArrowLeft,
  Loader2,
  LayoutGrid,
  Layers,
  Glasses,
  Database,
  Archive,
  Puzzle,
  Trash2,
  Library,
  Search,
  FlaskConical,
} from "lucide-react";
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
  handleRemoveModFromCollection,
}: CollectionDetailViewProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [versionFilter, setVersionFilter] = React.useState("all");
  const [loaderFilter, setLoaderFilter] = React.useState("all");

  const availableVersions = React.useMemo(() => {
    const set = new Set<string>();
    viewMods.forEach((m) => {
      const vers = (m as any).versions || (m as any).game_versions || [];
      if (Array.isArray(vers)) {
        vers.forEach((v: string) => {
          if (typeof v === "string") set.add(v);
        });
      }
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  }, [viewMods]);

  const availableLoaders = React.useMemo(() => {
    const set = new Set<string>();
    viewMods.forEach((m) => {
      const lds = (m as any).loaders || [];
      if (Array.isArray(lds)) {
        lds.forEach((l: string) => {
          if (typeof l === "string") set.add(l.toLowerCase());
        });
      }
    });
    return Array.from(set).sort();
  }, [viewMods]);

  const displayedMods = React.useMemo(() => {
    return viewMods.filter((m) => {
      if (activeCategory !== "all" && (m.projectType || "mod") !== activeCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = m.title?.toLowerCase().includes(q);
        const matchAuthor = m.author?.toLowerCase().includes(q);
        if (!matchTitle && !matchAuthor) return false;
      }
      if (versionFilter !== "all") {
        const vers = (m as any).versions || (m as any).game_versions || [];
        if (Array.isArray(vers) && !vers.includes(versionFilter)) return false;
      }
      if (loaderFilter !== "all") {
        const lds = ((m as any).loaders || []).map((l: string) => String(l).toLowerCase());
        if (Array.isArray(lds) && !lds.includes(loaderFilter.toLowerCase())) return false;
      }
      return true;
    });
  }, [viewMods, activeCategory, searchQuery, versionFilter, loaderFilter]);

  const handleAddAllToDraft = () => {
    displayedMods.forEach((m) => {
      window.dispatchEvent(
        new CustomEvent("fomo-open-add-to-draft", {
          detail: {
            projectId: m.projectId,
            platform: m._source || "modrinth",
            title: m.title,
          },
        })
      );
    });
    window.dispatchEvent(
      new CustomEvent("fomo-show-status", {
        detail: {
          text: `Enviando ${displayedMods.length} mods al selector de Draft...`,
          type: "info",
        },
      })
    );
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center gap-3 p-4 border-b shrink-0 flex-wrap" style={{ borderColor: COLORS.border }}>
        <button onClick={() => setViewing(null)} aria-label="Volver a colecciones" className="mim-control-3d p-1.5 rounded-lg hover:bg-white/10 cursor-pointer border border-white/10">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="min-w-0 flex-1">
          <h3 className="font-headline text-sm truncate">{viewing.name}</h3>
          <p className="text-[10px] text-white/40 truncate">
            {displayedMods.length} de {viewMods.length} proyectos visibles
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAddAllToDraft}
            disabled={displayedMods.length === 0}
            className="mim-control-3d px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary disabled:opacity-40"
            title="Añadir los mods visibles a un Draft"
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>Añadir a Draft</span>
          </button>
          <button
            onClick={() => handleDownloadCollection(viewing)}
            disabled={!!collDl}
            aria-label="Descargar todos los mods"
            className="mim-control-3d px-3 py-1.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
            style={{ background: "rgba(102,200,160,0.15)", color: COLORS.emerald, border: "1px solid rgba(102,200,160,0.3)" }}
          >
            {collDl === viewing.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "↓ Descargar todos"}
          </button>
        </div>
      </div>

      {/* Toolbar: Buscador y Filtros */}
      {!viewLoading && viewMods.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-6 py-2.5 border-b shrink-0 bg-white/[0.02]" style={{ borderColor: COLORS.border }}>
          {/* Buscador dentro de la colección */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 flex-1 min-w-[160px] max-w-xs">
            <Search className="w-3.5 h-3.5 text-white/40 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar en colección..."
              className="bg-transparent text-xs text-white placeholder:text-white/30 outline-none w-full"
            />
          </div>

          {/* Categorías */}
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar py-0.5">
            <button
              onClick={() => setActiveCategory("all")}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${activeCategory === "all" ? "bg-white/10 text-white" : "opacity-40 hover:opacity-100"}`}
              style={{ color: activeCategory === "all" ? "white" : COLORS.muted }}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Todos</span>
            </button>
            {Array.from(new Set(viewMods.map((m) => m.projectType || "mod"))).map((type) => {
              const typeConfig: Record<string, { label: string; icon: React.ReactNode }> = {
                resourcepack: { label: "Texturas", icon: <Layers className="w-3.5 h-3.5" /> },
                shader: { label: "Shaders", icon: <Glasses className="w-3.5 h-3.5" /> },
                datapack: { label: "Datapacks", icon: <Database className="w-3.5 h-3.5" /> },
                modpack: { label: "Modpacks", icon: <Archive className="w-3.5 h-3.5" /> },
                mod: { label: "Mods", icon: <Puzzle className="w-3.5 h-3.5" /> },
              };
              const config = typeConfig[type] || { label: type, icon: <Library className="w-3.5 h-3.5" /> };
              return (
                <button
                  key={type}
                  onClick={() => setActiveCategory(type)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${activeCategory === type ? "bg-white/10 text-white" : "opacity-40 hover:opacity-100"}`}
                  style={{ color: activeCategory === type ? "white" : COLORS.muted }}
                >
                  {config.icon}
                  <span>{config.label}</span>
                </button>
              );
            })}
          </div>

          {/* Selector de versión */}
          {availableVersions.length > 0 && (
            <select
              value={versionFilter}
              onChange={(e) => setVersionFilter(e.target.value)}
              className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-white/5 border border-white/10 text-white cursor-pointer outline-none"
            >
              <option value="all">Todas las versiones</option>
              {availableVersions.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          )}

          {/* Selector de loader */}
          {availableLoaders.length > 0 && (
            <select
              value={loaderFilter}
              onChange={(e) => setLoaderFilter(e.target.value)}
              className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-white/5 border border-white/10 text-white capitalize cursor-pointer outline-none"
            >
              <option value="all">Todos los loaders</option>
              {availableLoaders.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Grid de mods */}
      <div className={`flex-1 overflow-y-auto custom-scrollbar px-6 pb-6 pt-2 grid grid-cols-1 ${isDetailsOpen ? "lg:grid-cols-2" : "lg:grid-cols-2 xl:grid-cols-3"} gap-2 content-start transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]`}>
        {viewLoading ? (
          <div className="col-span-full">
            <FomoSkeleton variant="card" message="Cargando mods..." count={6} />
          </div>
        ) : displayedMods.length === 0 ? (
          <div className="col-span-full py-16 text-center text-white/40 space-y-2">
            <Library className="w-8 h-8 mx-auto opacity-30 mb-2" />
            <p className="font-bold text-sm">No hay coincidencias en esta colección</p>
            <p className="text-xs text-white/30">Probá modificando la búsqueda, versión o loader.</p>
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
                resourcepack: "Texturas",
                shader: "Shaders",
                datapack: "Datapacks",
                modpack: "Modpacks",
                mod: "Mods",
              };

              if (activeCategory !== "all") {
                return displayedMods.map((mod) => (
                  <div key={mod.projectId} className="p-2 bg-transparent overflow-visible relative group">
                    <FomoModCard
                      mod={mod}
                      isDownloading={!!downloading[mod.projectId]}
                      onDownload={onDownloadMod}
                      onOpenVersions={onOpenVersions}
                      onAddToCollection={() => {}}
                      isSelected={selectedMods.some((m) => m.projectId === mod.projectId)}
                      onToggleSelect={onToggleSelect}
                      sinytraActive={sinytraActive}
                      hasUpdateAvailable={Object.values(libraryUpdates).some(
                        (s: any) => s.projectId === mod.projectId && s.status === "update_available"
                      )}
                    />
                    <button
                      onClick={() => handleRemoveModFromCollection(viewing.id, mod)}
                      className="absolute top-4 right-4 p-1.5 rounded-full bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-lg cursor-pointer border-none"
                      title="Eliminar de la colección"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ));
              }

              // Si es "todos", los agrupamos con títulos
              const groupedMods = displayedMods.reduce((acc, mod) => {
                const type = mod.projectType || "mod";
                if (!acc[type]) acc[type] = [];
                acc[type].push(mod);
                return acc;
              }, {} as Record<string, any[]>);

              return Object.entries(groupedMods).map(([type, mods]) => (
                <React.Fragment key={type}>
                  <div className="col-span-full mt-4 first:mt-0">
                    <h4 className="font-headline text-xs uppercase tracking-wider opacity-40 mb-2" style={{ color: COLORS.foreground }}>
                      {typeLabels[type] || "Otros"} ({mods.length})
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
                        isSelected={selectedMods.some((m) => m.projectId === mod.projectId)}
                        onToggleSelect={onToggleSelect}
                        sinytraActive={sinytraActive}
                        hasUpdateAvailable={Object.values(libraryUpdates).some(
                          (s: any) => s.projectId === mod.projectId && s.status === "update_available"
                        )}
                      />
                      <button
                        onClick={() => handleRemoveModFromCollection(viewing.id, mod)}
                        className="absolute top-4 right-4 p-1.5 rounded-full bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-lg cursor-pointer border-none"
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
