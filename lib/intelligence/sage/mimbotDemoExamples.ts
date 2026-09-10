/**
 * BOT-02 — Static preview before BYOK (no managed free backend).
 */

import type { MimbotQuickQuestionContext } from "./mimbotQuickQuestions";

export type MimbotDemoPreview = {
  headline: string;
  valueProps: string[];
  exampleQuestion: string;
  exampleAnswer: string;
};

const CATEGORY_DEMOS: Partial<
  Record<MimbotQuickQuestionContext["category"], Omit<MimbotDemoPreview, "headline">>
> = {
  Memoria: {
    valueProps: [
      "Interpreta el OutOfMemory con el contexto de tu pack y loader.",
      "Sugiere flags JVM concretos sin inventar culpables fuera del log.",
      "Enlaza mods y dependencias en FOMO para actuar en un clic.",
    ],
    exampleQuestion: "¿Qué flags JVM debería usar para este crash de memoria?",
    exampleAnswer:
      "El cliente se quedó sin heap asignado. Probá `-Xmx6G` si tenés RAM disponible, revisá shaders pesados y considerá [Sodium](fomo:sodium) antes de subir más memoria a ciegas.",
  },
  Dependencias: {
    valueProps: [
      "Cruza mods sospechosos con dependencias faltantes del diagnóstico SAGE.",
      "Propone un orden seguro de instalación o desactivación.",
      "Responde en tono técnico o Bully según tu preferencia.",
    ],
    exampleQuestion: "¿Qué dependencias faltan según este crash?",
    exampleAnswer:
      "El loader abortó porque falta una API compartida. Instalá [Cloth Config API](fomo:cloth-config) en la versión compatible con tu pack antes de reintentar.",
  },
  Conflictos: {
    valueProps: [
      "Explica choques entre mods con referencias verificables del reporte.",
      "Prioriza qué desactivar primero para aislar el conflicto.",
      "Mantiene el diagnóstico determinista de SAGE como fuente de verdad.",
    ],
    exampleQuestion: "¿Qué mod debo desactivar primero?",
    exampleAnswer:
      "Hay dos mods tocando el mismo pipeline de rendering. Desactivá el parche más reciente, reiniciá y confirmá si el mixin conflictivo desaparece del stack trace.",
  },
};

const DEFAULT_DEMO: Omit<MimbotDemoPreview, "headline"> = {
  valueProps: [
    "Responde preguntas de seguimiento sobre el crash que SAGE ya analizó.",
    "No inventa culpables: usa evidencia del log y del motor heurístico.",
    "Integra enlaces FOMO para mods, APIs y resource packs sugeridos.",
  ],
  exampleQuestion: "¿Qué causó este crash exactamente?",
  exampleAnswer:
    "SAGE ya identificó la categoría y mods sospechosos. MIM-Bot profundiza con pasos concretos, versiones compatibles y acciones de mitigación sin reemplazar el diagnóstico local.",
};

export function buildMimbotDemoPreview(
  analysis: MimbotQuickQuestionContext
): MimbotDemoPreview {
  const primaryMod = analysis.suspectedMods?.[0];
  const headline = primaryMod
    ? `Vista previa: MIM-Bot sobre el conflicto con ${primaryMod}`
    : "Vista previa: MIM-Bot sobre este incidente";

  const categoryDemo = CATEGORY_DEMOS[analysis.category] ?? DEFAULT_DEMO;

  return {
    headline,
    ...categoryDemo,
  };
}
