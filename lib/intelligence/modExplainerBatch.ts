import { classifyModExplainIntent } from "./ai/intents";
import { runAnalysisQueue, type AnalysisQueueJob } from "./ai/analysisQueue";
import type { GatewayKeyOptions } from "./ai/modelGateway";
import { resolveGatewayKeys } from "./ai/modelGateway";
import {
  explainModWithGemini,
  type ModExplainerInput,
  type ModExplanationResult,
} from "./modExplainer";
import type { AIProviderId } from "./ai/types";

export interface ModBatchExplainItemResult {
  projectId: string;
  ok: boolean;
  result?: ModExplanationResult;
  error?: string;
  cancelled?: boolean;
}

export interface ModBatchExplainOptions {
  parentSignal?: AbortSignal;
  concurrency?: Partial<Record<AIProviderId, number>>;
  onProgress?: (completed: number, total: number, projectId: string) => void;
}

function resolveModExplainQueueProvider(
  input: ModExplainerInput,
  preferOpenRouter: boolean
): AIProviderId {
  const hasRichDescription = Boolean(input.description && input.description.trim().length > 25);
  const intent = classifyModExplainIntent({
    imageCount: input.galleryUrls?.length ?? 0,
    wantsSearchGrounding: !hasRichDescription,
  });
  if (intent === "mod-explain-multimodal") return "gemini";
  return preferOpenRouter ? "openrouter" : "gemini";
}

/** BOT-07 batch wrapper — explains multiple mods with quota-aware queueing. */
export async function explainModsInBatch(
  inputs: ModExplainerInput[],
  resolvedApiKey: string,
  gatewayKeys?: GatewayKeyOptions,
  options: ModBatchExplainOptions = {}
): Promise<ModBatchExplainItemResult[]> {
  if (inputs.length === 0) return [];

  const keys = gatewayKeys ?? {};
  const { hasOpenRouterKey } = resolveGatewayKeys(keys);
  let completed = 0;

  const jobs: AnalysisQueueJob<ModExplanationResult>[] = inputs.map((input) => ({
    id: input.projectId,
    provider: resolveModExplainQueueProvider(input, hasOpenRouterKey),
    run: (signal) => explainModWithGemini(input, resolvedApiKey, undefined, signal, keys),
  }));

  const queued = await runAnalysisQueue(jobs, {
    parentSignal: options.parentSignal,
    concurrency: options.concurrency,
    onJobComplete: (projectId) => {
      completed += 1;
      options.onProgress?.(completed, inputs.length, projectId);
    },
  });

  return queued.map((item) => ({
    projectId: item.id,
    ok: item.ok,
    result: item.value,
    error: item.error,
    cancelled: item.cancelled,
  }));
}
