/**
 * MIM – Pack Validator
 * ─────────────────────────────────────────────────────────────────────────────
 * Motor de validación preventiva de modpacks. Se ejecuta ANTES del build
 * y evalúa la integridad del pack contra 8 reglas de negocio.
 *
 * Reglas:
 *   R1 — DEPENDENCY_MISSING:   Mod requiere depId no presente en el pack
 *   R2 — DEPENDENCY_CONFLICT:  Mod declara conflicto con otro mod presente
 *   R3 — ENV_MISMATCH_CLIENT:  Mod server-only en categoría .local
 *   R4 — ENV_MISMATCH_SERVER:  Mod client-only en categoría .server
 *   R5 — LOADER_MISMATCH:      Mod de loader distinto sin Sinytra activo
 *   R6 — DUPLICATE_MOD:        Mismo modId en múltiples archivos
 *   R7 — VERSION_MISMATCH:     gameVersion del mod != versión del proyecto
 *   R8 — SERVER_LEAK:          Mod client-only en build allhost
 *
 * Health Score:
 *   score = max(0, 100 - errors×20 - warnings×5 - suggestions×1)
 *   Grade: S=95+, A=85+, B=75+, C=60+, D=40+, F=<40
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type {
  ValidationIssue,
  ValidationSeverity,
  ValidationCategory,
  PackHealthReport,
  PackGrade,
  EnvironmentStats,
} from "@/lib/core/types";
import type { Loader } from "@/lib/core/constants";
import { predictConnectorCompatibility } from "@/lib/modding/sinytraUtils";

// ── Mod info as seen from the scanner output ──────────────────────────────────

export interface ValidatorMod {
  /** Filename on disk (e.g. "jei-forge-1.20.1-15.2.0.jar") */
  fileName:   string;
  /** Human-readable name extracted from manifest */
  modName:    string;
  /** Internal modId from manifest */
  modId:      string;
  /** Detected loader ("forge" | "neoforge" | "fabric" | "quilt" | "unknown") */
  loader:     string;
  /** Minecraft game version string (may be "unknown") */
  gameVersion: string;
  /** projectType: "mod" | "library" | "shader" etc */
  projectType: string;
  /** Category in the source tree: ".essential" | ".local" | ".server" */
  category:   string;
  /** Sub-category folder (e.g. "tecnologia", "rendimiento") */
  sub:        string;
  /** IDs this mod requires */
  dependencies?: string[];
  /** IDs this mod is incompatible with */
  conflicts?: string[];
  /** IDs this mod also provides / is an alias of */
  providedIds?: string[];
  /** Fabric/Quilt 'breaks' list */
  breaks?: string[];
  /**
   * Fabric/Quilt: "required" | "optional" | "unsupported"
   * Forge: usually undefined
   */
  clientSide?: string;
  serverSide?: string;
  /** True for Fabric mods usable via Sinytra Connector */
  isCompatibleWithConnector?: boolean;
}

