/**
 * @fileoverview Project Subcategories Manager
 * 
 * Permite a cada proyecto tener subcategorías personalizadas.
 * Las subcategorías se almacenan en mim-project-config.json junto al proyecto.
 * 
 * Categorías base:
 * - .essential: Core mods (siempre incluidos)
 * - .local: Client-side mods (solo para el jugador)
 * - .server: Server-side mods (solo para el servidor)
 * 
 * Las subcategorías son subcarpetas dentro de cada categoría.
 */

import fs from "fs";
import path from "path";
import { SOURCE_BASE } from "@/lib/core/constants";

// Subcategorías por defecto para nuevos proyectos
export const DEFAULT_SUBCATEGORIES: Record<string, string[]> = {
  ".essential": [
    "fauna",
    "hostiles", 
    "estructuras y mazmorras",
    "arsenal",
    "bosses",
    "vanilla + & qol",
    "dimensiones",
    "progreso y rpg",
    "comidas",
    "librerias",
    "tecnologia",
    "combate avanzado",
    "rendimiento",
  ],
  ".local": [
    "animaciones",
    "sonidos",
    "rendimiento",
    "qol",
    "particulas",
  ],
  ".server": [
    "estructuras",
    "qol",
    "rendimiento",
    "terreno",
  ],
};

const CONFIG_FILE = "mim-project-config.json";

interface ProjectConfig {
  version: string;
  loader: string;
  subcategories?: Record<string, string[]>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Obtiene la ruta del archivo de configuración del proyecto
 */
function getConfigPath(projectName: string): string {
  return path.join(SOURCE_BASE, projectName, CONFIG_FILE);
}

/**
 * Lee la configuración del proyecto o crea una nueva con defaults
 */
export function readProjectConfig(projectName: string): ProjectConfig {
  const configPath = getConfigPath(projectName);
  
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      // Fusión inteligente: asegura que los nuevos defaults aparezcan sin borrar los del usuario
      const mergedSubs = { ...DEFAULT_SUBCATEGORIES };
      if (config.subcategories) {
        Object.keys(config.subcategories).forEach(cat => {
          const userSubs = config.subcategories[cat] || [];
          const defaultSubs = DEFAULT_SUBCATEGORIES[cat] || [];
          // Unir y eliminar duplicados
          mergedSubs[cat] = Array.from(new Set([...defaultSubs, ...userSubs]));
        });
      }

      return {
        ...config,
        subcategories: mergedSubs,
      };
    } catch (e) {
      console.error("[ProjectConfig] Error reading config:", e);
    }
  }
  
  // Config por defecto
  return {
    version: "",
    loader: "",
    subcategories: { ...DEFAULT_SUBCATEGORIES },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Guarda la configuración del proyecto
 */
export function saveProjectConfig(projectName: string, config: Partial<ProjectConfig>): void {
  const configPath = getConfigPath(projectName);
  const existing = readProjectConfig(projectName);
  
  const newConfig: ProjectConfig = {
    ...existing,
    ...config,
    subcategories: {
      ...existing.subcategories,
      ...(config.subcategories || {}),
    },
    updatedAt: new Date().toISOString(),
  };
  
  // Asegurar que existe el directorio
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2), "utf-8");
}

/**
 * Obtiene las subcategorías de un proyecto
 */
export function getProjectSubcategories(projectName: string): Record<string, string[]> {
  const config = readProjectConfig(projectName);
  return config.subcategories || DEFAULT_SUBCATEGORIES;
}

/**
 * Agrega una subcategoría a un proyecto
 */
export function addProjectSubcategory(
  projectName: string,
  category: string,
  subcategory: string
): boolean {
  const config = readProjectConfig(projectName);
  const subs = config.subcategories?.[category] || [];
  
  if (subs.includes(subcategory)) {
    return false; // Ya existe
  }
  
  saveProjectConfig(projectName, {
    subcategories: {
      ...config.subcategories,
      [category]: [...subs, subcategory],
    },
  });
  
  return true;
}

/**
 * Elimina una subcategoría de un proyecto
 */
export function removeProjectSubcategory(
  projectName: string,
  category: string,
  subcategory: string
): boolean {
  const config = readProjectConfig(projectName);
  const subs = config.subcategories?.[category] || [];
  
  const filtered = subs.filter(s => s !== subcategory);
  
  if (filtered.length === subs.length) {
    return false; // No existía
  }
  
  saveProjectConfig(projectName, {
    subcategories: {
      ...config.subcategories,
      [category]: filtered,
    },
  });
  
  return true;
}

/**
 * Resetea las subcategorías a los defaults
 */
export function resetProjectSubcategories(projectName: string): void {
  saveProjectConfig(projectName, {
    subcategories: { ...DEFAULT_SUBCATEGORIES },
  });
}
