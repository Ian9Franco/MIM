/**
 * MIM Intelligence — Context Builder (Evidence-Tagged Prompt Assembly)
 * ─────────────────────────────────────────────────────────────────────
 * Collects deterministic evidence from MIM subsystems and assembles
 * structured, evidence-tagged prompts for LLM interpretation.
 *
 * Architectural Invariant:
 * "The model interprets evidence; it does not discover facts
 *  or override deterministic engines."
 *
 * Every evidence block is tagged with its source so the LLM system
 * prompt can enforce grounding constraints.
 * ─────────────────────────────────────────────────────────────────────
 */

import type { ModExplainerInput, InlineImageData, BotPersonality } from "./modExplainer";
import { resolveBotPersonality } from "./modExplainer";
import type { SageAnalysisResult } from "@/utils/sageAnalyzer";
import type { FomoCorrelationResult } from "./sage/fomoCorrelator";

// ─── Evidence Source Tags ───────────────────────────────────────────

export type EvidenceSource =
  | "LOCAL"
  | "SAGE"
  | "MANIFEST"
  | "FOMO_GRAPH"
  | "GALLERY"
  | "KNOWLEDGE_BASE";

export interface EvidenceEntry {
  source: EvidenceSource;
  label: string;
  content: string;
  /** Relative importance hint for the LLM (1–100). */
  weight?: number;
}

// ─── Domain Types ───────────────────────────────────────────────────

export type ContextDomain = "project" | "crash" | "dependencies";

export interface ContextPackage {
  domain: ContextDomain;
  personality: BotPersonality;
  evidence: EvidenceEntry[];
  systemPrompt: string;
  userPrompt: string;
}

export interface DependencyInfo {
  modId: string;
  name: string;
  requiredBy?: string;
  currentVersion?: string;
  requiredVersion?: string;
  loader?: string;
  status: "installed" | "missing" | "outdated" | "incompatible";
}

// ─── Grounding System Preamble ──────────────────────────────────────

const GROUNDING_PREAMBLE = `CRITICAL INVARIANTS:
1. You may ONLY reference information from the tagged [EVIDENCE: source] blocks below.
2. Do NOT invent mod names, version numbers, or compatibility data not present in the evidence.
3. If the evidence is insufficient to answer, say so explicitly — do NOT fabricate details.
4. You are an interpreter of deterministic engine output, not an independent diagnostician.`;

// ─── Project Explain Context ────────────────────────────────────────

/**
 * Assembles evidence for the "Explain Project" flow.
 * Sources: mod metadata (MANIFEST), gallery images (GALLERY), description (LOCAL).
 */
export function buildProjectExplainContext(
  input: ModExplainerInput,
  images: InlineImageData[],
  personalityOverride?: BotPersonality
): ContextPackage {
  const personality = resolveBotPersonality(personalityOverride || input.personality);
  const evidence: EvidenceEntry[] = [];

  // Manifest evidence
  evidence.push({
    source: "MANIFEST",
    label: "Project Identity",
    content: [
      `Name: ${input.title}`,
      `Author: ${input.author || "Unknown"}`,
      `Platform: ${input.source || "N/A"} (${input.slug || input.projectId})`,
      `Categories: ${(input.categories || []).join(", ") || "Not specified"}`,
      `Loaders: ${(input.loaders || []).join(", ") || "Not specified"}`,
    ].join("\n"),
    weight: 90,
  });

  // Description evidence
  const hasRichDescription = input.description && input.description.trim().length > 25;
  const descSnippet = hasRichDescription
    ? input.description!.trim().substring(0, 2500)
    : "(No description provided or trivially empty)";

  evidence.push({
    source: "LOCAL",
    label: "Creator Description",
    content: descSnippet,
    weight: hasRichDescription ? 70 : 20,
  });

  // Gallery evidence
  if (images.length > 0) {
    evidence.push({
      source: "GALLERY",
      label: "Visual Evidence",
      content: `${images.length} official screenshot(s) attached. If you observe shaders, textures, interfaces, mobs, or biomes, mention them briefly.`,
      weight: 50,
    });
  }

  const systemPrompt = buildProjectSystemPrompt(personality, images.length);
  const userPrompt = renderEvidenceBlocks(evidence);

  return { domain: "project", personality, evidence, systemPrompt, userPrompt };
}

