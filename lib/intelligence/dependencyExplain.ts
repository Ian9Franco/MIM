import {
  generateWithModelGateway,
  type GatewayKeyOptions,
} from "./ai";
import {
  buildDependencyExplainContext,
  type DependencyInfo,
} from "./contextBuilder";
import type { BotPersonality } from "./modExplainer";
import {
  dependencyExplainModelSchema,
  type DependencyExplainModel,
} from "./schemas/dependencyExplainResponse";

export type DependencyExplainResult = {
  modId: string;
  explanation: string;
  structured: DependencyExplainModel | null;
  fallback: boolean;
  model: string;
  provider: string;
};

const JSON_OUTPUT_INSTRUCTION = `
Respondé EXCLUSIVAMENTE con un objeto JSON válido (sin markdown, sin texto extra) con esta forma:
{
  "summary": "string — resumen en 1-2 oraciones",
  "severity": "critical" | "warning" | "info",
  "actions": [
    { "type": "install" | "update" | "remove" | "review", "modId": "string", "modName": "string opcional", "label": "string accionable" }
  ]
}
Basate solo en las evidencias provistas. No inventes mods ni dependencias.`.trim();

export function appendJsonOutputInstruction(promptText: string): string {
  return `${promptText}\n\n${JSON_OUTPUT_INSTRUCTION}`;
}

export function extractJsonFromModelText(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    // fall through
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch {
      // fall through
    }
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
    } catch {
      return null;
    }
  }

  return null;
}

export function parseDependencyExplainResponse(raw: string): DependencyExplainModel | null {
  const candidate = extractJsonFromModelText(raw);
  const parsed = dependencyExplainModelSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

export function renderDependencyExplainMarkdown(
  structured: DependencyExplainModel,
  modName: string
): string {
  const severityLine = structured.severity
    ? `\n**Severidad:** ${structured.severity}`
    : "";

  const actions = structured.actions
    .map((action) => `- **${action.label}** (\`${action.modId}\` · ${action.type})`)
    .join("\n");

  return `### Dependencias de ${modName}
${structured.summary}${severityLine}

**Acciones recomendadas:**
${actions}`;
}

export function buildDeterministicDependencyExplain(
  modId: string,
  modName: string,
  deps: DependencyInfo[],
  personality: BotPersonality
): DependencyExplainModel {
  const missing = deps.filter((d) => d.status === "missing");
  const outdated = deps.filter((d) => d.status === "outdated");
  const incompatible = deps.filter((d) => d.status === "incompatible");

  const actions: DependencyExplainModel["actions"] = [];

  for (const dep of missing) {
    actions.push({
      type: "install",
      modId: dep.modId,
      modName: dep.name,
      label: `Instalar ${dep.name}${dep.requiredVersion ? ` (${dep.requiredVersion})` : ""}`,
    });
  }

  for (const dep of outdated) {
    actions.push({
      type: "update",
      modId: dep.modId,
      modName: dep.name,
      label: `Actualizar ${dep.name} de ${dep.currentVersion || "?"} a ${dep.requiredVersion || "la versión requerida"}`,
    });
  }

  for (const dep of incompatible) {
    actions.push({
      type: "review",
      modId: dep.modId,
      modName: dep.name,
      label: `Revisar conflicto con ${dep.name}${dep.requiredBy ? ` (requerido por ${dep.requiredBy})` : ""}`,
    });
  }

  if (actions.length === 0) {
    actions.push({
      type: "review",
      modId,
      modName,
      label: `Revisar el árbol de dependencias de ${modName}`,
    });
  }

  const severity: DependencyExplainModel["severity"] =
    incompatible.length > 0 || missing.length > 0
      ? "critical"
      : outdated.length > 0
        ? "warning"
        : "info";

  const summary =
    personality === "bully"
      ? `${modName} tiene ${missing.length} faltante(s), ${outdated.length} desactualizada(s) y ${incompatible.length} incompatible(s). Leé el manifest antes de volver a romper el cliente.`
      : `${modName}: ${missing.length} dependencia(s) faltante(s), ${outdated.length} desactualizada(s) y ${incompatible.length} incompatible(s) según el árbol analizado.`;

  return { summary, severity, actions };
}

export async function explainModDependencies(options: {
  modId: string;
  modName: string;
  dependencies: DependencyInfo[];
  loader?: string;
  mcVersion?: string;
  personality: BotPersonality;
  gatewayKeys: GatewayKeyOptions;
  signal?: AbortSignal;
}): Promise<DependencyExplainResult> {
  const ctx = buildDependencyExplainContext(
    options.modId,
    options.modName,
    options.dependencies,
    options.loader,
    options.mcVersion,
    options.personality
  );

  const promptText = appendJsonOutputInstruction(
    `${ctx.systemPrompt}\n\n${ctx.userPrompt}`
  );

  const fallbackStructured = buildDeterministicDependencyExplain(
    options.modId,
    options.modName,
    options.dependencies,
    options.personality
  );

  try {
    const result = await generateWithModelGateway({
      intent: "dependency-explain",
      messages: [{ role: "user", parts: [{ type: "text", text: promptText }] }],
      temperature: 0.3,
      maxOutputTokens: 600,
      signal: options.signal,
      ...options.gatewayKeys,
    });

    const structured = parseDependencyExplainResponse(result.text);
    if (structured) {
      return {
        modId: options.modId,
        explanation: renderDependencyExplainMarkdown(structured, options.modName),
        structured,
        fallback: false,
        model: result.model,
        provider: result.provider,
      };
    }

    console.warn("[dependencyExplain] Model output failed Zod validation; using deterministic fallback");
    return {
      modId: options.modId,
      explanation: renderDependencyExplainMarkdown(fallbackStructured, options.modName),
      structured: fallbackStructured,
      fallback: true,
      model: result.model,
      provider: result.provider,
    };
  } catch (err: unknown) {
    console.warn("[dependencyExplain] Gateway failed; using deterministic fallback:", err);
    return {
      modId: options.modId,
      explanation: renderDependencyExplainMarkdown(fallbackStructured, options.modName),
      structured: fallbackStructured,
      fallback: true,
      model: "local-deterministic-fallback",
      provider: "local",
    };
  }
}

/** @internal test helper */
export function validateDependencyExplainModel(value: unknown) {
  return dependencyExplainModelSchema.safeParse(value);
}
