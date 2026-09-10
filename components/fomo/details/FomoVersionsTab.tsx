"use client";

import React from "react";
import { VersionCard } from "./VersionCard";
import type { ModHit, VersionEntry } from "@/lib/core/types";

interface FomoVersionsTabProps {
  versions: VersionEntry[];
  mod: ModHit;
  gameVersions: string[];
  selectedVersionFilter: string | null;
  setSelectedVersionFilter: (v: string | null) => void;
  selectedLoaderFilter: string | null;
  selectedProjectType: string;
  expandedVersion: string | null;
  setExpandedVersion: (id: string | null) => void;
  handleDownloadWrapper: (v?: any) => void;
  downloading: boolean;
}

export function FomoVersionsTab({
  versions,
  mod,
  gameVersions,
  selectedVersionFilter,
  setSelectedVersionFilter,
  selectedLoaderFilter,
  selectedProjectType,
  expandedVersion,
  setExpandedVersion,
  handleDownloadWrapper,
  downloading,
}: FomoVersionsTabProps) {
  const uniqueVersions = Array.from(new Set(versions.flatMap((v) => v.gameVersions)))
    .filter((gv) => {
      if (!gv) return false;
      const isNumericVersion = /^\d+(\.\d+)*$/.test(gv);
      const isNoise = ["forge", "fabric", "neoforge", "quilt", "client", "server"].includes(gv.toLowerCase());
      return isNumericVersion && !isNoise;
    })
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true, sensitivity: "base" }));

  // Filtrado de versiones para lanzamientos recientes
  const recentVersions = versions
    .filter((v) => {
      const isNotMod = ["resourcepack", "shader", "datapack", "plugin"].includes(selectedProjectType);
      const isMod = !isNotMod && (!selectedProjectType || selectedProjectType === "mod");

      if (!isMod) return true;

      if (!selectedLoaderFilter || selectedLoaderFilter === "all") return true;
      const modLoaders = v.loaders || (v as any).loader || [];
      return modLoaders.some((l: string) => l.toLowerCase().includes(selectedLoaderFilter.toLowerCase()));
    })
    .slice(0, 2);

  // Filtrado de versiones para historial completo
  const historyVersions = versions
    .filter((v) => {
      const matchesVersion = !selectedVersionFilter || v.gameVersions.includes(selectedVersionFilter);
      const isNotMod = ["resourcepack", "shader", "datapack", "plugin"].includes(selectedProjectType);
      const isMod = !isNotMod && (!selectedProjectType || selectedProjectType === "mod");

      const matchesLoader =
        !isMod ||
        !selectedLoaderFilter ||
        selectedLoaderFilter === "all" ||
        (v.loaders || (v as any).loader || []).some((l: string) =>
          l.toLowerCase().includes(selectedLoaderFilter.toLowerCase())
        );

      const nameLower = (v.name || v.versionNumber || "").toLowerCase();
      const hasSpecificDatapackVersions = versions.some((ver) =>
        (ver.name || ver.versionNumber || "").toLowerCase().includes("datapack")
      );

      let matchesType = true;
      if (hasSpecificDatapackVersions) {
        matchesType =
          selectedProjectType === "datapack"
            ? nameLower.includes("datapack")
            : selectedProjectType === "mod"
            ? !nameLower.includes("datapack")
            : true;
      } else {
        const isHybrid = mod.categories?.map((c: any) => {
          if (typeof c === "string") return c.toLowerCase();
          if (c && typeof c === "object") {
            if (typeof c.name === "string") return c.name.toLowerCase();
            if (typeof c.slug === "string") return c.slug.toLowerCase();
          }
          return "";
        }).includes("datapack");
        if (isHybrid && selectedProjectType === "datapack") {
          matchesType = true;
        }
      }

      return matchesVersion && matchesLoader && matchesType;
    })
    .slice(!selectedVersionFilter && !selectedLoaderFilter ? 2 : 0);

  return (
    <div className="space-y-4">
      {/* Barra de Toggles de Versión de Minecraft */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none sticky top-[-16px] z-20 bg-[var(--fomo-bg)] -mx-4 px-4 pt-4 shadow-[0_10px_20px_-10px_rgba(0,0,0,0.5)]">
        <button
          type="button"
          onClick={() => setSelectedVersionFilter(null)}
          className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${
            !selectedVersionFilter
              ? "bg-primary text-white border-primary shadow-[0_0_15px_rgba(187,150,228,0.3)]"
              : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10"
          }`}
        >
          Todas
        </button>
        {uniqueVersions.map((gv) => {
          const isTarget = gameVersions.includes(gv);
          const active = selectedVersionFilter === gv;
          return (
            <button
              key={gv}
              type="button"
              onClick={() => setSelectedVersionFilter(gv)}
              className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${
                active
                  ? "bg-primary text-white border-primary shadow-[0_0_15px_rgba(187,150,228,0.3)]"
                  : isTarget
                  ? "bg-primary/10 border-primary/20 text-primary"
                  : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10"
              }`}
            >
              {gv}
            </button>
          );
        })}
      </div>

      <div className="space-y-8 pb-10">
        {/* SECCIÓN 1: ÚLTIMOS 2 LANZAMIENTOS (Prioridad Global) */}
        {!selectedVersionFilter && versions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 opacity-30 px-1">
              <span className="text-[9px] font-black uppercase tracking-[0.3em]">Lanzamientos Recientes</span>
              <div className="h-[1px] flex-1 bg-white/10" />
            </div>
            <div className="space-y-2">
              {recentVersions.map((v, idx) => (
                <VersionCard
                  key={`latest-${v.id || idx}`}
                  v={v}
                  mod={mod}
                  isCompatible={v.gameVersions.some((gv) => gameVersions.includes(gv))}
                  isMainVersion={true}
                  expanded={expandedVersion === v.id}
                  onToggle={() => setExpandedVersion(expandedVersion === v.id ? null : v.id)}
                  onDownload={handleDownloadWrapper}
                  downloading={downloading}
                  gameVersions={gameVersions}
                  activeLoader={selectedLoaderFilter || "all"}
                  selectedProjectType={selectedProjectType}
                />
              ))}
            </div>
          </div>
        )}

        {/* SECCIÓN 2: HISTORIAL FILTRADO O RESTO */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 opacity-30 px-1">
            <span className="text-[9px] font-black uppercase tracking-[0.3em]">
              {selectedVersionFilter ? `Archivos para Minecraft ${selectedVersionFilter}` : "Historial de Versiones"}
            </span>
            <div className="h-[1px] flex-1 bg-white/10" />
          </div>
          <div className="space-y-2">
            {historyVersions.map((v, idx) => (
              <VersionCard
                key={v.id || idx}
                v={v}
                mod={mod}
                isCompatible={v.gameVersions.some((gv) => gameVersions.includes(gv))}
                isMainVersion={false}
                expanded={expandedVersion === v.id}
                onToggle={() => setExpandedVersion(expandedVersion === v.id ? null : v.id)}
                onDownload={handleDownloadWrapper}
                downloading={downloading}
                gameVersions={gameVersions}
                activeLoader={selectedLoaderFilter || "all"}
                selectedProjectType={selectedProjectType}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
