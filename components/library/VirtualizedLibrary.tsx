import React, { useMemo, useCallback, useState } from "react";
import { 
  ChevronDown, Layout
} from "lucide-react";
import { List } from "react-window";
import { ModCard } from "@/components/library/ModCard";
import type { LibraryFile, Project } from "@/lib/types";

interface VirtualizedLibraryProps {
  library: LibraryFile[];
  selectedLibFiles: LibraryFile[];
  setSelectedLibFiles: React.Dispatch<React.SetStateAction<LibraryFile[]>>;
  activeProject: Project | null;
  downloadingMods: Record<string, boolean>;
  modrinthStatus: Record<string, any>;
  ignoredUpdates: Set<string>;
  handleDownloadUpdate: (path: string, url: string, filename: string) => void;
}

interface ModItemData {
  mods: LibraryFile[];
  selectedLibFiles: LibraryFile[];
  setSelectedLibFiles: React.Dispatch<React.SetStateAction<LibraryFile[]>>;
  activeProject: Project | null;
  downloadingMods: Record<string, boolean>;
  modrinthStatus: Record<string, any>;
  ignoredUpdates: Set<string>;
  handleDownloadUpdate: (path: string, url: string, filename: string) => void;
  getBadge: (f: LibraryFile) => {
    badgeText?: string;
    badgeColor?: string;
    onDownload?: () => void;
  };
  onOpenDetails: (f: LibraryFile) => void;
  conflicts: Record<string, string>;
}

// Función render para cada item en la lista virtualizada (compatible con react-window)
const ModItem = ({ index, style, data }: { index: number; style: React.CSSProperties; data: ModItemData }) => {
  const {
    mods,
    selectedLibFiles,
    setSelectedLibFiles,
    activeProject,
    downloadingMods,
    modrinthStatus,
    ignoredUpdates,
    handleDownloadUpdate,
    getBadge,
    onOpenDetails
  } = data;

  const mod = mods[index];
  if (!mod) return null;

  const displayName = (mod.meta?.modName && mod.meta.modName !== "unknown") ? mod.meta.modName : mod.fileName;
  const isSelected = selectedLibFiles.some((s: LibraryFile) => s.path === mod.path);
  const badge = getBadge(mod);

  return (
    <div style={style}>
      <ModCard
        key={mod.path}
        index={index}
        name={displayName}
        version={mod.meta?.gameVersion ?? mod.meta?.version ?? "unknown"}
        modVersion={mod.meta?.modVersion}
        projectType={mod.meta?.projectType}
        iconBase64={mod.meta?.iconBase64 || modrinthStatus[mod.path]?.iconUrl}
        author={mod.meta?.author}
        loader={mod.meta?.loader ?? "unknown"}
        isSelected={isSelected}
        onClick={() => setSelectedLibFiles((prev: LibraryFile[]) =>
          isSelected ? prev.filter((s: LibraryFile) => s.path !== mod.path) : [...prev, mod]
        )}
        activeVersion={activeProject?.version ?? ""}
        activeLoader={activeProject?.loader ?? ""}
        badgeText={badge.badgeText}
        badgeColor={badge.badgeColor}
        onDownload={badge.onDownload}
        isDownloading={downloadingMods[mod.path]}
        categories={modrinthStatus[mod.path]?.categories || mod.meta?.categories}
        onOpenDetails={() => data.onOpenDetails(mod)}
        conflict={data.conflicts[mod.path]}
        hasUpdate={modrinthStatus[mod.path]?.status === "update_available" && !ignoredUpdates.has(mod.path)}
        environment={mod.meta?.environment}
      />
    </div>
  );
};

