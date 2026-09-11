import React from "react";
import { Box, Image as ImageIcon, Glasses, Database, Hash, Package } from "lucide-react";

export const SORT_OPTIONS = [
  { value: "relevance", label: "Relevancia" },
  { value: "downloads", label: "Más Descargas" },
  { value: "follows", label: "Más Seguidos" },
  { value: "newest", label: "Más Recientes" },
  { value: "updated", label: "Última Actualización" }
];

export const MC_VERSIONS = [
  "26.1.2", "26.1.1", "26.1.0", "1.21.8", "1.21.4", "1.21.1", "1.21",
  "1.20.6", "1.20.4", "1.20.1", "1.20",
  "1.19.4", "1.19.2", "1.19", "1.18.2", "1.16.5", "1.12.2"
];

export const MOD_LOADERS = [
  { value: "fabric", label: "Fabric" },
  { value: "forge", label: "Forge" },
  { value: "neoforge", label: "NeoForge" },
  { value: "quilt", label: "Quilt" },
];

export const MOD_TYPES = [
  { value: "any", label: "Cualquiera", icon: Hash },
  { value: "mod", label: "Mods", icon: Box },
  { value: "resourcepack", label: "Texturas", icon: ImageIcon },
  { value: "shader", label: "Shaders", icon: Glasses },
  { value: "datapack", label: "Datapacks", icon: Database },
  { value: "modpack", label: "Modpacks", icon: Package },
];

export const DISCOVER_PAGE_SIZE = 12;

export const ENVIRONMENTS = [
  { value: "any", label: "Cualquiera" },
  { value: "client", label: "Cliente" },
  { value: "server", label: "Servidor" },
  { value: "both", label: "Ambos" },
];

export const MODRINTH_MOD_CATEGORIES = [
  { value: "adventure", label: "Aventura" },
  { value: "cursed", label: "Cursed (Bizarro)" },
  { value: "decoration", label: "Decoración" },
  { value: "economy", label: "Economía" },
  { value: "equipment", label: "Equipamiento" },
  { value: "food", label: "Comida" },
  { value: "game_mechanics", label: "Mecánicas" },
  { value: "library", label: "Librerías / APIs" },
  { value: "magic", label: "Magia" },
  { value: "management", label: "Gestión" },
  { value: "minigame", label: "Minijuegos" },
  { value: "mobs", label: "Criaturas" },
  { value: "optimization", label: "Optimización" },
  { value: "social", label: "Social" },
  { value: "storage", label: "Almacenamiento" },
  { value: "technology", label: "Tecnología" },
  { value: "transportation", label: "Transporte" },
  { value: "utility", label: "Utilidad / QoL" },
  { value: "world_generation", label: "Generación de Mundo" }
];

export const MODRINTH_RESOURCEPACK_CATEGORIES = [
  { value: "combat", label: "Combate" },
  { value: "cursed", label: "Cursed" },
  { value: "decoration", label: "Decoración" },
  { value: "modded", label: "Soporte de Mods" },
  { value: "realistic", label: "Realista" },
  { value: "simplistic", label: "Simplista" },
  { value: "themed", label: "Temático" },
  { value: "tweaks", label: "Ajustes / Tweaks" },
  { value: "utility", label: "Utilidad" },
  { value: "vanilla-like", label: "Estilo Vanilla" }
];

export const MODRINTH_SHADER_CATEGORIES = [
  { value: "cartoon", label: "Cartoon" },
  { value: "cursed", label: "Cursed" },
  { value: "fantasy", label: "Fantasía" },
  { value: "realistic", label: "Realista" },
  { value: "semi-realistic", label: "Semi-realista" },
  { value: "vanilla-like", label: "Estilo Vanilla" }
];

export const CURSEFORGE_MOD_CATEGORIES = [
  { value: "addons", label: "Addons" },
  { value: "twilight forest", label: "Twilight Forest" },
  { value: "adventure and rpg", label: "Aventura y RPG" },
  { value: "api and library", label: "API y Librerías" },
  { value: "armor, tools, and weapons", label: "Armas y Armaduras" },
  { value: "bug fixes", label: "Corrección de Errores" },
  { value: "cosmetic", label: "Cosmético" },
  { value: "creativemode", label: "Modo Creativo" },
  { value: "education", label: "Educación" },
  { value: "food", label: "Comida" },
  { value: "horror", label: "Terror (Horror)" },
  { value: "magic", label: "Magia" },
  { value: "map and information", label: "Mapa e Información" },
  { value: "mcreator", label: "MCreator" },
  { value: "miscellaneous", label: "Misceláneo" },
  { value: "performance", label: "Rendimiento" },
  { value: "redstone", label: "Redstone" },
  { value: "server utility", label: "Utilidad de Servidor" },
  { value: "storage", label: "Almacenamiento" },
  { value: "technology", label: "Tecnología" },
  { value: "twitch integration", label: "Integración de Twitch" },
  { value: "utility & qol", label: "Utilidad y QoL" },
  { value: "world-gen", label: "Generación de Mundo" }
];

