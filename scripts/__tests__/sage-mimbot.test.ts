/**
 * SAGE 3.0 MIM-Bot Copilot & Intelligence Test Suite
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates:
 * 1. Cryptographic SHA-256 crash signature calculation and local cache retrieval.
 * 2. FOMO Graph Correlator & Heuristic Elimination Tree (dependencies, incompatibilities).
 * 3. Continuous Log Profiler (tick-lag, GC pressure, packet spam detection).
 * 4. MIM-Bot Diagnosis Generation (Bully vs Standard personas and 1-click actions).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { computeCrashSignature, loadSageCache, saveSageCacheEntry, getCachedDiagnosis, _resetInMemoryCacheForTests } from "../../lib/intelligence/sage/cacheEngine";
import { correlateSuspectsWithFomo, normalizeModId } from "../../lib/intelligence/sage/fomoCorrelator";
import { profileLogStream } from "../../lib/intelligence/sage/logProfiler";
import { 
  analyzeWithSageMimbot, 
  buildDiagnosticPrompt, 
  generateLocalMimbotDiagnosis 
} from "../../lib/intelligence/sage/sageMimbotEngine";
import { SageAnalysisResult } from "../../utils/sageAnalyzer";

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m"
};

function pass(msg: string) {
  console.log(`  ${colors.green}✓${colors.reset} ${msg}`);
}

function fail(msg: string, details?: unknown) {
  console.error(`  ${colors.red}✗${colors.reset} ${msg}`);
  if (details) console.error("    Details:", details);
  process.exit(1);
}

function assert(condition: boolean, msg: string, details?: unknown) {
  if (!condition) {
    fail(msg, details);
  } else {
    pass(msg);
  }
}

export async function runSageMimbotTests() {
  console.log(`\n${colors.bold}${colors.cyan}=== SAGE 3.0 MIM-Bot Copilot & Graph Intelligence Tests ===${colors.reset}`);

  // 1. Deterministic Signature & Cache Engine
  console.log("\n[1. Deterministic Signatures & Local Cache]");
  const sig1 = computeCrashSignature("fabric", "1.20.1", "at net.minecraft.client.main.Main.main(Main.java:123) 0x7ffd98", ["sodium", "optifine"]);
  const sig2 = computeCrashSignature("fabric", "1.20.1", "at net.minecraft.client.main.Main.main(Main.java:999) 0x11ab44", ["optifine", "sodium"]);
  
  assert(sig1 === sig2, "Signatures match despite line numbers and memory address variations");
  assert(sig1.length === 64, "Crash signature is a valid 64-char SHA-256 hex string");

  const testEntry = {
    signature: sig1,
    timestamp: Date.now(),
    loader: "fabric",
    mcVersion: "1.20.1",
    culprit: "optifine",
    suspects: ["optifine", "sodium"],
    severity: "critical" as const,
    summary: "Colisión directa de rendering.",
    mimbotExplanation: "Roast de prueba.",
    personality: "bully" as const,
    solutions: ["Remover OptiFine"],
    actionableFixes: [{ id: "fix-1", label: "Desactivar OptiFine", action: "disable_mod" as const, modId: "optifine" }],
    eliminationTree: [{ modId: "optifine", confidence: 0.95, reason: "Conflict", hasDirectMixinCollision: true, isMissingDependency: false }],
  };

  const originalCwd = process.cwd();
  const isolatedCacheRoot = mkdtempSync(join(tmpdir(), "mim-sage-cache-test-"));

  try {
    process.chdir(isolatedCacheRoot);
    _resetInMemoryCacheForTests();

    await saveSageCacheEntry(testEntry);
    const fetched = getCachedDiagnosis(sig1);
    assert(fetched !== null, "Successfully saved and retrieved entry from local cache");
    assert(fetched?.culprit === "optifine", "Cached culprit accurately preserved");

    const cacheFile = join(isolatedCacheRoot, ".mim-index", "cache", "sage-cache.json");
    writeFileSync(cacheFile, "{ definitely-not-json", "utf-8");
    _resetInMemoryCacheForTests();

    const recovered = loadSageCache();
    assert(Object.keys(recovered).length === 0, "Corrupted disk cache falls back to an empty store");

    await saveSageCacheEntry(testEntry);
    const repairedDisk = JSON.parse(readFileSync(cacheFile, "utf-8"));
    assert(repairedDisk[sig1]?.culprit === "optifine", "Cache write repairs corrupt persisted JSON");
  } finally {
    process.chdir(originalCwd);
    _resetInMemoryCacheForTests();
    rmSync(isolatedCacheRoot, { recursive: true, force: true });
  }

  // 2. FOMO Graph Correlator & Elimination Tree
  console.log("\n[2. FOMO Graph Correlator & Heuristic Elimination Tree]");
  assert(normalizeModId("Sodium-Fabric-mc1.20.1-0.5.8.jar") === "sodium", "Normalizes complex JAR filename to core mod id");

  const correlation = correlateSuspectsWithFomo({
    suspects: ["sodium", "optifine"],
    stackTrace: "Caused by: net.optifine.render.CustomRenderException: Incompatible rendering engine\norg.spongepowered.asm.mixin.injection.throwables.MixinApplyError",
    installedModIds: ["sodium", "optifine", "fabric-api"],
    loader: "fabric",
  });

  assert(correlation.primaryCulprit === "optifine", "Identifies OptiFine as the primary culprit via known incompatibility and Caused by match");
  assert(correlation.detectedIncompatibilities.length > 0, "Flags known OptiFine vs Sodium incompatibility");
  assert(correlation.eliminationTree[0].confidence > 0.7, "Primary culprit has high confidence score (> 0.7)");
  assert(correlation.eliminationTree[0].hasDirectMixinCollision === true, "Flags Mixin collision properly");

  // Missing dependency test
  const missingDepTest = correlateSuspectsWithFomo({
    suspects: ["iris"],
    stackTrace: "java.lang.NoClassDefFoundError: me/jellysquid/mods/sodium/client/render/SodiumWorldRenderer",
    installedModIds: ["iris"],
    loader: "fabric",
  });
  assert(missingDepTest.missingDependencies.length > 0, "Detects missing required dependency 'sodium' for Iris Shaders");
  assert(missingDepTest.suggestedAction === "install_dep", "Recommends 'install_dep' action");

  // 3. Log Profiler
  console.log("\n[3. Log Profiler & Preventative Health Monitor]");
  const sampleLog = `
[12:00:01] [Server thread/WARN]: Can't keep up! Is the server overloaded? Running 5000ms or 100 ticks behind
[12:00:02] [Server thread/WARN]: Can't keep up! Is the server overloaded? Running 2500ms or 50 ticks behind
[12:00:03] [Server thread/ERROR]: [BadMod] Exception: NullPointer in tick loop
[12:00:04] [Server thread/ERROR]: [BadMod] Exception: NullPointer in tick loop
[12:00:05] [Server thread/ERROR]: [BadMod] Exception: NullPointer in tick loop
[12:00:06] [Server thread/ERROR]: [BadMod] Exception: NullPointer in tick loop
[12:00:07] [Server thread/ERROR]: [BadMod] Exception: NullPointer in tick loop
[12:00:08] [Server thread/ERROR]: [BadMod] Exception: NullPointer in tick loop
[12:00:09] [Server thread/ERROR]: [BadMod] Exception: NullPointer in tick loop
[12:00:10] [Server thread/ERROR]: [BadMod] Exception: NullPointer in tick loop
[12:00:11] [Server thread/ERROR]: [BadMod] Exception: NullPointer in tick loop
[12:00:12] [Netty Server IO #1/WARN]: Packet flood detected: dropped packet from client
`.trim();

  const profile = profileLogStream(sampleLog, "fabric");
  assert(profile.totalLinesAnalyzed > 10, "Analyzed log lines correctly");
  assert(profile.anomalies.some((a) => a.type === "tick_lag"), "Detected tick lag anomaly");
  assert(profile.anomalies.some((a) => a.type === "packet_spam"), "Detected packet flood anomaly");
  assert(profile.anomalies.some((a) => a.sourceMod === "badmod"), "Isolated repeated warning flood to 'badmod'");
  assert(profile.healthScore < 85, "Degrades health score based on anomalies");
  assert(profile.recommendations.some((r) => r.targetMod === "lithium"), "Recommends Lithium for server tick lag");

  // 4. SAGE MIM-Bot Orchestration & Fallback
  console.log("\n[4. SAGE MIM-Bot Orchestration & Prompting]");
  const mockAnalysis: SageAnalysisResult = {
    success: true,
    title: "Crash de Incompatibilidad",
    exceptionType: "MixinApplyError",
    category: "Conflictos",
    severity: "critical",
    confidence: 90,
    suspectedMods: ["optifine", "sodium"],
    explanation: "Colisión crítica entre OptiFine y Sodium.",
    solutions: ["Desinstalar OptiFine"],
    technicalSummary: "MixinApplyError in LevelRenderer",
    rawStats: { linesParsed: 50, hasStackTrace: true, hasModList: true },
    loader: "fabric",
    gameVersion: "1.20.1",
  };

  const bullyPrompt = buildDiagnosticPrompt(mockAnalysis, correlation, "bully");
  assert(bullyPrompt.includes("El Roast de MIM-Bot"), "Bully prompt mandates roast structure");
  assert(bullyPrompt.includes("OptiFine"), "Bully prompt incorporates culprit mod data");

  const standardPrompt = buildDiagnosticPrompt(mockAnalysis, correlation, "standard");
  assert(!standardPrompt.includes("Roast"), "Standard prompt forbids roast");
  assert(standardPrompt.includes("Modo Ingeniero"), "Standard prompt establishes engineering persona");

  const localBullyDiag = generateLocalMimbotDiagnosis(mockAnalysis, correlation, "bully");
  assert(localBullyDiag.includes("Roast"), "Local fallback produces formatted roast");
  assert(localBullyDiag.includes("Plan de Rescate"), "Local fallback includes actionable rescue plan");

  const diagResult = await analyzeWithSageMimbot({
    analysis: mockAnalysis,
    rawCrashText: "Caused by: net.optifine.render.CustomRenderException",
    personality: "bully",
    provider: "offline",
  });

  assert(diagResult.actionableFixes.length > 0, "Produces 1-click actionable fixes");
  assert(diagResult.primaryCulprit === "optifine", "Identifies primary culprit in orchestrated flow");
  assert(diagResult.eliminationTree.length > 0, "Provides populated elimination tree");

  console.log(`\n${colors.bold}${colors.green}✓ All SAGE 3.0 MIM-Bot Copilot & Intelligence tests passed!${colors.reset}`);
}

if (require.main === module) {
  runSageMimbotTests().catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  });
}
