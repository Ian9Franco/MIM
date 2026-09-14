"use client";

import React, { useEffect, useState } from "react";
import { Library, Plus, Trash2, X, Loader2, ChevronLeft, ChevronRight, ChevronRight as ChevronIcon } from "lucide-react";
import { COLORS } from "@/theme/tokens";
import { EmptyState, PillToggleGroup } from "@/components/ui/primitives";
import { FomoSkeleton } from "@/components/fomo/core/FomoSkeleton";
import { CollectionIcon } from "../components/CollectionIcon";
import type { CollectionEntry } from "@/lib/core/types";

const ARCHIVE_PAGE_SIZE = 8;
const CAROUSEL_INTERVAL_MS = 2500;

function CollectionPreviewCarousel({
  icons,
  fallbackUrl,
}: {
  icons: string[];
  fallbackUrl?: string;
}) {
  const slides = icons.length > 0 ? icons : fallbackUrl ? [fallbackUrl] : [];
  const [activeIndex, setActiveIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    setReduceMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [slides.join("|")]);

  useEffect(() => {
    if (reduceMotion || slides.length <= 1) return;
    const id = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, CAROUSEL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [reduceMotion, slides.length]);

  if (slides.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <CollectionIcon url={fallbackUrl} fallbackSize="w-12 h-12" />
      </div>
    );
  }

  const mosaicIcons = slides.slice(0, 8);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-1 p-2 opacity-25 blur-[2px] scale-110">
        {mosaicIcons.map((icon, idx) => (
          <img key={`mosaic-${idx}`} src={icon} alt="" className="h-10 w-10 rounded-lg object-cover" />
        ))}
      </div>
      <div className="absolute inset-0 bg-linear-to-t from-black/55 via-black/15 to-transparent" />
      <div className="relative flex h-full w-full items-center justify-center">
        {slides.map((icon, idx) => (
          <img
            key={`slide-${idx}`}
            src={icon}
            alt=""
            className="absolute h-14 w-14 rounded-xl object-cover shadow-2xl ring-1 ring-white/15 transition-opacity duration-700"
            style={{ opacity: idx === activeIndex ? 1 : 0 }}
          />
        ))}
      </div>
    </div>
  );
}

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

function CollectionTile({
  coll,
  onOpen,
  activeTab,
}: {
  coll: CollectionEntry;
  onOpen: () => void;
  activeTab: string;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="mim-collection-card min-w-0 overflow-hidden rounded-2xl border text-left transition-all hover:-translate-y-0.5"
      style={{ background: "rgba(255,255,255,0.03)", borderColor: COLORS.border }}
    >
      <div className="aspect-[1.6/1] overflow-hidden bg-white/4">
        <CollectionIcon url={coll.iconUrl} fallbackSize="w-10 h-10" />
      </div>
      <div className="p-2.5">
        <p className="font-headline text-[10px] truncate" style={{ color: COLORS.foreground }}>
          {coll.name}
        </p>
        <p className="font-caption text-[7px] mt-1 font-mono" style={{ color: COLORS.muted }}>
          {coll.projectCount} proyectos
        </p>
        {activeTab === "official" && (
          <span className="font-label text-[0.5rem] px-1 py-0.5 rounded-full mt-1 inline-block" style={{ background: "rgba(30,215,96,0.12)", color: "#1ED760" }}>
            Oficial
          </span>
        )}
      </div>
    </button>
  );
}

function CollectionHero({
  coll,
  onOpen,
  eyebrow,
  title,
}: {
  coll: CollectionEntry;
  onOpen: () => void;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-[8px] font-mono font-bold uppercase text-white/30">{eyebrow}</p>
        <h3 className="text-xs font-black text-white/80 mt-0.5">{title}</h3>
      </div>
      <button
        type="button"
        onClick={onOpen}
        className="mim-collection-hero mim-editorial-hero w-full overflow-hidden rounded-2xl border text-left transition-transform hover:-translate-y-0.5"
        style={{ borderColor: COLORS.border }}
      >
        <div className="relative aspect-[3.2/1] max-h-35 overflow-hidden bg-white/4">
          <CollectionPreviewCarousel icons={coll.previewIcons ?? []} fallbackUrl={coll.iconUrl ?? undefined} />
          <span className="absolute bottom-2 right-2 z-10 rounded-md border border-white/10 bg-black/65 px-2 py-1 text-[8px] font-mono text-white/80">
            {coll.projectCount} proyectos
          </span>
        </div>
        <div className="flex items-center gap-3 p-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-black" style={{ color: COLORS.foreground }}>{coll.name}</h3>
            {coll.description && (
              <p className="mt-1 line-clamp-2 text-[9px]" style={{ color: COLORS.muted }}>{coll.description}</p>
            )}
          </div>
          <ChevronIcon className="h-5 w-5 shrink-0 text-white/30" />
        </div>
      </button>
    </div>
  );
}

