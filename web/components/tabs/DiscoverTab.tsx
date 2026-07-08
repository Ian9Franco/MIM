"use client";

import React from "react";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal, Loader2, ChevronRight } from "lucide-react";
import type { ModHit } from "../SpotlightMarquees";

interface DiscoverTabProps {
  discoverQuery: string;
  setDiscoverQuery: (v: string) => void;
  discoverType: string;
  setDiscoverType: (v: string) => void;
  discoverVersion: string;
  setDiscoverVersion: (v: string) => void;
  discoverLoader: string;
  setDiscoverLoader: (v: string) => void;
  discoverEnvironment: string;
  setDiscoverEnvironment: (v: string) => void;
  discoverCategory: string;
  setDiscoverCategory: (v: string) => void;
  discoverResults: ModHit[];
  discoverLoading: boolean;
  discoverPage: number;
  discoverTotal: number;
  setDiscoverResults: (r: ModHit[]) => void;
  setDiscoverPage: (p: number) => void;
  runDiscoverSearch: (page?: number) => void;
  handleOpenModDetails: (mod: ModHit) => void;
  discoverSource: "modrinth" | "curseforge";
  setDiscoverSource: (s: "modrinth" | "curseforge") => void;
  discoverError: string;
}

const MC_VERSIONS = ["1.21.1", "1.20.4", "1.20.1", "1.19.4", "1.19.2", "1.18.2", "1.16.5", "1.12.2"];
const MOD_LOADERS = [
  { value: "fabric", label: "Fabric" },
  { value: "forge", label: "Forge" },
  { value: "neoforge", label: "NeoForge" },
  { value: "quilt", label: "Quilt" },
  { value: "any", label: "Cualquiera" },
];
const MOD_TYPES = [
  { value: "mod", label: "Mods" },
  { value: "resourcepack", label: "Texturas" },
  { value: "shader", label: "Shaders" },
  { value: "datapack", label: "Datapacks" },
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

/** Formatea números de descarga a K/M */
function formatDownloads(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
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
  discoverSource, setDiscoverSource, discoverError,
}: DiscoverTabProps) {
  const handleTypeChange = (val: string) => {
    setDiscoverType(val);
    setDiscoverResults([]);
    setDiscoverPage(1);
    setDiscoverCategory("");
  };

  const getCategories = () => {
    if (discoverSource === "modrinth") {
      if (discoverType === "mod" || discoverType === "datapack") return MODRINTH_MOD_CATEGORIES;
      if (discoverType === "resourcepack") return MODRINTH_RESOURCEPACK_CATEGORIES;
      if (discoverType === "shader") return MODRINTH_SHADER_CATEGORIES;
    } else {
      if (discoverType === "mod") return CURSEFORGE_MOD_CATEGORIES;
      if (discoverType === "datapack") return CURSEFORGE_DATAPACK_CATEGORIES;
      if (discoverType === "resourcepack") return CURSEFORGE_RESOURCEPACK_CATEGORIES;
      if (discoverType === "shader") return CURSEFORGE_SHADER_CATEGORIES;
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
      {/* Header */}
      <div
        className="border-l-2 rounded-r-lg p-3 mb-4 shrink-0"
        style={{
          background: "linear-gradient(to right, color-mix(in srgb, var(--color-primary) 10%, transparent), transparent)",
          borderColor: "var(--color-primary)"
        }}
      >
        <p className="text-[10px] font-mono uppercase tracking-wider font-bold" style={{ color: "var(--color-primary)" }}>
          Explorar
        </p>
        <h2 className="text-xs font-semibold text-white/90 mt-1">
          {discoverSource === "curseforge"
            ? "Explorá y buscá mods, texturas y shaders de CurseForge."
            : "Explorá y buscá mods, texturas y shaders de Modrinth."}
        </h2>
      </div>

      {/* Source selector */}
      <div className="flex gap-2 mb-3 shrink-0">
        <button
          onClick={() => {
            setDiscoverSource("modrinth");
            setDiscoverResults([]);
            setDiscoverPage(1);
            setDiscoverCategory("");
          }}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border ${
            discoverSource === "modrinth"
              ? "bg-[#1bd672]/20 text-[#1bd672] border-[#1bd672]/30"
              : "bg-white/5 text-white/50 border-transparent hover:bg-white/10"
          }`}
        >
          Modrinth
        </button>
        <button
          onClick={() => {
            setDiscoverSource("curseforge");
            setDiscoverResults([]);
            setDiscoverPage(1);
            setDiscoverCategory("");
          }}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border ${
            discoverSource === "curseforge"
              ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
              : "bg-white/5 text-white/50 border-transparent hover:bg-white/10"
          }`}
        >
          CurseForge
        </button>
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
      <div className="flex gap-1.5 mb-3 shrink-0 overflow-x-auto pb-1 scrollbar-none">
        {MOD_TYPES.map(type => (
          <button
            key={type.value}
            onClick={() => handleTypeChange(type.value)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 active:scale-95 ${
              discoverType === type.value
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/35 shadow-sm"
                : "bg-white/5 text-white/50 border border-white/[0.04] hover:bg-white/10"
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 gap-3 mb-4 shrink-0">
        {/* Minecraft Version: shown for all project types */}
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold text-white/30 uppercase font-mono tracking-wider">Versión de Minecraft</label>
          <select
            value={discoverVersion}
            onChange={(e) => { setDiscoverVersion(e.target.value); setDiscoverResults([]); setDiscoverPage(1); }}
            className="w-full bg-surface/90 border border-border rounded-xl py-2 px-3 text-xs text-white/80 focus:border-amber-500/50 outline-none cursor-pointer"
          >
            {MC_VERSIONS.map(ver => (
              <option key={ver} value={ver} className="bg-surface text-white">{ver}</option>
            ))}
          </select>
        </div>

        {/* Mod Loader: shown only for mods */}
        {discoverType === "mod" && (
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-bold text-white/30 uppercase font-mono tracking-wider">Mod Loader</label>
            <select
              value={discoverLoader}
              onChange={(e) => { setDiscoverLoader(e.target.value); setDiscoverResults([]); setDiscoverPage(1); }}
              className="w-full bg-surface/90 border border-border rounded-xl py-2 px-3 text-xs text-white/80 focus:border-amber-500/50 outline-none cursor-pointer"
            >
              {MOD_LOADERS.map(l => (
                <option key={l.value} value={l.value} className="bg-surface text-white">{l.label}</option>
              ))}
            </select>
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
          <div className={`flex flex-col gap-1 ${
            (discoverType === "mod" && discoverSource === "curseforge") || (discoverType === "datapack" && discoverSource === "curseforge")
              ? "col-span-2"
              : ""
          }`}>
            <label className="text-[9px] font-bold text-white/30 uppercase font-mono tracking-wider">Categoría</label>
            <select
              value={discoverCategory}
              onChange={(e) => { setDiscoverCategory(e.target.value); setDiscoverResults([]); setDiscoverPage(1); }}
              className="w-full bg-surface/90 border border-border rounded-xl py-2 px-3 text-xs text-white/80 focus:border-amber-500/50 outline-none cursor-pointer"
            >
              <option value="" className="bg-surface text-white">Cualquiera</option>
              {activeCategories.map(cat => (
                <option key={cat.value} value={cat.value} className="bg-surface text-white">{cat.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

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
      {discoverLoading && discoverPage === 1 ? (
        <div className="flex-1 flex flex-col justify-center items-center">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          <span className="text-xs text-white/40 mt-3 font-mono">Buscando en {discoverSource === "curseforge" ? "CurseForge" : "Modrinth"}...</span>
        </div>
      ) : discoverResults.length > 0 ? (
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-none">
          {discoverResults.map((mod) => (
            <div
              key={mod.projectId}
              onClick={() => handleOpenModDetails(mod)}
              className="bg-surface/90 border border-border rounded-2xl p-3 flex items-center gap-3 active:scale-[0.98] transition-all cursor-pointer hover:border-border"
            >
              <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/[0.05] flex items-center justify-center overflow-hidden flex-shrink-0">
                {mod.iconUrl ? (
                  <img src={mod.iconUrl} alt="" className="object-cover w-full h-full" />
                ) : (
                  <span className="text-white/40 text-xs font-bold uppercase">{mod.title.substring(0, 2)}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{mod.title}</p>
                <p className="text-[9px] text-white/40 mt-0.5 truncate leading-tight">
                  {mod.description || `Creador: ${mod.author}`}
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {mod.downloads !== undefined && (
                  <span className="text-[9.5px] font-mono text-white/30">
                    {formatDownloads(mod.downloads)} ↓
                  </span>
                )}
                <ChevronRight className="w-3.5 h-3.5 text-white/20" />
              </div>
            </div>
          ))}

          {discoverResults.length < discoverTotal && (
            <button
              onClick={() => runDiscoverSearch(discoverPage + 1)}
              disabled={discoverLoading}
              className="w-full bg-white/5 hover:bg-white/10 border border-white/[0.06] rounded-xl py-3 text-xs font-semibold text-white/70 active:scale-95 transition-all flex items-center justify-center gap-2 mt-4"
            >
              {discoverLoading ? <Loader2 className="w-4 h-4 animate-spin text-amber-500" /> : "Cargar más"}
            </button>
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
