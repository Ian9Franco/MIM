"use client";

import React from "react";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal, Loader2, ChevronRight, ExternalLink, ChevronDown, ChevronUp, RotateCcw, Box, Image as ImageIcon, Glasses, Database, Hash, Package } from "lucide-react";
import type { ModHit } from "../SpotlightMarquees";
import { DiscoverSkeleton } from "../FomoSkeletons";

interface DiscoverTabProps {
  discoverQuery: string;
  setDiscoverQuery: (v: string) => void;
  discoverType: string;
  setDiscoverType: (v: string) => void;
  discoverVersion: string[];
  setDiscoverVersion: (v: string[]) => void;
  discoverLoader: string[];
  setDiscoverLoader: (v: string[]) => void;
  discoverEnvironment: string;
  setDiscoverEnvironment: (v: string) => void;
  discoverCategory: string[];
  setDiscoverCategory: (v: string[]) => void;
  discoverSort: string;
  setDiscoverSort: (v: string) => void;
  discoverResults: ModHit[];
  discoverLoading: boolean;
  discoverPage: number;
  discoverTotal: number;
  setDiscoverResults: (r: ModHit[]) => void;
  setDiscoverPage: (p: number) => void;
  runDiscoverSearch: (page?: number) => void;
  handleOpenModDetails: (mod: ModHit) => void;
  discoverSource: "modrinth" | "curseforge" | "all";
  setDiscoverSource: (s: "modrinth" | "curseforge" | "all") => void;
  discoverError: string;
}

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevancia" },
  { value: "downloads", label: "Más Descargas" },
  { value: "follows", label: "Más Seguidos" },
  { value: "newest", label: "Más Recientes" },
  { value: "updated", label: "Última Actualización" }
];

const MC_VERSIONS = [
  "26.1.2", "26.1.1", "26.1.0", "1.21.8", "1.21.4", "1.21.1", "1.21",
  "1.20.6", "1.20.4", "1.20.1", "1.20",
  "1.19.4", "1.19.2", "1.19", "1.18.2", "1.16.5", "1.12.2"
];
const MOD_LOADERS = [
  { value: "fabric", label: "Fabric" },
  { value: "forge", label: "Forge" },
  { value: "neoforge", label: "NeoForge" },
  { value: "quilt", label: "Quilt" },
];
const MOD_TYPES = [
  { value: "any", label: "Cualquiera", icon: Hash },
  { value: "mod", label: "Mods", icon: Box },
  { value: "resourcepack", label: "Texturas", icon: ImageIcon },
  { value: "shader", label: "Shaders", icon: Glasses },
  { value: "datapack", label: "Datapacks", icon: Database },
  { value: "modpack", label: "Modpacks", icon: Package },
];
const ENVIRONMENTS = [
  { value: "any", label: "Cualquiera" },
  { value: "client", label: "Cliente" },
  { value: "server", label: "Servidor" },
  { value: "both", label: "Ambos" },
];

