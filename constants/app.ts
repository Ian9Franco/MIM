export const CATEGORY_HOTKEYS: Record<string, string> = {
  "1": ".local",
  "2": ".server",
  "3": ".essential"
};

export const LOADER_COLORS: Record<string, string> = {
  forge: "#3B82F6", neoforge: "#06B6D4", fabric: "#8B5CF6", quilt: "#EC4899",
};

export const LOADERS: string[] = ["forge", "fabric", "neoforge", "quilt"];
export const GAME_VERSIONS: string[] = [
  "26.1.2", "26.1.1", "26.1.0", "1.21.8", "1.21.4", "1.21.1", "1.21", 
  "1.20.6", "1.20.4", "1.20.1", "1.20",
  "1.19.4", "1.19.2", "1.19", "1.18.2", "1.16.5", "1.12.2"
];
export const PROJECT_TYPES: { value: string; label: string }[] = [
  { value: "mod", label: "Mods" },
  { value: "resourcepack", label: "Texturas" },
  { value: "shader", label: "Shaders" },
  { value: "datapack", label: "Data Packs" }
];
export const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "relevance", label: "Relevancia" },
  { value: "downloads", label: "Descargas" },
  { value: "updated", label: "Actividad" },
  { value: "newest", label: "Nuevos" },
  { value: "follows", label: "Seguidores" }
];

export const MODRINTH_CATEGORIES = [
  "adventure", "cursed", "decoration", "economy", "equipment", "food", 
  "game_mechanics", "library", "magic", "management", "minigame", "mobs", 
  "optimization", "social", "storage", "technology", "transportation", 
  "utility", "world_generation"
];

export const CURSEFORGE_CATEGORIES = {
  mod: [
    { 
      label: "Addons", 
      value: "addons",
      sub: [
        "applied-energistics-2", "blood-magic", "buildcraft", "crafttweaker", "create", 
        "farmers-delight", "forestry", "galacticraft", "industrial-craft", "integrated-dynamics", 
        "kubejs", "refined-storage", "skyblock", "thaumcraft", "thermal-expansion", "tinkers-construct"
      ]
    },
    "twilight-forest", "adventure-rpg", "api-and-library", "armor-tools-and-weapons", "bug-fixes", "cosmetic", 
    "creativemode", "education", "food", "horror", "magic", "map-and-information", 
    "mcreator", "miscellaneous", "modjam-2025", "performance", "redstone", "server-utility", "storage",
    {
      label: "Technology",
      value: "technology",
      sub: ["automation", "energy", "energy-fluid-and-item-transport", "farming", "genetics", "player-transport", "processing"]
    },
    "twitch-integration", "utility-qol",
    {
      label: "World Gen",
      value: "world-gen",
      sub: ["biomes", "dimensions", "mobs", "ores-and-resources", "structures"]
    }
  ],
  datapack: [
    "adventure", "fantasy", "library", "magic", "miscellaneous", "mod-support", "modjam-2025", "tech", "utility"
  ],
  resourcepack: [
    "128x", "16x", "256x", "32x", "512x-and-higher", "64x", "animated", "data-packs", 
    "font-packs", "medieval", "miscellaneous", "mod-support", "modern", "modjam-2025", "photo-realistic", 
    "steampunk", "traditional"
  ],
  shader: [
    "fantasy", "realistic", "vanilla"
  ]
};

export const RESOURCEPACK_FILTERS = {
  resolutions: ["8x or lower", "16x", "32x", "48x", "64x", "128x", "256x", "512x or higher"],
  categories: ["combat", "cursed", "decoration", "modded", "realistic", "simplistic", "themed", "tweaks", "utility", "vanilla-like"],
  features: ["audio", "blocks", "core-shaders", "entities", "environment", "equipment", "fonts", "gui", "items", "locale", "models"]
};

export const SHADER_FILTERS = {
  categories: ["cartoon", "cursed", "fantasy", "realistic", "semi-realistic", "vanilla-like"],
  features: ["atmosphere", "bloom", "colored-lighting", "foliage", "path-tracing", "pbr", "reflections", "shadows"],
  performance: ["potato", "low", "medium", "high", "screenshot"],
  loaders: ["iris", "optifine", "vanilla"]
};

export const ENVIRONMENTS = [
  { value: "client", label: "Client-side" },
  { value: "server", label: "Server-side" },
  { value: "both", label: "Client & Server" }
];

export type SortOrder = "relevance" | "downloads" | "newest" | "updated";
