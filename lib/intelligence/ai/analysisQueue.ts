/**
 * BOT-07 — Bounded analysis queue for batch LLM work (CI eval, mod explains).
 * Serializes per provider, honors quota backoff, and supports cancellation.
 */

import { AIProviderError, isAIProviderError } from "./errors";
import { createAIRequestSignal, waitForRetry } from "./requestLifecycle";
import { recordAiProviderRateLimit, recordAiProviderRequest } from "./quotaTracker";
import type { AIProviderId } from "./types";

export interface AnalysisQueueJob<T> {
  id: string;
  provider: AIProviderId;
  run: (signal: AbortSignal) => Promise<T>;
}

export interface AnalysisQueueOptions {
  /** Max in-flight jobs per provider (default 1 each). */
  concurrency?: Partial<Record<AIProviderId, number>>;
  /** Retries after provider quota / rate-limit signals (default 2). */
  maxRetries?: number;
  /** Cancels queued and in-flight work when aborted. */
  parentSignal?: AbortSignal;
  onJobStart?: (jobId: string, provider: AIProviderId) => void;
  onJobComplete?: (jobId: string, provider: AIProviderId) => void;
  onQuotaWait?: (provider: AIProviderId, waitMs: number, hint: string) => void;
}

export interface AnalysisQueueResult<T> {
  id: string;
  ok: boolean;
  value?: T;
  error?: string;
  cancelled?: boolean;
}

const DEFAULT_CONCURRENCY: Record<AIProviderId, number> = {
  gemini: 1,
  openrouter: 1,
};

function isQuotaLikeError(error: unknown): boolean {
  if (isAIProviderError(error)) {
    return error.code === "RATE_LIMITED" || error.status === 429;
  }
  const message = error instanceof Error ? error.message : String(error);
  return /rate limit|resource_exhausted|429|quota/i.test(message);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function waitForProviderPause(
  provider: AIProviderId,
  pausedUntil: Record<AIProviderId, number>,
  signal: AbortSignal | undefined,
  onQuotaWait?: AnalysisQueueOptions["onQuotaWait"]
): Promise<void> {
  while (true) {
    signal?.throwIfAborted();
    const waitMs = pausedUntil[provider] - Date.now();
    if (waitMs <= 0) return;
    onQuotaWait?.(provider, waitMs, "Esperando ventana de cuota del proveedor.");
    await waitForRetry(waitMs, createAIRequestSignal(signal, waitMs + 5_000));
  }
}

async function executeWithQuotaRetry<T>(
  provider: AIProviderId,
  run: (signal: AbortSignal) => Promise<T>,
  pausedUntil: Record<AIProviderId, number>,
  signal: AbortSignal | undefined,
  maxRetries: number,
  onQuotaWait?: AnalysisQueueOptions["onQuotaWait"]
): Promise<T> {
  let attempt = 0;
  while (true) {
    signal?.throwIfAborted();
    await waitForProviderPause(provider, pausedUntil, signal, onQuotaWait);
    recordAiProviderRequest(provider);
    try {
      return await run(createAIRequestSignal(signal));
    } catch (error: unknown) {
      if (!isQuotaLikeError(error) || attempt >= maxRetries) throw error;
      const classified = recordAiProviderRateLimit(provider, errorMessage(error));
      const waitMs = Math.max(250, (classified.retryAfterSeconds ?? 3) * 1000);
      pausedUntil[provider] = Date.now() + waitMs;
      onQuotaWait?.(provider, waitMs, classified.userHint);
      attempt += 1;
    }
  }
}

class ProviderSemaphore {
  constructor(private readonly limit: number) {}

  private active = 0;
  private readonly waiters: Array<{ resolve: () => void; reject: (reason?: unknown) => void }> = [];

  async acquire(signal?: AbortSignal): Promise<() => void> {
    if (signal?.aborted) throw signal.reason ?? new Error("Cancelled");

    if (this.active < this.limit) {
      this.active += 1;
      return () => this.release();
    }

    await new Promise<void>((resolve, reject) => {
      const waiter = { resolve, reject };
      this.waiters.push(waiter);

      const onAbort = () => {
        const index = this.waiters.indexOf(waiter);
        if (index >= 0) this.waiters.splice(index, 1);
        reject(signal?.reason ?? new Error("Cancelled"));
      };

      signal?.addEventListener("abort", onAbort, { once: true });
    });

    this.active += 1;
    return () => this.release();
  }

  private release(): void {
    this.active = Math.max(0, this.active - 1);
    const next = this.waiters.shift();
    next?.resolve();
  }
}

/** Runs batch LLM jobs with per-provider concurrency and quota-aware retries. */
export async function runAnalysisQueue<T>(
  jobs: AnalysisQueueJob<T>[],
  options: AnalysisQueueOptions = {}
): Promise<AnalysisQueueResult<T>[]> {
  if (jobs.length === 0) return [];

  const concurrency: Record<AIProviderId, number> = {
    ...DEFAULT_CONCURRENCY,
    ...options.concurrency,
  };
  const maxRetries = options.maxRetries ?? 2;
  const pausedUntil: Record<AIProviderId, number> = { gemini: 0, openrouter: 0 };
  const semaphores: Record<AIProviderId, ProviderSemaphore> = {
    gemini: new ProviderSemaphore(concurrency.gemini),
    openrouter: new ProviderSemaphore(concurrency.openrouter),
  };

  const runOne = async (job: AnalysisQueueJob<T>): Promise<AnalysisQueueResult<T>> => {
    if (options.parentSignal?.aborted) {
      return { id: job.id, ok: false, cancelled: true, error: "Cancelled" };
    }

    let release: (() => void) | undefined;
    try {
      release = await semaphores[job.provider].acquire(options.parentSignal);
      options.onJobStart?.(job.id, job.provider);
      const value = await executeWithQuotaRetry(
        job.provider,
        job.run,
        pausedUntil,
        options.parentSignal,
        maxRetries,
        options.onQuotaWait
      );
      options.onJobComplete?.(job.id, job.provider);
      return { id: job.id, ok: true, value };
    } catch (error: unknown) {
      if (options.parentSignal?.aborted) {
        return { id: job.id, ok: false, cancelled: true, error: "Cancelled" };
      }
      return { id: job.id, ok: false, error: errorMessage(error) };
    } finally {
      release?.();
    }
  };

  return Promise.all(jobs.map((job) => runOne(job)));
}
