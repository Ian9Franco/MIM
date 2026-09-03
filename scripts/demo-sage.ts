import { SageCrashEngine } from "../lib/intelligence/sage/engine";
import { SageExplainer } from "../lib/intelligence/sage/explainer";

const mockLog = `[Render thread/FATAL] [Minecraft/]: Error executing task on Client
org.spongepowered.asm.mixin.transformer.throwables.MixinTransformerError: An unexpected critical error was encountered
\tat org.spongepowered.asm.mixin.transformer.MixinProcessor.applyMixins(MixinProcessor.java:392)
Caused by: org.spongepowered.asm.mixin.injection.throwables.InjectionError: Critical injection failure: Callback method handler$zfa000$render in sodium.mixins.json:RenderMixin failed injection check
[main/INFO] Loaded mods: sodium 0.5.8, optifine HD_U_I6
Minecraft Version: 1.20.1
Fabric Loader: 0.15.11`;

const report = SageCrashEngine.diagnose(mockLog);
const synthesis = SageExplainer.synthesizeGroundedPlan(report);

console.log(JSON.stringify({
  category: report.category,
  culprit: report.culpritMod,
  confidence: report.confidence,
  kbMatches: synthesis.retrievedContext.map((r: any) => ({ title: r.article.title, score: r.relevanceScore })),
  groundingScore: synthesis.guardrails.groundingScore,
  actions: synthesis.guardrails.sanitizedActions.slice(0, 2)
}));
