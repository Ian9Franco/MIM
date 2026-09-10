import React from "react";

export { TabButton } from "../details/TabButton";
export { DependencyCard } from "../details/DependencyCard";
export { VersionCard } from "../details/VersionCard";
export { CompatibilitySection } from "../details/CompatibilitySection";
export { ModHeader } from "../details/ModHeader";
export { FomoOverlayTopBar } from "../details/FomoOverlayTopBar";
export { FomoDescriptionTab } from "../details/FomoDescriptionTab";
export { FomoGalleryTab } from "../details/FomoGalleryTab";
export { FomoDependenciesTab } from "../details/FomoDependenciesTab";
export { FomoVersionsTab } from "../details/FomoVersionsTab";
export { FomoLightbox } from "../details/FomoLightbox";

export function StatsGrid({ mod: _mod }: { mod: unknown }) {
  return null; // Compacted into CompatibilitySection
}
