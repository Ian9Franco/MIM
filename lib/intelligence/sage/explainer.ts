/**
 * SAGE 2.0 — Contextual Explanation & Grounding Layer (Deterministic-First)
 * ─────────────────────────────────────────────────────────────────────────────
 * Translates structured diagnostic reports into human-readable explanations.
 * Combines:
 * 1. Deterministic SAGE Engine Diagnostic Facts
 * 2. Curated Knowledge Base Context Matching
 * 3. Remediation Safety & Grounding Verification
 * 
 * Architectural Invariant:
 * "AI should explain evidence, not manufacture it."
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { StructuredCrashReport } from "./types";
import { SageRetriever, RetrievedContext } from "./retriever";
import { SageGuardrails, GuardrailValidationResult } from "./guardrails";

export interface LlmPromptPackage {
  systemPrompt: string;
  userPrompt: string;
  retrievedContext: RetrievedContext[];
}

export interface GroundedSynthesisResult {
  report: StructuredCrashReport;
  retrievedContext: RetrievedContext[];
  guardrails: GuardrailValidationResult;
  formattedMarkdown: string;
}

export class SageExplainer {
  /**
   * Generates a constrained, context-enriched prompt package for LLMs
   * (e.g. Gemini, OpenAI, Claude, local Ollama).
   */
  public static generateLlmPrompt(report: StructuredCrashReport): LlmPromptPackage {
    // 1. Retrieve relevant contextual articles from Knowledge Base
    const retrievedContext = SageRetriever.retrieve(report, 3);

    const systemPrompt = `You are the SAGE Crash Intelligence Assistant for Minecraft Intelligent Manager (MIM).
Your role is strictly educational, explanatory, and grounded in verified engineering facts.

CRITICAL INVARIANTS:
1. NEVER diagnose or guess a different root cause or culprit mod than the deterministic SAGE engine findings provided.
2. Rely ONLY on the provided diagnostic facts, evidence points, and the retrieved knowledge base articles.
3. Be concise, technically precise, and format step-by-step guidance in clear Spanish.
4. Do NOT hallucinate mod names or suggest ungrounded operations (e.g. disabling antivirus).`;

    const kbContextText = retrievedContext.length > 0
      ? retrievedContext.map(rc => 
          `### [${rc.article.id}] ${rc.article.title} (Relevance: ${(rc.relevanceScore * 100).toFixed(0)}%)
Analysis: ${rc.article.rootCauseAnalysis}
Verified Fixes:
${rc.article.verifiedRemediation.map(f => `- ${f}`).join("\n")}`
        ).join("\n\n")
      : "No matching prior knowledge base articles isolated.";

    const userPrompt = `A Minecraft crash has been analyzed by the deterministic SAGE Diagnostic Engine:

DIAGNOSTIC REPORT:
- Crash ID: ${report.id}
- Category: ${report.category}
- Root Cause: ${report.rootCause}
- Confidence: ${report.confidence}%
- Culprit Mod: ${report.culpritMod || "None identified directly"}
- Suspected Mods: ${report.suspectedMods.join(", ") || "None"}
- Loader: ${report.environment.loader} ${report.environment.loaderVersion || ""}
- Minecraft: ${report.environment.minecraftVersion || "Unknown"}
- Java: ${report.environment.javaVersion || "Unknown"}

EVIDENCE GATHERED:
${report.evidence.map(e => `• [${e.code}] (Weight: ${e.weight}%): ${e.description}`).join("\n")}

DETERMINISTIC ENGINE REMEDIATION ACTIONS:
${report.remediation.allActions.map(a => `• ${a.title}: ${a.instructions.join(" ")}`).join("\n")}

RETRIEVED KNOWLEDGE BASE CONTEXT (RAG):
${kbContextText}

Please explain this crash to the player in clear, friendly Spanish, explaining why the SAGE engine reached this conclusion, citing the retrieved context if applicable, and outlining exact steps to fix it.`;

    return { systemPrompt, userPrompt, retrievedContext };
  }

  /**
   * Generates a fully grounded, deterministic diagnostic synthesis with RAG context and guardrail checks.
   * Completely offline, requiring zero external API keys.
   */
  public static synthesizeGroundedPlan(report: StructuredCrashReport): GroundedSynthesisResult {
    const retrievedContext = SageRetriever.retrieve(report, 2);

    const evidenceBullets = report.evidence
      .map(e => `  • **[${e.code}]**: ${e.description}${e.snippet ? ` (\`${e.snippet.trim()}\`)` : ""}`)
      .join("\n");

    const deterministicSteps = report.remediation.allActions
      .flatMap(a => a.instructions.map(ins => `  1. ${ins}`));

    // Extract proposed actions
    const proposedActions = [...deterministicSteps];
    for (const rc of retrievedContext) {
      for (const fix of rc.article.verifiedRemediation) {
        proposedActions.push(`  1. [Verified KB Fix] ${fix}`);
      }
    }

    // Run Guardrails
    const guardrails = SageGuardrails.validate(
      report,
      retrievedContext,
      proposedActions,
      report.culpritMod
    );

    const isEs = report.locale === "es";

    const kbBlock = retrievedContext.length > 0
      ? `\n#### ${isEs ? "📚 Contexto de Conocimiento Recuperado (RAG):" : "📚 Retrieved Knowledge Context (RAG):"}
${retrievedContext.map(rc => `  • **${rc.article.title}** (${isEs ? "Relevancia" : "Relevance"}: ${(rc.relevanceScore * 100).toFixed(0)}%)\n    *${rc.article.rootCauseAnalysis}*`).join("\n")}\n`
      : "";

    const formattedMarkdown = isEs
      ? `### 🛡️ Reporte Diagnóstico SAGE

**Causa Raíz:** ${report.rootCause}  
**Categoría:** \`${report.category}\`  
**Nivel de Confianza:** **${report.confidence}%**  
**Culpable Probable:** \`${report.culpritMod || "No especificado"}\`  
**Entorno:** Minecraft \`${report.environment.minecraftVersion || "N/D"}\` (${report.environment.loader})
${kbBlock}
#### 📋 Registro de Evidencias:
${evidenceBullets || "  • No se aislaron patrones específicos."}

#### 🛠️ Remediación Recomendada:
${guardrails.sanitizedActions.join("\n") || "  1. Revisa latest.log en busca de anomalías."}

> *Puntuación de Fundamentación:* **${(guardrails.groundingScore * 100).toFixed(0)}%** (Protección Anti-Alucinación: ${guardrails.valid ? "SUPERADA" : "VIOLACIONES DETECTADAS"})
`
      : `### 🛡️ SAGE Diagnostic Report

**Root Cause:** ${report.rootCause}  
**Category:** \`${report.category}\`  
**Confidence:** **${report.confidence}%**  
**Likely Culprit:** \`${report.culpritMod || "Unspecified"}\`  
**Environment:** Minecraft \`${report.environment.minecraftVersion || "N/A"}\` (${report.environment.loader})
${kbBlock}
#### 📋 Evidence Trail:
${evidenceBullets || "  • No specific sub-patterns isolated."}

#### 🛠️ Recommended Remediation:
${guardrails.sanitizedActions.join("\n") || "  1. Review latest.log for anomalies."}

> *Grounded Lineage Score:* **${(guardrails.groundingScore * 100).toFixed(0)}%** (Anti-Hallucination Guardrail: ${guardrails.valid ? "PASSED" : "VIOLATIONS DETECTED"})
`;

    return {
      report,
      retrievedContext,
      guardrails,
      formattedMarkdown
    };
  }

  /**
   * Generates an offline, deterministic human-readable diagnosis report.
   */
  public static formatOfflineReport(report: StructuredCrashReport): string {
    return this.synthesizeGroundedPlan(report).formattedMarkdown;
  }
}