export interface ValidatorInput {
  mods:        ValidatorMod[];
  version:     string;               // "1.20.1"
  loader:      Loader;               // project loader
  buildTarget: "alluser" | "allhost" | "both";
  /** Pass true if project has Sinytra Connector active */
  sinytraActive?: boolean;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function issue(
  severity:    ValidationSeverity,
  category:    ValidationCategory,
  mod:         ValidatorMod,
  message:     string,
  extras?:     Partial<Omit<ValidationIssue, "severity" | "category" | "modFile" | "modName" | "message">>
): ValidationIssue {
  return {
    severity,
    category,
    modFile:  mod.fileName,
    modName:  mod.modName !== "unknown" ? mod.modName : mod.fileName,
    modType:  mod.projectType,
    modSub:   mod.sub,
    message,
    ...extras,
  };
}

/** Build a set of ALL modIds present (including providedIds aliases) */
function buildModIdIndex(mods: ValidatorMod[]): Set<string> {
  const ids = new Set<string>();
  for (const mod of mods) {
    if (mod.modId && mod.modId !== "unknown") ids.add(mod.modId);
    for (const pid of mod.providedIds ?? []) ids.add(pid);
  }
  return ids;
}

/** Normalize "1.20.x" / ">=1.20.1" ranges to simple "1.20.1" for fuzzy match */
function versionMatchesFuzzy(modVer: string, projectVer: string): boolean {
  if (!modVer || modVer === "unknown") return true; // no info → skip
  if (modVer === projectVer) return true;
  // Ignore trailing ranges like "1.20+" or "1.20.x"
  if (modVer.startsWith(projectVer)) return true;
  // projectVer starts with modVer (e.g. mod says "1.20", project is "1.20.1")
  if (projectVer.startsWith(modVer)) return true;
  return false;
}

// ── Rule Implementations ──────────────────────────────────────────────────────

/** R1 — DEPENDENCY_MISSING (ERROR) */
function ruleDependencyMissing(mod: ValidatorMod, allIds: Set<string>): ValidationIssue[] {
  const results: ValidationIssue[] = [];
  for (const depId of mod.dependencies ?? []) {
    if (!allIds.has(depId)) {
      results.push(issue(
        "error", "dependency_missing", mod,
        `Falta dependencia: "${depId}"`,
        {
          details: `"${mod.modName}" requiere el mod con ID "${depId}" para funcionar, pero no está presente en ninguna categoría del pack.`,
          affectedMod: depId,
          autoFixable: true,
          fixAction:   "fomo_search",
          fixPayload:  { query: depId },
        }
      ));
    }
  }
  return results;
}

/** R2 — DEPENDENCY_CONFLICT (ERROR) */
function ruleDependencyConflict(mod: ValidatorMod, allMods: ValidatorMod[]): ValidationIssue[] {
  const results: ValidationIssue[] = [];
  const conflictIds = [...(mod.conflicts ?? []), ...(mod.breaks ?? [])];
  for (const conflictId of conflictIds) {
    const found = allMods.find(
      m => m.modId === conflictId || m.providedIds?.includes(conflictId)
    );
    if (found) {
      results.push(issue(
        "error", "dependency_conflict", mod,
        `Conflicto declarado con "${found.modName || conflictId}"`,
        {
          details: `${mod.modName} y ${found.modName} son incompatibles según sus manifiestos.`,
          affectedMod: found.fileName,
          autoFixable: false,
        }
      ));
    }
  }
  return results;
}

/** R3 — ENV_MISMATCH: server-only mod in .local (client) category */
function ruleEnvMismatchServerInLocal(mod: ValidatorMod): ValidationIssue | null {
  // serverSide === "unsupported" means client-only → shouldn't be in .server
  // serverSide === "required" means server-only → shouldn't be in .local
  if (mod.category === ".local" && mod.serverSide === "required") {
    return issue(
      "warning", "environment_mismatch", mod,
      `Mod server-side ubicado en categoría client (.local)`,
      {
        details: `"${mod.modName}" se declara como server-only pero está en .local. Muévelo a .server o marca como compatible con cliente.`,
        autoFixable: true,
        fixAction:   "move_to_server",
        fixPayload:  { targetCategory: ".server", targetSub: mod.sub },
        secondaryAction: "override",
        secondaryPayload: { clientSide: "optional", serverSide: "required" }
      }
    );
  }
  return null;
}

/** R4 — ENV_MISMATCH: client-only mod in .server or .essential */
function ruleEnvMismatchClientInServer(mod: ValidatorMod): ValidationIssue | null {
  if (
    (mod.category === ".server") &&
    mod.clientSide === "required" &&
    mod.serverSide === "unsupported"
  ) {
    return issue(
      "warning", "environment_mismatch", mod,
      `Mod client-only ubicado en categoría servidor (.server)`,
      {
        details: `"${mod.modName}" es client-only pero está en .server. Muévelo a .local o marca como compatible con servidor.`,
        autoFixable: true,
        fixAction:   "move_to_local",
        fixPayload:  { targetCategory: ".local", targetSub: mod.sub },
        secondaryAction: "override",
        secondaryPayload: { clientSide: "required", serverSide: "optional" }
      }
    );
  }
  return null;
}

/** R5 — LOADER_MISMATCH (ERROR) */
function ruleLoaderMismatch(mod: ValidatorMod, projectLoader: Loader, sinytraActive: boolean): ValidationIssue | null {
  if (mod.loader === "unknown") return null;

  // Special case: Forge/NeoForge are interchangeable in 1.20.1
  const forgeFamily = new Set(["forge", "neoforge"]);
  if (forgeFamily.has(mod.loader) && forgeFamily.has(projectLoader)) return null;

  // Fabric/Quilt mods allowed in Forge project if Sinytra is active
  if (
    (mod.loader === "fabric" || mod.loader === "quilt") &&
    forgeFamily.has(projectLoader) &&
    (sinytraActive || mod.isCompatibleWithConnector)
  ) {
    const pred = predictConnectorCompatibility(mod.modName, []); // Categories might be empty here as they are tags
    return issue(
      "warning", "loader_mismatch", mod,
      `Compatibilidad vía Sinytra: ${mod.loader} en ${projectLoader}`,
      {
        details: `Estabilidad estimada: ${pred.percentage}% (${pred.label}). ${pred.reason}`,
        autoFixable: false,
      }
    );
  }

  if (mod.loader !== projectLoader) {
    const isFabricInForge = (mod.loader === "fabric" || mod.loader === "quilt") && forgeFamily.has(projectLoader);
    return issue(
      "error", "loader_mismatch", mod,
      `Loader incompatible: ${mod.loader} (mod) vs ${projectLoader} (proyecto)`,
      {
        details: isFabricInForge
          ? `Activa Sinytra Connector para usar mods Fabric en un proyecto ${projectLoader}.`
          : `El mod "${mod.modName}" no es compatible con el loader del proyecto.`,
        autoFixable: isFabricInForge,
        fixAction:   isFabricInForge ? "disable" : undefined,
        fixPayload:  isFabricInForge ? { hint: "activate_sinytra" } : undefined,
      }
    );
  }
  return null;
}

/** R6 — DUPLICATE_MOD (WARNING) */
function ruleDuplicateMod(mods: ValidatorMod[]): ValidationIssue[] {
  const seen = new Map<string, ValidatorMod>();
  const results: ValidationIssue[] = [];
  for (const mod of mods) {
    if (!mod.modId || mod.modId === "unknown") continue;
    const existing = seen.get(mod.modId);
    if (existing) {
      results.push(issue(
        "warning", "duplicate_mod", mod,
        `ModId duplicado: "${mod.modId}" aparece en múltiples archivos`,
        {
          details: `Archivos: "${existing.fileName}" y "${mod.fileName}". Mantén solo la versión más reciente.`,
          affectedMod: existing.fileName,
          autoFixable: false,
        }
      ));
    } else {
      seen.set(mod.modId, mod);
    }
  }
  return results;
}

/** R7 — VERSION_MISMATCH (WARNING) */
function ruleVersionMismatch(mod: ValidatorMod, projectVersion: string): ValidationIssue | null {
  if (!mod.gameVersion || mod.gameVersion === "unknown") return null;
  if (versionMatchesFuzzy(mod.gameVersion, projectVersion)) return null;
  return issue(
    "warning", "version_mismatch", mod,
    `Versión de juego incompatible: mod dice ${mod.gameVersion}, proyecto usa ${projectVersion}`,
    {
      details: `"${mod.modName}" fue compilado para Minecraft ${mod.gameVersion}. El proyecto apunta a ${projectVersion}.`,
      autoFixable: false,
    }
  );
}

/** R8 — SERVER_LEAK: client-only mod in allhost build (ERROR) */
function ruleServerLeak(mod: ValidatorMod, buildTarget: "alluser" | "allhost" | "both"): ValidationIssue | null {
  if (buildTarget === "alluser") return null;
  // If the mod is client-only AND it's in .essential (which goes to server)
  if (
    mod.category === ".essential" &&
    mod.clientSide === "required" &&
    mod.serverSide === "unsupported"
  ) {
    return issue(
      "error", "server_leak", mod,
      `Mod client-only en .essential causará crash en el servidor`,
      {
        details: `"${mod.modName}" se declara como client-only pero .essential se incluye en builds de servidor. Muévelo a .local o marca como compatible.`,
        autoFixable: true,
        fixAction:   "move_to_local",
        fixPayload:  { targetCategory: ".local", targetSub: mod.sub },
        secondaryAction: "override",
        secondaryPayload: { clientSide: "required", serverSide: "optional" }
      }
    );
  }
  return null;
}

// ── Score & Grade ─────────────────────────────────────────────────────────────

const PENALTIES = { error: 20, warning: 5, suggestion: 1 } as const;

function calcScore(issues: ValidationIssue[]): number {
  const penalty = issues.reduce((acc, i) => acc + PENALTIES[i.severity], 0);
  return Math.max(0, 100 - penalty);
}

function scoreToGrade(score: number): PackGrade {
  if (score >= 95) return "S";
  if (score >= 85) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Validates a set of mods against pack integrity rules.
 * Pure function — no filesystem access, no side effects.
 *
 * @param input  The mods collection, project metadata, and build target.
 * @returns      A `PackHealthReport` with score, grade, and all issues.
 */
export function validatePack(input: ValidatorInput): PackHealthReport {
  const { mods, version, loader, buildTarget, sinytraActive = false } = input;
  const allIds = buildModIdIndex(mods);
  const issues: ValidationIssue[] = [];

  // R6 first — find duplicates across the whole list
  issues.push(...ruleDuplicateMod(mods));

  for (const mod of mods) {
    // R1 — missing dependencies
    issues.push(...ruleDependencyMissing(mod, allIds));

    // R2 — declared conflicts present in pack
    issues.push(...ruleDependencyConflict(mod, mods));

    // R3 — server-only in .local
    const r3 = ruleEnvMismatchServerInLocal(mod);
    if (r3) issues.push(r3);

    // R4 — client-only in .server
    const r4 = ruleEnvMismatchClientInServer(mod);
    if (r4) issues.push(r4);

    // R5 — loader mismatch
    const r5 = ruleLoaderMismatch(mod, loader, sinytraActive);
    if (r5) issues.push(r5);

    // R7 — version mismatch
    const r7 = ruleVersionMismatch(mod, version);
    if (r7) issues.push(r7);

    // R8 — server leak in allhost
    const r8 = ruleServerLeak(mod, buildTarget);
    if (r8) issues.push(r8);
  }

  // ── Environment Predictions ───────────────────────────────────────────────
  let clientStats: EnvironmentStats | undefined;
  let serverStats: EnvironmentStats | undefined;

  if (buildTarget === "both") {
    // Predict Client (.essential + .local)
    const clientMods = mods.filter(m => m.category === ".essential" || m.category === ".local");
    const clientIssues = issues.filter(i => i.modSub !== ".server"); // Simplification
    const clientScore = calcScore(clientIssues);
    clientStats = {
      totalMods: clientMods.length,
      errors: clientIssues.filter(i => i.severity === "error").length,
      warnings: clientIssues.filter(i => i.severity === "warning").length,
      suggestions: clientIssues.filter(i => i.severity === "suggestion").length,
      score: clientScore,
      grade: scoreToGrade(clientScore)
    };

    // Predict Server (.essential + .server)
    const serverMods = mods.filter(m => m.category === ".essential" || m.category === ".server");
    const serverIssues = issues.filter(i => {
      // Excluir issues de mods que no van al servidor
      const isClientMod = mods.find(m => m.fileName === i.modFile && m.category === ".local");
      return !isClientMod;
    });
    const serverScore = calcScore(serverIssues);
    serverStats = {
      totalMods: serverMods.length,
      errors: serverIssues.filter(i => i.severity === "error").length,
      warnings: serverIssues.filter(i => i.severity === "warning").length,
      suggestions: serverIssues.filter(i => i.severity === "suggestion").length,
      score: serverScore,
      grade: scoreToGrade(serverScore)
    };
  }

  const errors      = issues.filter(i => i.severity === "error");
  const warnings    = issues.filter(i => i.severity === "warning");
  const suggestions = issues.filter(i => i.severity === "suggestion");

  const score = calcScore(issues);
  const grade = scoreToGrade(score);

  return {
    score,
    grade,
    totalMods:    mods.length,
    issues,
    errors,
    warnings,
    suggestions,
    blocksExport: errors.length > 0,
    buildTarget,
    validatedAt:  new Date().toISOString(),
    clientStats,
    serverStats
  };
}
