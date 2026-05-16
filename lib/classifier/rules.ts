/**
 * @fileoverview Reglas de Clasificación Semántica (Configuración).
 * ─────────────────────────────────────────────────────────────────────────────
 * Este archivo contiene los diccionarios de datos que alimentan al MimClassifier.
 * Modificar los pesos (weight) aquí altera directamente la sensibilidad 
 * de la categorización automática.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * EXPLICIT_TAG_MAPPING
 * Mapeo directo de los 'tags' o 'categories' que vienen de Modrinth/CurseForge.
 * Se asigna un peso alto (30-40) porque son etiquetas oficiales de plataforma.
 */
export const EXPLICIT_TAG_MAPPING: Record<string, any> = {
  "library": [{ category: ".essential", sub: "librerias", weight: 40 }],
  "api-and-library": [{ category: ".essential", sub: "librerias", weight: 40 }],
  "kubejs": [{ category: ".essential", sub: "librerias", weight: 40 }],
  "optimization": [{ category: ".local", sub: "rendimiento", weight: 35 }, { category: ".essential", sub: "rendimiento", weight: 30 }],
  "performance": [{ category: ".local", sub: "rendimiento", weight: 35 }, { category: ".essential", sub: "rendimiento", weight: 30 }],
  "technology": [{ category: ".essential", sub: "tecnologia", weight: 35 }],
  "automation": [{ category: ".essential", sub: "tecnologia", weight: 35 }],
  "biomes": [{ category: ".essential", sub: "dimensiones", weight: 30 }],
  "dimensions": [{ category: ".essential", sub: "dimensiones", weight: 35 }],
  "adventure": [{ category: ".essential", sub: "progreso y rpg", weight: 30 }],
  "magic": [{ category: ".essential", sub: "progreso y rpg", weight: 35 }],
  "utility": [{ category: ".local", sub: "qol", weight: 20 }, { category: ".essential", sub: "vanilla + & qol", weight: 20 }],
  "cosmetic": [{ category: ".local", sub: "qol", weight: 25 }]
};

/**
 * SEMANTIC_KEYWORDS
 * Heurísticas basadas en palabras clave encontradas en el nombre del archivo.
 * Se utiliza cuando el mod no tiene tags claros o es un archivo local desconocido.
 */
export const SEMANTIC_KEYWORDS = [
  { sub: "sonidos", category: ".local", keywords: ["sound", "audio", "voice", "ambient", "music"], weight: 35 },
  { sub: "animaciones", category: ".local", keywords: ["animation", "anim", "emote", "motion"], weight: 35 },
  { sub: "hostiles", category: ".essential", keywords: ["hostile", "enemy", "monster", "zombie"], weight: 30 },
  { sub: "bosses", category: ".essential", keywords: ["boss", "raid", "dungeon"], weight: 35 },
  { sub: "comidas", category: ".essential", keywords: ["food", "farming", "cook", "kitchen"], weight: 30 },
  { sub: "rendimiento", keywords: ["fps", "optimize", "render", "fast", "smooth"], weight: 30 }
];

/**
 * ANCHOR_RULES
 * Reglas de Coincidencia Forzada (Anclajes).
 * Identifican mods críticos por nombre que no deben ser analizados por puntuación,
 * sino asignados inmediatamente a su categoría correcta.
 */
export const ANCHOR_RULES = [
  { 
    test: (n: string) => /\b(sodium|rubidium|embeddium|lithium|modernfix|iris|oculus)\b/i.test(n), 
    category: ".local", sub: "rendimiento", name: "Anchor: Rendimiento" 
  },
  { 
    test: (n: string) => /\b(geckolib|architectury|cloth-config|fabric-api|curios|patchouli)\b/i.test(n), 
    category: ".essential", sub: "librerias", name: "Anchor: API/Lib" 
  },
  { 
    test: (n: string) => /\b(jei|rei|emi|inventorysorter|apple_skin|appleskin|mousetweaks|controlling|journeymap|xaero|tombstone)\b/i.test(n), 
    category: ".essential", sub: "vanilla + & qol", name: "Anchor: Utility/QoL" 
  },
  { 
    test: (n: string) => /\b(ambientsounds|soundphysics|presencefootsteps)\b/i.test(n), 
    category: ".local", sub: "sonidos", name: "Anchor: Sonidos" 
  }
];
