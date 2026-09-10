import assert from "node:assert/strict";
import {
  buildProjectExplainContext,
  buildSageDiagnosisContext,
  buildDependencyExplainContext,
  type DependencyInfo,
} from "../../lib/intelligence/contextBuilder";
import type { SageAnalysisResult } from "../../utils/sageAnalyzer";
import type { FomoCorrelationResult } from "../../lib/intelligence/sage/fomoCorrelator";

function runTests() {
  console.log("Running Context Builder tests...");

  // 1. buildProjectExplainContext
  {
    const baseInput = {
      projectId: "test-mod-123",
      title: "Sodium",
      author: "jellysquid3",
      slug: "sodium",
      description: "A modern rendering engine for Minecraft that drastically improves frame rates and fixes graphical issues.",
      source: "modrinth",
      categories: ["optimization", "rendering"],
      loaders: ["fabric", "quilt"],
      galleryUrls: [],
    };

    // produces evidence blocks with correct source tags
    const ctx = buildProjectExplainContext(baseInput, []);
    assert.equal(ctx.domain, "project");
    assert.ok(ctx.userPrompt.includes("[EVIDENCE: MANIFEST]"));
    assert.ok(ctx.userPrompt.includes("[EVIDENCE: LOCAL]"));
    assert.ok(ctx.userPrompt.includes("Sodium"));
    assert.ok(ctx.userPrompt.includes("jellysquid3"));

    // includes grounding invariants
    assert.ok(ctx.systemPrompt.includes("CRITICAL INVARIANTS"));
    assert.ok(ctx.systemPrompt.includes("ONLY reference information from the tagged"));

    // gallery evidence
    const images = [{ mimeType: "image/png", data: "base64data" }];
    const ctxGallery = buildProjectExplainContext(baseInput, images);
    assert.ok(ctxGallery.userPrompt.includes("[EVIDENCE: GALLERY]"));
    assert.ok(ctxGallery.userPrompt.includes("1 official screenshot"));

    // personality
    const ctxStd = buildProjectExplainContext(baseInput, [], "standard");
    assert.equal(ctxStd.personality, "standard");
    assert.ok(ctxStd.systemPrompt.includes("Modo Estándar"));
    assert.ok(!ctxStd.systemPrompt.includes("BULLY"));

    const ctxBully = buildProjectExplainContext(baseInput, []);
    assert.equal(ctxBully.personality, "bully");
    assert.ok(ctxBully.systemPrompt.includes("BULLY"));

    // weight sorting
    const manifestIdx = ctx.userPrompt.indexOf("[EVIDENCE: MANIFEST]");
    const localIdx = ctx.userPrompt.indexOf("[EVIDENCE: LOCAL]");
    assert.ok(manifestIdx < localIdx, "MANIFEST weight should come before LOCAL weight");
  }

  // 2. buildSageDiagnosisContext
  {
    const analysis: SageAnalysisResult = {
      success: true,
      title: "Missing Dependency: Flywheel",
      category: "Dependencias",
      exceptionType: "NoClassDefFoundError",
      suspectedMods: ["create", "flywheel"],
      loader: "forge",
      gameVersion: "1.20.1",
      explanation: "Missing required library flywheel for Create mod",
      technicalSummary: "NoClassDefFoundError in Create mod initialization",
      severity: "critical",
      confidence: 95,
      solutions: ["Install Flywheel library", "Update Create to latest version"],
      rawStats: { linesParsed: 100, hasStackTrace: true, hasModList: true },
      timestamp: new Date().toISOString(),
    } as SageAnalysisResult;

    const fomo: FomoCorrelationResult = {
      primaryCulprit: "create",
      eliminationTree: [],
      missingDependencies: [{ modId: "create", requiredMod: "flywheel", name: "Create" }],
      detectedIncompatibilities: [],
      suggestedAction: "install_dep",
    };

    const ctx = buildSageDiagnosisContext(analysis, fomo, "crash text here");
    assert.equal(ctx.domain, "crash");
    assert.ok(ctx.userPrompt.includes("[EVIDENCE: SAGE]"));
    assert.ok(ctx.userPrompt.includes("[EVIDENCE: FOMO_GRAPH]"));
    assert.ok(ctx.userPrompt.includes("[EVIDENCE: LOCAL]"));

    const ctxCrash = buildSageDiagnosisContext(analysis, fomo, "java.lang.NoClassDefFoundError");
    assert.ok(ctxCrash.userPrompt.includes("NoClassDefFoundError"));
    assert.ok(ctxCrash.userPrompt.includes("create"));
    assert.ok(ctxCrash.userPrompt.includes("flywheel"));

    const ctxInv = buildSageDiagnosisContext(analysis, fomo, "");
    assert.ok(ctxInv.systemPrompt.includes("CRITICAL INVARIANTS"));
    assert.ok(ctxInv.systemPrompt.includes("EXCLUSIVAMENTE en las evidencias etiquetadas"));
  }

  // 3. buildDependencyExplainContext
  {
    const deps: DependencyInfo[] = [
      { modId: "flywheel", name: "Flywheel", requiredBy: "create", status: "missing", requiredVersion: "0.6.8" },
      { modId: "cloth-config", name: "Cloth Config", status: "installed", currentVersion: "11.0.99" },
      { modId: "architectury", name: "Architectury API", status: "outdated", currentVersion: "9.0.1", requiredVersion: "9.1.0" },
    ];

    const ctx = buildDependencyExplainContext("create", "Create", deps, "forge", "1.20.1");
    assert.equal(ctx.domain, "dependencies");
    assert.ok(ctx.userPrompt.includes("[EVIDENCE: FOMO_GRAPH] Missing Dependencies"));
    assert.ok(ctx.userPrompt.includes("[EVIDENCE: FOMO_GRAPH] Outdated Dependencies"));
    assert.ok(ctx.userPrompt.includes("[EVIDENCE: MANIFEST] Installed Dependencies"));
    assert.ok(ctx.userPrompt.includes("Mod ID: create"));
    assert.ok(ctx.userPrompt.includes("Name: Create"));

    const missingIdx = ctx.userPrompt.indexOf("Missing Dependencies");
    const installedIdx = ctx.userPrompt.indexOf("Installed Dependencies");
    assert.ok(missingIdx < installedIdx, "Missing dependencies should be weighted above installed");
  }

  console.log("All Context Builder unit tests passed successfully!");
}

runTests();

