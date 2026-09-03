/**
 * SAGE 2.0 — Exception & Crash Classifier
 * ─────────────────────────────────────────────────────────────────────────────
 * Classifies Minecraft crash logs into 8 standard taxonomy categories
 * using multi-pass structural heuristics and extracts primary culprit indicators.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { CrashCategory, DiagnosisEvidence } from "./types";
import { stripAnsi } from "./parser";

export interface ClassificationResult {
  category: CrashCategory;
  primaryException?: string;
  evidence: DiagnosisEvidence[];
  candidateCulprits: string[];
}

export function classifyCrash(rawLog: string): ClassificationResult {
  const clean = stripAnsi(rawLog);
  const evidence: DiagnosisEvidence[] = [];
  const candidateCulprits: string[] = [];

  // ── 1. OUT OF MEMORY CHECK ──────────────────────────────────────────────────
  if (
    clean.includes("java.lang.OutOfMemoryError") ||
    clean.includes("Java heap space") ||
    clean.includes("GC overhead limit exceeded") ||
    clean.includes("OutOfMemoryError: Metaspace")
  ) {
    evidence.push({
      code: "JVM_OOM_DETECTED",
      weight: 95,
      description: "JVM exhausted allocated heap memory or metaspace.",
      snippet: clean.match(/java\.lang\.OutOfMemoryError:[^\r\n]*/)?.[0] || "OutOfMemoryError"
    });
    return {
      category: "OUT_OF_MEMORY",
      primaryException: "java.lang.OutOfMemoryError",
      evidence,
      candidateCulprits: []
    };
  }

  // ── 2. MISSING DEPENDENCY CHECK ─────────────────────────────────────────────
  // A. Fabric Dependency Block
  const fabricDepMatch =
    clean.match(/Mod\s+['"]?([a-zA-Z0-9_-]+)['"]?\s+requires\s+any\s+version\s+of\s+([a-zA-Z0-9_-]+)/i) ||
    clean.match(/Mod\s+['"]?([a-zA-Z0-9_-]+)['"]?\s+requires\s+['"]?([a-zA-Z0-9_-]+)['"]?[^\r\n]*(?:not installed|missing|which is missing)/i) ||
    clean.match(/requires\s+['"]?([a-zA-Z0-9_-]+)['"]?,?\s+which\s+is\s+missing/i) ||
    clean.match(/Install\s+([a-zA-Z0-9_-]+),\s+any\s+version/i);

  // B. Forge / NeoForge Missing Dependency Block
  const forgeDepMatch =
    clean.match(/Missing\s+or\s+unsupported\s+mandatory\s+dependencies:?\s*[\r\n]+\s*Mod\s+ID:\s*'([^']+)',\s*Requested\s+by:\s*'([^']+)'/i) ||
    clean.match(/Missing\s+or\s+unsupported\s+mandatory\s+dependencies:?\s*[\r\n]+\s*Mod\s+ID:\s*'([^']+)'/i) ||
    clean.match(/Mod\s+['"]?([a-zA-Z0-9_-]+)['"]?\s+requires\s+['"]?([a-zA-Z0-9_-]+)['"]?\s+([\d.]+)/i) ||
    clean.match(/mod\s+([a-zA-Z0-9_-]+)\s+requires\s+([a-zA-Z0-9_-]+)/i);

  // C. ClassNotFoundException / NoClassDefFoundError
  const classNotFoundMatch = clean.match(/java\.lang\.ClassNotFoundException:\s*([a-zA-Z0-9_$.]+)/) ||
                             clean.match(/java\.lang\.NoClassDefFoundError:\s*([a-zA-Z0-9_$/]+)/);

  if (fabricDepMatch || forgeDepMatch) {
    let dep = "unknown_dependency";
    let src = "unknown_mod";

    if (fabricDepMatch) {
      if (fabricDepMatch[2]) {
        src = fabricDepMatch[1];
        dep = fabricDepMatch[2];
      } else if (fabricDepMatch[1]) {
        dep = fabricDepMatch[1];
      }
    } else if (forgeDepMatch) {
      dep = forgeDepMatch[1];
      src = forgeDepMatch[2] || "unknown_mod";
    }

    candidateCulprits.push(dep, src);
    evidence.push({
      code: "MISSING_DEPENDENCY_SPEC",
      weight: 95,
      description: `Mod '${src}' demands dependency '${dep}', which is missing from the environment.`,
      snippet: fabricDepMatch?.[0] || forgeDepMatch?.[0]
    });
    return {
      category: "MISSING_DEPENDENCY",
      primaryException: "MissingDependencyException",
      evidence,
      candidateCulprits
    };
  }

  // ── 3. VERSION CONFLICT CHECK ───────────────────────────────────────────────
  const versionMismatchMatch = clean.match(/requires\s+version\s+([^\s,]+)\s+of\s+([a-zA-Z0-9_-]+),\s+but\s+currently\s+([^\s,]+)\s+is\s+installed/i) ||
                               clean.match(/Mod\s+['"]?([a-zA-Z0-9_-]+)['"]?\s+requires\s+([a-zA-Z0-9_-]+)\s+([0-9.]+)\s+or\s+above/i) ||
                               clean.match(/Requires\s+Minecraft\s+([0-9.]+)/i);

  if (versionMismatchMatch && !clean.includes("not installed")) {
    const mod = versionMismatchMatch[2] || versionMismatchMatch[1];
    candidateCulprits.push(mod);
    evidence.push({
      code: "DEPENDENCY_VERSION_MISMATCH",
      weight: 90,
      description: `Dependency version mismatch detected for '${mod}'.`,
      snippet: versionMismatchMatch[0]
    });
    return {
      category: "VERSION_CONFLICT",
      primaryException: "DependencyVersionMismatchException",
      evidence,
      candidateCulprits
    };
  }

  // ── 4. JAVA INCOMPATIBILITY CHECK ───────────────────────────────────────────
  const javaVerMatch = clean.match(/has been compiled by a more recent version of the Java Runtime \(class file version (\d+\.\d+)\), this version of the Java Runtime only recognizes class file versions up to (\d+\.\d+)/i) ||
                       clean.match(/UnsupportedClassVersionError:\s*([^\r\n]+)/i) ||
                       clean.match(/requires\s+java\s+(\d+)\s+or\s+newer/i);

  if (javaVerMatch || clean.includes("java.lang.UnsupportedClassVersionError")) {
    evidence.push({
      code: "JAVA_VERSION_INCOMPATIBILITY",
      weight: 98,
      description: "Class bytecode compiled for a higher Java version than the active JVM runtime.",
      snippet: javaVerMatch?.[0] || "UnsupportedClassVersionError"
    });
    return {
      category: "JAVA_INCOMPATIBILITY",
      primaryException: "java.lang.UnsupportedClassVersionError",
      evidence,
      candidateCulprits: []
    };
  }

  // ── 5. MOD CONFLICT & DUPLICATES CHECK ──────────────────────────────────────
  const duplicateMatch = clean.match(/Found\s+duplicate\s+mods?:?\s*[\r\n]*\s*Mod\s+ID:\s*'([^']+)'/i) ||
                         clean.match(/Duplicate\s+mod\s+id:\s*([a-zA-Z0-9_-]+)/i) ||
                         clean.match(/Duplicate\s+mods\s+found:\s*([^\r\n]+)/i);

  if (duplicateMatch) {
    const modId = duplicateMatch[1];
    candidateCulprits.push(modId);
    evidence.push({
      code: "DUPLICATE_MOD_ID",
      weight: 95,
      description: `Duplicate mod registration detected for '${modId}'. Multiple JAR files provide the same ID.`,
      snippet: duplicateMatch[0]
    });
    return {
      category: "MOD_CONFLICT",
      primaryException: "DuplicateModsFoundException",
      evidence,
      candidateCulprits
    };
  }

  // ── 6. MIXIN TRANSFORMATION FAILURE CHECK ───────────────────────────────────
  const mixinMatch = clean.match(/org\.spongepowered\.asm\.mixin\.transformer\.throwables\.MixinTransformerError:[^\r\n]*/i) ||
                     clean.match(/org\.spongepowered\.asm\.mixin\.injection\.throwables\.InjectionError:[^\r\n]*/i) ||
                     clean.match(/Mixin\s+apply\s+failed\s+([a-zA-Z0-9_.-]+)/i) ||
                     clean.match(/Critical\s+injection\s+failure:\s*([^\r\n]+)/i);

  if (mixinMatch || clean.includes("org.spongepowered.asm.mixin")) {
    const culpritInMixin = clean.match(/from\s+mod\s+([a-zA-Z0-9_-]+)/i) ||
                           clean.match(/in\s+config\s+\[([a-zA-Z0-9_-]+)\.mixins?\.json\]/i) ||
                           clean.match(/([a-zA-Z0-9_-]+)\.mixins?\.json/i);

    if (culpritInMixin) {
      candidateCulprits.push(culpritInMixin[1]);
    }

    evidence.push({
      code: "MIXIN_TRANSFORMATION_FAILURE",
      weight: 85,
      description: "ASM bytecode injection failed during class transformation.",
      snippet: mixinMatch?.[0] || culpritInMixin?.[0] || "MixinTransformerError"
    });
    return {
      category: "MIXIN_FAILURE",
      primaryException: "MixinTransformerError",
      evidence,
      candidateCulprits
    };
  }

  // ── 7. CORRUPTED WORLD / NBT CHECK ──────────────────────────────────────────
  if (
    clean.includes("Failed to load chunk") ||
    clean.includes("Corrupted NBT tag") ||
    clean.includes("Encountered an unexpected exception com.mojang.datafixers") ||
    clean.includes("level.dat is corrupted") ||
    clean.includes("java.io.UTFDataFormatException") ||
    clean.includes("Chunk file at") && clean.includes("error")
  ) {
    evidence.push({
      code: "WORLD_NBT_CORRUPTION",
      weight: 90,
      description: "Binary world save or chunk NBT structure failed validation or decompression.",
      snippet: clean.match(/(?:Failed to load chunk|Corrupted NBT|level\.dat is corrupted)[^\r\n]*/)?.[0]
    });
    return {
      category: "CORRUPTED_WORLD",
      primaryException: "CorruptedWorldException",
      evidence,
      candidateCulprits: []
    };
  }

  // ── 8. FALLBACK / UNKNOWN RUNTIME ───────────────────────────────────────────
  if (classNotFoundMatch) {
    const missingClass = classNotFoundMatch[1];
    candidateCulprits.push(missingClass.split(".").pop() || missingClass);
    evidence.push({
      code: "CLASS_NOT_FOUND_ISOLATION",
      weight: 75,
      description: `Class loading failure for '${missingClass}'. Likely unfulfilled shaded library or dependency.`,
      snippet: classNotFoundMatch[0]
    });
    return {
      category: "MISSING_DEPENDENCY",
      primaryException: classNotFoundMatch[0],
      evidence,
      candidateCulprits
    };
  }

  evidence.push({
    code: "UNRECOGNIZED_CRASH_PATTERN",
    weight: 20,
    description: "No deterministic crash pattern was matched against known taxonomy signatures."
  });

  return {
    category: "UNKNOWN_RUNTIME",
    primaryException: "UnknownException",
    evidence,
    candidateCulprits: []
  };
}
