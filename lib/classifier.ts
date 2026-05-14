/**
 * @fileoverview MIM Semantic Classification Engine (Auto-Categorías)
 * 
 * Implementa un clasificador semántico de 4 capas para categorizar mods
 * de Minecraft automáticamente en .local, .essential o .server basándose en:
 * 1. Scope (cliente/servidor/ambos)
 * 2. Tags explícitos de Modrinth/CurseForge
 * 3. Palabras clave semánticas en el nombre del archivo / proyecto
 * 4. Reglas de oro (Overrides / Anchors) para casos de alta popularidad
 */

export interface ClassificationInput {
  fileName: string;
  modName?: string;
  categories?: string[]; // Etiquetas de Modrinth/CurseForge (ej: ["optimization", "utility"])
  clientSide?: "required" | "optional" | "unsupported" | boolean | string;
  serverSide?: "required" | "optional" | "unsupported" | boolean | string;
  environment?: "client" | "server" | "both" | "unknown"; // Metadata persistente de MIM
}

export interface ClassificationResult {
  category: ".local" | ".essential" | ".server";
  sub: string;
  confidence: number; // Score de confianza normalizado entre 0.0 y 1.0
  matchedRules: string[];
}

// Mapeo explícito de categorías de Modrinth y CurseForge a subcategorías canónicas de MIM
const EXPLICIT_TAG_MAPPING: Record<string, { category: ".local" | ".essential" | ".server"; sub: string; weight: number }[]> = {
  // --- LIBRERIAS ---
  "library": [{ category: ".essential", sub: "librerias", weight: 40 }],
  "api-and-library": [{ category: ".essential", sub: "librerias", weight: 40 }],
  "api and library": [{ category: ".essential", sub: "librerias", weight: 40 }],
  "kubejs": [{ category: ".essential", sub: "librerias", weight: 40 }],
  "crafttweaker": [{ category: ".essential", sub: "librerias", weight: 40 }],
  "mcreator": [{ category: ".essential", sub: "librerias", weight: 35 }],

  // --- RENDIMIENTO ---
  "optimization": [
    { category: ".local", sub: "rendimiento", weight: 35 },
    { category: ".essential", sub: "rendimiento", weight: 30 },
    { category: ".server", sub: "rendimiento", weight: 30 }
  ],
  "performance": [
    { category: ".local", sub: "rendimiento", weight: 35 },
    { category: ".essential", sub: "rendimiento", weight: 30 },
    { category: ".server", sub: "rendimiento", weight: 30 }
  ],
  "bug fixes": [
    { category: ".local", sub: "rendimiento", weight: 20 },
    { category: ".essential", sub: "rendimiento", weight: 20 }
  ],
  "bug-fixes": [
    { category: ".local", sub: "rendimiento", weight: 20 },
    { category: ".essential", sub: "rendimiento", weight: 20 }
  ],

  // --- TECNOLOGIA ---
  "technology": [{ category: ".essential", sub: "tecnologia", weight: 35 }],
  "automation": [{ category: ".essential", sub: "tecnologia", weight: 35 }],
  "energy": [{ category: ".essential", sub: "tecnologia", weight: 35 }],
  "processing": [{ category: ".essential", sub: "tecnologia", weight: 30 }],
  "storage": [{ category: ".essential", sub: "tecnologia", weight: 30 }],
  "transportation": [{ category: ".essential", sub: "tecnologia", weight: 30 }],
  "player transport": [{ category: ".essential", sub: "tecnologia", weight: 30 }],
  "economy": [{ category: ".essential", sub: "tecnologia", weight: 25 }],
  "create": [{ category: ".essential", sub: "tecnologia", weight: 40 }],
  "applied energistics 2": [{ category: ".essential", sub: "tecnologia", weight: 40 }],

  // --- FAUNA Y HOSTILES ---
  "mobs": [
    { category: ".essential", sub: "fauna", weight: 30 },
    { category: ".essential", sub: "hostiles", weight: 25 }
  ],
  "genetics": [{ category: ".essential", sub: "fauna", weight: 30 }],
  "farming": [
    { category: ".essential", sub: "comidas", weight: 25 },
    { category: ".essential", sub: "fauna", weight: 20 }
  ],

  // --- ESTRUCTURAS, BIOMAS Y TERRENO ---
  "world_generation": [
    { category: ".essential", sub: "estructuras y mazmorras", weight: 30 },
    { category: ".server", sub: "terreno", weight: 25 }
  ],
  "world gen": [
    { category: ".essential", sub: "estructuras y mazmorras", weight: 30 },
    { category: ".server", sub: "terreno", weight: 25 }
  ],
  "biomes": [
    { category: ".essential", sub: "dimensiones", weight: 30 },
    { category: ".server", sub: "terreno", weight: 25 }
  ],
  "dimensions": [
    { category: ".essential", sub: "dimensiones", weight: 35 },
    { category: ".essential", sub: "estructuras y mazmorras", weight: 20 }
  ],
  "structures": [
    { category: ".essential", sub: "estructuras y mazmorras", weight: 35 },
    { category: ".server", sub: "estructuras", weight: 35 }
  ],
  "ores and resources": [{ category: ".server", sub: "terreno", weight: 30 }],

  // --- ARSENAL ---
  "armor tools and weapons": [{ category: ".essential", sub: "arsenal", weight: 40 }],
  "equipment": [{ category: ".essential", sub: "arsenal", weight: 35 }],

  // --- COMIDAS ---
  "food": [{ category: ".essential", sub: "comidas", weight: 40 }],

  // --- PROGRESO, RPG Y MAGIA ---
  "adventure": [
    { category: ".essential", sub: "progreso y rpg", weight: 30 },
    { category: ".essential", sub: "estructuras y mazmorras", weight: 25 }
  ],
  "adventure rpg": [{ category: ".essential", sub: "progreso y rpg", weight: 35 }],
  "magic": [{ category: ".essential", sub: "progreso y rpg", weight: 35 }],

  // --- QOL Y UTILITY ---
  "utility": [
    { category: ".local", sub: "qol", weight: 20 },
    { category: ".essential", sub: "vanilla + & qol", weight: 20 },
    { category: ".server", sub: "qol", weight: 15 }
  ],
  "utility qol": [
    { category: ".local", sub: "qol", weight: 25 },
    { category: ".essential", sub: "vanilla + & qol", weight: 25 }
  ],
  "management": [
    { category: ".local", sub: "qol", weight: 20 },
    { category: ".server", sub: "qol", weight: 20 }
  ],
  "server utility": [{ category: ".server", sub: "qol", weight: 30 }],
  "map and information": [
    { category: ".local", sub: "qol", weight: 30 },
    { category: ".essential", sub: "vanilla + & qol", weight: 20 }
  ],
  "cosmetic": [{ category: ".local", sub: "qol", weight: 25 }]
};