export const CURSEFORGE_DATAPACK_CATEGORIES = [
  { value: "mod support", label: "Soporte de Mods" },
  { value: "tech", label: "Tecnología" },
  { value: "magic", label: "Magia" },
  { value: "adventure", label: "Aventura" },
  { value: "library", label: "Librería" },
  { value: "utility", label: "Utilidad" },
  { value: "miscellaneous", label: "Misceláneo" },
  { value: "fantasy", label: "Fantasía" }
];

export const CURSEFORGE_RESOURCEPACK_CATEGORIES = [
  { value: "miscellaneous", label: "Misceláneo" },
  { value: "16x", label: "16x" },
  { value: "32x", label: "32x" },
  { value: "photo realistic", label: "Fotorrealista" },
  { value: "512x and higher", label: "512x o Superior" },
  { value: "traditional", label: "Tradicional" },
  { value: "128x", label: "128x" },
  { value: "256x", label: "256x" },
  { value: "font packs", label: "Fuentes" },
  { value: "64x", label: "64x" },
  { value: "mod support", label: "Soporte de Mods" },
  { value: "medieval", label: "Medieval" },
  { value: "data packs", label: "Data Packs" },
  { value: "animated", label: "Animado" },
  { value: "modern", label: "Moderno" },
  { value: "steampunk", label: "Steampunk" }
];

export const CURSEFORGE_SHADER_CATEGORIES = [
  { value: "fantasy", label: "Fantasía" },
  { value: "realistic", label: "Realista" },
  { value: "vanilla", label: "Vanilla" }
];

export const CURSEFORGE_MODPACK_CATEGORIES = [
  { value: "adventure and rpg", label: "Aventura / RPG" },
  { value: "tech", label: "Tecnología" },
  { value: "quests", label: "Misiones" },
  { value: "skyblock", label: "Skyblock" },
  { value: "magic", label: "Magia" },
  { value: "vanilla+", label: "Vanilla+" },
  { value: "exploration", label: "Exploración" },
  { value: "expert", label: "Expert" },
  { value: "multiplayer", label: "Multijugador" },
  { value: "small / light", label: "Liviano" },
  { value: "extra large", label: "Grande" },
  { value: "horror", label: "Horror" },
];

export function ModrinthIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`} style={{ color: "#1bd672" }}>
      <path d="M12.252 0.004a11.78 11.768 0 0 0 -8.92 3.73 11 10.999 0 0 0 -2.17 3.11 11.37 11.359 0 0 0 -1.16 5.169c0 1.42 0.17 2.5 0.6 3.77 0.24 0.759 0.77 1.899 1.17 2.529a12.3 12.298 0 0 0 8.85 5.639c0.44 0.05 2.54 0.07 2.76 0.02 0.2 -0.04 0.22 0.1 -0.26 -1.7l-0.36 -1.37 -1.01 -0.06a8.5 8.489 0 0 1 -5.18 -1.8 5.34 5.34 0 0 1 -1.3 -1.26c0 -0.05 0.34 -0.28 0.74 -0.5a37.572 37.545 0 0 1 2.88 -1.629c0.03 0 0.5 0.45 1.06 0.98l1 0.97 2.07 -0.43 2.06 -0.43 1.47 -1.47c0.8 -0.8 1.48 -1.5 1.48 -1.52 0 -0.09 -0.42 -1.63 -0.46 -1.7 -0.04 -0.06 -0.2 -0.03 -1.02 0.18 -0.53 0.13 -1.2 0.3 -1.45 0.4l-0.48 0.15 -0.53 0.53 -0.53 0.53 -0.93 0.1 -0.93 0.07 -0.52 -0.5a2.7 2.7 0 0 1 -0.96 -1.7l-0.13 -0.6 0.43 -0.57c0.68 -0.9 0.68 -0.9 1.46 -1.1 0.4 -0.1 0.65 -0.2 0.83 -0.33 0.13 -0.099 0.65 -0.579 1.14 -1.069l0.9 -0.9 -0.7 -0.7 -0.7 -0.7 -1.95 0.54c-1.07 0.3 -1.96 0.53 -1.97 0.53 -0.03 0 -2.23 2.48 -2.63 2.97l-0.29 0.35 0.28 1.03c0.16 0.56 0.3 1.16 0.31 1.34l0.03 0.3 -0.34 0.23c-0.37 0.23 -2.22 1.3 -2.84 1.63 -0.36 0.2 -0.37 0.2 -0.44 0.1 -0.08 -0.1 -0.23 -0.6 -0.32 -1.03 -0.18 -0.86 -0.17 -2.75 0.02 -3.73a8.84 8.839 0 0 1 7.9 -6.93c0.43 -0.03 0.77 -0.08 0.78 -0.1 0.06 -0.17 0.5 -2.999 0.47 -3.039 -0.01 -0.02 -0.1 -0.02 -0.2 -0.03Zm3.68 0.67c-0.2 0 -0.3 0.1 -0.37 0.38 -0.06 0.23 -0.46 2.42 -0.46 2.52 0 0.04 0.1 0.11 0.22 0.16a8.51 8.499 0 0 1 2.99 2 8.38 8.379 0 0 1 2.16 3.449 6.9 6.9 0 0 1 0.4 2.8c0 1.07 0 1.27 -0.1 1.73a9.37 9.369 0 0 1 -1.76 3.769c-0.32 0.4 -0.98 1.06 -1.37 1.38 -0.38 0.32 -1.54 1.1 -1.7 1.14 -0.1 0.03 -0.1 0.06 -0.07 0.26 0.03 0.18 0.64 2.56 0.7 2.78l0.06 0.06a12.07 12.058 0 0 0 7.27 -9.4c0.13 -0.77 0.13 -2.58 0 -3.4a11.96 11.948 0 0 0 -5.73 -8.578c-0.7 -0.42 -2.05 -1.06 -2.25 -1.06Z" fill="currentColor" />
    </svg>
  );
}

export function CurseForgeIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`} style={{ color: "#f16436" }}>
      <path d="M18.326 9.2145S23.2261 8.4418 24 6.1882h-7.5066V4.4H0l2.0318 2.3576V9.173s5.1267 -0.2665 7.1098 1.2372c2.7146 2.516 -3.053 5.917 -3.053 5.917L5.0995 19.6c1.5465 -1.4726 4.494 -3.3775 9.8983 -3.2857 -2.0565 0.65 -4.1245 1.6651 -5.7344 3.2857h10.9248l-1.0288 -3.2726s-7.918 -4.6688 -0.8336 -7.1127z" fill="currentColor" />
    </svg>
  );
}