export function VirtualizedLibrary({
  library,
  selectedLibFiles,
  setSelectedLibFiles,
  activeProject,
  downloadingMods,
  modrinthStatus,
  ignoredUpdates,
  handleDownloadUpdate
}: VirtualizedLibraryProps) {
  // Memoización agresiva para evitar recálculos con grandes librerías
  const libraryHash = useMemo(() => 
    library.map(m => `${m.path}:${m.fileName}`).join('|'), 
    [library.length, library.map(m => m.path).join(',')]
  );
  
  const selectedHash = useMemo(() => 
    selectedLibFiles.map(f => f.path).join('|'),
    [selectedLibFiles.length, selectedLibFiles.map(f => f.path).join(',')]
  );

  const statusHash = useMemo(() => 
    Object.keys(modrinthStatus).sort().join('|'),
    [Object.keys(modrinthStatus).length]
  );

  // ── Conflict Detection Logic ───────────────────────────────────────────────
  const conflicts = useMemo(() => {
    const map: Record<string, string> = {};
    const modIdToPaths: Record<string, string[]> = {};

    const SYSTEM_IDS = ["minecraft", "forge", "neoforge", "fabric", "quilt", "java", "fabricloader", "quiltloader", "loader"];
    library.forEach(f => {
      const allIds = Array.from(new Set([
        f.meta?.modId,
        ...(f.meta?.providedIds || [])
      ])).filter(id => id && id !== "unknown" && !SYSTEM_IDS.includes(id.toLowerCase())) as string[];

      allIds.forEach(id => {
        if (!modIdToPaths[id]) modIdToPaths[id] = [];
        if (!modIdToPaths[id].includes(f.path)) {
          modIdToPaths[id].push(f.path);
        }
      });
    });

    Object.entries(modIdToPaths).forEach(([mid, paths]) => {
      if (paths.length > 1) {
        // Find files for these paths to check their top-level categories
        const filesForPaths = library.filter(f => paths.includes(f.path));
        const categories = new Set(filesForPaths.map(f => f.category));

        // If they are in different categories, this is an intentional duplication
        if (categories.size === paths.length) {
          return;
        }

        // Only mark duplicates that are in the same category
        const catGroupedPaths: Record<string, string[]> = {};
        filesForPaths.forEach(f => {
          if (!catGroupedPaths[f.category]) catGroupedPaths[f.category] = [];
          catGroupedPaths[f.category].push(f.path);
        });

        Object.values(catGroupedPaths).forEach(pths => {
          if (pths.length > 1) {
            pths.forEach(p => { map[p] = "Duplicado"; });
          }
        });
      }
    });

    library.forEach(f => {
      const allConflictIds = [...(f.meta?.conflicts || []), ...(f.meta?.breaks || [])];
      if (allConflictIds.length > 0) {
        library.forEach(other => {
          if (f.path === other.path) return;
          const otherId = other.meta?.modId;
          if (otherId && allConflictIds.includes(otherId)) {
            map[f.path] = `Conflicto con ${other.meta?.modName || otherId}`;
            map[other.path] = `Conflicto con ${f.meta?.modName || f.meta?.modId || f.fileName}`;
          }
        });
      }
    });

    return map;
  }, [library]);

  // Función para obtener badge info (extraída del componente original)
  const getBadge = useCallback((f: LibraryFile) => {
    const s = modrinthStatus[f.path];
    if (!s) return {};
    if (s.status === "update_available" && !ignoredUpdates.has(f.path)) return {
      badgeText: "↑ " + s.latestVersion,
      badgeColor: "bg-[rgba(250,204,21,0.15)] text-[#facc15] border border-[rgba(250,204,21,0.3)]",
      onDownload: () => handleDownloadUpdate(f.path, s.downloadUrl, f.fileName.replace(f.meta?.modVersion ?? "", s.latestVersion)),
    };
    if (s.status === "updated") return { badgeText: "Al día", badgeColor: "bg-[rgba(102,200,160,0.15)] text-[#66C8A0] border border-[rgba(102,200,160,0.25)]" };
    if (s.status === "updated_downloaded") return { badgeText: "Descargado", badgeColor: "bg-[rgba(102,200,160,0.15)] text-[#66C8A0] border border-[rgba(102,200,160,0.25)]" };
    return { badgeText: "No encontrado", badgeColor: "bg-white/8 text-foreground/40" };
  }, [modrinthStatus, ignoredUpdates, handleDownloadUpdate, statusHash]);

  // Agrupar mods por categoría y subcategoría (manteniendo la lógica original)
  const groupedLibrary = useMemo(() => {
    return library.reduce((acc, mod) => {
      const cat = mod.category || "Otros";
      if (!acc[cat]) acc[cat] = {};
      const sub = mod.sub || "general";
      if (!acc[cat][sub]) acc[cat][sub] = [];
      acc[cat][sub].push(mod);
      return acc;
    }, {} as Record<string, Record<string, LibraryFile[]>>);
  }, [library]);

  // Preparar datos para la lista virtualizada
  const itemData = useMemo<ModItemData>(() => ({
    mods: library,
    selectedLibFiles,
    setSelectedLibFiles,
    activeProject,
    downloadingMods,
    modrinthStatus,
    ignoredUpdates,
    handleDownloadUpdate,
    getBadge,
    conflicts,
    onOpenDetails: (f: LibraryFile) => {
      const rawModId = f.meta?.modId || "";
      const fileSlug = f.fileName.replace(/\.jar$/i, "").replace(/-[\d.]+.*/i, "").toLowerCase();
      const isCurseforge = /^[0-9]+$/.test(rawModId);
      const modHit: any = {
        projectId: rawModId,
        slug: rawModId || fileSlug,
        title: f.meta?.modName || f.fileName,
        description: "",
        iconUrl: f.meta?.iconBase64 || null,
        author: f.meta?.author || "Unknown",
        downloads: 0,
        follows: 0,
        latestVersion: null,
        categories: f.meta?.categories || [],
        dateCreated: "",
        projectType: f.meta?.projectType || "mod",
        url: isCurseforge
          ? `https://www.curseforge.com/minecraft/mc-mods/${rawModId}`
          : `https://modrinth.com/mod/${rawModId || fileSlug}`,
        _source: isCurseforge ? "curseforge" : "modrinth"
      };
      
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("fomo-toggle", { detail: true }));
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("fomo-open-details", { detail: modHit }));
        }, 400);
      }
    }
  }), [library, selectedLibFiles, setSelectedLibFiles, activeProject, downloadingMods, modrinthStatus, ignoredUpdates, handleDownloadUpdate, getBadge]);

  const [isNavOpen, setIsNavOpen] = useState(false);

  // Si hay pocos mods (< 50), usar renderizado normal para evitar complejidad innecesaria
  if (library.length < 50) {
    return (
      <div className="flex flex-col h-full gap-4">
        {/* Category Quick Nav */}
        <div className="flex items-center justify-end gap-4 shrink-0">
          <div className="relative">
            <button
              onClick={() => setIsNavOpen(!isNavOpen)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all font-label text-xs"
            >
              <Layout className="w-3.5 h-3.5 text-primary" />
              Categorías
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isNavOpen ? 'rotate-180' : ''}`} />
            </button>

            {isNavOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 p-2 rounded-2xl glass z-50 animate-in fade-in zoom-in-95 duration-200">
                {Object.keys(groupedLibrary).map(cat => (
                  <button
                    key={cat}
                    onClick={() => {
                      document.getElementById(`cat-${cat}`)?.scrollIntoView({ behavior: 'smooth' });
                      setIsNavOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-primary/10 transition-colors text-[10px] font-black uppercase tracking-wider flex items-center justify-between group"
                  >
                    <span className="group-hover:translate-x-1 transition-transform">{cat}</span>
                    <span className="opacity-40">{Object.values(groupedLibrary[cat] || {}).flat().length}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-8 max-h-[680px] overflow-y-auto pr-2 custom-scrollbar">
          {Object.entries(groupedLibrary).map(([category, subGroups]) => {
          const items = Object.values(subGroups).flat();
          const categoryColors: Record<string, string> = {
            ".essential": "#F2562B", // Naranja vibrante
            ".local": "#BB96E4",     // Púrpura
            ".server": "#66C8A0"      // Verde esmeralda
          };

          const catColor = categoryColors[category.toLowerCase()] || "var(--color-primary)";

          return (
            <div 
              key={category} 
              id={`cat-${category}`}
              className="animate-fade-up mb-8 scroll-mt-24 space-y-4"
            >
              <div className="flex items-center justify-between group mb-4 px-1 border-b border-white/5 pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-6 rounded-full" style={{ background: catColor }} />
                  <h3 className="text-sm font-black uppercase tracking-[0.2em]" style={{ color: catColor }}>
                    {category}
                    <span className="ml-2 text-[10px] opacity-40 font-bold">{items.length}</span>
                  </h3>
                </div>
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
                      const isSelected = selectedLibFiles.some((s) => s.path === f.path);
                      const badge = getBadge(f);
                      return (
                        <div key={f.path} className="bg-transparent overflow-visible">
                          <ModCard
                            index={i}
                            name={displayName}
                            version={f.meta?.gameVersion ?? f.meta?.version ?? "unknown"}
                            modVersion={f.meta?.modVersion}
                            projectType={f.meta?.projectType}
                            iconBase64={f.meta?.iconBase64 || modrinthStatus[f.path]?.iconUrl}
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
                            categories={modrinthStatus[f.path]?.categories || f.meta?.categories}
                            conflict={conflicts[f.path]}
                            hasUpdate={modrinthStatus[f.path]?.status === "update_available" && !ignoredUpdates.has(f.path)}
                            environment={f.meta?.environment}
                            onOpenDetails={() => {
                              const modHit: any = {
                                projectId: f.meta?.modId || "",
                                slug: f.meta?.modId || f.fileName,
                                title: f.meta?.modName || f.fileName,
                                description: "",
                                iconUrl: f.meta?.iconBase64 || null,
                                author: f.meta?.author || "Unknown",
                                downloads: 0,
                                follows: 0,
                                latestVersion: null,
                                categories: f.meta?.categories || [],
                                dateCreated: "",
                                url: `https://modrinth.com/mod/${f.meta?.modId || ""}`,
                                _source: f.meta?.modId?.match(/^[0-9]+$/) ? "curseforge" : "modrinth"
                              };
                              
                              if (typeof window !== "undefined") {
                                window.dispatchEvent(new CustomEvent("fomo-toggle", { detail: true }));
                                setTimeout(() => {
                                  window.dispatchEvent(new CustomEvent("fomo-open-details", { detail: modHit }));
                                }, 400);
                              }
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      </div>
      </div>
    );
  }

  // Para muchas librerías (50+ mods), usar virtual scrolling
  return (
    <div className="space-y-8">
      {/* Mostrar categorías como headers fijos */}
      {Object.entries(groupedLibrary).map(([category, subGroups]) => (
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
                
                {/* Lista virtualizada para esta subcategoría */}
                <div className="border border-dashed border-white/10 rounded-lg p-2">
                  {(List as any)(
                    {
                      height: Math.min(mods.length * 140, 600), // Altura dinámica basada en cantidad de mods
                      itemCount: mods.length,
                      itemSize: 140, // Altura estimada de cada ModCard
                      itemData: {
                        mods,
                        selectedLibFiles,
                        setSelectedLibFiles,
                        activeProject,
                        downloadingMods,
                        modrinthStatus,
                        ignoredUpdates,
                        handleDownloadUpdate,
                        getBadge
                      },
                      width: "100%",
                      children: ModItem as any
                    }
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
