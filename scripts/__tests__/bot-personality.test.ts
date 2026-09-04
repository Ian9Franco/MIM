/**
 * MIM-Bot Personality Engine Test Suite
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates prompt generation and heuristic local fallbacks for both
 * 'bully' (roast gamer) and 'standard' (neutral technical) personalities.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
  resolveBotPersonality,
  buildMultimodalPrompt,
  generateLocalFallbackExplanation,
  type ModExplainerInput,
} from "../../lib/intelligence/modExplainer";

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

export async function runBotPersonalityTests() {
  console.log(`\n${colors.bold}${colors.cyan}=== MIM-Bot Personality Engine Tests ===${colors.reset}`);

  // Test 1: Personality Resolver
  console.log(`\n${colors.cyan}[1. Personality Resolution Contract]${colors.reset}`);
  assert(resolveBotPersonality("bully") === "bully", "resolveBotPersonality('bully') resolves to 'bully'");
  assert(resolveBotPersonality("standard") === "standard", "resolveBotPersonality('standard') resolves to 'standard'");
  assert(resolveBotPersonality("unknown_value") === "bully", "resolveBotPersonality with invalid input defaults to 'bully'");
  assert(resolveBotPersonality(undefined) === "bully", "resolveBotPersonality(undefined) defaults to 'bully'");

  // Test 2: Multimodal Prompt Generation - Bully Mode
  console.log(`\n${colors.cyan}[2. Prompt Generation - Bully Mode]${colors.reset}`);
  const sampleMod: ModExplainerInput = {
    projectId: "jei",
    title: "Just Enough Items",
    author: "mezz",
    categories: ["Utility", "Information"],
    loaders: ["Forge", "Fabric", "NeoForge"],
    description: "View items and recipes directly in-game.",
    personality: "bully",
  };

  const bullyPrompt = buildMultimodalPrompt(sampleMod, 2);
  assert(bullyPrompt.includes("Sos un BULLY total"), "Bully prompt specifies aggressive bully persona");
  assert(bullyPrompt.includes("Tu tostadora"), "Bully prompt contains potato PC roasting section");
  assert(bullyPrompt.includes("100% REAL, EXACTA Y AL HUESO"), "Bully prompt enforces factual technical accuracy");
  assert(bullyPrompt.includes("EVIDENCIA VISUAL: Se adjuntan 2 captura(s)"), "Prompt includes gallery visual evidence");

  // Test 3: Multimodal Prompt Generation - Standard Mode
  console.log(`\n${colors.cyan}[3. Prompt Generation - Standard Mode]${colors.reset}`);
  const standardMod: ModExplainerInput = {
    ...sampleMod,
    personality: "standard",
  };

  const standardPrompt = buildMultimodalPrompt(standardMod, 2);
  assert(standardPrompt.includes("Modo Estándar / Profesional"), "Standard prompt specifies professional persona");
  assert(standardPrompt.includes("CERO INSULTOS, CERO ROAST"), "Standard prompt forbids insults and roast");
  assert(standardPrompt.includes("Propósito y Loaders"), "Standard prompt asks for objective Purpose & Loaders structure");
  assert(!standardPrompt.includes("Tu tostadora"), "Standard prompt does not contain roast slang");

  // Test 4: Local Fallback Generation - Bully Mode
  console.log(`\n${colors.cyan}[4. Local Fallback - Bully Mode]${colors.reset}`);
  const bullyFallback = generateLocalFallbackExplanation(sampleMod, 3, "bully");
  assert(bullyFallback.model === "mim-bot-offline-fallback", "Bully fallback sets model identifier");
  assert(bullyFallback.summaryMarkdown.includes("pedazo de manco"), "Bully fallback incorporates satirical gamer insult");
  assert(bullyFallback.summaryMarkdown.includes("Tu tostadora"), "Bully fallback includes toaster roast");
  assert(bullyFallback.imagesAnalyzed === 3, "Images count preserved in fallback result");

  // Test 5: Local Fallback Generation - Standard Mode
  console.log(`\n${colors.cyan}[5. Local Fallback - Standard Mode]${colors.reset}`);
  const standardFallback = generateLocalFallbackExplanation(standardMod, 1, "standard");
  assert(standardFallback.model === "mim-bot-offline-fallback-standard", "Standard fallback sets standard model identifier");
  assert(standardFallback.summaryMarkdown.includes("Resumen Técnico de MIM-Bot"), "Standard fallback includes technical summary header");
  assert(standardFallback.summaryMarkdown.includes("Propósito y Loaders"), "Standard fallback includes neutral purpose section");
  assert(!standardFallback.summaryMarkdown.includes("pedazo de manco"), "Standard fallback contains zero insults");

  console.log(`\n${colors.green}${colors.bold}✓ All MIM-Bot Personality Engine tests passed!${colors.reset}\n`);
}

if (require.main === module) {
  runBotPersonalityTests().catch((err) => {
    console.error("Test suite fatal error:", err);
    process.exit(1);
  });
}
