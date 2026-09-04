/**
 * SAGE 3.0 FOMO Graph Correlator & Heuristic Elimination Tree
 * 
 * Cross-references crash suspects with mod dependency graphs, known ecosystem
 * incompatibilities (e.g. OptiFine vs Sodium, Mixin collisions), and bytecode
 * injection points to logically eliminate suspects without guesswork.
 */

import { SageEliminationCandidate } from "./cacheEngine";

export interface ModDependencyRule {
  modId: string;
  name: string;
  requiredDependencies: string[];
  incompatibleWith: string[];
  loaders?: Array<"fabric" | "forge" | "neoforge" | "quilt">;
  mixinPrefixes?: string[];
  notes?: string;
}

/**
 * Curated knowledge base of core modding libraries, critical dependencies,
 * and architecturally documented incompatibilities across loaders.
 */
export const KNOWN_MOD_RULES: Record<string, ModDependencyRule> = {
  optifine: {
    modId: "optifine",
    name: "OptiFine",
    requiredDependencies: [],
    incompatibleWith: ["sodium", "rubidium", "embeddium", "iris", "oculus"],
    mixinPrefixes: ["net.optifine"],
    notes: "OptiFine replaces vanilla rendering pipelines completely, causing fatal crashes when loaded alongside Sodium/Iris/Embeddium.",
  },
  sodium: {
    modId: "sodium",
    name: "Sodium",
    requiredDependencies: ["fabric-api"],
    incompatibleWith: ["optifine", "rubidium"],
    loaders: ["fabric", "neoforge"],
    mixinPrefixes: ["me.jellysquid.mods.sodium", "net.caffeinemc.mods.sodium"],
  },
  iris: {
    modId: "iris",
    name: "Iris Shaders",
    requiredDependencies: ["sodium"],
    incompatibleWith: ["optifine"],
    loaders: ["fabric", "neoforge"],
    mixinPrefixes: ["net.irisshaders.iris"],
  },
  create: {
    modId: "create",
    name: "Create",
    requiredDependencies: ["flywheel"],
    incompatibleWith: [],
    mixinPrefixes: ["com.simibubi.create"],
    notes: "Requires compatible rendering backend; custom contraption rendering can conflict with aggressive shader mods.",
  },
  architectury: {
    modId: "architectury",
    name: "Architectury API",
    requiredDependencies: [],
    incompatibleWith: [],
    mixinPrefixes: ["dev.architectury"],
  },
  "cloth-config": {
    modId: "cloth-config",
    name: "Cloth Config v10+",
    requiredDependencies: [],
    incompatibleWith: [],
    mixinPrefixes: ["me.shedaniel.clothconfig"],
  },
  "fabric-api": {
    modId: "fabric-api",
    name: "Fabric API",
    requiredDependencies: [],
    incompatibleWith: [],
    loaders: ["fabric", "quilt"],
    mixinPrefixes: ["net.fabricmc.fabric"],
  },
};

export interface CorrelationInput {
  suspects: string[];
  stackTrace: string;
  installedModIds?: string[];
  loader?: string;
  mcVersion?: string;
}

export interface FomoCorrelationResult {
  primaryCulprit: string | null;
  eliminationTree: SageEliminationCandidate[];
  missingDependencies: Array<{ modId: string; requiredMod: string; name: string }>;
  detectedIncompatibilities: Array<{ modA: string; modB: string; reason: string }>;
  suggestedAction: "disable" | "update" | "install_dep" | "review";
}

/**
 * Normalizes mod identifiers by stripping loader tags, version suffixes, and file extensions
 * while preserving valid hyphenated identifiers like 'cloth-config'.
 */
export function normalizeModId(raw: string): string {
  let clean = (raw || "")
    .toLowerCase()
    .replace(/\.jar$/i, "")
    .trim();

  // Strip loader annotations (-fabric, -forge, etc.)
  clean = clean.replace(/[-_](fabric|forge|neoforge|quilt)/gi, "");

  // Strip Minecraft versions and mod semver suffixes (-mc1.20.1, -1.2.3, +1.20)
  clean = clean.replace(/[-_+](mc\d|v?\d).*$/i, "");

  return clean.replace(/[^a-z0-9-]/g, "").trim();
}

/**
 * Builds a heuristic elimination tree to isolate culprits with deterministic logic.
 */
