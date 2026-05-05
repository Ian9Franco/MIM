/**
 * @fileoverview FomoSidebar – slide-in panel for discovering, collecting, and
 * applying Minecraft mods from Modrinth and CurseForge.
 *
 * Responsibilities of this file:
 *   - Tab navigation (Discover / Collections / Presets)
 *   - Source toggle (Modrinth / CurseForge)
 *   - Composing sub-panels from focused child components
 *   - Managing collection-selector and version-picker overlays
 *
 * Business logic is delegated to:
 *   - useFomoDiscover   (discover tab state + API)
 *   - useStatusBanner   (transient notifications)
 *   - FomoCollections   (collections tab)
 *   - FomoPresets       (presets tab)
 *   - FomoDiscoverFilters, FomoModCard, FomoPagination, FomoVersionOverlay
 */

"use client";

import React, { useState, useCallback } from "react";
import { Flame, X, Zap, Box, Search, Library, LayoutTemplate, Download, Layers } from "lucide-react";
import { COLORS } from "@/theme/tokens";
import { useStatusBanner } from "@/hooks/useStatusBanner";
import { useFomoDiscover } from "@/hooks/useFomoDiscover";
import { PillToggleGroup, StatusBanner } from "../ui/primitives";
import { ConfirmModal } from "../ui/ConfirmModal";
import { FomoDiscoverFilters } from "./FomoDiscoverFilters";
import { FomoModCard }         from "./FomoModCard";
import { FomoPagination }      from "./FomoPagination";
import { FomoVersionOverlay }  from "./FomoVersionOverlay";
import { FomoPresets }         from "./FomoPresets";
import { FomoCollections }     from "./FomoCollections";
import { formatNumber, getProjectTypeLabel } from "@/utils/format";
import type { ModHit } from "@/lib/types";

type Mode = "discover" | "collections" | "presets";

interface FomoSidebarProps {
  open:            boolean;
  onClose:         () => void;
  defaultLoader?:  string;
  defaultVersion?: string;
}

const TAB_OPTIONS = [
  { value: "discover",    label: "Descubrir",      icon: <Search className="w-4 h-4" />,        activeColor: "#FF6C3E", activeBg: "rgba(255,108,62,0.15)", activeBorder: "rgba(255,108,62,0.3)" },
  { value: "collections", label: "Mis Colecciones", icon: <Library className="w-4 h-4" />,      activeColor: "#66C8A0", activeBg: "rgba(102,200,160,0.15)", activeBorder: "rgba(102,200,160,0.3)" },
  { value: "presets",     label: "Modpacks",        icon: <LayoutTemplate className="w-4 h-4" />,activeColor: "#BB96E4", activeBg: "rgba(187,150,228,0.15)", activeBorder: "rgba(187,150,228,0.3)" },
];

const SOURCE_OPTIONS = [
  { value: "modrinth",   label: "Modrinth",   icon: <Zap className="w-3.5 h-3.5" />, activeColor: "#1ED760", activeBg: "rgba(30,215,96,0.15)", activeBorder: "rgba(30,215,96,0.3)" },
  { value: "curseforge", label: "CurseForge", icon: <Box className="w-3.5 h-3.5" />, activeColor: "#EF6C00", activeBg: "rgba(239,108,0,0.15)",  activeBorder: "rgba(239,108,0,0.3)" },
];

const SIDEBAR_TITLE: Record<Mode, (source: string) => string> = {
  discover:    (src) => src === "modrinth" ? "Novedades de Modrinth" : "Catálogo CurseForge",
  collections: ()    => "Mis Colecciones de Modrinth",
  presets:     ()    => "Modpacks Recomendados",
};

