import React from "react";
import { Library, Plus, Trash2, X, Loader2 } from "lucide-react";
import { COLORS } from "@/theme/tokens";
import { EmptyState, PillToggleGroup } from "@/components/ui/primitives";
import { FomoSkeleton } from "@/components/fomo/core/FomoSkeleton";
import { CollectionIcon } from "../components/CollectionIcon";
import type { CollectionEntry } from "@/lib/core/types";

interface CollectionListViewProps {
  loading: boolean;
  error: string | null;
  collections: CollectionEntry[];
  officialCollections: CollectionEntry[];
  cfCollections: CollectionEntry[];
  activeTab: "official" | "curseforge" | "mim" | "followed";
  setActiveTab: (val: "official" | "curseforge" | "mim" | "followed") => void;
  animationClass: string;
  setCreating: (val: boolean) => void;
  openCollection: (coll: CollectionEntry) => void;
  confirmDelete: string | null;
  setConfirmDelete: (val: string | null) => void;
  handleDeleteCollection: (coll: CollectionEntry) => void;
  deletingColl: string | null;
}

export function CollectionListView({
  loading,
  error,
  collections,
  officialCollections,
  cfCollections,
  activeTab,
  setActiveTab,
  animationClass,
  setCreating,
  openCollection,
  confirmDelete,
  setConfirmDelete,
  handleDeleteCollection,
  deletingColl
}: CollectionListViewProps) {
  if (loading) return <FomoSkeleton message="Cargando colecciones..." />;
  if (error && collections.length === 0 && officialCollections.length === 0) {
    return <EmptyState icon={<Library className="w-12 h-12" />} title="Error al cargar" subtitle={error} />;
  }

  let displayedCollections: CollectionEntry[] = [];
  if (activeTab === "official") {
    displayedCollections = officialCollections;
  } else if (activeTab === "curseforge") {
    displayedCollections = cfCollections;
  } else if (activeTab === "mim") {
    displayedCollections = collections;
  }

  const TABS = [
    { value: "official", label: "Modrinth Official", activeColor: "#1ED760", activeBg: "rgba(30,215,96,0.15)", activeBorder: "rgba(30,215,96,0.3)" },
    { value: "curseforge", label: "CurseForge Picks", activeColor: "#f87171", activeBg: "rgba(248,113,113,0.15)", activeBorder: "rgba(248,113,113,0.3)" },
    { value: "mim", label: "Colecciones MIM", activeColor: "#FF6C3E", activeBg: "rgba(255,108,62,0.15)", activeBorder: "rgba(255,108,62,0.3)" },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Estilos inyectados para las animaciones direccionales */}
      <style>{`
        @keyframes slideInFromRight {
          from { transform: translateX(30px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideInFromLeft {
          from { transform: translateX(-30px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in-right {
          opacity: 0;
          animation: slideInFromRight 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .animate-slide-in-left {
          opacity: 0;
          animation: slideInFromLeft 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
      `}</style>

      {/* Tabs Header */}
      <div id="onboarding-collections-header" className="px-4 py-3 border-b shrink-0 flex items-center justify-center relative z-10" style={{ borderColor: "var(--color-border)", background: "var(--color-card)", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
        <PillToggleGroup 
          options={TABS} 
          value={activeTab} 
          onChange={(v) => setActiveTab(v as any)} 
          className="p-1.5 w-full max-w-xl" 
          style={{ background: "var(--color-secondary-bg)", borderColor: "var(--color-border)" }}
          ariaLabel="Pestañas de colecciones" 
        />
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4" role="list" aria-label="Tus colecciones">
        <div key={activeTab} className={`space-y-3 ${animationClass}`}>
          {activeTab === "mim" && (
            <button onClick={() => setCreating(true)} className="w-full p-4 rounded-2xl border-2 border-dashed border-white/10 hover:border-primary/30 hover:bg-primary/5 transition-all flex items-center justify-center gap-3 mb-2">
              <Plus className="w-5 h-5" style={{ color: COLORS.primary }} />
              <span className="font-bold text-sm">Nueva Colección</span>
            </button>
          )}
          {displayedCollections.length === 0 ? (
            <EmptyState icon={<Library className="w-12 h-12" />} title="Sin colecciones" subtitle={activeTab === "official" ? "No se encontraron colecciones oficiales" : "Crea una para empezar"} />
          ) : (
            displayedCollections.map((coll) => (
              <div key={coll.id} role="listitem" className="w-full flex items-center gap-3 p-3 rounded-2xl transition-all group" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${COLORS.border}` }}>
                <button onClick={() => openCollection(coll)} className="flex-1 flex items-center gap-3 text-left min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 shrink-0 flex items-center justify-center overflow-hidden">
                    <CollectionIcon url={coll.iconUrl} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-headline text-sm truncate flex items-center gap-2" style={{ color: COLORS.foreground }}>
                      {coll.name}
                      {activeTab === "official" && <span className="font-label text-[0.55rem] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(30,215,96,0.12)", color: "#1ED760", border: "1px solid rgba(30,215,96,0.3)" }}>✓ Oficial</span>}
                    </p>
                    <p className="font-caption text-xs mt-0.5" style={{ color: COLORS.muted }}>{coll.projectCount} proyectos • ID: {coll.id}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      {coll.isLocal && <span className="font-label text-[0.55rem] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(255,208,102,0.1)", color: COLORS.gold }}>Local</span>}
                      {coll.id === "followed-projects" && <span className="font-label text-[0.55rem] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(187,150,228,0.12)", color: COLORS.primary }}>Modrinth</span>}
                    </div>
                  </div>
                  
                  {/* Miniaturas de mods (Overlap) */}
                  {coll.previewIcons && coll.previewIcons.length > 0 && (
                    <div className="flex items-center -space-x-6 ml-auto mr-4 shrink-0">
                      {coll.previewIcons.map((icon, idx) => (
                        <div key={idx} className="w-12 h-12 rounded-lg bg-card border border-white/10 overflow-hidden shadow-lg transition-transform hover:translate-y-[-2px]" style={{ zIndex: (coll.previewIcons?.length || 0) - idx }}>
                          <img src={icon} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </button>

                {/* Delete Button / Confirmation */}
                {activeTab === "mim" && coll.id !== "followed-projects" && (
                  confirmDelete === coll.id ? (
                    <div className="flex items-center gap-1.5 animate-fade-in">
                      <button
                        onClick={() => handleDeleteCollection(coll)}
                        disabled={deletingColl === coll.id}
                        className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-all"
                        title="Confirmar eliminación"
                      >
                        {deletingColl === coll.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        disabled={deletingColl === coll.id}
                        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/60 transition-all"
                        title="Cancelar"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(coll.id)}
                      className="p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/10 text-red-400/50 hover:text-red-400"
                      title="Eliminar colección"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
