import React from "react";
import { 
  RefreshCw, Check, Globe, Laptop, Server, Tags, Compass, Skull, Palette, Coins, Shield, Utensils, Cog, BookOpen, Wand2, 
  SlidersHorizontal, Gamepad2, PawPrint, Zap, Users, Archive, Cpu, TrainFront, Wrench, Mountain, Map, Package, 
  Ghost, Trophy, Hammer, Pickaxe, Flame, Scroll, Database, Cloud, Network, Box as BoxIcon, ChevronRight, 
  Swords, Blocks, Aperture, Feather, Brush, Settings2, Leaf, Headphones, Cuboid, Sparkles, Shapes, Trees, Type, 
  LayoutDashboard, Gem, Languages, Component, Dna, Pencil, Castle, ImagePlus, SunDim, Lightbulb, Sprout, Sun, 
  Layers, Droplet, Moon, Snail, BatteryLow, BatteryMedium, Rocket, Camera, Eye, Glasses, Box, Grid2x2, Grid3x3, 
  LayoutGrid, Grip, Image as ImageIcon, Monitor, Maximize, Maximize2, Download, Clock, Calendar, Heart
} from "lucide-react";

export const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  adventure: <Compass className="w-3.5 h-3.5" />, cursed: <Skull className="w-3.5 h-3.5" />, decoration: <Palette className="w-3.5 h-3.5" />, 
  economy: <Coins className="w-3.5 h-3.5" />, equipment: <Shield className="w-3.5 h-3.5" />, food: <Utensils className="w-3.5 h-3.5" />, 
  game_mechanics: <Cog className="w-3.5 h-3.5" />, library: <BookOpen className="w-3.5 h-3.5" />, magic: <Wand2 className="w-3.5 h-3.5" />,
  management: <SlidersHorizontal className="w-3.5 h-3.5" />, minigame: <Gamepad2 className="w-3.5 h-3.5" />, mobs: <PawPrint className="w-3.5 h-3.5" />,
  optimization: <Zap className="w-3.5 h-3.5" />, social: <Users className="w-3.5 h-3.5" />, storage: <Archive className="w-3.5 h-3.5" />,
  technology: <Cpu className="w-3.5 h-3.5" />, transportation: <TrainFront className="w-3.5 h-3.5" />, utility: <Wrench className="w-3.5 h-3.5" />,
  world_generation: <Mountain className="w-3.5 h-3.5" />, addons: <Package className="w-3.5 h-3.5" />, create: <Cog className="w-3.5 h-3.5" />,
  performance: <Rocket className="w-3.5 h-3.5" />, redstone: <Zap className="w-3.5 h-3.5" />, "server-utility": <Server className="w-3.5 h-3.5" />,
  combat: <Swords className="w-3.5 h-3.5" />, modded: <Blocks className="w-3.5 h-3.5" />, realistic: <Aperture className="w-3.5 h-3.5" />,
  simplistic: <Feather className="w-3.5 h-3.5" />, themed: <Brush className="w-3.5 h-3.5" />, tweaks: <Settings2 className="w-3.5 h-3.5" />,
  "vanilla-like": <Leaf className="w-3.5 h-3.5" />, audio: <Headphones className="w-3.5 h-3.5" />, blocks: <Cuboid className="w-3.5 h-3.5" />,
  "core-shaders": <Sparkles className="w-3.5 h-3.5" />, entities: <Shapes className="w-3.5 h-3.5" />, environment: <Trees className="w-3.5 h-3.5" />,
  fonts: <Type className="w-3.5 h-3.5" />, gui: <LayoutDashboard className="w-3.5 h-3.5" />, items: <Gem className="w-3.5 h-3.5" />,
  locale: <Languages className="w-3.5 h-3.5" />, models: <Component className="w-3.5 h-3.5" />, cartoon: <Pencil className="w-3.5 h-3.5" />,
  fantasy: <Castle className="w-3.5 h-3.5" />, "semi-realistic": <ImagePlus className="w-3.5 h-3.5" />, atmosphere: <Cloud className="w-3.5 h-3.5" />,
  bloom: <SunDim className="w-3.5 h-3.5" />, "colored-lighting": <Lightbulb className="w-3.5 h-3.5" />, foliage: <Sprout className="w-3.5 h-3.5" />,
  "path-tracing": <Sun className="w-3.5 h-3.5" />, pbr: <Layers className="w-3.5 h-3.5" />, reflections: <Droplet className="w-3.5 h-3.5" />,
  shadows: <Moon className="w-3.5 h-3.5" />, potato: <Snail className="w-3.5 h-3.5" />, low: <BatteryLow className="w-3.5 h-3.5" />,
  medium: <BatteryMedium className="w-3.5 h-3.5" />, high: <Rocket className="w-3.5 h-3.5" />, screenshot: <Camera className="w-3.5 h-3.5" />,
  iris: <Eye className="w-3.5 h-3.5" />, optifine: <Glasses className="w-3.5 h-3.5" />, vanilla: <Box className="w-3.5 h-3.5" />,
  "8x or lower": <Grid2x2 className="w-3.5 h-3.5" />, "16x": <Grid3x3 className="w-3.5 h-3.5" />, "32x": <LayoutGrid className="w-3.5 h-3.5" />,
  "48x": <Grip className="w-3.5 h-3.5" />, "64x": <ImageIcon className="w-3.5 h-3.5" />, "128x": <Monitor className="w-3.5 h-3.5" />,
  "256x": <Maximize className="w-3.5 h-3.5" />, "512x or higher": <Maximize2 className="w-3.5 h-3.5" />,
  mod: <BoxIcon className="w-3.5 h-3.5" />,
  datapack: <Database className="w-3.5 h-3.5" />,
  resourcepack: <Palette className="w-3.5 h-3.5" />,
  shader: <Sparkles className="w-3.5 h-3.5" />,
  modpack: <Package className="w-3.5 h-3.5" />,
  forge: <Hammer className="w-3.5 h-3.5" />,
  fabric: <Feather className="w-3.5 h-3.5" />,
  neoforge: <Zap className="w-3.5 h-3.5" />,
  quilt: <Grid3x3 className="w-3.5 h-3.5" />,
};

export const SORT_ICONS: Record<string, React.ReactNode> = {
  relevance: <Sparkles className="w-3.5 h-3.5" />, downloads: <Download className="w-3.5 h-3.5" />, 
  updated: <Clock className="w-3.5 h-3.5" />, newest: <Calendar className="w-3.5 h-3.5" />, follows: <Heart className="w-3.5 h-3.5" />,
};
