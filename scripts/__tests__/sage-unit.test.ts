/**
 * SAGE 2.0 — Unit Test Suite
 * ─────────────────────────────────────────────────────────────────────────────
 * Tests core diagnostic components in isolation (Zero I/O):
 * 1. parser.ts: ANSI stripping, Loader fingerprinting (Forge, Fabric, NeoForge, Quilt), Stack parsing
 * 2. classifier.ts: Deterministic pattern matching across crash categories
 * 3. scorer.ts: Bounded confidence scoring (20-99) and evidence weighting
 * 4. correlator.ts: Mod culprit correlation and suspected list generation
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { stripAnsi, parseCrashEnvironment, parseNormalizedStack, extractExceptionChain } from "../../lib/intelligence/sage/parser";
import { classifyCrash } from "../../lib/intelligence/sage/classifier";
import { computeConfidenceScore } from "../../lib/intelligence/sage/scorer";
import { correlateCulprits } from "../../lib/intelligence/sage/correlator";

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

async function run() {
  console.log(`\n${colors.bold}${colors.cyan}▶ Executing SAGE 2.0 Unit Test Suite...${colors.reset}\n`);

  // ───────────────────────────────────────────────────────────────────────────
  // 1. PARSER: ANSI Stripping
  // ───────────────────────────────────────────────────────────────────────────
  console.log(`${colors.bold}1. Parser: ANSI Sanitation${colors.reset}`);
  const rawWithAnsi = "\u001b[31m[ERROR]\u001b[0m \u001b[1mException in thread 'main'\u001b[0m \u001b[32mnet.minecraft.client.main.Main\u001b[0m";
  const stripped = stripAnsi(rawWithAnsi);
  assert(!stripped.includes("\u001b"), "stripAnsi removes all escape sequences");
  assert(stripped === "[ERROR] Exception in thread 'main' net.minecraft.client.main.Main", "stripAnsi preserves exact plain text");

  // ───────────────────────────────────────────────────────────────────────────
  // 2. PARSER: Mod Loader & Environment Fingerprinting
  // ───────────────────────────────────────────────────────────────────────────
  console.log(`\n${colors.bold}2. Parser: Mod Loader & Environment Detection${colors.reset}`);

  // Forge
  const forgeLog = `
    Minecraft Version: 1.20.1
    Operating System: Windows 11 (amd64) version 10.0
    Java Version: 17.0.8, Microsoft
    Minecraft Forge: 47.2.0
  `;
  const envForge = parseCrashEnvironment(forgeLog);
  assert(envForge.loader === "forge", "Correctly identifies Minecraft Forge loader");
  assert(envForge.minecraftVersion === "1.20.1", "Extracts Forge Minecraft version (1.20.1)");
  assert(envForge.loaderVersion === "47.2.0", "Extracts Forge loader version (47.2.0)");

  // Fabric
  const fabricLog = `
    Minecraft Version: 1.20.4
    Fabric Loader 0.15.7
    Java Version: 21.0.2
  `;
  const envFabric = parseCrashEnvironment(fabricLog);
  assert(envFabric.loader === "fabric", "Correctly identifies Fabric loader");
  assert(envFabric.loaderVersion === "0.15.7", "Extracts Fabric loader version (0.15.7)");

  // NeoForge
  const neoForgeLog = `
    Minecraft Version: 1.20.4
    NeoForge: 20.4.80-beta
  `;
  const envNeoForge = parseCrashEnvironment(neoForgeLog);
  assert(envNeoForge.loader === "neoforge", "Correctly identifies NeoForge loader");
  assert(envNeoForge.loaderVersion === "20.4.80-beta", "Extracts NeoForge version (20.4.80-beta)");

  // Quilt
  const quiltLog = `
    Minecraft Version: 1.20.1
    Quilt Loader 0.23.1
    org.quiltmc.loader.impl.launch.knot.KnotClient
  `;
  const envQuilt = parseCrashEnvironment(quiltLog);
  assert(envQuilt.loader === "quilt", "Correctly identifies Quilt loader");

  // ───────────────────────────────────────────────────────────────────────────
  // 3. PARSER: Stack Frame Extraction & Exception Extraction
  // ───────────────────────────────────────────────────────────────────────────
  console.log(`\n${colors.bold}3. Parser: Frame Normalization & Exception Chain${colors.reset}`);
  const stackSample = `
    java.lang.NullPointerException: Cannot invoke method
      at net.minecraft.client.Minecraft.run(Minecraft.java:650)
      at com.example.supermod.mixin.TitleScreenMixin.handler$init(TitleScreenMixin.java:34)
      at org.spongepowered.asm.mixin.transformer.MixinProcessor.applyMixins(MixinProcessor.java:363)
    Caused by: java.lang.RuntimeException: Supermod crashed
      at com.example.supermod.Init.load(Init.java:12)
  `;
  const frames = parseNormalizedStack(stackSample);
  assert(frames.length === 4, `Extracted ${frames.length} stack frames`);
  assert(frames[1].isMixin === true, "Identified mixin synthetic injection method");
  
  const exceptions = extractExceptionChain(stackSample);
  assert(exceptions.length >= 2, `Extracted ${exceptions.length} exception lines`);
  assert(exceptions.some(e => e.includes("NullPointerException")), "Captures top-level exception");
  assert(exceptions.some(e => e.includes("Caused by:")), "Captures causal exception chain");

  // ───────────────────────────────────────────────────────────────────────────
  // 4. CLASSIFIER: Deterministic Pattern Categories
  // ───────────────────────────────────────────────────────────────────────────
  console.log(`\n${colors.bold}4. Classifier: Crash Categorization${colors.reset}`);

  // Missing dependency
  const missingDepLog = "net.fabricmc.loader.api.EntrypointException: Mod 'create' requires version 1.2.0 of 'flywheel', which is missing!";
  const cMissing = classifyCrash(missingDepLog);
  assert(cMissing.category === "MISSING_DEPENDENCY", "Classifies missing mod dependency");
  assert(cMissing.candidateCulprits.length > 0, "Extracts candidate culprits in missing dependency");

  // Mixin failure
  const mixinFailLog = "org.spongepowered.asm.mixin.transformer.throwables.MixinTransformerError: An unexpected critical error was encountered";
  const cMixin = classifyCrash(mixinFailLog);
  assert(cMixin.category === "MIXIN_FAILURE", "Classifies mixin transformer failure");

  // Out of Memory
  const oomLog = "java.lang.OutOfMemoryError: Java heap space: failed to allocate memory";
  const cOom = classifyCrash(oomLog);
  assert(cOom.category === "OUT_OF_MEMORY", "Classifies Java OutOfMemoryError");

  // Java Incompatibility
  const javaIncompatLog = "has been compiled by a more recent version of the Java Runtime (class file version 65.0), this version only recognizes up to 61.0";
  const cJava = classifyCrash(javaIncompatLog);
  assert(cJava.category === "JAVA_INCOMPATIBILITY", "Classifies unsupported Java version bytecode");

  // ───────────────────────────────────────────────────────────────────────────
  // 5. SCORER & CORRELATOR: Bounded Confidence & Culprit Attribution
  // ───────────────────────────────────────────────────────────────────────────
  console.log(`\n${colors.bold}5. Scorer & Correlator: Confidence & Culprit Attribution${colors.reset}`);

  const evidence = [
    { code: "TEST_EV_1", weight: 90, description: "Direct mod crash signature" }
  ];
  const score = computeConfidenceScore("MISSING_DEPENDENCY", evidence, frames, "supermod");
  assert(score >= 20 && score <= 99, `Confidence score is strictly bounded [20, 99] (got ${score})`);

  // Out of memory should anchor high
  const oomScore = computeConfidenceScore("OUT_OF_MEMORY", evidence, []);
  assert(oomScore >= 95, `OOM produces deterministic high certainty (got ${oomScore})`);

  // Unknown runtime should score lowest
  const unknownScore = computeConfidenceScore("UNKNOWN_RUNTIME", [], []);
  assert(unknownScore <= 25, `Unknown runtime scores low confidence (got ${unknownScore})`);

  // Correlator
  const correlation = correlateCulprits(frames, ["supermod"]);
  assert(correlation.primaryCulprit === "supermod", `Identified primary culprit: ${correlation.primaryCulprit}`);
  assert(correlation.allSuspects.includes("supermod"), "Suspect list includes targeted mod");

  console.log(`\n${colors.green}${colors.bold}✓ All SAGE 2.0 unit tests passed successfully!${colors.reset}\n`);
}

run().catch(err => {
  fail("Unhandled exception in SAGE unit tests", err);
});