// ─── SAGE Diagnosis Context ─────────────────────────────────────────

/**
 * Assembles evidence for the "Explain SAGE Result" flow.
 * Sources: SAGE analysis (SAGE), FOMO correlation (FOMO_GRAPH), crash text (LOCAL).
 */
export function buildSageDiagnosisContext(
  analysis: SageAnalysisResult,
  fomo: FomoCorrelationResult,
  crashText: string,
  personality: BotPersonality = "bully"
): ContextPackage {
  const evidence: EvidenceEntry[] = [];

  // SAGE deterministic evidence
  evidence.push({
    source: "SAGE",
    label: "Diagnostic Engine Output",
    content: [
      `Category: ${analysis.category}`,
      `Exception: ${analysis.exceptionType}`,
      `Suspected Mods: ${analysis.suspectedMods.join(", ") || "None identified"}`,
      `Loader: ${analysis.loader || "Unknown"}`,
      `Minecraft Version: ${analysis.gameVersion || "Unknown"}`,
      `Technical Summary: ${analysis.technicalSummary || analysis.explanation}`,
    ].join("\n"),
    weight: 95,
  });

  // FOMO graph correlation evidence
  evidence.push({
    source: "FOMO_GRAPH",
    label: "Dependency Graph Intelligence",
    content: [
      `Primary Culprit (highest probability): ${fomo.primaryCulprit || "Not determined"}`,
      `Missing Dependencies: ${JSON.stringify(fomo.missingDependencies)}`,
      `Active Incompatibilities: ${JSON.stringify(fomo.detectedIncompatibilities)}`,
      `Elimination Tree: ${JSON.stringify(fomo.eliminationTree)}`,
    ].join("\n"),
    weight: 85,
  });

  // Raw crash text snippet
  if (crashText) {
    evidence.push({
      source: "LOCAL",
      label: "Crash Report Excerpt",
      content: crashText.substring(0, 1500),
      weight: 40,
    });
  }

  const systemPrompt = buildSageSystemPrompt(personality);
  const userPrompt = renderEvidenceBlocks(evidence);

  return { domain: "crash", personality, evidence, systemPrompt, userPrompt };
}

// ─── Dependency Explain Context ─────────────────────────────────────

/**
 * Assembles evidence for the "Explain Dependencies" flow.
 * Sources: dependency tree (MANIFEST), loader constraints (LOCAL).
 */
