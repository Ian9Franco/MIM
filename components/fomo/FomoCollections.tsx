import React from "react";
import { Loader2, AlertCircle, Library, Download, ChevronLeft, Box, Flame, ExternalLink, ChevronDown } from "lucide-react";
import type { CollectionEntry, ModHit } from "./types";
import { formatNumber, openExternal } from "./utils";

interface FomoCollectionsProps {
  collections: CollectionEntry[];
  collLoading: boolean;
  collError: string | null;
  collDownloading: string | null;
  viewingCollection: CollectionEntry | null;
  collectionMods: ModHit[];
  collModsLoading: boolean;
  collectionFilter: string;
  setCollectionFilter: (f: string) => void;
  setViewingCollection: (c: CollectionEntry | null) => void;
  fetchCollections: () => void;
  fetchCollectionProjects: (c: CollectionEntry) => void;
  handleDownloadCollection: (c: CollectionEntry) => void;
  handleDownload: (m: ModHit) => void;
  handleOpenVersionSelector: (m: ModHit) => void;
  downloading: Record<string, boolean>;
  handleCreateCollection?: () => void;
}

export function FomoCollections({
  collections,
  collLoading,
  collError,
  collDownloading,
  viewingCollection,
  collectionMods,
  collModsLoading,
  collectionFilter,
  setCollectionFilter,
  setViewingCollection,
  fetchCollections,
  fetchCollectionProjects,
  handleDownloadCollection,
  handleDownload,
  handleOpenVersionSelector,
  downloading,
  handleCreateCollection,
}: FomoCollectionsProps) {
  if (viewingCollection) {
    return (
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* View Header */}
        <div className="px-4 py-3 border-b flex items-center justify-between shrink-0" style={{ borderColor: "var(--color-border)" }}>
          <button 
            onClick={() => setViewingCollection(null)}
            className="flex items-center gap-2 text-xs font-bold hover:opacity-70 transition-opacity"
            style={{ color: "var(--color-primary)" }}
          >
            <ChevronLeft className="w-4 h-4" />
            Volver a colecciones
          </button>
          <button
            onClick={() => handleDownloadCollection(viewingCollection)}
            disabled={!!collDownloading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 active:scale-95"
            style={{ 
              background: "rgba(102,200,160,0.15)",
              color: "#66C8A0",
              border: "1px solid rgba(102,200,160,0.3)"
            }}
          >
            {collDownloading === viewingCollection.id ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                Bajar Todo
              </>
            )}
          </button>
        </div>

        {/* Collection Meta & Filters */}
        <div className="px-5 py-4 bg-white/[0.02] border-b space-y-3" style={{ borderColor: "var(--color-border)" }}>
          <div>
            <h3 className="font-headline text-lg" style={{ color: "var(--color-foreground)" }}>{viewingCollection.name}</h3>
            <p className="font-caption text-xs mt-1" style={{ color: "var(--color-muted)" }}>{viewingCollection.projectCount} proyectos en esta colección</p>
          </div>
          
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {["all", "mod", "resourcepack"].map((type) => (
              <button
                key={type}
                onClick={() => setCollectionFilter(type)}
                className="px-3 py-1.5 rounded-lg text-[0.65rem] font-bold transition-all shrink-0"
                style={{
                  background: collectionFilter === type ? "rgba(102,200,160,0.15)" : "rgba(255,255,255,0.05)",
                  color: collectionFilter === type ? "#66C8A0" : "var(--color-muted)",
                  border: collectionFilter === type ? "1px solid rgba(102,200,160,0.3)" : "1px solid transparent"
                }}
              >
                {type === "all" ? "Todo" : type === "mod" ? "Mods" : "Packs"}
              </button>
            ))}
          </div>
        </div>

        {/* Projects List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-4 space-y-3">
          {collModsLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-8 h-8 animate-spin opacity-40" style={{ color: "var(--color-primary)" }} />
              <p className="font-caption text-xs" style={{ color: "var(--color-muted)" }}>Cargando proyectos...</p>
            </div>
          ) : collectionMods.length === 0 ? (
            <div className="text-center py-20 opacity-40">
              <Box className="w-12 h-12 mx-auto mb-3" />
              <p className="font-subhead">No hay proyectos compatibles</p>
            </div>
          ) : (
            collectionMods
              .filter(m => {
                if (collectionFilter === "all") return true;
                return m.projectType === collectionFilter;
              })
              .map((mod) => (
              <div
                key={mod.projectId}
                className="rounded-2xl p-4 transition-all duration-200"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-white/5 border border-white/10 flex items-center justify-center">
                    {mod.iconUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={mod.iconUrl} alt={mod.title} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <Flame className="w-5 h-5 opacity-25" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-subhead text-base leading-snug" style={{ color: "var(--color-foreground)" }}>
                          {mod.title}
                        </p>
                        <p className="font-caption text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>
                          by {mod.author}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="font-label text-[0.6rem]" style={{ color: "var(--color-muted)" }}>
                            ↓ {formatNumber(mod.downloads)}
                          </span>
                          {mod.latestVersion && (
                            <span className="font-label text-[0.55rem] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(102,200,160,0.12)", color: "#66C8A0" }}>
                              v{mod.latestVersion}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleDownload(mod)}
                            disabled={downloading[mod.projectId]}
                            className="p-2 rounded-xl transition-all hover:bg-white/10 disabled:opacity-40"
                            style={{ color: "#66C8A0", border: "1px solid var(--color-border)" }}
                            title="Descargar versión por defecto"
                          >
                            {downloading[mod.projectId] ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleOpenVersionSelector(mod)}
                            className="px-2 py-2 rounded-xl text-[0.65rem] font-bold transition-all hover:bg-white/10 flex items-center justify-center gap-1"
                            style={{ color: "var(--color-foreground)", border: "1px solid var(--color-border)" }}
                            title="Ver versiones"
                          >
                            Versiones
                            <ChevronDown className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => openExternal(mod.url)}
                            className="p-2 rounded-xl hover:bg-white/10 transition-colors"
                            style={{ color: "var(--color-muted)", border: "1px solid transparent" }}
                            title="Abrir en navegador"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Full Description */}
                    {mod.description && (
                      <p className="font-caption text-sm mt-3 leading-relaxed" style={{ color: "var(--color-muted)" }}>
                        {mod.description}
                      </p>
                    )}

                    {/* Categories */}
                    {mod.categories && mod.categories.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {mod.categories.map(cat => (
                          <span
                            key={cat}
                            className="font-label text-[0.58rem] px-2 py-0.5 rounded-full"
                            style={{ background: "rgba(187,150,228,0.12)", color: "var(--color-primary)" }}
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-4">
      {collLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-9 h-9 animate-spin" style={{ color: "#66C8A0", opacity: 0.5 }} />
          <p className="font-subhead text-sm animate-pulse" style={{ color: "var(--color-muted)" }}>Sincronizando con Modrinth...</p>
        </div>
      ) : collError ? (
        <div className="text-center py-20 px-6 rounded-3xl" style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500 opacity-60" />
          <p className="font-subhead text-red-400">Error de Autenticación</p>
          <p className="font-caption mt-2 leading-relaxed" style={{ color: "var(--color-muted)" }}>
            {collError.includes("TOKEN") 
              ? "Necesitás configurar MODRINTH_TOKEN en tu .env.local para acceder a tus colecciones privadas."
              : collError}
          </p>
          <button 
            onClick={fetchCollections}
            className="mt-6 px-6 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105 active:scale-95"
            style={{ background: "rgba(255,255,255,0.1)", color: "var(--color-foreground)" }}
          >
            Reintentar
          </button>
        </div>
      ) : collections.length === 0 ? (
        <div className="text-center py-20 opacity-40">
          <Library className="w-12 h-12 mx-auto mb-3" />
          <p className="font-subhead">No tienes colecciones</p>
          <p className="font-caption mt-1 mb-6">Crea una colección local o sincroniza con Modrinth</p>
          {handleCreateCollection && (
            <button 
              onClick={handleCreateCollection}
              className="px-6 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105 active:scale-95"
              style={{ background: "rgba(102,200,160,0.15)", color: "#66C8A0", border: "1px solid rgba(102,200,160,0.3)" }}
            >
              + Crear Colección
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Botón flotante o superior para crear más colecciones */}
          {handleCreateCollection && (
            <div className="flex justify-end mb-2">
              <button 
                onClick={handleCreateCollection}
                className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 active:scale-95"
                style={{ background: "rgba(102,200,160,0.1)", color: "#66C8A0", border: "1px solid rgba(102,200,160,0.2)" }}
              >
                + Nueva Colección
              </button>
            </div>
          )}
          {collections.map((coll) => (
          <div
            key={coll.id}
            onClick={() => fetchCollectionProjects(coll)}
            className="rounded-2xl p-4 transition-all duration-300 group cursor-pointer hover:translate-x-1"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white/5 border border-white/10 shrink-0">
                {coll.iconUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={coll.iconUrl} alt={coll.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center opacity-20">
                    <Library className="w-8 h-8" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-headline text-base truncate" style={{ color: "var(--color-foreground)" }}>{coll.name}</h3>
                <p className="font-caption text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>{coll.projectCount} proyectos</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleDownloadCollection(coll); }}
                disabled={!!collDownloading}
                className="flex flex-col items-center justify-center p-3 rounded-2xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                style={{ 
                  background: collDownloading === coll.id ? "rgba(102,200,160,0.15)" : "rgba(255,255,255,0.05)",
                  color: "#66C8A0",
                  border: "1px solid rgba(102,200,160,0.3)"
                }}
                title="Sincronizar todo"
              >
                {collDownloading === coll.id ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Download className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        ))}
        </>
      )}
    </div>
  );
}