function MimCollectionRow({
  coll,
  activeTab,
  openCollection,
  confirmDelete,
  setConfirmDelete,
  handleDeleteCollection,
  deletingColl,
}: {
  coll: CollectionEntry;
  activeTab: string;
  openCollection: (c: CollectionEntry) => void;
  confirmDelete: string | null;
  setConfirmDelete: (id: string | null) => void;
  handleDeleteCollection: (c: CollectionEntry) => void;
  deletingColl: string | null;
}) {
  return (
    <div role="listitem" className="mim-collection-card w-full flex flex-col p-4 rounded-2xl overflow-hidden transition-all group hover:-translate-y-0.5 hover:shadow-lg" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${COLORS.border}` }}>
      <button onClick={() => openCollection(coll)} className="flex flex-col gap-3 text-left min-w-0 w-full">
        <div className="flex items-start gap-3">
          <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 shrink-0 flex items-center justify-center overflow-hidden shadow-md">
            <CollectionIcon url={coll.iconUrl} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-headline text-sm truncate flex items-center gap-2" style={{ color: COLORS.foreground }}>
              {coll.name}
            </p>
            <p className="font-caption text-xs mt-0.5" style={{ color: COLORS.muted }}>{coll.projectCount} proyectos</p>
          </div>
        </div>
        {coll.previewIcons && coll.previewIcons.length > 0 && (
          <div className="flex items-center -space-x-6 justify-end pt-1">
            {coll.previewIcons.map((icon, idx) => (
              <div key={idx} className="w-11 h-11 rounded-lg bg-card border border-white/10 overflow-hidden shadow-lg" style={{ zIndex: (coll.previewIcons?.length || 0) - idx }}>
                <img src={icon} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}
      </button>
      {activeTab === "mim" && coll.id !== "followed-projects" && (
        confirmDelete === coll.id ? (
          <div className="flex items-center gap-1.5 animate-fade-in">
            <button onClick={() => handleDeleteCollection(coll)} disabled={deletingColl === coll.id} className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-all" title="Confirmar eliminación">
              {deletingColl === coll.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
            <button onClick={() => setConfirmDelete(null)} disabled={deletingColl === coll.id} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/60 transition-all" title="Cancelar">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(coll.id)} className="p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/10 text-red-400/50 hover:text-red-400" title="Eliminar colección">
            <Trash2 className="w-4 h-4" />
          </button>
        )
      )}
    </div>
  );
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
  deletingColl,
}: CollectionListViewProps) {
  const [archivePage, setArchivePage] = useState(0);

  useEffect(() => {
    setArchivePage(0);
  }, [activeTab]);

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

  const featured = displayedCollections[0];
  const recent = displayedCollections.slice(1, 5);
  const archive = displayedCollections.slice(5);

  const archivePages = Math.max(1, Math.ceil(archive.length / ARCHIVE_PAGE_SIZE));
  const archiveStart = archivePage * ARCHIVE_PAGE_SIZE;
  const pagedArchive = archive.slice(archiveStart, archiveStart + ARCHIVE_PAGE_SIZE);

  const TABS = [
    { value: "official", label: "Modrinth Official", activeColor: "#1ED760", activeBg: "rgba(30,215,96,0.15)", activeBorder: "rgba(30,215,96,0.3)" },
    { value: "curseforge", label: "CurseForge Picks", activeColor: "#f87171", activeBg: "rgba(248,113,113,0.15)", activeBorder: "rgba(248,113,113,0.3)" },
    { value: "mim", label: "Colecciones MIM", activeColor: "#FF6C3E", activeBg: "rgba(255,108,62,0.15)", activeBorder: "rgba(255,108,62,0.3)" },
  ];

  const heroEyebrow = activeTab === "official" ? "Selección actual" : activeTab === "curseforge" ? "Destacado" : "Más reciente";
  const heroTitle = activeTab === "official" ? "Lo nuevo de Modrinth" : activeTab === "curseforge" ? "CurseForge Picks" : "Tu colección más reciente";

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
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

      <div id="onboarding-collections-header" className="px-4 py-3 border-b shrink-0 flex items-center justify-center relative z-10" style={{ borderColor: "var(--color-border)", background: "var(--color-card)", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
        <PillToggleGroup
          options={TABS}
          value={activeTab}
          onChange={(v) => setActiveTab(v as typeof activeTab)}
          className="p-1.5 w-full max-w-xl"
          style={{ background: "var(--color-secondary-bg)", borderColor: "var(--color-border)" }}
          ariaLabel="Pestañas de colecciones"
        />
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4" role="list" aria-label="Tus colecciones">
        <div key={activeTab} className={`space-y-6 ${animationClass}`}>
          {activeTab === "mim" && (
            <button onClick={() => setCreating(true)} className="w-full p-4 rounded-2xl border-2 border-dashed border-white/10 hover:border-primary/30 hover:bg-primary/5 transition-all flex items-center justify-center gap-3">
              <Plus className="w-5 h-5" style={{ color: COLORS.primary }} />
              <span className="font-bold text-sm">Nueva Colección</span>
            </button>
          )}

          {displayedCollections.length === 0 ? (
            <EmptyState icon={<Library className="w-12 h-12" />} title="Sin colecciones" subtitle={activeTab === "official" ? "No se encontraron colecciones oficiales" : "Crea una para empezar"} />
          ) : (
            <>
              {featured && (
                <CollectionHero
                  coll={featured}
                  onOpen={() => openCollection(featured)}
                  eyebrow={heroEyebrow}
                  title={heroTitle}
                />
              )}

              {recent.length > 0 && (
                <div>
                  <p className="text-[8px] font-mono font-bold uppercase text-white/30">Últimas semanas</p>
                  <h3 className="text-xs font-black text-white/80 mt-0.5 mb-2">Selecciones recientes</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {recent.map((coll) => (
                      <CollectionTile key={coll.id} coll={coll} onOpen={() => openCollection(coll)} activeTab={activeTab} />
                    ))}
                  </div>
                </div>
              )}

              {archive.length > 0 && (
                <div>
                  <p className="text-[8px] font-mono font-bold uppercase text-white/30">Archivo</p>
                  <h3 className="text-xs font-black text-white/80 mt-0.5 mb-2">Colecciones anteriores</h3>
                  <div className="space-y-3">
                    {activeTab === "mim"
                      ? pagedArchive.map((coll) => (
                          <MimCollectionRow
                            key={coll.id}
                            coll={coll}
                            activeTab={activeTab}
                            openCollection={openCollection}
                            confirmDelete={confirmDelete}
                            setConfirmDelete={setConfirmDelete}
                            handleDeleteCollection={handleDeleteCollection}
                            deletingColl={deletingColl}
                          />
                        ))
                      : pagedArchive.map((coll) => (
                          <CollectionTile key={coll.id} coll={coll} onOpen={() => openCollection(coll)} activeTab={activeTab} />
                        ))}
                  </div>
                  {archivePages > 1 && (
                    <div className="flex items-center justify-center gap-4 mt-4">
                      <button
                        type="button"
                        disabled={archivePage === 0}
                        onClick={() => setArchivePage((p) => Math.max(0, p - 1))}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-bold disabled:opacity-30"
                        style={{ borderColor: COLORS.border, color: COLORS.foreground }}
                      >
                        <ChevronLeft className="w-4 h-4" /> Anterior
                      </button>
                      <span className="text-[10px] font-mono" style={{ color: COLORS.muted }}>
                        {archivePage + 1} / {archivePages}
                      </span>
                      <button
                        type="button"
                        disabled={archivePage >= archivePages - 1}
                        onClick={() => setArchivePage((p) => Math.min(archivePages - 1, p + 1))}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-bold disabled:opacity-30"
                        style={{ borderColor: COLORS.border, color: COLORS.foreground }}
                      >
                        Siguiente <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