/** Formatea números de descarga a K/M */
export function formatDownloads(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

export type FomoBannerProjectType =
  | "mod"
  | "shader"
  | "textura"
  | "resourcepack"
  | "datapack"
  | "modpack"
  | "bedrock"
  | "addon";

export interface BannerFallbackStyle {
  bannerBgColor: string;
  fallbackTexture: Record<string, string>;
}

export function getBannerFallbackStyle(
  primaryType: FomoBannerProjectType | string
): BannerFallbackStyle {
  let bannerBgColor = "#18181b";
  let fallbackTexture: Record<string, string> = {};

  if (primaryType === "datapack") {
    bannerBgColor = "#022c22";
    fallbackTexture = {
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 20.5V18H0v-2h20v-2H8v-2h12V9.5h-2V7h2V5H8v-2h12V.5h-2V-2h2v2h2v2h2v-2v2h2v2h-2v2h2v2h-2v2h2v2h-2v2h2v2h-2v2.5H20zm0 0V23h20v2H20v2h12v2H20v2h12v2H20v2h12v2H20v2.5h2V42h-2v-2h-2v-2h2v-2h-2v-2h2v-2h-2v-2h2v-2h-2v-2h2v-2h-2v-2.5H20z' fill='%23ffffff' fill-opacity='0.06' fill-rule='evenodd'/%3E%3C/svg%3E")`,
    };
  } else if (primaryType === "shader") {
    bannerBgColor = "#2e1065";
    fallbackTexture = {
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='20' viewBox='0 0 100 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M21.184 20c.392-5.351-2.352-10.051-6.102-13.799C11.332 2.453 6.136.634 0 0h100c-6.136.634-11.332 2.453-15.082 6.201C81.168 9.949 78.424 14.649 78.816 20h-57.632z' fill='%23ffffff' fill-opacity='0.06' fill-rule='evenodd'/%3E%3C/svg%3E")`,
    };
  } else if (primaryType === "textura" || primaryType === "resourcepack") {
    bannerBgColor = "#451a03";
    fallbackTexture = {
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 20l20-20v20L20 40V20zM0 40l20-20v20L0 40zm0-20L20 0v20L0 20z' fill='%23ffffff' fill-opacity='0.05' fill-rule='evenodd'/%3E%3C/svg%3E")`,
    };
  } else if (primaryType === "modpack") {
    bannerBgColor = "#172554";
    fallbackTexture = {
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='100' viewBox='0 0 60 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.06' fill-rule='evenodd'%3E%3Cpath d='M30 50L0 67.5V100l30-17.5V50zm0-50L0 17.5V50l30-17.5V0zm30 17.5L30 35v33.25l30-17.5V17.5zM30 67.5L0 85v33.25l30-17.5V67.5z'/%3E%3C/g%3E%3C/svg%3E")`,
    };
  } else if (primaryType === "bedrock" || primaryType === "addon") {
    bannerBgColor = "#064e3b";
    fallbackTexture = {
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%2300cc44' fill-opacity='0.15' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E")`,
    };
  } else {
    bannerBgColor = "#500724";
    fallbackTexture = {
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='28' height='49' viewBox='0 0 28 49' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.06' fill-rule='evenodd'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.98-7.5V0h-2v6.35L0 12.69v2.3zm0 18.5L12.98 41v8h-2v-6.85L0 35.81v-2.3zM15 0v7.5L27.99 15H28v-2.31h-.01L17 6.35V0h-2zm0 49v-8l12.99-7.5H28v2.31h-.01L17 42.65V49h-2z'/%3E%3C/g%3E%3C/svg%3E")`,
    };
  }

  return { bannerBgColor, fallbackTexture };
}