export function FomoSidebar({
  open, onClose, defaultLoader = "forge", defaultVersion = "1.20.1",
}: FomoSidebarProps) {
  const [mode, setMode] = useState<Mode>("discover");
  const [addingToCollectionFor, setAddingToCollectionFor] = useState<ModHit | null>(null);

  const { status, showStatus, clearStatus } = useStatusBanner();
  const discover = useFomoDiscover(defaultLoader, defaultVersion, showStatus);

  const handleAddToCollection = useCallback((mod: ModHit) => {
    setAddingToCollectionFor(mod);
  }, []);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <aside
        role="complementary"
        aria-label="Panel FOMO – Descubrir mods"
        className="fixed inset-y-0 left-0 z-40 flex flex-col w-full max-w-[960px] md:max-w-[50vw] shadow-2xl animate-slide-right glass"
        style={{ background: COLORS.card, borderRight: `1px solid ${COLORS.borderStrong}`, backdropFilter: "blur(20px)" }}
      >
        {/* Header */}
        <div className="relative flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: COLORS.border }}>
          <div className="flex items-center gap-3">
            <div aria-hidden="true" className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--color-accent-bg)", border: "1px solid var(--color-accent-border)" }}>
              <Flame className="w-5 h-5" style={{ color: COLORS.fomoFlame }} />
            </div>
            <div>
              <h2 className="font-headline text-base leading-none" style={{ color: COLORS.foreground }}>FOMO</h2>
              <p className="font-caption mt-0.5" style={{ color: COLORS.muted, fontSize: "0.68rem" }}>
                {SIDEBAR_TITLE[mode](discover.source)}
              </p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Cerrar panel" className="p-2.5 rounded-xl hover:bg-white/10 transition-colors" style={{ color: COLORS.muted }}>
            <X className="w-5 h-5" />
          </button>
          {status && <StatusBanner text={status.text} type={status.type} onClose={clearStatus} />}
        </div>

        {/* Tabs */}
        <PillToggleGroup options={TAB_OPTIONS} value={mode} onChange={(v) => setMode(v as Mode)} className="px-4 pt-4 pb-1" ariaLabel="Secciones de FOMO" />

        {/* Source toggle (discover only) */}
        {mode === "discover" && (
          <PillToggleGroup options={SOURCE_OPTIONS} value={discover.source} onChange={(v) => discover.setSource(v as any)} className="px-4 pb-2" ariaLabel="Fuente de mods" />
        )}

        {/* Source error banner */}
        {discover.sourceError && (
          <div className="mx-4 mb-2 p-3 rounded-xl text-xs" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <p className="font-subhead text-red-400">⚠️ {discover.sourceError}</p>
            <p className="font-caption mt-1" style={{ color: COLORS.muted }}>Agregá CURSEFORGE_API_KEY en tu .env.local</p>
          </div>
        )}

        {/* Tab content */}
        {mode === "discover" ? (
          <>
            <FomoDiscoverFilters
              loader={discover.loader} gameVersion={discover.gameVersion}
              projectType={discover.projectType} sortOrder={discover.sortOrder}
              query={discover.query} loading={discover.loading}
              onLoader={discover.setLoader} onVersion={discover.setGameVersion}
              onProjectType={discover.setProjectType} onSort={discover.setSortOrder}
              onQuery={discover.setQuery} onRefresh={discover.refetch}
            />

            {/* Counter */}
            <div className="px-5 py-2.5 shrink-0" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
              <p className="font-caption text-sm" style={{ color: COLORS.muted }}>
                {discover.loading ? "Cargando..." : discover.query
                  ? `${formatNumber(discover.total)} resultados para "${discover.query}"`
                  : `${formatNumber(discover.total)} ${getProjectTypeLabel(discover.projectType)} · Pág. ${discover.page} de ${discover.totalPages}`}
              </p>
            </div>

            {/* Mod list */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 grid grid-cols-1 md:grid-cols-2 gap-3 content-start" role="feed" aria-label="Lista de mods" aria-busy={discover.loading}>
              {discover.mods.map((mod) => (
                <FomoModCard
                  key={mod.projectId}
                  mod={mod}
                  isDownloading={!!discover.downloading[mod.projectId]}
                  onDownload={discover.handleDownload}
                  onOpenVersions={discover.handleOpenVersionSelector}
                  onAddToCollection={handleAddToCollection}
                />
              ))}
            </div>

            <FomoPagination page={discover.page} totalPages={discover.totalPages} loading={discover.loading} onPage={discover.setPage} />
          </>
        ) : mode === "collections" ? (
          <FomoCollections
            loader={discover.loader}
            gameVersion={discover.gameVersion}
            onStatus={showStatus}
            addingForMod={addingToCollectionFor}
            onClearAddingFor={() => setAddingToCollectionFor(null)}
            downloading={discover.downloading}
            onDownloadMod={discover.handleDownload}
            onOpenVersions={discover.handleOpenVersionSelector}
          />
        ) : (
          <FomoPresets
            presets={[]}
            presetsLoading={false}
            presetDownloading={null}
            onApplyPreset={() => {}}
          />
        )}

        {/* Version overlay */}
        {(() => {
          const selMod = discover.selectingVersionFor;
          if (!selMod) return null;
          return (
            <FomoVersionOverlay
              mod={selMod}
              versions={discover.projectVersions}
              loading={discover.versLoading}
              downloading={!!discover.downloading[selMod.projectId]}
              loader={discover.loader}
              gameVersion={discover.gameVersion}
              projectType={discover.projectType}
              onClose={() => discover.setSelectingVersionFor(null)}
              onDownload={discover.handleDownload}
              onDownloadDependency={discover.handleDownloadDependency}
            />
          );
        })()}

        {/* Dependency Prompt Modal */}
        {discover.dependencyPrompt && (
          <ConfirmModal
            isOpen={!!discover.dependencyPrompt}
            onClose={() => {
              discover.setDependencyPrompt(null);
              discover.confirmDownloadWithDeps(false);
            }}
            onConfirm={() => discover.confirmDownloadWithDeps(true)}
            title={`${discover.dependencyPrompt.mod.title} requiere dependencias`}
            message={`Este mod necesita ${discover.dependencyPrompt.dependencies.length} dependencia${discover.dependencyPrompt.dependencies.length === 1 ? "" : "s"} para funcionar correctamente.`}
            confirmLabel="Descargar con dependencias"
            cancelLabel="Solo el mod"
            type="info"
          >
            <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
              <p className="text-xs font-medium mb-2" style={{ color: COLORS.muted }}>Dependencias requeridas:</p>
              {discover.dependencyPrompt.dependencies.map((dep) => (
                <div 
                  key={dep.projectId}
                  className="flex items-center gap-2 p-2 rounded-lg"
                  style={{ background: "var(--color-secondary-bg)" }}
                >
                  {dep.iconUrl ? (
                    <img src={dep.iconUrl} alt="" className="w-6 h-6 rounded" />
                  ) : (
                    <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: "var(--color-hover)" }}>
                      <Layers className="w-3 h-3" style={{ color: COLORS.muted }} />
                    </div>
                  )}
                  <span className="text-sm font-medium" style={{ color: COLORS.foreground }}>{dep.title}</span>
                </div>
              ))}
            </div>
          </ConfirmModal>
        )}
      </aside>
    </>
  );
}
