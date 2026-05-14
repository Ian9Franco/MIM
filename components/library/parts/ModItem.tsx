import React from "react";
import { ModCard } from "@/components/library/ModCard";

/**
 * @fileoverview Fila Virtualizada de la Librería de Mods.
 * ─────────────────────────────────────────────────────────────────────────────
 * Componente envolvente diseñado específicamente para la API de `react-window`.
 * Renderiza una instancia individual de `ModCard` inyectando los datos compartidos
 * del contexto (estados de descarga, badges, manejadores de eventos) en base
 * al índice de la fila actual.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const ModItem = ({ index, style, data }: any) => {
  const { 
    mods, selectedLibFiles, setSelectedLibFiles, activeProject, 
    downloadingMods, modrinthStatus, ignoredUpdates, getBadge, 
    onOpenDetails, conflicts 
  } = data;
  
  const mod = mods[index];
  if (!mod) return null;

  const isSelected = selectedLibFiles.some((s: any) => s.path === mod.path);
  const badge = getBadge(mod);

  return (
    // El prop 'style' inyecta la posición absoluta calculada por react-window
    <div style={style}>
      <ModCard
        index={index}
        name={(mod.meta?.modName && mod.meta.modName !== "unknown") ? mod.meta.modName : mod.fileName}
        version={mod.meta?.gameVersion ?? mod.meta?.version ?? "unknown"}
        modVersion={mod.meta?.modVersion}
        projectType={mod.meta?.projectType}
        iconBase64={mod.meta?.iconBase64 || modrinthStatus[mod.path]?.iconUrl}
        author={mod.meta?.author}
        loader={mod.meta?.loader ?? "unknown"}
        isSelected={isSelected}
        onClick={() => setSelectedLibFiles((prev: any) => isSelected ? prev.filter((s: any) => s.path !== mod.path) : [...prev, mod])}
        activeVersion={activeProject?.version ?? ""}
        activeLoader={activeProject?.loader ?? ""}
        badgeText={badge.badgeText}
        badgeColor={badge.badgeColor}
        onDownload={badge.onDownload}
        isDownloading={downloadingMods[mod.path]}
        categories={modrinthStatus[mod.path]?.categories || mod.meta?.categories}
        onOpenDetails={() => onOpenDetails(mod)}
        conflict={conflicts[mod.path]}
        hasUpdate={modrinthStatus[mod.path]?.status === "update_available" && !ignoredUpdates.has(mod.path)}
        environment={mod.meta?.environment}
      />
    </div>
  );
};
