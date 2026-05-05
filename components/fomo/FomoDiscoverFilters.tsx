/**
 * @fileoverview FomoDiscoverFilters – search input + filter selects + sort
 * toggle for the FOMO discover view. Extracted from FomoSidebar to keep
 * each component under 150 lines.
 */

"use client";

import React, { memo, useMemo } from "react";
import { 
  // Iconos de Interfaz (mantenidos de tu import original)
  RefreshCw, Check, ChevronDown, Globe, Laptop, Server, Tags,
  
  // Mods & Datapacks
  Compass, Skull, Palette, Coins, Shield, Utensils, Cog, BookOpen, Wand2, 
  SlidersHorizontal, Gamepad2, PawPrint, Zap, Users, Archive, Cpu, TrainFront, 
  Wrench, Mountain,
  
  // Resourcepacks
  Swords, Blocks, Aperture, Feather, Brush, Settings2, Leaf,
  
  // Features
  Headphones, Cuboid, Sparkles, Shapes, Trees, Type, LayoutDashboard, Gem, 
  Languages, Component,
  
  // Shaders
  Pencil, Castle, ImagePlus, Cloud, SunDim, Lightbulb, Sprout, Sun, Layers, 
  Droplet, Moon,
  
  // Performance
  Snail, BatteryLow, BatteryMedium, Rocket, Camera,
  
  // Shader Loaders
  Eye, Glasses, Box,
  
  // Resolutions
  Grid2x2, Grid3x3, LayoutGrid, Grip, Image, Monitor, Maximize, Maximize2
} from "lucide-react";


import { 
  LOADERS, GAME_VERSIONS, PROJECT_TYPES, SORT_OPTIONS, 
  MODRINTH_CATEGORIES, RESOURCEPACK_FILTERS, SHADER_FILTERS, ENVIRONMENTS 
} from "../../constants/app";
import { COLORS } from "@/theme/tokens";
import type { SortOrder } from "../../constants/app";

interface FomoDiscoverFiltersProps {
  loader:       string;
  gameVersions: string[];
  projectType:  string;
  categories:   string[];
  environments: string[];
  sortOrder:    SortOrder;
  query:        string;
  loading:      boolean;
  source:       "modrinth" | "curseforge";
  onLoader:       (v: string) => void;
  onVersions:     (v: string[]) => void;
  onProjectType:  (v: string) => void;
  onCategories:   (v: string[]) => void;
  onEnvironments: (v: string[]) => void;
  onSort:         (v: SortOrder) => void;
  onQuery:        (v: string) => void;
  onRefresh:      () => void;
}

