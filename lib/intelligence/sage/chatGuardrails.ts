import { z } from "zod";
import { containsForbiddenRemediation } from "./guardrails";
import type { SageCrashContext } from "./sageChatEngine";

const evidenceRefSchema = z.enum([
  "category",
  "exceptionType",
  "suspectedMods",
  "loader",
  "gameVersion",
  "diagnosis",
]);

const completionSchema = z.object({
  answer: z.string().trim().min(1).max(10_000),
  evidenceRefs: z.array(evidenceRefSchema).max(6),
  culpritClaims: z.array(z.string().trim().min(1).max(160)).max(12),
  actions: z.array(z.string().trim().min(1).max(1_000)).max(20),
}).strict();

export type SageChatEvidenceRef = z.infer<typeof evidenceRefSchema>;

export type SageChatGuardrailViolation =
  | "INVALID_COMPLETION_CONTRACT"
  | "UNAVAILABLE_EVIDENCE"
  | "MISSING_EVIDENCE"
  | "UNSUPPORTED_ATTRIBUTION"
  | "UNSAFE_REMEDIATION"
  | "POLICY_OVERRIDE";

export type SageChatGuardrailResult = {
  status: "passed" | "blocked";
  text: string;
  violations: SageChatGuardrailViolation[];
};

const POLICY_OVERRIDE_PATTERNS = [
  /ignore (?:all |any )?(?:previous|prior|system|developer) instructions?/i,
  /reveal (?:the )?(?:system|developer) prompt/i,
  /bypass (?:the )?(?:guardrails?|safety|policy)/i,
  /ignor(?:a|á) (?:todas? )?(?:las )?instrucciones (?:anteriores|del sistema)/i,
  /revel(?:a|á) (?:el )?prompt (?:del sistema|interno)/i,
  /salt(?:a|á|e) (?:las? )?(?:protecciones|políticas|reglas de seguridad)/i,
];

function normalizeIdentifier(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function extractExplicitAttributions(answer: string): string[] {
  const patterns = [
    /(?:culprit|culpable|responsable)(?:\s+(?:is|es))?\s*[:=-]?\s*[`*[\s]*([a-z0-9_.-]+)/gi,
    /(?:caused by|causado por|lo causa)\s*[`*[\s]*([a-z0-9_.-]+)/gi,
    /([a-z0-9_.-]+)\s+(?:is|es)\s+(?:the\s+|el\s+)?(?:culprit|culpable|responsable)/gi,
  ];

  return patterns.flatMap(pattern =>
    [...answer.matchAll(pattern)].map(match => match[1]).filter(Boolean),
  );
}

function parseCompletion(rawText: string): z.infer<typeof completionSchema> | null {
  const trimmed = rawText.trim();
  const jsonText = trimmed.startsWith("```")
    ? trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
    : trimmed;

  try {
    const parsed: unknown = JSON.parse(jsonText);
    const result = completionSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function availableSageChatEvidence(
  context?: SageCrashContext,
): Set<SageChatEvidenceRef> {
  const available = new Set<SageChatEvidenceRef>();
  if (context?.category?.trim()) available.add("category");
  if (context?.exceptionType?.trim()) available.add("exceptionType");
  if (context?.suspectedMods?.some(mod => mod.trim())) available.add("suspectedMods");
  if (context?.loader?.trim()) available.add("loader");
  if (context?.gameVersion?.trim()) available.add("gameVersion");
  if (context?.explanation?.trim() || context?.stackTraceSnippet?.trim()) {
    available.add("diagnosis");
  }
  return available;
}

export function buildSageChatSafetyFallback(context?: SageCrashContext): string {
  const category = context?.category?.trim();
  const suspects = context?.suspectedMods?.map(mod => mod.trim()).filter(Boolean) ?? [];
  const facts = [
    category ? `Categoría verificada: ${category}.` : "",
    suspects.length > 0 ? `Sospechosos del diagnóstico local: ${suspects.join(", ")}.` : "",
  ].filter(Boolean).join(" ");

  return [
    "No pude validar la respuesta del proveedor contra la evidencia local de SAGE, así que no la mostraré.",
    facts,
    "Revisá el diagnóstico determinístico antes de aplicar cambios y no ejecutes comandos que desactiven protecciones del sistema.",
  ].filter(Boolean).join(" ");
}

export function validateSageChatCompletion(
  rawText: string,
  context?: SageCrashContext,
): SageChatGuardrailResult {
  const completion = parseCompletion(rawText);
  if (!completion) {
    return {
      status: "blocked",
      text: buildSageChatSafetyFallback(context),
      violations: ["INVALID_COMPLETION_CONTRACT"],
    };
  }

  const violations = new Set<SageChatGuardrailViolation>();
  const availableEvidence = availableSageChatEvidence(context);
  const referencedEvidence = completion.evidenceRefs.filter(ref => availableEvidence.has(ref));

  if (referencedEvidence.length !== completion.evidenceRefs.length) {
    violations.add("UNAVAILABLE_EVIDENCE");
  }
  const explicitAttributions = extractExplicitAttributions(completion.answer);
  const attributionCandidates = [...completion.culpritClaims, ...explicitAttributions];
  if (availableEvidence.size > 0 && referencedEvidence.length === 0) {
    violations.add("MISSING_EVIDENCE");
  }

  const allowedCulprits = new Set(
    (context?.suspectedMods ?? []).map(normalizeIdentifier).filter(Boolean),
  );
  if (attributionCandidates.some(claim => !allowedCulprits.has(normalizeIdentifier(claim)))) {
    violations.add("UNSUPPORTED_ATTRIBUTION");
  }

  const safetyText = [completion.answer, ...completion.actions].join("\n");
  if (containsForbiddenRemediation(safetyText)) {
    violations.add("UNSAFE_REMEDIATION");
  }
  if (POLICY_OVERRIDE_PATTERNS.some(pattern => pattern.test(safetyText))) {
    violations.add("POLICY_OVERRIDE");
  }

  if (violations.size > 0) {
    return {
      status: "blocked",
      text: buildSageChatSafetyFallback(context),
      violations: [...violations],
    };
  }

  return { status: "passed", text: completion.answer, violations: [] };
}
