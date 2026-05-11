/**
 * @fileoverview FomoDiscoverFilters – search input + filter selects + sort
 * toggle for the FOMO discover view. Extracted from FomoSidebar to keep
 * each component under 150 lines.
 */

"use client";

import React, { memo, useMemo, useState } from "react";
import { 
  // Iconos de Interfaz (mantenidos de tu import original)
  RefreshCw, Check, Globe, Laptop, Server, Tags,
  
  // Mods & Datapacks
  Compass, Skull, Palette, Coins, Shield, Utensils, Cog, BookOpen, Wand2, 
  SlidersHorizontal, Gamepad2, PawPrint, Zap, Users, Archive, Cpu, TrainFront, 
  Wrench, Mountain, Map,
  
  // Resourcepacks
  Swords, Blocks, Aperture, Feather, Brush, Settings2, Leaf,
  
  // Features
  Headphones, Cuboid, Sparkles, Shapes, Trees, Type, LayoutDashboard, Gem, 
  Languages, Component, Dna,
  
  // Shaders
  Pencil, Castle, ImagePlus, SunDim, Lightbulb, Sprout, Sun, Layers, 
  Droplet, Moon,
  
  // Performance
  Snail, BatteryLow, BatteryMedium, Rocket, Camera,
  
  // New Icons for CurseForge
  Ghost, Trophy, Hammer, Pickaxe, Flame, Scroll, Database, Cloud, Network, 
  Package, Box as BoxIcon, ChevronRight, ChevronDown as ChevronDownIcon,
  
  // Shader Loaders
  Eye, Glasses, Box,
  
  // Resolutions
  Grid2x2, Grid3x3, LayoutGrid, Grip, Image as ImageIcon, Monitor, Maximize, Maximize2,

  // Sort Icons
  Download, Clock, Calendar, Heart
} from "lucide-react";


import { 
  LOADERS, GAME_VERSIONS, PROJECT_TYPES, SORT_OPTIONS, 
  MODRINTH_CATEGORIES, CURSEFORGE_CATEGORIES, RESOURCEPACK_FILTERS, SHADER_FILTERS, ENVIRONMENTS 
} from "../../constants/app";
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

  // CurseForge Specific & Subcategories
  "addons": <Package className="w-3.5 h-3.5" />,
  "applied-energistics-2": <Cpu className="w-3.5 h-3.5" />,
  "blood-magic": <Droplet className="w-3.5 h-3.5" />,
  "buildcraft": <Hammer className="w-3.5 h-3.5" />,
  "crafttweaker": <Wrench className="w-3.5 h-3.5" />,
  "create": <Cog className="w-3.5 h-3.5" />,
  "farmers-delight": <Utensils className="w-3.5 h-3.5" />,
  "forestry": <Trees className="w-3.5 h-3.5" />,
  "galacticraft": <Rocket className="w-3.5 h-3.5" />,
  "industrial-craft": <Zap className="w-3.5 h-3.5" />,
  "integrated-dynamics": <Network className="w-3.5 h-3.5" />,
  "kubejs": <Scroll className="w-3.5 h-3.5" />,
  "refined-storage": <Database className="w-3.5 h-3.5" />,
  "skyblock": <Cloud className="w-3.5 h-3.5" />,
  "thaumcraft": <Sparkles className="w-3.5 h-3.5" />,
  "thermal-expansion": <Flame className="w-3.5 h-3.5" />,
  "tinkers-construct": <Pickaxe className="w-3.5 h-3.5" />,
  "twilight-forest": <Moon className="w-3.5 h-3.5" />,
  "horror": <Ghost className="w-3.5 h-3.5" />,
  "mcreator": <Hammer className="w-3.5 h-3.5" />,
  "modjam-2025": <Trophy className="w-3.5 h-3.5" />,
  "performance": <Rocket className="w-3.5 h-3.5" />,
  "redstone": <Zap className="w-3.5 h-3.5" />,
  "server-utility": <Server className="w-3.5 h-3.5" />,
  "twitch-integration": <Users className="w-3.5 h-3.5" />,
  "utility-qol": <Wrench className="w-3.5 h-3.5" />,
  "adventure-rpg": <Compass className="w-3.5 h-3.5" />,
  "api-and-library": <BookOpen className="w-3.5 h-3.5" />,
  "armor-tools-and-weapons": <Shield className="w-3.5 h-3.5" />,
  "bug-fixes": <Wrench className="w-3.5 h-3.5" />,
  "map-and-information": <Map className="w-3.5 h-3.5" />,
  "world-gen": <Mountain className="w-3.5 h-3.5" />,
  "dimensions": <Globe className="w-3.5 h-3.5" />,
  "ores-and-resources": <Gem className="w-3.5 h-3.5" />,
  "structures": <Castle className="w-3.5 h-3.5" />,
  "genetics": <Dna className="w-3.5 h-3.5" />,
  "farming": <Sprout className="w-3.5 h-3.5" />,
  "energy-fluid-and-item-transport": <TrainFront className="w-3.5 h-3.5" />,
  "energy": <Zap className="w-3.5 h-3.5" />,
  "automation": <Cog className="w-3.5 h-3.5" />,
  "processing": <Cog className="w-3.5 h-3.5" />,
  "player-transport": <TrainFront className="w-3.5 h-3.5" />,

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
  "64x": <ImageIcon className="w-3.5 h-3.5" />,
  "128x": <Monitor className="w-3.5 h-3.5" />,
  "256x": <Maximize className="w-3.5 h-3.5" />,
  "512x or higher": <Maximize2 className="w-3.5 h-3.5" />,
};