// Heurísticas basadas en palabras clave en nombre de archivo / mod
const SEMANTIC_KEYWORDS: {
  sub: string;
  category?: ".local" | ".essential" | ".server";
  keywords: string[];
  weight: number;
}[] = [
  {
    sub: "sonidos",
    category: ".local",
    keywords: ["sound", "audio", "voice", "ambient", "music", "acoustic", "hear", "ear", "noise"],
    weight: 35
  },
  {
    sub: "animaciones",
    category: ".local",
    keywords: ["animation", "anim", "emote", "motion", "movement", "crawl", "physics", "eat", "dance"],
    weight: 35
  },
  {
    sub: "particulas",
    category: ".local",
    keywords: ["particle", "visual", "fx", "effect", "vfx", "trail", "spark", "glow", "bubble"],
    weight: 35
  },
  {
    sub: "hostiles",
    category: ".essential",
    keywords: ["hostile", "enemy", "monster", "horror", "undead", "infected", "mutant", "zombie", "skeleton", "creature"],
    weight: 30
  },
  {
    sub: "bosses",
    category: ".essential",
    keywords: ["boss", "raid", "dungeon", "elite", "titan", "wither", "dragon", "champion"],
    weight: 35
  },
  {
    sub: "combate avanzado",
    category: ".essential",
    keywords: ["combat", "weapon", "parry", "stamina", "moveset", "battle", "shield", "dodge", "sword", "fight"],
    weight: 35
  },
  {
    sub: "comidas",
    category: ".essential",
    keywords: ["food", "farming", "crop", "seed", "cook", "kitchen", "delight", "sweet", "drink", "baker", "chef"],
    weight: 30
  },
  {
    sub: "estructuras y mazmorras",
    category: ".essential",
    keywords: ["structure", "dungeon", "ruin", "castle", "temple", "shrine", "tower", "fortress", "worldgen"],
    weight: 30
  },
  {
    sub: "dimensiones",
    category: ".essential",
    keywords: ["dimension", "portal", "ether", "twilight", "underworld", "skyblock", "nether", "end"],
    weight: 35
  },
  {
    sub: "rendimiento",
    keywords: ["fps", "optimize", "render", "fast", "smooth", "chunk", "memory", "lag", "cull", "engine"],
    weight: 30
  }
];

