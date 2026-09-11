/** Shared types for the web FOMO app */

export interface CollectionItem {
  id: string;
  name: string;
  description: string;
  projectCount: number;
  iconUrl?: string;
  source: "modrinth" | "curseforge" | "draft";
  previewIcons?: string[];
  mods?: import("../components/SpotlightMarquees").ModHit[];
}