// Icon mapping for categories
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  // Mods & Datapacks
  adventure: <Compass className="w-3.5 h-3.5" />,
  cursed: <Skull className="w-3.5 h-3.5" />,
  decoration: <Palette className="w-3.5 h-3.5" />,
  economy: <Coins className="w-3.5 h-3.5" />,
  equipment: <Shield className="w-3.5 h-3.5" />,
  food: <Utensils className="w-3.5 h-3.5" />,
  game_mechanics: <Cog className="w-3.5 h-3.5" />,
  library: <BookOpen className="w-3.5 h-3.5" />,
  magic: <Wand2 className="w-3.5 h-3.5" />,
  management: <SlidersHorizontal className="w-3.5 h-3.5" />,
  minigame: <Gamepad2 className="w-3.5 h-3.5" />,
  mobs: <PawPrint className="w-3.5 h-3.5" />,
  optimization: <Zap className="w-3.5 h-3.5" />,
  social: <Users className="w-3.5 h-3.5" />,
  storage: <Archive className="w-3.5 h-3.5" />,
  technology: <Cpu className="w-3.5 h-3.5" />,
  transportation: <TrainFront className="w-3.5 h-3.5" />,
  utility: <Wrench className="w-3.5 h-3.5" />,
  world_generation: <Mountain className="w-3.5 h-3.5" />,

  // Resourcepacks
  combat: <Swords className="w-3.5 h-3.5" />,
  modded: <Blocks className="w-3.5 h-3.5" />,
  realistic: <Aperture className="w-3.5 h-3.5" />,
  simplistic: <Feather className="w-3.5 h-3.5" />,
  themed: <Brush className="w-3.5 h-3.5" />,
  tweaks: <Settings2 className="w-3.5 h-3.5" />,
  "vanilla-like": <Leaf className="w-3.5 h-3.5" />,
  
  // Features
  audio: <Headphones className="w-3.5 h-3.5" />,
  blocks: <Cuboid className="w-3.5 h-3.5" />,
  "core-shaders": <Sparkles className="w-3.5 h-3.5" />,
  entities: <Shapes className="w-3.5 h-3.5" />,
  environment: <Trees className="w-3.5 h-3.5" />,
  fonts: <Type className="w-3.5 h-3.5" />,
  gui: <LayoutDashboard className="w-3.5 h-3.5" />,
  items: <Gem className="w-3.5 h-3.5" />,
  locale: <Languages className="w-3.5 h-3.5" />,
  models: <Component className="w-3.5 h-3.5" />,

  // Shaders
  cartoon: <Pencil className="w-3.5 h-3.5" />,
  fantasy: <Castle className="w-3.5 h-3.5" />,
  "semi-realistic": <ImagePlus className="w-3.5 h-3.5" />,
  atmosphere: <Cloud className="w-3.5 h-3.5" />,
  bloom: <SunDim className="w-3.5 h-3.5" />,
  "colored-lighting": <Lightbulb className="w-3.5 h-3.5" />,
  foliage: <Sprout className="w-3.5 h-3.5" />,
  "path-tracing": <Sun className="w-3.5 h-3.5" />,
  pbr: <Layers className="w-3.5 h-3.5" />,
  reflections: <Droplet className="w-3.5 h-3.5" />,
  shadows: <Moon className="w-3.5 h-3.5" />,
  
  // Performance
  potato: <Snail className="w-3.5 h-3.5" />,
  low: <BatteryLow className="w-3.5 h-3.5" />,
  medium: <BatteryMedium className="w-3.5 h-3.5" />,
  high: <Rocket className="w-3.5 h-3.5" />,
  screenshot: <Camera className="w-3.5 h-3.5" />,
  
  // Shader Loaders
  iris: <Eye className="w-3.5 h-3.5" />,
  optifine: <Glasses className="w-3.5 h-3.5" />,
  vanilla: <Box className="w-3.5 h-3.5" />,
  
  // Resolutions
  "8x or lower": <Grid2x2 className="w-3.5 h-3.5" />,
  "16x": <Grid3x3 className="w-3.5 h-3.5" />,
  "32x": <LayoutGrid className="w-3.5 h-3.5" />,
  "48x": <Grip className="w-3.5 h-3.5" />,
  "64x": <Image className="w-3.5 h-3.5" />,
  "128x": <Monitor className="w-3.5 h-3.5" />,
  "256x": <Maximize className="w-3.5 h-3.5" />,
  "512x or higher": <Maximize2 className="w-3.5 h-3.5" />,
};