// Reglas fijas (Anchor & Overrides) de alta prioridad
const ANCHOR_RULES: {
  test: (name: string) => boolean;
  category: ".local" | ".essential" | ".server";
  sub: string;
  name: string;
}[] = [
  // --- RENDIMIENTO (ANCLADO) ---
  {
    test: (n) => /\b(sodium|rubidium|embeddium|lithium|ferritecore|modernfix|krypton|iris|oculus|frustum|clump|entityculling|memoryleakfix)\b/i.test(n),
    category: ".local",
    sub: "rendimiento",
    name: "Anchor: Mod de Rendimiento Crítico"
  },
  // --- LIBRERIAS (ANCLADO) ---
  {
    test: (n) => /\b(geckolib|architectury|cloth-config|clothconfig|fabric-api|fabricapi|patchouli|curios|citadel|kotlin|rei|jei|emi|architect|creativecore|pehkui|supermartijn642)\b/i.test(n),
    category: ".essential",
    sub: "librerias",
    name: "Anchor: API o Librería Core"
  },
  // --- SONIDOS (ANCLADO) ---
  {
    test: (n) => /\b(ambientsounds|soundphysics|presencefootsteps|auditory|sound-physics)\b/i.test(n),
    category: ".local",
    sub: "sonidos",
    name: "Anchor: Mod de Sonidos Avanzado"
  },
  // --- ANIMACIONES (ANCLADO) ---
  {
    test: (n) => /\b(notenoughanimations|animatica|freshanimations|eatinganimation|3dskinlayers|skinlayers)\b/i.test(n),
    category: ".local",
    sub: "animaciones",
    name: "Anchor: Mod de Animación"
  }
];