export function correlateSuspectsWithFomo(input: CorrelationInput): FomoCorrelationResult {
  const { suspects, stackTrace, installedModIds = [], loader = "fabric" } = input;
  const normalizedSuspects = suspects.map(normalizeModId);
  const normalizedInstalled = installedModIds.map(normalizeModId);
  const lowerStack = (stackTrace || "").toLowerCase();

  const missingDependencies: Array<{ modId: string; requiredMod: string; name: string }> = [];
  const detectedIncompatibilities: Array<{ modA: string; modB: string; reason: string }> = [];
  const candidateScores = new Map<string, { confidence: number; reasons: string[]; isMissingDep: boolean; hasMixinCol: boolean }>();

  // Initialize candidates
  for (const rawSuspect of suspects) {
    const norm = normalizeModId(rawSuspect);
    candidateScores.set(norm, {
      confidence: 0.3, // baseline suspect confidence
      reasons: [`Identificado preliminarmente en el stack frame del error.`],
      isMissingDep: false,
      hasMixinCol: false,
    });
  }

  // 1. Evidence: Presence in "Caused by" or top frames
  const causedByRegex = /caused by:\s*([a-zA-Z0-9_.$]+)/gi;
  let causedMatch;
  while ((causedMatch = causedByRegex.exec(stackTrace)) !== null) {
    const fullClass = causedMatch[1].toLowerCase();
    for (const [norm, data] of candidateScores.entries()) {
      if (fullClass.includes(norm)) {
        data.confidence = Math.min(1.0, data.confidence + 0.35);
        data.reasons.push(`Aparece explícitamente en la cláusula 'Caused by:' (${causedMatch[1]}).`);
      }
    }
  }

  // 2. Evidence: Mixin Injection Collisions
  const isMixinCrash = lowerStack.includes("org.spongepowered.asm.mixin") || lowerStack.includes("mixinapplyerror");
  if (isMixinCrash) {
    for (const [norm, data] of candidateScores.entries()) {
      const rule = KNOWN_MOD_RULES[norm];
      if (rule?.mixinPrefixes?.some((prefix) => lowerStack.includes(prefix.toLowerCase())) || lowerStack.includes(norm)) {
        data.confidence = Math.min(1.0, data.confidence + 0.25);
        data.hasMixinCol = true;
        data.reasons.push(`Involucrado en colisión de inyección de Mixins en el bytecode.`);
      }
    }
  }

  // 3. Evidence: Cross-check against known dependency rules & incompatibilities
  for (const [norm, data] of candidateScores.entries()) {
    const rule = KNOWN_MOD_RULES[norm];
    if (!rule) continue;

    // Check missing dependencies
    for (const req of rule.requiredDependencies) {
      const reqNorm = normalizeModId(req);
      const isPresent = normalizedInstalled.includes(reqNorm) || normalizedSuspects.includes(reqNorm);
      if (!isPresent && normalizedInstalled.length > 0) {
        missingDependencies.push({ modId: norm, requiredMod: req, name: rule.name });
        data.confidence = Math.min(1.0, data.confidence + 0.3);
        data.isMissingDep = true;
        data.reasons.push(`Le falta la dependencia requerida '${req}'.`);
      }
    }

    // Check incompatibilities against other installed or suspected mods
    for (const incomp of rule.incompatibleWith) {
      const incompNorm = normalizeModId(incomp);
      const conflictFound = normalizedInstalled.includes(incompNorm) || normalizedSuspects.includes(incompNorm);
      if (conflictFound) {
        detectedIncompatibilities.push({
          modA: rule.name,
          modB: incomp,
          reason: rule.notes || `Incompatibilidad crítica conocida entre ${rule.name} y ${incomp}.`,
        });
        data.confidence = Math.min(1.0, data.confidence + 0.4);
        data.reasons.push(`Incompatibilidad estructural activa con '${incomp}'.`);
      }
    }
  }

  // Build sorted elimination tree with deterministic tie-breaking (Caused by and Mixin collisions win ties)
  const eliminationTree: SageEliminationCandidate[] = Array.from(candidateScores.entries())
    .map(([modId, data]) => {
      const isDirectCausedBy = data.reasons.some((r) => r.includes("Caused by"));
      const tieBreakBonus = (isDirectCausedBy ? 0.3 : 0) + (data.hasMixinCol ? 0.15 : 0);
      return {
        modId,
        confidence: Math.round(data.confidence * 100) / 100,
        reason: data.reasons.join(" "),
        hasDirectMixinCollision: data.hasMixinCol,
        isMissingDependency: data.isMissingDep,
        _weightedScore: data.confidence + tieBreakBonus,
      };
    })
    .sort((a, b) => b._weightedScore - a._weightedScore)
    .map(({ _weightedScore, ...rest }) => rest);

  const primaryCulprit = eliminationTree.length > 0 && eliminationTree[0].confidence >= 0.5
    ? eliminationTree[0].modId
    : suspects[0] || null;

  let suggestedAction: FomoCorrelationResult["suggestedAction"] = "review";
  if (missingDependencies.length > 0) {
    suggestedAction = "install_dep";
  } else if (detectedIncompatibilities.length > 0 || (eliminationTree[0]?.confidence ?? 0) >= 0.7) {
    suggestedAction = "disable";
  }

  return {
    primaryCulprit,
    eliminationTree,
    missingDependencies,
    detectedIncompatibilities,
    suggestedAction,
  };
}
