import React, { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Package, Loader2, Search, Trash2, Image, Check, Sparkles, Database, Layers2, Puzzle, Glasses, Info } from "lucide-react";
import { SectionHeading } from "../ui/SectionHeading";

interface ContentItem {
  fileName: string;
  size: number;
  mtime: string;
  path: string;
  isFolder?: boolean;
}

export function InstalledModsSection() {
  const [mods, setMods] = useState<ContentItem[]>([]);
  const [textures, setTextures] = useState<ContentItem[]>([]);
  const [shaders, setShaders] = useState<ContentItem[]>([]);
  const [datapacks, setDatapacks] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"mods" | "textures" | "shaders" | "datapacks">("mods");
  const [itemsToDelete, setItemsToDelete] = useState<ContentItem[]>([]);
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(10);
  const [icons, setIcons] = useState<Record<string, string>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchContent = useCallback(() => {
    setLoading(true);
    setSelectedPaths([]);
    setVisibleCount(10);
    
    const label = activeTab === "mods" ? "Mods" : activeTab === "textures" ? "Texturas" : activeTab === "shaders" ? "Shaders" : "Datapacks";
    window.dispatchEvent(new CustomEvent("watcher-status-change", { detail: label }));
    
    let url = "/api/minecraft/mods";
    if (activeTab === "textures") url = "/api/minecraft/resourcepacks";
    if (activeTab === "shaders") url = "/api/minecraft/shaderpacks";
    if (activeTab === "datapacks") url = "/api/minecraft/datapacks";

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (activeTab === "mods") setMods(data.mods || []);
        else if (activeTab === "textures") setTextures(data.packs || []);
        else if (activeTab === "shaders") setShaders(data.packs || []);
        else if (activeTab === "datapacks") setDatapacks(data.packs || []);
        setLoading(false);
        window.dispatchEvent(new CustomEvent("watcher-status-change", { detail: "Watcher" }));
      })
      .catch((err) => {
        console.error(`Failed to fetch ${activeTab}:`, err);
        setLoading(false);
        window.dispatchEvent(new CustomEvent("watcher-status-change", { detail: "Watcher" }));
      });
  }, [activeTab]);

  useEffect(() => {
    fetchContent();

    const handleRefresh = () => fetchContent();
    window.addEventListener("refresh-system", handleRefresh);
    return () => window.removeEventListener("refresh-system", handleRefresh);
  }, [fetchContent]);

  const currentList = activeTab === "mods" ? mods : activeTab === "textures" ? textures : activeTab === "shaders" ? shaders : datapacks;

  const filteredItems = currentList.filter((item) =>
    item.fileName.toLowerCase().includes(search.toLowerCase())
  );

  const visibleItems = filteredItems.slice(0, visibleCount);

  useEffect(() => {
    visibleItems.forEach((item) => {
      if (!icons[item.path]) {
        fetch(`/api/minecraft/mod-icon?path=${encodeURIComponent(item.path)}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.iconBase64) {
              setIcons((prev) => ({ ...prev, [item.path]: data.iconBase64 }));
            }
          })
          .catch((err) => console.error(`Failed to fetch icon for ${item.fileName}:`, err));
      }
    });
  }, [visibleItems, icons]);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <section className="animate-fade-up relative h-full flex flex-col">
      <SectionHeading
        icon={<Layers2 className="w-4 h-4" />}
        title="Contenido Instalado"
        sub="Detectados en .minecraft"
        badge={currentList.length}
        accentColor="var(--color-primary)"
      />

      {/* Tabs */}
      <div className="flex gap-2 mt-4 mb-3 p-1 bg-[var(--color-secondary-bg)] rounded-xl border border-[var(--color-border)] overflow-x-auto">
        <button
          onClick={() => setActiveTab("mods")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
            activeTab === "mods"
              ? "bg-[var(--color-accent-bg)] text-[var(--color-accent)] shadow-sm border border-[var(--color-accent-border)]"
              : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
          }`}
        >
          <Puzzle className="w-4 h-4" /> Mods
        </button>
        <button
          onClick={() => setActiveTab("textures")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
            activeTab === "textures"
              ? "bg-[var(--color-accent-bg)] text-[var(--color-accent)] shadow-sm border border-[var(--color-accent-border)]"
              : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
          }`}
        >
          <Image className="w-4 h-4" /> Texturas
        </button>
        <button
          onClick={() => setActiveTab("shaders")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
            activeTab === "shaders"
              ? "bg-[var(--color-accent-bg)] text-[var(--color-accent)] shadow-sm border border-[var(--color-accent-border)]"
              : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
          }`}
        >
          <Glasses className="w-4 h-4" /> Shaders
        </button>
        <button
          onClick={() => setActiveTab("datapacks")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
            activeTab === "datapacks"
              ? "bg-[var(--color-accent-bg)] text-[var(--color-accent)] shadow-sm border border-[var(--color-accent-border)]"
              : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
          }`}
        >
          <Database className="w-4 h-4" /> Datapacks
        </button>
      </div>

      <div className="mb-3 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-muted)]" />
        <input
          type="text"
          placeholder={`Buscar ${activeTab === "mods" ? "mods" : activeTab === "textures" ? "texturas" : activeTab === "shaders" ? "shaders" : "datapacks"}...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-xl bg-[var(--color-secondary-bg)] border border-[var(--color-border)] focus:border-primary focus:outline-none text-sm transition-colors text-[var(--color-foreground)]"
        />
      </div>

      {selectedPaths.length > 0 && (
        <div className="mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between animate-fade-in">
          <span className="text-sm text-red-400 font-medium">{selectedPaths.length} seleccionados</span>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedPaths([])}
              className="px-3 py-1.5 rounded-lg bg-[var(--color-secondary-bg)] text-[var(--color-foreground)] text-xs font-medium hover:bg-[var(--color-border)] transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={async () => {
                const selectedItems = currentList.filter(item => selectedPaths.includes(item.path));
                const res = await fetch("/api/unclassify", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ sourcePaths: selectedItems.map((item: any) => item.path) })
                });
                if (res.ok) {
                  setSelectedPaths([]);
                  window.dispatchEvent(new CustomEvent("refresh-system"));
                }
              }}
              className="px-3 py-1.5 rounded-xl transition-all hover:scale-105 active:scale-95 text-[10px] font-bold uppercase tracking-wider"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--color-foreground)" }}
            >
              Mover a Descargas
            </button>
            <button
              onClick={() => {
                const selectedItems = currentList.filter(item => selectedPaths.includes(item.path));
                setItemsToDelete(selectedItems);
              }}
              className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> Eliminar
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-[var(--color-muted)]">Cargando...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-[var(--color-border)] rounded-2xl bg-[var(--color-secondary-bg)]">
            {activeTab === "mods" ? (
              <Puzzle className="w-8 h-8 mx-auto mb-2 opacity-30 text-[var(--color-muted)]" />
            ) : activeTab === "textures" ? (
              <Image className="w-8 h-8 mx-auto mb-2 opacity-30 text-[var(--color-muted)]" />
            ) : activeTab === "shaders" ? (
              <Glasses className="w-8 h-8 mx-auto mb-2 opacity-30 text-[var(--color-muted)]" />
            ) : (
              <Database className="w-8 h-8 mx-auto mb-2 opacity-30 text-[var(--color-muted)]" />
            )}
            <p className="text-sm text-[var(--color-muted)]">No se encontraron elementos.</p>
          </div>
        ) : (
          visibleItems.map((item) => (
            <div
              key={item.fileName}
              onClick={() => {
                if (selectedPaths.includes(item.path)) {
                  setSelectedPaths(selectedPaths.filter((p) => p !== item.path));
                } else {
                  setSelectedPaths([...selectedPaths, item.path]);
                }
              }}
              className={`p-3 rounded-xl border transition-all group flex items-center justify-between gap-3 cursor-pointer ${
                selectedPaths.includes(item.path)
                  ? "border-primary/50 bg-primary/5"
                  : "border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[color-mix(in_srgb,var(--color-card)_95%,var(--color-primary))]"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                    selectedPaths.includes(item.path)
                      ? "bg-primary border-primary text-white"
                      : "border-[var(--color-border)] bg-[var(--color-secondary-bg)] hover:border-primary/50"
                  }`}
                >
                  {selectedPaths.includes(item.path) && (
                    <Check className="w-3 h-3 text-white" />
                  )}
                </div>
                <div className="w-8 h-8 rounded-lg bg-[var(--color-secondary-bg)] flex items-center justify-center shrink-0 border border-[var(--color-border)]">
                  {icons[item.path] ? (
                    <img src={icons[item.path]} alt={item.fileName} className="w-full h-full object-cover rounded-lg" />
                  ) : activeTab === "mods" ? (
                    <Puzzle className="w-4 h-4 text-[var(--color-muted)]" />
                  ) : activeTab === "textures" ? (
                    <Image className="w-4 h-4 text-[var(--color-muted)]" />
                  ) : activeTab === "shaders" ? (
                    <Glasses className="w-4 h-4 text-[var(--color-muted)]" />
                  ) : (
                    <Database className="w-4 h-4 text-[var(--color-muted)]" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-subhead text-sm truncate max-w-[160px] md:max-w-[200px]" title={item.fileName} style={{ color: "var(--color-foreground)" }}>
                    {item.fileName}
                  </h3>
                  <p className="font-caption text-xs text-[var(--color-muted)]">
                    {item.size > 0 ? formatSize(item.size) : "Carpeta"} • {new Date(item.mtime).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    const query = item.fileName.replace(/\.(zip|jar)$/i, "").replace(/[_\-][vV]?\d+[\.\d]*.*$/, "").replace(/[-_]+/g, " ").trim();
                    const pType = activeTab === 'textures' ? 'resourcepack' : activeTab === 'shaders' ? 'shader' : activeTab === 'datapacks' ? 'datapack' : 'mod';
                    fetch(`/api/modrinth/discover?q=${encodeURIComponent(query)}&projectType=${pType}&loader=unknown&page=1`)
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
                            projectType: pType,
                            _source: "modrinth",
                          };
                          window.dispatchEvent(new CustomEvent("fomo-open-details", { detail: modHit }));
                        } else {
                          window.dispatchEvent(new CustomEvent("fomo-toggle", { detail: true }));
                          window.dispatchEvent(new CustomEvent("fomo-search-and-open", { detail: { query } }));
                        }
                      })
                      .catch(() => {
                        window.dispatchEvent(new CustomEvent("fomo-toggle", { detail: true }));
                        window.dispatchEvent(new CustomEvent("fomo-search-and-open", { detail: { query } }));
                      });
                  }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center bg-[var(--color-secondary-bg)] border border-[var(--color-border)] hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-colors"
                  title="Ver detalles"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setItemsToDelete([item]); }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center bg-[var(--color-secondary-bg)] border border-[var(--color-border)] hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-colors"
                  title="Eliminar archivo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
        {filteredItems.length > visibleCount && (
          <button
            onClick={() => setVisibleCount(visibleCount + 10)}
            className="w-full py-2.5 mt-2 rounded-xl border border-dashed border-[var(--color-border)] text-sm text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-secondary-bg)] transition-all font-medium"
          >
            Cargar más (+10)
          </button>
        )}
      </div>

      {/* Custom Confirmation Modal */}
      {itemsToDelete.length > 0 && mounted && createPortal(
        <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-[2rem] p-6 max-w-md w-full shadow-2xl animate-fade-up">
            <h3 className="font-headline text-lg mb-2" style={{ color: "var(--color-foreground)" }}>Confirmar eliminación</h3>
            <p className="text-sm text-[var(--color-muted)] mb-6">
              ¿Estás seguro de que quieres borrar {itemsToDelete.length > 1 ? `${itemsToDelete.length} elementos` : <span className="font-medium text-[var(--color-foreground)]">{itemsToDelete[0].fileName}</span>}? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setItemsToDelete([])}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--color-secondary-bg)] border border-[var(--color-border)] hover:bg-[color-mix(in_srgb,var(--color-secondary-bg)_90%,var(--color-foreground))] transition-all text-[var(--color-foreground)]"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const paths = itemsToDelete.map(item => item.path);
                  fetch("/api/delete", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ paths })
                  }).then(() => {
                    fetchContent();
                    setItemsToDelete([]);
                    setSelectedPaths([]);
                  });
                }}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-red-500 hover:bg-red-600 text-white transition-all"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
}
