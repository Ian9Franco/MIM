/**
 * @fileoverview MIM Semantic Classification Engine (Auto-Categorías)
 * ─────────────────────────────────────────────────────────────────────────────
 * Clasificador semántico de 4 capas para categorizar mods automáticamente.
 * Determina si un mod es una Herramienta Local (.local), Esencial (.essential)
 * o de Servidor (.server) basándose en metadatos y patrones de nombres.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { EXPLICIT_TAG_MAPPING, SEMANTIC_KEYWORDS, ANCHOR_RULES } from './rules';

export interface ClassificationInput {
  fileName: string;
  modName?: string;
  categories?: string[];
  clientSide?: any;
  serverSide?: any;
  environment?: "client" | "server" | "both" | "unknown";
}

export interface ClassificationResult {
  category: ".local" | ".essential" | ".server";
  sub: string;
  confidence: number;
  matchedRules: string[];
}

/**
 * MimClassifier (Motor de Heurística)
 * ─────────────────────────────────────────────────────────────────────────────
 * Utiliza un sistema de puntuación ponderada para decidir la mejor categoría.
 * 
 * Capas de decisión:
 * 1. Anchors: Reglas de coincidencia exacta (ej. 'optifine' siempre es .local).
 * 2. Jerarquía: Si el mod declara un entorno específico en sus metadatos internos.
 * 3. Tags: Mapeo de categorías de plataformas (Modrinth/CurseForge).
 * 4. Semántica: Análisis de palabras clave en el nombre del archivo.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export class MimClassifier {
  public static classify(input: ClassificationInput): ClassificationResult {
    const matchedRules: string[] = [];
    const searchName = `${input.modName || ""} ${input.fileName}`.toLowerCase();

    // CAPA 1: Anchor Rules (Inmediato / Hard-coded)
    // Estas reglas tienen prioridad absoluta sobre el sistema de puntuación.
    for (const anchor of ANCHOR_RULES) {
      if (anchor.test(searchName)) {
        return { category: anchor.category as any, sub: anchor.sub, confidence: 1.0, matchedRules: [anchor.name] };
      }
    }

    // CAPA 2: Hierarchy (Entorno declarado en metadatos del Loader)
    let strictCategory: any = null;
    if (input.environment === "client") strictCategory = ".local";
    else if (input.environment === "server") strictCategory = ".server";
    else if (input.environment === "both") strictCategory = ".essential";

    // Sistema de Puntuación (Scoring)
    const scores: any = { ".local": {}, ".essential": {}, ".server": {} };
    const addScore = (cat: string, sub: string, val: number) => {
      if (!scores[cat]) scores[cat] = {};
      scores[cat][sub] = (scores[cat][sub] || 0) + val;
    };

    // CAPA 3: Explicit Tags (Categorías de plataformas externas)
    input.categories?.forEach(tag => {
      const mappings = EXPLICIT_TAG_MAPPING[tag.toLowerCase().trim()];
      mappings?.forEach((m: any) => addScore(m.category, m.sub, m.weight));
    });

    // CAPA 4: Semantic Keywords (Búsqueda difusa en nombres)
    SEMANTIC_KEYWORDS.forEach(hk => {
      if (hk.keywords.some(kw => searchName.includes(kw))) {
        if (hk.category) {
          addScore(hk.category, hk.sub, hk.weight);
        } else {
          // Si la keyword no tiene categoría fija, puntúa en todas las ramas
          [".local", ".essential", ".server"].forEach(c => addScore(c, hk.sub, hk.weight));
        }
      }
    });

    // Evaluación Final de Resultados
    let bestCat: any = strictCategory || ".essential";
    let bestSub = "librerias"; // Fallback por defecto
    let maxScore = 0;

    Object.entries(scores).forEach(([cat, subs]: any) => {
      Object.entries(subs).forEach(([sub, score]: any) => {
        if (score > maxScore) { 
          maxScore = score; 
          if (!strictCategory) bestCat = cat; 
          bestSub = sub; 
        }
      });
    });

    return { 
      category: bestCat, 
      sub: bestSub, 
      confidence: maxScore > 5 ? 0.9 : 0.7, 
      matchedRules 
    };
  }
}