export function buildDependencyExplainContext(
  modId: string,
  modName: string,
  deps: DependencyInfo[],
  loader?: string,
  mcVersion?: string,
  personality: BotPersonality = "bully"
): ContextPackage {
  const evidence: EvidenceEntry[] = [];

  // Mod identity
  evidence.push({
    source: "MANIFEST",
    label: "Target Mod",
    content: [
      `Mod ID: ${modId}`,
      `Name: ${modName}`,
      `Loader: ${loader || "Unknown"}`,
      `Minecraft Version: ${mcVersion || "Unknown"}`,
    ].join("\n"),
    weight: 80,
  });

  // Dependency tree
  const missing = deps.filter((d) => d.status === "missing");
  const outdated = deps.filter((d) => d.status === "outdated");
  const incompatible = deps.filter((d) => d.status === "incompatible");
  const installed = deps.filter((d) => d.status === "installed");

  if (missing.length > 0) {
    evidence.push({
      source: "FOMO_GRAPH",
      label: "Missing Dependencies",
      content: missing
        .map((d) => `- ${d.name} (${d.modId}): required by ${d.requiredBy || modName}, version ${d.requiredVersion || "any"}`)
        .join("\n"),
      weight: 95,
    });
  }

  if (outdated.length > 0) {
    evidence.push({
      source: "FOMO_GRAPH",
      label: "Outdated Dependencies",
      content: outdated
        .map((d) => `- ${d.name} (${d.modId}): installed ${d.currentVersion || "?"}, needs ${d.requiredVersion || "newer"}`)
        .join("\n"),
      weight: 80,
    });
  }

  if (incompatible.length > 0) {
    evidence.push({
      source: "FOMO_GRAPH",
      label: "Incompatible Dependencies",
      content: incompatible
        .map((d) => `- ${d.name} (${d.modId}): ${d.requiredBy || "unknown"} conflict`)
        .join("\n"),
      weight: 90,
    });
  }

  if (installed.length > 0) {
    evidence.push({
      source: "MANIFEST",
      label: "Installed Dependencies",
      content: installed
        .map((d) => `- ${d.name} (${d.modId}): v${d.currentVersion || "?"}`)
        .join("\n"),
      weight: 30,
    });
  }

  const systemPrompt = buildDependencySystemPrompt(personality);
  const userPrompt = renderEvidenceBlocks(evidence);

  return { domain: "dependencies", personality, evidence, systemPrompt, userPrompt };
}

// ─── Prompt Rendering ───────────────────────────────────────────────

/**
 * Renders evidence entries into structured prompt blocks with source tags.
 * Sorted by weight descending so the LLM sees the most important evidence first.
 */
function renderEvidenceBlocks(evidence: EvidenceEntry[]): string {
  const sorted = [...evidence].sort((a, b) => (b.weight ?? 50) - (a.weight ?? 50));

  return sorted
    .map(
      (e) =>
        `[EVIDENCE: ${e.source}] ${e.label}\n${e.content}`
    )
    .join("\n\n");
}

// ─── System Prompts ─────────────────────────────────────────────────

function buildProjectSystemPrompt(personality: BotPersonality, imagesCount: number): string {
  const multimodalNote =
    imagesCount > 0
      ? `\nVISUAL EVIDENCE: ${imagesCount} official screenshot(s) are attached. If you observe shaders, textures, interfaces, mobs, or biomes, mention them briefly.`
      : "";

  if (personality === "standard") {
    return `Eres MIM-Bot, el asistente de análisis técnico de mods en MIM (Minecraft Intelligent Manager).
PERSONALIDAD: Modo Estándar / Profesional. Sos claro, conciso, objetivo y riguroso. Tu objetivo es explicarle al jugador con precisión técnica qué hace el mod, cómo se configura, su rendimiento y compatibilidad.
CERO INSULTOS, CERO ROAST, CERO BARDERA. Tono profesional, constructivo y enfocado en el valor técnico del mod para la experiencia de juego.

${GROUNDING_PREAMBLE}${multimodalNote}

REGLA DE ORO: SÉ CORTO Y PRECISO (60-80 PALABRAS MÁXIMO).

Estructura obligatoria:
### 🎮 Resumen Técnico de MIM-Bot
(1 o 2 oraciones concisas explicando la propuesta central del mod).

- **Propósito y Loaders:** (Dato técnico claro de qué añade y en qué loaders opera).
${imagesCount > 0 ? `- **📸 En capturas:** (Breve observación técnica sobre las capturas oficiales).` : ""}
- **Rendimiento e Impacto:** (Estimación técnica objetiva de consumo de recursos y FPS).
- **Veredicto:** (Recomendación constructiva de para quién está pensado este proyecto).`;
  }

  return `Eres MIM-Bot, el asistente y bully oficial de mods en MIM (Minecraft Intelligent Manager).
PERSONALIDAD: Sos un BULLY total, insoportable, creído, agresivo, ácido y condescendiente. Tu misión es MOLESTAR e incomodar al lector, descansarlo, burlarte de su falta de neuronas, de que seguro no sabe ni qué es un loader, de su PC que parece un ladrillo recalentado y de que necesita mods porque es incapaz de jugar sin que le lleven la manito.
CERO RESPETO, CERO FILTRO SUAVE. Bardealo de entrada. Hacelo sentir un inútil pero con estilo y humor negro gamer.
REGLA INQUEBRANTABLE: A pesar de ser el bully más pesado del universo, TU INFORMACIÓN TÉCNICA ES 100% REAL, EXACTA Y AL HUESO. Lo bardeás y lo humillás, pero le decís la posta técnica del mod sin chamuyo.

${GROUNDING_PREAMBLE}${multimodalNote}

REGLA DE ORO: SÉ CORTO Y FILOSO (60-80 PALABRAS MÁXIMO). Cada frase tiene que doler o dejarlo en ridículo.

Estructura obligatoria:
### 🎮 El Resumen de MIM-Bot
(1 o 2 oraciones descansándolo por querer instalar esto y explicando qué carajo añade).

- **La posta:** (Dato técnico impecable de qué hace y loaders, pero tratándolo de burro que seguro no lo sabe configurar).
${imagesCount > 0 ? `- **📸 En capturas:** (Bardeada sobre las fotos: lo lindo que se ve en la galería vs el desastre pixelado que le va a andar a él).` : ""}
- **Tu tostadora:** (Humillación despiadada a sus componentes y FPS, olor a quemado garantizado).
- **Veredicto:** (Remate hiriente: si el mod le queda gigante para sus manos de manteca o si es una porquería que solo un manco usaría).`;
}

