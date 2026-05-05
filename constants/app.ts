export const CATEGORY_HOTKEYS: Record<string, string> = {
  "1": ".local",
  "2": ".server",
  "3": ".essential"
};

export const LOADER_COLORS: Record<string, string> = {
  forge: "#3B82F6", neoforge: "#06B6D4", fabric: "#8B5CF6", quilt: "#EC4899",
};

export const LOADERS: string[] = ["forge", "fabric", "neoforge", "quilt"];
export const GAME_VERSIONS: string[] = ["1.20.4", "1.20.1", "1.19.2", "1.18.2", "1.16.5", "1.12.2"];
export const PROJECT_TYPES: { value: string; label: string }[] = [
  { value: "mod", label: "Mods" },
  { value: "resourcepack", label: "Resource Packs" },
  { value: "shader", label: "Shaders" },
  { value: "datapack", label: "Data Packs" }
];
export const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "relevance", label: "Relevancia" },
  { value: "downloads", label: "Descargas" },
  { value: "updated", label: "Recientes" }
];
export type SortOrder = "relevance" | "downloads" | "newest" | "updated";
