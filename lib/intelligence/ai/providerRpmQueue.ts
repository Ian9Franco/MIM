import type { AIProviderId } from "./types";
import { waitForRetry } from "./requestLifecycle";

export const GEMINI_RPM_LIMIT = 15;
export const RPM_WINDOW_MS = 60_000;

type Clock = () => number;
type WaitFn = (delayMs: number, signal: AbortSignal) => Promise<void>;

let nowFn: Clock = () => Date.now();
let waitFn: WaitFn = waitForRetry;
const stamps: Record<AIProviderId, number[]> = { gemini: [], openrouter: [] };
const chain: Record<AIProviderId, Promise<void>> = {
  gemini: Promise.resolve(),
  openrouter: Promise.resolve(),
};

export function resetProviderRpmQueueForTests(options?: {
  clock?: Clock;
  wait?: WaitFn;
}): void {
  nowFn = options?.clock ?? (() => Date.now());
  waitFn = options?.wait ?? waitForRetry;
  stamps.gemini = [];
  stamps.openrouter = [];
  chain.gemini = Promise.resolve();
  chain.openrouter = Promise.resolve();
}

function defaultLimit(provider: AIProviderId): number {
  return provider === "gemini" ? GEMINI_RPM_LIMIT : Number.POSITIVE_INFINITY;
}

function waitSignal(parent: AbortSignal | undefined, waitMs: number): AbortSignal {
  const cap = AbortSignal.timeout(Math.max(1, waitMs + 50));
  return parent ? AbortSignal.any([parent, cap]) : cap;
}

/**
 * Serializes provider work and waits until the sliding 60s window has a free slot.
 * Gemini free tier: 15 RPM. Other providers pass through unless a limit is set.
 */
export async function withProviderRpmLimit<T>(
  provider: AIProviderId,
  run: () => Promise<T>,
  options: { signal?: AbortSignal; limit?: number; windowMs?: number } = {}
): Promise<T> {
  const limit = options.limit ?? defaultLimit(provider);
  const windowMs = options.windowMs ?? RPM_WINDOW_MS;
  const signal = options.signal;

  const job = chain[provider].then(
    () => executeLimited(provider, run, { limit, windowMs, signal }),
    () => executeLimited(provider, run, { limit, windowMs, signal })
  );
  chain[provider] = job.then(
    () => undefined,
    () => undefined
  );
  return job;
}

async function executeLimited<T>(
  provider: AIProviderId,
  run: () => Promise<T>,
  options: { limit: number; windowMs: number; signal?: AbortSignal }
): Promise<T> {
  const { limit, windowMs, signal } = options;
  signal?.throwIfAborted();

  if (Number.isFinite(limit)) {
    while (true) {
      signal?.throwIfAborted();
      const now = nowFn();
      stamps[provider] = stamps[provider].filter((ts) => now - ts < windowMs);
      if (stamps[provider].length < limit) {
        stamps[provider].push(now);
        break;
      }
      const waitMs = Math.max(1, windowMs - (now - stamps[provider][0]) + 1);
      await waitFn(waitMs, waitSignal(signal, waitMs));
    }
  }

  return run();
}