const MODRINTH_MOD_CATEGORIES = [
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

const MODRINTH_RESOURCEPACK_CATEGORIES = [
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

const MODRINTH_SHADER_CATEGORIES = [
  { value: "cartoon", label: "Cartoon" },
  { value: "cursed", label: "Cursed" },
  { value: "fantasy", label: "Fantasía" },
  { value: "realistic", label: "Realista" },
  { value: "semi-realistic", label: "Semi-realista" },
  { value: "vanilla-like", label: "Estilo Vanilla" }
];

const CURSEFORGE_MOD_CATEGORIES = [
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

const CURSEFORGE_DATAPACK_CATEGORIES = [
  { value: "mod support", label: "Soporte de Mods" },
  { value: "tech", label: "Tecnología" },
  { value: "magic", label: "Magia" },
  { value: "adventure", label: "Aventura" },
  { value: "library", label: "Librería" },
  { value: "utility", label: "Utilidad" },
  { value: "miscellaneous", label: "Misceláneo" },
  { value: "fantasy", label: "Fantasía" }
];

const CURSEFORGE_RESOURCEPACK_CATEGORIES = [
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

const CURSEFORGE_SHADER_CATEGORIES = [
  { value: "fantasy", label: "Fantasía" },
  { value: "realistic", label: "Realista" },
  { value: "vanilla", label: "Vanilla" }
];

const CURSEFORGE_MODPACK_CATEGORIES = [
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

function ModrinthIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`} style={{ color: "#1bd672" }}>
      <path d="M12.252 0.004a11.78 11.768 0 0 0 -8.92 3.73 11 10.999 0 0 0 -2.17 3.11 11.37 11.359 0 0 0 -1.16 5.169c0 1.42 0.17 2.5 0.6 3.77 0.24 0.759 0.77 1.899 1.17 2.529a12.3 12.298 0 0 0 8.85 5.639c0.44 0.05 2.54 0.07 2.76 0.02 0.2 -0.04 0.22 0.1 -0.26 -1.7l-0.36 -1.37 -1.01 -0.06a8.5 8.489 0 0 1 -5.18 -1.8 5.34 5.34 0 0 1 -1.3 -1.26c0 -0.05 0.34 -0.28 0.74 -0.5a37.572 37.545 0 0 1 2.88 -1.629c0.03 0 0.5 0.45 1.06 0.98l1 0.97 2.07 -0.43 2.06 -0.43 1.47 -1.47c0.8 -0.8 1.48 -1.5 1.48 -1.52 0 -0.09 -0.42 -1.63 -0.46 -1.7 -0.04 -0.06 -0.2 -0.03 -1.02 0.18 -0.53 0.13 -1.2 0.3 -1.45 0.4l-0.48 0.15 -0.53 0.53 -0.53 0.53 -0.93 0.1 -0.93 0.07 -0.52 -0.5a2.7 2.7 0 0 1 -0.96 -1.7l-0.13 -0.6 0.43 -0.57c0.68 -0.9 0.68 -0.9 1.46 -1.1 0.4 -0.1 0.65 -0.2 0.83 -0.33 0.13 -0.099 0.65 -0.579 1.14 -1.069l0.9 -0.9 -0.7 -0.7 -0.7 -0.7 -1.95 0.54c-1.07 0.3 -1.96 0.53 -1.97 0.53 -0.03 0 -2.23 2.48 -2.63 2.97l-0.29 0.35 0.28 1.03c0.16 0.56 0.3 1.16 0.31 1.34l0.03 0.3 -0.34 0.23c-0.37 0.23 -2.22 1.3 -2.84 1.63 -0.36 0.2 -0.37 0.2 -0.44 0.1 -0.08 -0.1 -0.23 -0.6 -0.32 -1.03 -0.18 -0.86 -0.17 -2.75 0.02 -3.73a8.84 8.839 0 0 1 7.9 -6.93c0.43 -0.03 0.77 -0.08 0.78 -0.1 0.06 -0.17 0.5 -2.999 0.47 -3.039 -0.01 -0.02 -0.1 -0.02 -0.2 -0.03Zm3.68 0.67c-0.2 0 -0.3 0.1 -0.37 0.38 -0.06 0.23 -0.46 2.42 -0.46 2.52 0 0.04 0.1 0.11 0.22 0.16a8.51 8.499 0 0 1 2.99 2 8.38 8.379 0 0 1 2.16 3.449 6.9 6.9 0 0 1 0.4 2.8c0 1.07 0 1.27 -0.1 1.73a9.37 9.369 0 0 1 -1.76 3.769c-0.32 0.4 -0.98 1.06 -1.37 1.38 -0.38 0.32 -1.54 1.1 -1.7 1.14 -0.1 0.03 -0.1 0.06 -0.07 0.26 0.03 0.18 0.64 2.56 0.7 2.78l0.06 0.06a12.07 12.058 0 0 0 7.27 -9.4c0.13 -0.77 0.13 -2.58 0 -3.4a11.96 11.948 0 0 0 -5.73 -8.578c-0.7 -0.42 -2.05 -1.06 -2.25 -1.06Z" fill="currentColor" />
    </svg>
  );
}

function CurseForgeIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`} style={{ color: "#f16436" }}>
      <path d="M18.326 9.2145S23.2261 8.4418 24 6.1882h-7.5066V4.4H0l2.0318 2.3576V9.173s5.1267 -0.2665 7.1098 1.2372c2.7146 2.516 -3.053 5.917 -3.053 5.917L5.0995 19.6c1.5465 -1.4726 4.494 -3.3775 9.8983 -3.2857 -2.0565 0.65 -4.1245 1.6651 -5.7344 3.2857h10.9248l-1.0288 -3.2726s-7.918 -4.6688 -0.8336 -7.1127z" fill="currentColor" />
    </svg>
  );
}

/** Formatea números de descarga a K/M */
function formatDownloads(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

type FomoBannerProjectType =
  | "mod"
  | "shader"
  | "textura"
  | "resourcepack"
  | "datapack"
  | "modpack"
  | "bedrock"
  | "addon";

interface BannerFallbackStyle {
  bannerBgColor: string;
  fallbackTexture: Record<string, string>;
}

function getBannerFallbackStyle(
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

/**
 * DiscoverTab — buscador de mods/texturas/shaders/datapacks desde Modrinth API.
 */
export function DiscoverTab({
  discoverQuery, setDiscoverQuery, discoverType, setDiscoverType,
  discoverVersion, setDiscoverVersion, discoverLoader, setDiscoverLoader,
  discoverEnvironment, setDiscoverEnvironment, discoverCategory, setDiscoverCategory,
  discoverResults, discoverLoading, discoverPage, discoverTotal,
  setDiscoverResults, setDiscoverPage, runDiscoverSearch, handleOpenModDetails,
  discoverSource, setDiscoverSource, discoverError, discoverSort, setDiscoverSort,
}: DiscoverTabProps) {
  const [showFilters, setShowFilters] = React.useState(false);

  // Calcular cantidad de filtros activos
  const activeFiltersCount =
    discoverVersion.length +
    (discoverType === "mod" ? discoverLoader.length : 0) +
    (discoverType === "mod" && discoverSource === "modrinth" && discoverEnvironment !== "any" ? 1 : 0) +
    discoverCategory.length;

  const handleClearFilters = () => {
    setDiscoverVersion([]);
    setDiscoverLoader([]);
    setDiscoverEnvironment("any");
    setDiscoverSort("newest");
    setDiscoverCategory([]);
    setDiscoverResults([]);
    setDiscoverPage(1);
  };

  const handleTypeChange = (val: string) => {
    setDiscoverType(val);
    setDiscoverResults([]);
    setDiscoverPage(1);
    setDiscoverCategory([]);
    if (val !== "mod") setDiscoverLoader([]);
  };

  const toggleVersion = (version: string) => {
    setDiscoverVersion(
      discoverVersion.includes(version)
        ? discoverVersion.filter((item) => item !== version)
        : [...discoverVersion, version]
    );
    setDiscoverResults([]);
    setDiscoverPage(1);
  };

  const toggleLoader = (loader: string) => {
    setDiscoverLoader(
      discoverLoader.includes(loader)
        ? discoverLoader.filter((item) => item !== loader)
        : [...discoverLoader, loader]
    );
    setDiscoverResults([]);
    setDiscoverPage(1);
  };

  const getCategories = () => {
    if (discoverSource === "modrinth" || discoverSource === "all") {
      if (discoverType === "mod" || discoverType === "datapack" || discoverType === "modpack") return MODRINTH_MOD_CATEGORIES;
      if (discoverType === "resourcepack") return MODRINTH_RESOURCEPACK_CATEGORIES;
      if (discoverType === "shader") return MODRINTH_SHADER_CATEGORIES;
    } else {
      if (discoverType === "mod") return CURSEFORGE_MOD_CATEGORIES;
      if (discoverType === "datapack") return CURSEFORGE_DATAPACK_CATEGORIES;
      if (discoverType === "resourcepack") return CURSEFORGE_RESOURCEPACK_CATEGORIES;
      if (discoverType === "shader") return CURSEFORGE_SHADER_CATEGORIES;
      if (discoverType === "modpack") return CURSEFORGE_MODPACK_CATEGORIES;
    }
    return [];
  };

  const activeCategories = getCategories();

  return (
    <motion.div
      key="discover"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="flex-1 flex flex-col min-h-0 pb-24"
    >
      {/* Header + platform selector */}
      <div className="flex gap-2 mb-2 shrink-0">
        <div
          className="flex-1 min-w-0 border-l-2 rounded-r-lg px-2.5 py-1.5"
          style={{
            background: "linear-gradient(to right, color-mix(in srgb, var(--color-primary) 10%, transparent), transparent)",
            borderColor: "var(--color-primary)"
          }}
        >
          <p className="text-[9px] font-mono uppercase tracking-wider font-bold leading-none" style={{ color: "var(--color-primary)" }}>
            Explorar
          </p>
          <h2 className="text-[10px] font-semibold text-white/90 mt-1 leading-tight line-clamp-2">
            {discoverSource === "all"
              ? "Explorá mods, texturas, shaders y modpacks en Modrinth y CurseForge."
              : discoverSource === "curseforge"
              ? "Explorá mods, texturas, shaders y modpacks de CurseForge."
              : "Explorá mods, texturas, shaders y modpacks de Modrinth."}
          </h2>
        </div>

        <div className="w-[86px] shrink-0 grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => {
              setDiscoverSource("modrinth");
              setDiscoverResults([]);
              setDiscoverPage(1);
              setDiscoverCategory([]);
            }}
            className={`h-6 rounded-lg text-xs font-bold transition-all border flex items-center justify-center ${
              discoverSource === "modrinth"
                ? "bg-[#1bd672]/20 text-[#1bd672] border-[#1bd672]/30"
                : "bg-white/5 text-white/50 border-transparent hover:bg-white/10"
            }`}
            title="Buscar en Modrinth"
            aria-label="Buscar en Modrinth"
          >
            <ModrinthIcon className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setDiscoverSource("curseforge");
              setDiscoverResults([]);
              setDiscoverPage(1);
              setDiscoverCategory([]);
            }}
            className={`h-6 rounded-lg text-xs font-bold transition-all border flex items-center justify-center ${
              discoverSource === "curseforge"
                ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
                : "bg-white/5 text-white/50 border-transparent hover:bg-white/10"
            }`}
            title="Buscar en CurseForge"
            aria-label="Buscar en CurseForge"
          >
            <CurseForgeIcon className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setDiscoverSource("all");
              setDiscoverResults([]);
              setDiscoverPage(1);
              setDiscoverCategory([]);
            }}
            className={`col-span-2 h-6 rounded-lg text-xs font-bold transition-all border flex items-center justify-center gap-1 ${
              discoverSource === "all"
                ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                : "bg-white/5 text-white/50 border-transparent hover:bg-white/10"
            }`}
            title="Buscar en ambas plataformas"
            aria-label="Buscar en ambas plataformas"
          >
            <ModrinthIcon className="w-3.5 h-3.5" />
            <CurseForgeIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Error banner */}
      {discoverError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-4 text-xs flex flex-col gap-2 shrink-0">
          <div className="flex items-center gap-2 text-red-400 font-semibold">
            <span>⚠️ {discoverError}</span>
          </div>
          {discoverSource === "modrinth" && (
            <div className="text-white/60">
              Parece que los servidores de búsqueda de Modrinth están experimentando problemas en este momento. 
              Te recomendamos cambiar a **CurseForge** para continuar explorando.
              <button
                onClick={() => {
                  setDiscoverSource("curseforge");
                  setDiscoverResults([]);
                  setDiscoverPage(1);
                }}
                className="mt-2.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 active:scale-95 transition-all text-white font-bold rounded-lg block w-max"
              >
                Cambiar a CurseForge
              </button>
            </div>
          )}
        </div>
      )}

      {/* Type selector */}
      <div className="flex gap-1 mb-2 shrink-0 overflow-visible">
        {MOD_TYPES.map(type => {
          const TypeIcon = type.icon;
          const isSelected = discoverType === type.value;
          return (
            <button
              key={type.value}
              onClick={() => handleTypeChange(type.value)}
              title={type.label}
              aria-label={type.label}
              className={`group h-8 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all duration-200 active:scale-95 flex items-center justify-center gap-1.5 overflow-hidden ${
                isSelected ? "px-2.5 min-w-0" : "px-2 w-9 hover:w-auto hover:px-2.5"
              } ${
                isSelected
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/35 shadow-sm"
                  : "bg-white/5 text-white/50 border border-white/[0.04] hover:bg-white/10"
              }`}
            >
              <TypeIcon className="w-[18px] h-[18px]" />
              <span className={`overflow-hidden transition-all duration-200 ${
                isSelected ? "max-w-[76px] opacity-100" : "max-w-0 opacity-0 group-hover:max-w-[76px] group-hover:opacity-100"
              }`}>
                {type.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Sort selector */}
      <div className="flex items-center gap-2 mb-2 shrink-0">
        <label className="text-[9px] font-bold text-white/30 uppercase font-mono tracking-wider shrink-0">Ordenar</label>
        <select
          value={discoverSort}
          onChange={(e) => { setDiscoverSort(e.target.value); setDiscoverResults([]); setDiscoverPage(1); }}
          className="flex-1 h-8 bg-surface/90 border border-border rounded-xl px-3 text-[11px] text-white/80 focus:border-amber-500/50 outline-none cursor-pointer"
        >
          {SORT_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value} className="bg-surface text-white">{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Filtros y Categorías - Cabecera Colapsable */}
      <div className="flex items-center justify-between mb-2 shrink-0 bg-white/5 border border-white/[0.04] p-1.5 rounded-2xl">
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-white/80 hover:text-white hover:bg-white/5 transition-all"
        >
          <SlidersHorizontal className={`w-3.5 h-3.5 transition-transform duration-300 ${showFilters ? "rotate-90 text-amber-400" : "text-white/40"}`} />
          <span>Filtros y Categorías</span>
          {activeFiltersCount > 0 && (
            <span className="flex items-center justify-center w-5 h-5 text-[10px] font-black rounded-full bg-amber-500 text-black shadow-sm">
              {activeFiltersCount}
            </span>
          )}
        </button>

        <div className="flex items-center gap-2">
          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all uppercase tracking-wider font-mono"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Limpiar</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="p-1 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-all"
          >
            {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Contenedor Animado de Filtros */}
      <motion.div
        initial={false}
        animate={{
          height: showFilters ? "auto" : 0,
          opacity: showFilters ? 1 : 0,
          marginBottom: showFilters ? 16 : 0,
        }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="overflow-hidden shrink-0"
      >
        <div className="grid grid-cols-2 gap-3 p-1">
          <div className="flex flex-col gap-1 col-span-2">
            <label className="text-[9px] font-bold text-white/30 uppercase font-mono tracking-wider flex justify-between">
              <span>Versión de Minecraft</span>
              {discoverVersion.length > 0 && <span className="text-amber-500/80">{discoverVersion.length} seleccionada{discoverVersion.length > 1 ? "s" : ""}</span>}
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-surface/50 border border-border rounded-xl scrollbar-thin scrollbar-thumb-white/10">
              <button
                type="button"
                onClick={() => { setDiscoverVersion([]); setDiscoverResults([]); setDiscoverPage(1); }}
                className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                  discoverVersion.length === 0
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/35"
                    : "bg-white/5 text-white/50 border border-white/[0.04] hover:bg-white/10"
                }`}
              >
                Cualquiera
              </button>
              {MC_VERSIONS.map(ver => {
                const isSelected = discoverVersion.includes(ver);
                return (
                  <button
                    key={ver}
                    type="button"
                    onClick={() => toggleVersion(ver)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                      isSelected
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/35"
                        : "bg-white/5 text-white/50 border border-white/[0.04] hover:bg-white/10"
                    }`}
                  >
                    {ver}
                  </button>
                );
              })}
            </div>
          </div>

          {discoverType === "mod" && (
            <div className="flex flex-col gap-1 col-span-2">
              <label className="text-[9px] font-bold text-white/30 uppercase font-mono tracking-wider flex justify-between">
                <span>Mod Loader</span>
                {discoverLoader.length > 0 && <span className="text-amber-500/80">{discoverLoader.length} seleccionado{discoverLoader.length > 1 ? "s" : ""}</span>}
              </label>
              <div className="flex flex-wrap gap-1.5 p-1.5 bg-surface/50 border border-border rounded-xl">
                <button
                  type="button"
                  onClick={() => { setDiscoverLoader([]); setDiscoverResults([]); setDiscoverPage(1); }}
                  className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                    discoverLoader.length === 0
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/35"
                      : "bg-white/5 text-white/50 border border-white/[0.04] hover:bg-white/10"
                  }`}
                >
                  Cualquiera
                </button>
                {MOD_LOADERS.map(l => {
                  const isSelected = discoverLoader.includes(l.value);
                  return (
                    <button
                      key={l.value}
                      type="button"
                      onClick={() => toggleLoader(l.value)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                        isSelected
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/35"
                          : "bg-white/5 text-white/50 border border-white/[0.04] hover:bg-white/10"
                      }`}
                    >
                      {l.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Entorno: shown only for Modrinth mods */}
          {discoverSource === "modrinth" && discoverType === "mod" && (
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-white/30 uppercase font-mono tracking-wider">Entorno</label>
              <select
                value={discoverEnvironment}
                onChange={(e) => { setDiscoverEnvironment(e.target.value); setDiscoverResults([]); setDiscoverPage(1); }}
                className="w-full bg-surface/90 border border-border rounded-xl py-2 px-3 text-xs text-white/80 focus:border-amber-500/50 outline-none cursor-pointer"
              >
                {ENVIRONMENTS.map(env => (
                  <option key={env.value} value={env.value} className="bg-surface text-white">{env.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Category: shown for all types */}
          {activeCategories.length > 0 && (
            <div className="flex flex-col gap-1 col-span-2">
              <label className="text-[9px] font-bold text-white/30 uppercase font-mono tracking-wider flex justify-between">
                <span>Categorías</span>
                {discoverCategory.length > 0 && <span className="text-amber-500/80">{discoverCategory.length} seleccionada{discoverCategory.length > 1 ? 's' : ''}</span>}
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1.5 bg-surface/50 border border-border rounded-xl scrollbar-thin scrollbar-thumb-white/10">
                {activeCategories.map(cat => {
                  const isSelected = discoverCategory.includes(cat.value);
                  return (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        if (isSelected) setDiscoverCategory(discoverCategory.filter(c => c !== cat.value));
                        else setDiscoverCategory([...discoverCategory, cat.value]);
                        setDiscoverResults([]); setDiscoverPage(1);
                      }}
                      className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                        isSelected 
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/35" 
                          : "bg-white/5 text-white/50 border border-white/[0.04] hover:bg-white/10"
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </motion.div>

      {/* Search bar */}
      <form
        onSubmit={(e) => { e.preventDefault(); runDiscoverSearch(1); }}
        className="flex gap-2 mb-4 shrink-0"
      >
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar proyectos..."
            value={discoverQuery}
            onChange={(e) => setDiscoverQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/[0.08] rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-white/20 focus:border-amber-500/55 outline-none"
          />
        </div>
        <button
          type="submit"
          className="bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs px-4 rounded-xl active:scale-95 transition-all shadow-md"
        >
          Buscar
        </button>
      </form>

      {/* Results */}
      {discoverLoading ? (
        <div className="flex-1 overflow-y-auto pr-1 scrollbar-none flex flex-col gap-4">
          <DiscoverSkeleton />
        </div>
      ) : discoverResults.length > 0 ? (
        <div className="flex-1 overflow-y-auto pr-1 scrollbar-none flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3.5 w-full">
            {discoverResults.map((mod) => {
              const isCurse = mod._source === "curseforge";
              const cardRoundedClass = isCurse ? "rounded-xl" : "rounded-3xl";
              const iconRoundedClass = isCurse ? "rounded-lg" : "rounded-2xl";
              
              const pType = mod.projectType || "mod";
              const bannerUrl = mod.gallery?.[0]?.url || undefined;
              const { bannerBgColor, fallbackTexture } = getBannerFallbackStyle(pType);
              
              const platformBorderClass = isCurse 
                ? "border-orange-500/15 hover:border-orange-500/40 hover:shadow-[0_4px_20px_rgba(249,115,22,0.08)]" 
                : "border-emerald-500/15 hover:border-emerald-500/40 hover:shadow-[0_4px_20px_rgba(16,185,129,0.08)]";

              return (
                <div
                  key={mod.projectId}
                  onClick={() => handleOpenModDetails(mod)}
                  className={`bg-surface/60 border flex flex-col overflow-hidden active:scale-[0.98] transition-all cursor-pointer ${cardRoundedClass} ${platformBorderClass}`}
                >
                  {/* Banner/Header of the card */}
                  <div 
                    className="h-12 w-full relative shrink-0 overflow-hidden" 
                    style={bannerUrl ? {
                      backgroundImage: `url(${bannerUrl})`,
                      backgroundPosition: "center",
                      backgroundSize: "cover"
                    } : {
                      backgroundColor: bannerBgColor,
                      ...fallbackTexture
                    }}
                  >
                    {/* Small tag/badge on the banner */}
                    <div className="absolute top-2 left-2.5 flex items-center gap-1 z-10">
                      <span className="text-[7.5px] font-black uppercase tracking-wider bg-black/75 text-white px-1.5 py-0.5 rounded">
                        {pType}
                      </span>
                    </div>

                    {/* Platform Badge Tag */}
                    <div className="absolute top-2 right-2.5 z-10">
                      <span className={`text-[7.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shadow-sm ${
                        isCurse 
                          ? "bg-orange-600 text-white border border-orange-500/20" 
                          : "bg-emerald-600 text-white border border-emerald-500/20"
                      }`}>
                        {isCurse ? "CurseForge" : "Modrinth"}
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-3 pt-6 relative flex-grow flex flex-col justify-between">
                    {/* Floating Icon Container */}
                    <div className={`absolute -top-6 left-3 w-10 h-10 bg-surface border border-white/[0.08] flex items-center justify-center overflow-hidden shadow-md ${iconRoundedClass}`}>
                      {mod.iconUrl ? (
                        <img src={mod.iconUrl} alt="" className="object-cover w-full h-full" />
                      ) : (
                        <span className="text-white/40 text-[10px] font-bold uppercase">{mod.title.substring(0, 2)}</span>
                      )}
                    </div>

                    <div className="flex-grow min-w-0 mt-1">
                      <h4 className="text-[11px] font-bold text-white leading-tight line-clamp-2 pr-1">{mod.title}</h4>
                      <p className="text-[9px] text-white/40 mt-1 truncate">
                        por <span className="text-white/60 font-semibold">{mod.author || "Comunidad"}</span>
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/[0.04] pt-2 mt-2.5">
                      {mod.downloads !== undefined ? (
                        <span className="text-[9px] font-mono text-white/30 font-semibold">
                          {formatDownloads(mod.downloads)} ↓
                        </span>
                      ) : (
                        <span />
                      )}
                      
                      <div className="flex items-center gap-2">
                        <a
                          href={mod.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all flex items-center justify-center"
                          title={`Abrir en ${isCurse ? "CurseForge" : "Modrinth"}`}
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <span className="text-[9px] font-bold text-orange-400/90 flex items-center gap-0.5">
                          Ver <ChevronRight className="w-2.5 h-2.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {discoverTotal > 0 && (
            <div className="flex items-center justify-between border-t border-white/[0.06] pt-4 mt-2 mb-6 px-1 shrink-0">
              <button
                onClick={() => {
                  if (discoverPage > 1) {
                    runDiscoverSearch(discoverPage - 1);
                  }
                }}
                disabled={discoverPage <= 1 || discoverLoading}
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/[0.08] text-xs font-semibold text-white/80 disabled:opacity-30 disabled:pointer-events-none active:scale-95 transition-all flex items-center gap-1"
              >
                &larr; Anterior
              </button>

              <div className="flex flex-col items-center">
                <span className="text-[11px] font-bold text-white/90">
                  Página {discoverPage} de {Math.max(1, Math.ceil(discoverTotal / 10))}
                </span>
                <span className="text-[9px] text-white/40 font-semibold font-mono mt-0.5">
                  {discoverTotal} resultados
                </span>
              </div>

              <button
                onClick={() => {
                  const totalPages = Math.ceil(discoverTotal / 10);
                  if (discoverPage < totalPages) {
                    runDiscoverSearch(discoverPage + 1);
                  }
                }}
                disabled={discoverPage >= Math.ceil(discoverTotal / 10) || discoverLoading}
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/[0.08] text-xs font-semibold text-white/80 disabled:opacity-30 disabled:pointer-events-none active:scale-95 transition-all flex items-center gap-1"
              >
                Siguiente &rarr;
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-center items-center text-center p-6">
          <Search className="w-12 h-12 text-amber-500/50 mb-4 animate-pulse" />
          <h2 className="text-sm font-semibold text-white">Sin resultados</h2>
          <p className="text-xs text-white/40 mt-1">No se encontraron mods que coincidan con la búsqueda o filtros aplicados.</p>
        </div>
      )}
    </motion.div>
  );
}
