/**
 * SAGE 2.0 — Knowledge Context Matcher & Safety Validator Test Harness
 * ─────────────────────────────────────────────────────────────────────────────
 * Verifies heuristic retrieval from the compatibility knowledge base,
 * remediation safety validation (destructive commands & mod attribution),
 * and grounded remediation synthesis.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { SageCrashEngine } from "../../lib/intelligence/sage/engine";
import { SageExplainer } from "../../lib/intelligence/sage/explainer";
import { SageRetriever } from "../../lib/intelligence/sage/retriever";
import { SageGuardrails } from "../../lib/intelligence/sage/guardrails";

function runRagVerification() {
  console.log(`\n===============================================================`);
  console.log(`🧠 SAGE 2.0 KNOWLEDGE BASE MATCHING & SAFETY VALIDATION`);
  console.log(`===============================================================\n`);

  // Test Case 1: Sodium & OptiFine Rendering Conflict
  console.log(`[Test 1] Verifying Knowledge Base Matching on Mod Conflict...`);
  const mockLog1 = `[Render thread/FATAL] [Minecraft/]: Error executing task on Client
org.spongepowered.asm.mixin.transformer.throwables.MixinTransformerError: An unexpected critical error was encountered
\tat org.spongepowered.asm.mixin.transformer.MixinProcessor.applyMixins(MixinProcessor.java:392)
Caused by: org.spongepowered.asm.mixin.injection.throwables.InjectionError: Critical injection failure: Callback method handler$zfa000$render in sodium.mixins.json:RenderMixin failed injection check
[main/INFO] Loaded mods: sodium 0.5.8, optifine HD_U_I6
Minecraft Version: 1.20.1
Fabric Loader: 0.15.11`;

  const report1 = SageCrashEngine.diagnose(mockLog1);
  const retrieved1 = SageRetriever.retrieve(report1, 2);

  console.log(`  • Diagnosed Culprit: ${report1.culpritMod}`);
  console.log(`  • Diagnosed Category: ${report1.category}`);
  console.log(`  • Retrieved KB Articles: ${retrieved1.length}`);
  for (const r of retrieved1) {
    console.log(`    - [${(r.relevanceScore * 100).toFixed(0)}%] ${r.article.title} (Signals: ${r.matchedSignals.join(", ")})`);
  }

  if (retrieved1.length === 0 || !retrieved1.some(r => r.article.affectedMods.includes("sodium"))) {
    throw new Error("Test 1 Failed: Sodium KB article was not retrieved!");
  }
  console.log(`  ✓ Retrieval accuracy verified on Sodium/OptiFine conflict.`);

  // Test Case 2: Safety Validator: Attribution & Dangerous Commands
  console.log(`\n[Test 2] Verifying Safety Validator: Attribution & Dangerous Commands...`);
  const hallucinatedActions = [
    "Disable Windows Defender real-time protection to allow jar execution.",
    "Install the official Sodium release build.",
    "Remove OptiFine to prevent Mixin injection collision."
  ];

  const guardrailResult = SageGuardrails.validate(
    report1,
    retrieved1,
    hallucinatedActions,
    "completely_made_up_mod_name" // Contradictory culprit
  );

  console.log(`  • Safety Grounding Score: ${(guardrailResult.groundingScore * 100).toFixed(0)}%`);
  console.log(`  • Safety Violations Caught: ${guardrailResult.violations.length}`);
  for (const v of guardrailResult.violations) {
    console.log(`    - 🚨 ${v}`);
  }

  if (guardrailResult.valid) {
    throw new Error("Test 2 Failed: Safety validator failed to catch forbidden action and contradictory culprit!");
  }
  console.log(`  ✓ Security violation and attribution trap successfully triggered.`);

  // Test Case 3: Grounded Synthesis Generation
  console.log(`\n[Test 3] Verifying Grounded Synthesis Pipeline...`);
  const synthesis = SageExplainer.synthesizeGroundedPlan(report1);
  console.log(`  • Synthesis Report ID: ${synthesis.report.id}`);
  console.log(`  • Grounding Score: ${(synthesis.guardrails.groundingScore * 100).toFixed(0)}%`);
  console.log(`  • Formatted Markdown Length: ${synthesis.formattedMarkdown.length} chars`);
  console.log(`  ✓ Grounded synthesis completed successfully.`);

  console.log(`\n===============================================================`);
  console.log(`🎉 ALL SAGE KNOWLEDGE MATCHING & SAFETY VALIDATIONS PASSED!`);
  console.log(`===============================================================\n`);
}

runRagVerification();
