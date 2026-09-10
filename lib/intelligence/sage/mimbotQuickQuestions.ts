/**
 * BOT-03 / BOT-08 — Initial quick questions and contextual follow-up chips for SAGE MIM-Bot.
 */

import type { SageAnalysisResult } from "@/utils/sageAnalyzer";

export type MimbotChatMode = "bully" | "standard";

export type MimbotQuickQuestionContext = Pick<
  SageAnalysisResult,
  "category" | "exceptionType" | "suspectedMods" | "loader" | "gameVersion" | "explanation" | "solutions"
>;

export function normalizeMimbotQuestion(question: string): string {
  return question.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Four starter chips shown before the first message (BOT-08 scope). */
export function buildInitialQuickQuestions(analysis: MimbotQuickQuestionContext): string[] {
  const primaryMod = analysis.suspectedMods?.[0];

  return [
    primaryMod
      ? `¿Cómo resuelvo el conflicto con ${primaryMod}?`
      : "¿Qué causó este crash exactamente?",
    "¿Hay una versión actualizada o compatible disponible?",
    "¿Qué mod debo desactivar primero?",
    "¿Es un error de memoria o de dependencias?",
  ];
}

export function isCanonicalQuickQuestion(
  question: string,
  analysis: MimbotQuickQuestionContext
): boolean {
  const normalized = normalizeMimbotQuestion(question);
  return buildInitialQuickQuestions(analysis).some(
    (candidate) => normalizeMimbotQuestion(candidate) === normalized
  );
}

export type FollowUpSuggestionInput = {
  analysis: MimbotQuickQuestionContext;
  lastModelReply: string;
  askedQuestions: string[];
};

const FOMO_LINK_PATTERN = /\[([^\]]+)\]\(fomo:([^)]+)\)/g;

const CATEGORY_FOLLOW_UPS: Partial<
  Record<SageAnalysisResult["category"], string[]>
> = {
  Memoria: [
    "¿Qué flags JVM debería usar para evitar otro crash de memoria?",
    "¿Cuánta RAM debería asignar al perfil?",
  ],
  Dependencias: [
    "¿Qué dependencias faltan según el diagnóstico?",
    "¿Hay un orden seguro para instalar las libs requeridas?",
  ],
  Conflictos: [
    "¿Qué mods debería desactivar para aislar el conflicto?",
    "¿Existe una versión compatible de los mods en conflicto?",
  ],
  "Java/Sistema": [
    "¿Qué versión de Java necesito para este loader?",
    "¿Hay pasos del sistema operativo que deba revisar?",
  ],
  Programación: [
    "¿Qué mod o mixin parece ser el origen del stack trace?",
    "¿Conviene reportar el bug al autor del mod?",
  ],
};

/**
 * Returns up to two follow-up chips after the first exchange (BOT-03).
 * Deterministic — no extra LLM call.
 */
export function deriveFollowUpSuggestions(input: FollowUpSuggestionInput): string[] {
  const asked = new Set(input.askedQuestions.map(normalizeMimbotQuestion));
  const candidates: string[] = [];

  for (const match of input.lastModelReply.matchAll(FOMO_LINK_PATTERN)) {
    const modName = match[1]?.trim();
    if (modName) {
      candidates.push(`¿Cómo instalo o actualizo ${modName}?`);
    }
  }

  const categoryFollowUps = CATEGORY_FOLLOW_UPS[input.analysis.category] ?? [];
  candidates.push(...categoryFollowUps);

  if (input.analysis.suspectedMods?.length) {
    const mod = input.analysis.suspectedMods[0];
    candidates.push(`¿Qué hago primero con ${mod} para estabilizar el pack?`);
  }

  if (/memoria|heap|ram|outofmemory|oom/i.test(input.lastModelReply)) {
    candidates.push("¿Qué ajustes de memoria recomendás para este pack?");
  }

  if (/dependenc|library|api|requiere|falta/i.test(input.lastModelReply)) {
    candidates.push("¿Qué dependencias debería instalar antes de reintentar?");
  }

  if (/actualiz|versión|version|compatible/i.test(input.lastModelReply)) {
    candidates.push("¿Qué versiones debería alinear entre mods?");
  }

  candidates.push("¿Cuál sería el siguiente paso más seguro para probar?");

  const unique: string[] = [];
  for (const candidate of candidates) {
    const normalized = normalizeMimbotQuestion(candidate);
    if (asked.has(normalized)) continue;
    if (unique.some((item) => normalizeMimbotQuestion(item) === normalized)) continue;
    unique.push(candidate);
    if (unique.length >= 2) break;
  }

  return unique;
}
