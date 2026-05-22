/**
 * SAGE Recovery Engine - Data & Patterns
 */

export interface CrashPattern {
  type: "dependency_missing" | "mod_incompatible" | "loader_incorrect" | "mixin_conflict" | "version_invalid";
  patterns: RegExp[];
  extract: (match: RegExpMatchArray) => string;
}

export const CRASH_PATTERNS: CrashPattern[] = [
  {
    type: "dependency_missing",
    patterns: [
      /java\.lang\.NoClassDefFoundError:\s*(\w+)/gi,
      /java\.lang\.ClassNotFoundException:\s*(\w+)/gi,
      /Failed to load class\s*(\w+)/gi
    ],
    extract: (match) => match[1]
  },
  {
    type: "mod_incompatible",
    patterns: [
      /mod\s+(\w+)\s+has failed to load correctly/gi,
      /Cannot load mod\s+(\w+)/gi,
      /Mod\s+(\w+)\s+is incompatible/gi
    ],
    extract: (match) => match[1]
  },
  {
    type: "loader_incorrect",
    patterns: [
      /Fabric loader version/gi,
      /Forge loader/gi,
      /incompatible loader/gi
    ],
    extract: () => "loader"
  },
  {
    type: "mixin_conflict",
    patterns: [
      /mixin injection failed/gi,
      /mixin conflict/gi,
      /duplicate mixin/gi
    ],
    extract: () => "mixin"
  },
  {
    type: "version_invalid",
    patterns: [
      /requires minecraft\s+(\d+\.\d+\.\d+)/gi,
      /Unsupported minecraft version/gi,
      /version mismatch/gi
    ],
    extract: (match) => match[1]
  }
];

export const SEVERITY_MAP: Record<string, "low" | "medium" | "high" | "critical"> = {
  dependency_missing: "high",
  mod_incompatible: "medium",
  loader_incorrect: "critical",
  mixin_conflict: "high",
  version_invalid: "medium",
  unknown: "low"
};
