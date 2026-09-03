/**
 * SAGE 2.0 — Diagnostic Inference Engine Types
 * ─────────────────────────────────────────────────────────────────────────────
 * Formal domain models for Minecraft crash classification, stack normalization,
 * evidence-based confidence scoring, and structured remediation.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type CrashCategory =
  | "MISSING_DEPENDENCY"
  | "VERSION_CONFLICT"
  | "MIXIN_FAILURE"
  | "JAVA_INCOMPATIBILITY"
  | "MOD_CONFLICT"
  | "CORRUPTED_WORLD"
  | "OUT_OF_MEMORY"
  | "UNKNOWN_RUNTIME";

export type ModLoaderType = "fabric" | "forge" | "neoforge" | "quilt" | "vanilla" | "unknown";

export interface CrashEnvironment {
  minecraftVersion?: string;
  loader: ModLoaderType;
  loaderVersion?: string;
  javaVersion?: string;
  operatingSystem?: string;
  isHybridConnector: boolean;
  hasModList: boolean;
  totalLines: number;
}

export interface NormalizedFrame {
  raw: string;
  className: string;
  methodName: string;
  fileName?: string;
  lineNumber?: number;
  isMixin: boolean;
  mixinTarget?: string;
  associatedMod?: string;
}

export interface DiagnosisEvidence {
  code: string;
  weight: number; // 1-100 contribution to confidence
  description: string;
  snippet?: string;
}

export interface RemediationAction {
  id: string;
  title: string;
  actionType:
    | "install_dependency"
    | "disable_mod"
    | "update_loader"
    | "change_java"
    | "allocate_memory"
    | "delete_duplicate"
    | "restore_backup"
    | "manual_inspect";
  priority: number; // 1 = highest
  autoFixable: boolean;
  targetMod?: string;
  requiredVersion?: string;
  instructions: string[];
  params?: Record<string, any>;
}

export interface RemediationPlan {
  primaryAction?: RemediationAction;
  allActions: RemediationAction[];
  summary: string;
}

export interface StructuredCrashReport {
  id: string;
  category: CrashCategory;
  rootCause: string;
  confidence: number; // 0 to 100 bounded
  culpritMod?: string;
  suspectedMods: string[];
  evidence: DiagnosisEvidence[];
  environment: CrashEnvironment;
  normalizedStack: NormalizedFrame[];
  remediation: RemediationPlan;
  rawException?: string;
  timestamp: string;
  inferenceDurationMs: number;
}