export class MimClassifier {
  /**
   * Clasifica semánticamente un mod basándose en sus metadatos e inputs
   */
  public static classify(input: ClassificationInput): ClassificationResult {
    const matchedRules: string[] = [];
    const scores: Record<string, Record<string, number>> = {
      ".local": { animaciones: 0, sonidos: 0, rendimiento: 0, qol: 0, particulas: 0 },
      ".essential": {
        fauna: 0, hostiles: 0, "estructuras y mazmorras": 0, arsenal: 0, bosses: 0,
        "vanilla + & qol": 0, dimensiones: 0, "progreso y rpg": 0, comidas: 0,
        librerias: 0, tecnologia: 0, "combate avanzado": 0, rendimiento: 0
      },
      ".server": { estructuras: 0, qol: 0, rendimiento: 0, terreno: 0 }
    };

    const searchName = `${input.modName || ""} ${input.fileName}`.toLowerCase();

    // ───────────────────────────────────────────────────────────────────────────
    // LAYER 4 — OVERRIDE & ANCHOR RULES (Gana de forma inmediata si coincide)
    // ───────────────────────────────────────────────────────────────────────────
    for (const anchor of ANCHOR_RULES) {
      if (anchor.test(searchName)) {
        matchedRules.push(anchor.name);
        return {
          category: anchor.category,
          sub: anchor.sub,
          confidence: 1.0, // Anclado con total certeza
          matchedRules
        };
      }
    }

    // ───────────────────────────────────────────────────────────────────────────
    // LAYER 1 — PRIORITY 1: ENVIRONMENT (STRICT HIERARCHY)
    // ───────────────────────────────────────────────────────────────────────────
    let strictCategory: ".local" | ".essential" | ".server" | null = null;
    
    // Si tenemos metadata persistente de MIM, esa es la ley absoluta
    if (input.environment === "client") {
      strictCategory = ".local";
      matchedRules.push("Hierarchy: Entorno Persistente -> CLIENT (.local)");
    } else if (input.environment === "server") {
      strictCategory = ".server";
      matchedRules.push("Hierarchy: Entorno Persistente -> SERVER (.server)");
    } else if (input.environment === "both") {
      strictCategory = ".essential";
      matchedRules.push("Hierarchy: Entorno Persistente -> BOTH (.essential)");
    }

    // Si no hay metadata persistente, intentamos deducir el entorno (Fuzzy Scope)
    if (!strictCategory) {
      const clientSide = String(input.clientSide || "").toLowerCase();
      const serverSide = String(input.serverSide || "").toLowerCase();

      if (
        clientSide === "required" || clientSide === "true" ||
        searchName.includes("client-only") || searchName.includes("-client.jar")
      ) {
        strictCategory = ".local";
        matchedRules.push("Scope: Detección heurística de Cliente (.local)");
      } else if (
        serverSide === "required" || serverSide === "true" ||
        searchName.includes("server-only") || searchName.includes("-server.jar")
      ) {
        strictCategory = ".server";
        matchedRules.push("Scope: Detección heurística de Servidor (.server)");
      }
    }

    // ───────────────────────────────────────────────────────────────────────────
    // LAYER 2 — PRIORITY 2: TYPE (STRICT HIERARCHY)
    // ───────────────────────────────────────────────────────────────────────────
    // Si es una librería, forzamos la subcategoría "librerias"
    const isLibrary = searchName.includes("lib") || 
                     searchName.includes("api") || 
                     (input.categories || []).some(c => c.toLowerCase().includes("library"));
    
    if (isLibrary) {
      matchedRules.push("Hierarchy: Tipo Detectado -> LIBRERIA");
      return {
        category: strictCategory || ".essential",
        sub: "librerias",
        confidence: 0.95,
        matchedRules: Array.from(new Set(matchedRules))
      };
    }

    // ───────────────────────────────────────────────────────────────────────────
    // LAYER 3 — PRIORITY 3: TAGS & SEMANTIC SCORING (FOR SUB-CATEGORIZATION)
    // ───────────────────────────────────────────────────────────────────────────
    // Aplicar bonus inicial si ya tenemos una categoría estricta
    if (strictCategory) {
      Object.keys(scores[strictCategory]).forEach((sub) => {
        scores[strictCategory!][sub] += 30;
      });
    }

    // ───────────────────────────────────────────────────────────────────────────
    // LAYER 2 — EXPLICIT TAGS MAPPING
    // ───────────────────────────────────────────────────────────────────────────
    if (Array.isArray(input.categories)) {
      input.categories.forEach((c) => {
        const cleanTag = c.toLowerCase().trim();
        const mappings = EXPLICIT_TAG_MAPPING[cleanTag];
        if (mappings) {
          mappings.forEach((m) => {
            if (scores[m.category] && scores[m.category][m.sub] !== undefined) {
              scores[m.category][m.sub] += m.weight;
              matchedRules.push(`Tag: "${cleanTag}" -> ${m.category}\\${m.sub} (+${m.weight})`);
            }
          });
        }
      });
    }

    // ───────────────────────────────────────────────────────────────────────────
    // LAYER 3 — SEMANTIC KEYWORD HEURISTICS
    // ───────────────────────────────────────────────────────────────────────────
    SEMANTIC_KEYWORDS.forEach((hk) => {
      const match = hk.keywords.some((kw) => searchName.includes(kw));
      if (match) {
        if (hk.category) {
          if (scores[hk.category] && scores[hk.category][hk.sub] !== undefined) {
            scores[hk.category][hk.sub] += hk.weight;
            matchedRules.push(`Keyword: Coincidencia con "${hk.sub}" (+${hk.weight})`);
          }
        } else {
          // Palabra clave global, se suma a la subcategoría en todas las categorías que la tengan
          Object.keys(scores).forEach((cat) => {
            if (scores[cat][hk.sub] !== undefined) {
              scores[cat][hk.sub] += hk.weight;
              matchedRules.push(`Keyword Global: Coincidencia con "${hk.sub}" en ${cat} (+${hk.weight})`);
            }
          });
        }
      }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // SCORING EVALUATION & PRIORITY OVERRIDES
    // ───────────────────────────────────────────────────────────────────────────
    // Multiplicador absoluto: Las librerías ganan prioridad en su categoría
    if (scores[".essential"]["librerias"] > 10) {
      scores[".essential"]["librerias"] += 80;
    }
    // Rendimiento > QoL
    if (scores[".local"]["rendimiento"] > 10) {
      scores[".local"]["rendimiento"] += 40;
    }
    if (scores[".essential"]["rendimiento"] > 10) {
      scores[".essential"]["rendimiento"] += 40;
    }

    // Encontrar la puntuación más alta
    let bestCategory: ".local" | ".essential" | ".server" = ".essential";
    let bestSub = "vanilla + & qol";
    let highestScore = 0;

    Object.keys(scores).forEach((catStr) => {
      const cat = catStr as ".local" | ".essential" | ".server";
      Object.keys(scores[cat]).forEach((sub) => {
        const score = scores[cat][sub];
        if (score > highestScore) {
          highestScore = score;
          bestCategory = cat;
          bestSub = sub;
        }
      });
    });

    // Normalizar score de confianza en un rango saludable entre 0.4 y 0.99
    const rawConfidence = highestScore > 0 ? Math.min(highestScore / 130, 0.99) : 0.50;
    const confidence = parseFloat(Math.max(rawConfidence, 0.45).toFixed(2));

    return {
      category: bestCategory,
      sub: bestSub,
      confidence,
      matchedRules: Array.from(new Set(matchedRules)) // Deduplicar
    };
  }
}
