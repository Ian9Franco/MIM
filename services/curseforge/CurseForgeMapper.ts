/**
 * @fileoverview CurseForge API Mapper (Diccionario de Traducción).
 * ─────────────────────────────────────────────────────────────────────────────
 * La API de CurseForge utiliza identificadores numéricos estrictos (`classId`,
 * `categoryId`, `modLoaderType`) en lugar de cadenas de texto semánticas. 
 * Este módulo actúa como una capa de traducción bidireccional entre la
 * nomenclatura limpia de MIM y los requerimientos del backend de CurseForge.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * PROJECT_TYPE_TO_CLASS_ID
 * Traduce el tipo de activo arquitectónico al `classId` raíz de CurseForge.
 * - 6: Mods
 * - 4471: Modpacks
 * - 12: ResourcePacks (Paquetes de recursos)
 * - 6552: Shaders (Sombreadores)
 * - 6945: Datapacks
 */
export const PROJECT_TYPE_TO_CLASS_ID: Record<string, number> = {
  mod: 6, 
  modpack: 4471, 
  resourcepack: 12, 
  shader: 6552, 
  datapack: 6945
};

/**
 * LOADER_TO_CF_ID
 * Traduce el cargador de mods (Mod Loader) al `modLoaderType` de CurseForge.
 * Nota: Quilt (5) y LiteLoader (2) se omiten temporalmente al estar deprecados o asimilados.
 */
export const LOADER_TO_CF_ID: Record<string, number> = {
  forge: 1, 
  fabric: 4, 
  neoforge: 6
};

/**
 * SORT_TO_CF_FIELD
 * Mapeo de criterios de ordenación (SortField).
 * - 1: Featured / Relevancia
 * - 2: Popularidad (Descargas totales)
 * - 3: Última actualización
 * - 11: Fecha de creación (Más recientes)
 */
export const SORT_TO_CF_FIELD: Record<string, number> = {
  relevance: 1, 
  downloads: 2, 
  updated: 3, 
  newest: 11, 
  follows: 2 // Fallback a descargas para popularidad
};

/**
 * CF_CATEGORY_MAPS
 * Arbol jerárquico de categorías por `classId`.
 * Permite filtrar búsquedas dentro de un tipo de proyecto específico.
 * (ej. Buscar solo mods de "almacenamiento" [420] o resource packs "16x" [393]).
 */
export const CF_CATEGORY_MAPS: Record<string, Record<string, number>> = {
  mod: {
    "addons": 426, 
    "create": 6484, 
    "performance": 6814, 
    "technology": 412, 
    "magic": 419, 
    "storage": 420,
    "world-gen": 406, 
    "mobs": 411, 
    "optimization": 6814, 
    "utility": 5191, 
    "adventure": 422
  },
  resourcepack: { 
    "16x": 393, "32x": 394, "64x": 395, 
    "medieval": 402, "modern": 401 
  },
  shader: { 
    "realistic": 6553, "fantasy": 6554, "vanilla": 6555 
  }
};