export const FomoDiscoverFilters = memo(function FomoDiscoverFilters({
  loader, gameVersions, projectType, categories, environments, sortOrder, query, loading, source,
  onLoader, onVersions, onProjectType, onCategories, onEnvironments, onSort, onQuery, onRefresh,
}: FomoDiscoverFiltersProps) {
  const isCurseForge = source === "curseforge";

  const toggleFilter = (list: string[], setFn: (v: string[]) => void, item: string) => {
    if (list.includes(item)) {
      setFn(list.filter(x => x !== item));
    } else {
      setFn([...list, item]);
    }
  };

  const currentFilters = useMemo(() => {
    if (projectType === "mod" || projectType === "datapack") {
      return [{ title: "Categorías", items: MODRINTH_CATEGORIES }];
    }
    if (projectType === "resourcepack") {
      return [
        { title: "Resolución", items: RESOURCEPACK_FILTERS.resolutions },
        { title: "Categorías", items: RESOURCEPACK_FILTERS.categories },
        { title: "Características", items: RESOURCEPACK_FILTERS.features }
      ];
    }
    if (projectType === "shader") {
      return [
        { title: "Categorías", items: SHADER_FILTERS.categories },
        { title: "Características", items: SHADER_FILTERS.features },
        { title: "Rendimiento", items: SHADER_FILTERS.performance },
        { title: "Loader", items: SHADER_FILTERS.loaders }
      ];
    }
    return [];
  }, [projectType]);

  return (
    <div className="flex flex-col gap-6 h-full overflow-hidden">
      {/* Basic Controls */}
      <div className="flex flex-col gap-3 shrink-0">
        <div className="relative w-full">
          <select
            value={projectType}
            onChange={(e) => onProjectType(e.target.value)}
            className="w-full text-xs font-bold fomo-select-element border rounded-xl pl-3.5 pr-10 py-2.5 outline-none appearance-none cursor-pointer transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
          >
            {PROJECT_TYPES.map(pt => <option key={pt.value} value={pt.value} className="bg-[#1A1A1A]">{pt.label}</option>)}
          </select>
          <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--fomo-text-muted)] opacity-60" />
        </div>

        {projectType === "mod" && (
          <div className="relative w-full">
            <select
              value={loader}
              onChange={(e) => onLoader(e.target.value)}
              className="w-full text-xs font-bold fomo-select-element border rounded-xl pl-3.5 pr-10 py-2.5 outline-none appearance-none cursor-pointer transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
            >
              <option value="unknown" className="bg-[#1A1A1A]">Cualquier Loader</option>
              {LOADERS.map(l => <option key={l} value={l} className="bg-[#1A1A1A]">{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--fomo-text-muted)] opacity-60" />
          </div>
        )}
      </div>

      {/* Dynamic Filters Section */}
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-6 pr-1">
        {/* Game Versions */}
        <div className="flex flex-col gap-3">
          <p className="text-[0.65rem] uppercase tracking-widest flex items-center gap-2 fomo-section-header">
            <Globe className="w-3 h-3" /> Versión
          </p>
          <div className="flex flex-wrap gap-1.5">
            {GAME_VERSIONS.map(v => {
              const active = gameVersions.includes(v);
              const main = v === "1.20.1" || v === "1.21.1";
              return (
                <button
                  key={v}
                  onClick={() => isCurseForge ? onVersions([v]) : toggleFilter(gameVersions, onVersions, v)}
                  className={`px-2 py-1 rounded-lg text-[0.65rem] font-bold border transition-all ${
                    active 
                      ? "bg-primary text-white border-primary" 
                      : main ? "bg-primary/10 text-primary border-primary/30" : "fomo-pill-inactive"
                  }`}
                >
                  {v}
                </button>
              );
            })}
          </div>
        </div>

        {/* Environments (Modrinth only) */}
        {!isCurseForge && projectType === "mod" && (
          <div className="flex flex-col gap-3">
            <p className="text-[0.65rem] uppercase tracking-widest flex items-center gap-2 fomo-section-header">
              <Laptop className="w-3 h-3" /> Entorno
            </p>
            <div className="flex flex-col gap-1.5">
              {ENVIRONMENTS.map(env => {
                const active = environments.includes(env.value);
                return (
                  <button
                    key={env.value}
                    onClick={() => toggleFilter(environments, onEnvironments, env.value)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[0.65rem] font-bold border transition-all ${
                      active ? "bg-[var(--color-emerald)]/15 text-[var(--color-emerald)] border-[var(--color-emerald)]/30" : "fomo-pill-inactive"
                    }`}
                  >
                    {env.value === 'client' ? <Laptop className="w-3 h-3" /> : env.value === 'server' ? <Server className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                    {env.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Project Specific Filters */}
        {!isCurseForge && currentFilters.map(group => (
          <div key={group.title} className="flex flex-col gap-3">
            <p className="text-[0.65rem] uppercase tracking-widest flex items-center gap-2 fomo-section-header">
              <Tags className="w-3 h-3" /> {group.title}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {group.items.map(cat => {
                const active = categories.includes(cat);
                const label = cat.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                return (
                  <button
                    key={cat}
                    onClick={() => toggleFilter(categories, onCategories, cat)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[0.65rem] font-bold border transition-all ${
                      active ? "bg-[var(--color-primary)]/15 text-[var(--color-primary)] border-[var(--color-primary)]/30" : "fomo-pill-inactive"
                    }`}
                  >
                    {CATEGORY_ICONS[cat] || <Box className="w-3 h-3" />}
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Sorting & Refresh */}
      <div className="pt-4 border-t fomo-header-border flex flex-col gap-3 shrink-0">
        <div className="flex flex-col gap-1.5">
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => onSort(opt.value as SortOrder)}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-[0.65rem] font-bold border transition-all ${
                sortOrder === opt.value ? "bg-orange-500/10 text-orange-400 border-orange-500/30" : "fomo-pill-inactive"
              }`}
            >
              {opt.label}
              {sortOrder === opt.value && <Check className="w-3 h-3" />}
            </button>
          ))}
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-primary text-white text-[0.65rem] font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Actualizando..." : "Actualizar"}
        </button>
      </div>
    </div>
  );
});