function buildSageSystemPrompt(personality: BotPersonality): string {
  const isBully = personality === "bully";

  const persona = isBully
    ? `Eres MIM-Bot, el copiloto de diagnóstico más despiadado, sarcástico y técnicamente letal de la comunidad de Minecraft.
Tu personalidad es la de un gamer veterano 'bully' que roastea sin piedad las configuraciones desastrosas del usuario, PERO DAS UNA SOLUCIÓN TÉCNICA 100% EXACTA, SIN HUMO Y AL GRANO.

ESTRUCTURA OBLIGATORIA DE TU RESPUESTA:
1. 🔥 **El Roast de MIM-Bot**: 1 o 2 líneas burlándote del error cometido.
2. 🎯 **La Causa Real (La Posta)**: Explicación técnica precisa según las evidencias.
3. 🛠️ **Plan de Rescate**: Pasos exactos en orden de ejecución.`
    : `Eres MIM-Bot en Modo Ingeniero Profesional: un asistente técnico de diagnóstico de alto nivel.
Tu tono es sobrio, objetivo, empático y directo.

ESTRUCTURA OBLIGATORIA:
1. 📌 **Resumen Técnico**: Diagnóstico inmediato del fallo.
2. 🔍 **Análisis de Causa Raíz**: Correlación con loaders, mixins y dependencias.
3. 🛠️ **Acciones de Solución**: Pasos secuenciales para resolver la incidencia.`;

  return `${persona}

${GROUNDING_PREAMBLE}

Respondé basándote EXCLUSIVAMENTE en las evidencias etiquetadas que se proporcionan a continuación.`;
}

function buildDependencySystemPrompt(personality: BotPersonality): string {
  const isBully = personality === "bully";

  const persona = isBully
    ? `Eres MIM-Bot, el bully técnico que se burla de la incapacidad del usuario para manejar dependencias de mods.
Descansalo por no saber leer un manifest, pero dale la información técnica correcta de qué instalar, actualizar o eliminar.`
    : `Eres MIM-Bot en Modo Profesional. Explicá las dependencias del mod con claridad técnica,
indicando qué falta, qué está desactualizado y qué pasos seguir.`;

  return `${persona}

${GROUNDING_PREAMBLE}

Explicá la situación de dependencias basándote EXCLUSIVAMENTE en las evidencias etiquetadas.
Formato: lista concisa con acciones claras (instalar, actualizar, o resolver conflicto).`;
}