const SORT_ICONS: Record<string, React.ReactNode> = {
  relevance: <Sparkles className="w-3.5 h-3.5" />,
  downloads: <Download className="w-3.5 h-3.5" />,
  updated: <Clock className="w-3.5 h-3.5" />,
  newest: <Calendar className="w-3.5 h-3.5" />,
  follows: <Heart className="w-3.5 h-3.5" />,
};

export const FomoDiscoverFilters = memo(function FomoDiscoverFilters({
  loader, gameVersions, projectType, categories, environments, sortOrder, loading, source,
  onLoader, onVersions, onProjectType, onCategories, onEnvironments, onSort, onQuery, onRefresh,
}: FomoDiscoverFiltersProps) {
  const isCurseForge = source === "curseforge";
  const [expandedCats, setExpandedCats] = useState<string[]>([]);

  const toggleFilter = (list: string[], setFn: (v: string[]) => void, item: string) => {
    if (list.includes(item)) {
      setFn(list.filter(x => x !== item));
    } else {
      // Lógica de preselección de padre si es CurseForge
      if (isCurseForge) {
        const cfCats = CURSEFORGE_CATEGORIES[projectType as keyof typeof CURSEFORGE_CATEGORIES] || [];
        const parent = cfCats.find(c => typeof c !== 'string' && Array.isArray((c as any).sub) && (c as any).sub.includes(item));
        if (parent && typeof parent !== 'string' && !list.includes(parent.value)) {
          setFn([...list, parent.value, item]);
          return;
        }
      }
      setFn([...list, item]);
    }
  };

  const toggleExpanded = (val: string) => {
    setExpandedCats(prev => 
      prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]
    );
  };

  const clearFilters = () => {
    onCategories([]);
    onEnvironments([]);
    onVersions(["1.20.1"]); 
    onQuery("");
  };

  const currentFilters = useMemo(() => {
    if (isCurseForge) {
      const cfCats = CURSEFORGE_CATEGORIES[projectType as keyof typeof CURSEFORGE_CATEGORIES] || [];
      return [{ title: "Categorías (CurseForge)", items: cfCats }];
    }

    if (projectType === "mod" || projectType === "datapack") {
      return [{ title: "Categorías", items: MODRINTH_CATEGORIES.map(c => ({ value: c })) }];
    }
    if (projectType === "resourcepack") {
      return [
        { title: "Resolución", items: RESOURCEPACK_FILTERS.resolutions.map(c => ({ value: c })) },
        { title: "Categorías", items: RESOURCEPACK_FILTERS.categories.map(c => ({ value: c })) },
        { title: "Características", items: RESOURCEPACK_FILTERS.features.map(c => ({ value: c })) }
      ];
    }
    if (projectType === "shader") {
      return [
        { title: "Categorías", items: SHADER_FILTERS.categories.map(c => ({ value: c })) },
        { title: "Características", items: SHADER_FILTERS.features.map(c => ({ value: c })) },
        { title: "Rendimiento", items: SHADER_FILTERS.performance.map(c => ({ value: c })) },
        { title: "Loader", items: SHADER_FILTERS.loaders.map(c => ({ value: c })) }
      ];
    }
    return [];
  }, [projectType, isCurseForge]);

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
            {PROJECT_TYPES.map(pt => <option key={pt.value} value={pt.value} style={{ background: "var(--fomo-card-bg)", color: "var(--fomo-text-primary)" }}>{pt.label}</option>)}
          </select>
        </div>

        {projectType === "mod" && (
          <div className="relative w-full">
            <select
              value={loader}
              onChange={(e) => onLoader(e.target.value)}
              className="w-full text-xs font-bold fomo-select-element border rounded-xl pl-3.5 pr-10 py-2.5 outline-none appearance-none cursor-pointer transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
            >
              <option value="unknown" style={{ background: "var(--fomo-card-bg)", color: "var(--fomo-text-primary)" }}>Cualquier Loader</option>
              {LOADERS.map(l => <option key={l} value={l} style={{ background: "var(--fomo-card-bg)", color: "var(--fomo-text-primary)" }}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Dynamic Filters Section */}
      <div 
        className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-6 pr-1 pb-10"
        style={{
          WebkitMaskImage: "linear-gradient(to bottom, black 92%, transparent 100%)",
          maskImage: "linear-gradient(to bottom, black 92%, transparent 100%)",
        }}
      >
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
                  onClick={() => toggleFilter(gameVersions, onVersions, v)}
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
                      active ? "bg-(--color-emerald)/15 text-(--color-emerald) border-(--color-emerald)/30" : "fomo-pill-inactive"
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
        {currentFilters.map(group => (
          <div key={group.title} className="flex flex-col gap-3">
            <p className="text-[0.65rem] uppercase tracking-widest flex items-center gap-2 fomo-section-header">
              <Tags className="w-3 h-3" /> {group.title}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {group.items.map((cat: any) => {
                const isString = typeof cat === 'string';
                const val = isString ? cat : cat.value;
                const active = categories.includes(val);
                const hasSub = !isString && Array.isArray(cat.sub) && cat.sub.length > 0;
                const isExpanded = expandedCats.includes(val);
                const label = val.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

                return (
                  <div key={val} className="flex flex-col gap-1.5 w-full">
                    <div className="flex items-center gap-1.5 w-full">
                      <button
                        onClick={() => toggleFilter(categories, onCategories, val)}
                        className={`flex-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[0.65rem] font-bold border transition-all ${
                          active 
                            ? "bg-primary/15 text-primary border-primary/30" 
                            : "fomo-pill-inactive"
                        }`}
                      >
                        {CATEGORY_ICONS[val] || <BoxIcon className="w-3 h-3" />}
                        {label}
                      </button>
                      
                      {hasSub && (
                        <button 
                          onClick={() => toggleExpanded(val)}
                          className={`p-1.5 rounded-lg border transition-all ${isExpanded ? "bg-primary/10 border-primary/20 text-primary" : "fomo-pill-inactive"}`}
                        >
                          {isExpanded ? <ChevronDownIcon className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        </button>
                      )}
                    </div>

                    {hasSub && isExpanded && (
                      <div className="flex flex-wrap gap-1.5 pl-4 py-1 border-l border-white/5 ml-4">
                        {cat.sub.map((s: string) => {
                          const sActive = categories.includes(s);
                          const sLabel = s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                          return (
                            <button
                              key={s}
                              onClick={() => toggleFilter(categories, onCategories, s)}
                              className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[0.6rem] font-bold border transition-all ${
                                sActive 
                                  ? "bg-primary/20 text-primary border-primary/40" 
                                  : "fomo-pill-inactive opacity-70 hover:opacity-100"
                              }`}
                            >
                              {CATEGORY_ICONS[s] || <BoxIcon className="w-2.5 h-2.5" />}
                              {sLabel}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Sorting & Refresh */}
      <div className="pt-4 border-t fomo-header-border flex flex-col gap-3 shrink-0">
        <button
          onClick={clearFilters}
          className="flex items-center justify-center gap-2 w-full py-2 rounded-xl border transition-all text-[0.65rem] font-bold"
          style={{ 
            borderColor: "var(--fomo-border)",
            color: "var(--fomo-text-muted)",
            background: "var(--fomo-pill-inactive-bg)"
          }}
        >
          Limpiar Filtros
        </button>

        <div className="grid grid-cols-2 gap-1.5">
          {SORT_OPTIONS.map(opt => {
            const isActive = sortOrder === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => onSort(opt.value as SortOrder)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-[0.65rem] font-bold border transition-all ${
                  isActive 
                    ? "bg-orange-500/10 text-orange-400 border-orange-500/30" 
                    : "fomo-pill-inactive"
                } ${opt.value === "relevance" ? "col-span-2 justify-center" : ""}`}
              >
                <span className={`${isActive ? "text-orange-400" : "text-white/40"} shrink-0`}>
                  {SORT_ICONS[opt.value] || <SlidersHorizontal className="w-3.5 h-3.5" />}
                </span>
                <span className="truncate">{opt.label}</span>
              </button>
            );
          })}
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
