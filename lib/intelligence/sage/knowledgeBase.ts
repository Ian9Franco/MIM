/**
 * SAGE 2.0 — Mod Compatibility & Incident Knowledge Base
 * ─────────────────────────────────────────────────────────────────────────────
 * Curated repository of documented Minecraft modding incompatibilities,
 * rendering engine conflicts, JVM deprecations, and verified remediations.
 * Serves as the grounded retrieval corpus for the SAGE RAG layer.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { CrashCategory } from "./types";

export interface KnowledgeArticle {
  id: string;
  title: string;
  category: CrashCategory;
  affectedMods: string[];
  symptoms: string[];
  rootCauseAnalysis: string;
  verifiedRemediation: string[];
  referenceLinks?: string[];
  keywords: string[];
}

export const COMPATIBILITY_KNOWLEDGE_BASE: KnowledgeArticle[] = [
  {
    id: "KB-001-SODIUM-OPTIFINE-CONFLICT",
    title: "Sodium / Embeddium and OptiFine Mutual Exclusion",
    category: "MOD_CONFLICT",
    affectedMods: ["sodium", "optifine", "embeddium", "rubidium"],
    symptoms: [
      "Crash during early OpenGL initialization",
      "MixinTransformerError targeting RenderSystem or WorldRenderer",
      "Duplicate pipeline registration in Minecraft classloader"
    ],
    rootCauseAnalysis:
      "Sodium replaces the entire vanilla rendering engine with a modern chunk-mesh pipeline. OptiFine replaces the same vanilla rendering hooks with legacy fixed-function pipeline overrides. Running both causes fatal ASM bytecode transformation collisions.",
    verifiedRemediation: [
      "Remove OptiFine.jar from your mods directory.",
      "Use Sodium + Iris Shaders (or Embeddium + Oculus) for modern shaderpack support.",
      "Delete old shader cache files from .minecraft/shaderpacks."
    ],
    keywords: ["sodium", "optifine", "embeddium", "rubidium", "shader", "render", "opengl", "worldrenderer"]
  },
  {
    id: "KB-002-CREATE-FLYWHEEL-BACKEND",
    title: "Create Mod & Flywheel GPU Instancing Pipeline Mismatch",
    category: "MIXIN_FAILURE",
    affectedMods: ["create", "flywheel", "iris", "oculus"],
    symptoms: [
      "Crash during block entity tick or train contraption render",
      "NullPointerException in Flywheel WorldAttached instance",
      "Critical injection failure in flywheel.mixins.json"
    ],
    rootCauseAnalysis:
      "Flywheel uses advanced instanced GPU rendering for kinetic contraptions. Incompatible versions of Flywheel or conflicts with certain shader pipelines cause shader compilation failure on block entity matrix transformations.",
    verifiedRemediation: [
      "Ensure Flywheel version matches the exact sub-build required by Create.",
      "Switch Flywheel backend from 'instancing' to 'batching' via /flywheel backend batching.",
      "Update Iris/Oculus to version 1.6.4+ to support Flywheel shader pipeline integration."
    ],
    keywords: ["create", "flywheel", "contraption", "kinetic", "instancing", "shader", "batching"]
  },
  {
    id: "KB-003-JAVA-21-BYTECODE-VERSION",
    title: "Java 21 Bytecode Incompatibility (Class File Version 65.0)",
    category: "JAVA_INCOMPATIBILITY",
    affectedMods: ["minecraft", "fabricloader", "neoforge"],
    symptoms: [
      "UnsupportedClassVersionError: class file version 65.0",
      "Game terminates before opening launcher window",
      "Only recognizes class file versions up to 61.0 (Java 17)"
    ],
    rootCauseAnalysis:
      "Minecraft 1.20.5+ and contemporary mod loaders compile with Java 21 (class file format 65.0). Running on Java 17 (format 61.0) or Java 8 (format 52.0) causes the JVM classloader to abort initialization immediately.",
    verifiedRemediation: [
      "Download and install Eclipse Temurin or Oracle OpenJDK 21 (LTS).",
      "In launcher settings, configure Java Runtime Path to point to javaw.exe for Java 21.",
      "Ensure environment variable JAVA_HOME points to the Java 21 JDK."
    ],
    keywords: ["java", "unsupportedclassversionerror", "class file version 65.0", "java 21", "jvm", "runtime"]
  },
  {
    id: "KB-004-FABRIC-API-MISSING-MODULES",
    title: "Missing Fabric API Sub-Module or Lifecycle Events",
    category: "MISSING_DEPENDENCY",
    affectedMods: ["fabric-api", "fabricloader"],
    symptoms: [
      "Mod requires fabric-api or fabric-lifecycle-events-v1",
      "ClassNotFoundException: net.fabricmc.fabric.api.event.lifecycle.v1.ServerTickEvents",
      "Startup dialog reports missing essential library"
    ],
    rootCauseAnalysis:
      "Fabric mods depend on modularized Fabric API interfaces. Fabric Loader alone does not provide game API hooks; the unified Fabric API jar must be placed directly into the mods directory.",
    verifiedRemediation: [
      "Download the matching build of Fabric API from Modrinth or CurseForge for your exact Minecraft version.",
      "Confirm Fabric Loader is updated to at least version 0.15.11.",
      "Verify the downloaded jar is not corrupted (0 bytes)."
    ],
    keywords: ["fabric-api", "fabric", "missing dependency", "servertickevents", "lifecycle"]
  },
  {
    id: "KB-005-INDRIUM-SODIUM-INDICES",
    title: "Indium Requirement for Fabric Rendering API Mods",
    category: "MISSING_DEPENDENCY",
    affectedMods: ["indium", "sodium", "continuity", "lambda-better-grass"],
    symptoms: [
      "Sodium is installed without Indium",
      "Continuity or connected textures mod fails to load",
      "Crash in FabricRenderingAPI model transformation"
    ],
    rootCauseAnalysis:
      "Sodium replaces the vanilla rendering pipeline and does not implement the Fabric Rendering API (FREX) natively. Mods relying on custom block models require Indium as an ASM bridge between Sodium and the Fabric Model API.",
    verifiedRemediation: [
      "Install Indium compatible with your Sodium version.",
      "Restart Minecraft; Indium will automatically bind connected textures to Sodium meshes."
    ],
    keywords: ["indium", "sodium", "continuity", "frex", "connected textures", "fabric rendering api"]
  },
  {
    id: "KB-006-OUT-OF-MEMORY-HEAP-ALLOCATION",
    title: "JVM Heap Allocation Exhaustion in Heavy Modpacks",
    category: "OUT_OF_MEMORY",
    affectedMods: ["minecraft", "jvm"],
    symptoms: [
      "java.lang.OutOfMemoryError: Java heap space",
      "Game freezes during world generation or chunk baking",
      "GC overhead limit exceeded"
    ],
    rootCauseAnalysis:
      "Modpacks with 150+ mods, high-resolution resource packs, or distant horizons require at least 6 GB to 8 GB of RAM. The default 2 GB (-Xmx2G) allocation causes garbage collection thrashing and fatal heap exhaustion.",
    verifiedRemediation: [
      "Increase maximum heap argument in launcher: change -Xmx2G to -Xmx6G or -Xmx8G.",
      "Install memory optimization mods: FerriteCore and ModernFix.",
      "Avoid allocating more than 80% of total physical host RAM to avoid operating system paging."
    ],
    keywords: ["outofmemoryerror", "heap space", "ram", "xmx", "memory leak", "ferritecore", "gc overhead"]
  },
  {
    id: "KB-007-CORRUPTED-PLAYERDATA-COORDINATES",
    title: "Corrupted Player Data / Out-of-Bounds Coordinate Crash",
    category: "CORRUPTED_WORLD",
    affectedMods: ["minecraft", "world"],
    symptoms: [
      "Crash immediately upon joining singleplayer or server",
      "Encountered an unexpected exception com.mojang.datafixers",
      "Position coordinates show NaN, Infinity, or values exceeding world border"
    ],
    rootCauseAnalysis:
      "Sudden game crashes during dimension travel or teleportation can corrupt playerdata/<uuid>.dat NBT compound tags, writing invalid floating-point values or unregistered dimension namespaces.",
    verifiedRemediation: [
      "Run SAGE NBT Rescue on the affected player.dat.",
      "SAGE creates an automatic .mim_bak snapshot and resets coordinates to world spawn.",
      "Inspect player inventory for invalid/deleted custom items."
    ],
    keywords: ["playerdata", "corrupted", "nbt", "datafixers", "coordinates", "level.dat", "spawn"]
  },
  {
    id: "KB-008-SINYTRA-CONNECTOR-HYBRID-CRASH",
    title: "Sinytra Connector Forge-on-Fabric Mixin Incompatibility",
    category: "MIXIN_FAILURE",
    affectedMods: ["sinytra", "connector", "forgified-fabric-api"],
    symptoms: [
      "Crash during runtime translation of Forge mod on Fabric/NeoForge",
      "org.sinytra.connector.transformer exception",
      "Failed to remap method signature or Forge event bus subscriber"
    ],
    rootCauseAnalysis:
      "Sinytra Connector attempts dynamic bytecode translation of Forge mods into Fabric-compatible calls. Complex coremods or mods with deep unmanaged reflection fail during bytecode remapping.",
    verifiedRemediation: [
      "Check Sinytra Connector compatibility list for the offending mod.",
      "Temporarily disable the translated Forge mod.",
      "Update Connector and Forgified Fabric API to the latest development snapshot."
    ],
    keywords: ["sinytra", "connector", "hybrid", "remap", "forgified", "bytecode translation"]
  }
];
