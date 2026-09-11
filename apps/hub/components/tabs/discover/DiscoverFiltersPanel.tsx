"use client";

import React from "react";
import { motion } from "framer-motion";
import { SlidersHorizontal, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import {
  MC_VERSIONS,
  MOD_LOADERS,
  ENVIRONMENTS,
  MODRINTH_MOD_CATEGORIES,
  MODRINTH_RESOURCEPACK_CATEGORIES,
  MODRINTH_SHADER_CATEGORIES,
  CURSEFORGE_MOD_CATEGORIES,
  CURSEFORGE_DATAPACK_CATEGORIES,
  CURSEFORGE_RESOURCEPACK_CATEGORIES,
  CURSEFORGE_SHADER_CATEGORIES,
  CURSEFORGE_MODPACK_CATEGORIES,
} from "./discoverConstants";
import type { ModHit } from "../../SpotlightMarquees";

interface DiscoverFiltersPanelProps {
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  discoverType: string;
  discoverSource: "modrinth" | "curseforge" | "all" | "chunk";
  discoverVersion: string[];
  setDiscoverVersion: (v: string[]) => void;
  discoverLoader: string[];
  setDiscoverLoader: (v: string[]) => void;
  discoverEnvironment: string;
  setDiscoverEnvironment: (v: string) => void;
  discoverCategory: string[];
  setDiscoverCategory: (v: string[]) => void;
  setDiscoverResults: (r: ModHit[]) => void;
  setDiscoverPage: (p: number) => void;
  handleClearFilters: () => void;
}

export function DiscoverFiltersPanel({
  showFilters,
  setShowFilters,
  discoverType,
  discoverSource,
  discoverVersion,
  setDiscoverVersion,
  discoverLoader,
  setDiscoverLoader,
  discoverEnvironment,
  setDiscoverEnvironment,
  discoverCategory,
  setDiscoverCategory,
  setDiscoverResults,
  setDiscoverPage,
  handleClearFilters,
}: DiscoverFiltersPanelProps) {
  // Cantidad de filtros activos
  const activeFiltersCount =
    discoverVersion.length +
    (discoverType === "mod" ? discoverLoader.length : 0) +
    (discoverType === "mod" && discoverSource === "modrinth" && discoverEnvironment !== "any" ? 1 : 0) +
    discoverCategory.length;

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
    <>
      {/* Filtros y Categorías - Cabecera Colapsable */}
      <div 
        onClick={() => {
          setShowFilters(!showFilters);
        }}
        className="flex items-center justify-between mb-2 shrink-0 bg-white/5 border border-white/[0.04] p-1.5 rounded-2xl cursor-pointer hover:bg-white/[0.08] transition-colors"
      >
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-white/80 transition-all select-none">
          <SlidersHorizontal className={`w-3.5 h-3.5 transition-transform duration-300 ${showFilters ? "rotate-90 text-amber-400" : "text-white/40"}`} />
          <span>Filtros y Categorías</span>
          {activeFiltersCount > 0 && (
            <span className="flex items-center justify-center w-5 h-5 text-[10px] font-black rounded-full bg-amber-500 text-black shadow-sm">
              {activeFiltersCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 pr-1.5">
          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClearFilters();
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all uppercase tracking-wider font-mono"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Limpiar</span>
            </button>
          )}
          <div className="p-1 text-white/40 transition-colors">
            {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
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
              {discoverVersion.length > 0 && (
                <span className="text-amber-500/80">
                  {discoverVersion.length} seleccionada{discoverVersion.length > 1 ? "s" : ""}
                </span>
              )}
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
                    onClick={() => {
                      toggleVersion(ver);
                    }}
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
                {discoverLoader.length > 0 && (
                  <span className="text-amber-500/80">
                    {discoverLoader.length} seleccionado{discoverLoader.length > 1 ? "s" : ""}
                  </span>
                )}
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
                      onClick={() => {
                        toggleLoader(l.value);
                      }}
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
              <label className="text-[9px] font-bold text-white/30 uppercase font-mono tracking-wider">
                Entorno
              </label>
              <select
                value={discoverEnvironment}
                onChange={(e) => { setDiscoverEnvironment(e.target.value); setDiscoverResults([]); setDiscoverPage(1); }}
                className="w-full bg-surface/90 border border-border rounded-xl py-2 px-3 text-xs text-white/80 focus:border-amber-500/50 outline-none cursor-pointer"
              >
                {ENVIRONMENTS.map(env => (
                  <option key={env.value} value={env.value} className="bg-surface text-white">
                    {env.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Category: shown for all types */}
          {activeCategories.length > 0 && (
            <div className="flex flex-col gap-1 col-span-2">
              <label className="text-[9px] font-bold text-white/30 uppercase font-mono tracking-wider flex justify-between">
                <span>Categorías</span>
                {discoverCategory.length > 0 && (
                  <span className="text-amber-500/80">
                    {discoverCategory.length} seleccionada{discoverCategory.length > 1 ? "s" : ""}
                  </span>
                )}
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
                        setDiscoverResults([]);
                        setDiscoverPage(1);
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
    </>
  );
}
