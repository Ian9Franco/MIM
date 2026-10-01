import type { DownloadPlatform } from "./downloadTypes";

const MIN_GAP_MS: Record<DownloadPlatform, number> = {
  modrinth: 125,
  curseforge: 500,
};

const MAX_BACKOFF_MULTIPLIER = 8;

type QueueEntry = {
  run: () => Promise<Response>;
  resolve: (value: Response) => void;
  reject: (reason?: unknown) => void;
};

const queues: Record<DownloadPlatform, QueueEntry[]> = {
  modrinth: [],
  curseforge: [],
};

const processing: Record<DownloadPlatform, boolean> = {
  modrinth: false,
  curseforge: false,
};

const lastRunAt: Record<DownloadPlatform, number> = {
  modrinth: 0,
  curseforge: 0,
};

const backoffMultiplier: Record<DownloadPlatform, number> = {
  modrinth: 1,
  curseforge: 1,
};

function effectiveGap(platform: DownloadPlatform): number {
  return MIN_GAP_MS[platform] * backoffMultiplier[platform];
}

export function noteThrottleRateLimit(platform: DownloadPlatform): void {
  backoffMultiplier[platform] = Math.min(MAX_BACKOFF_MULTIPLIER, backoffMultiplier[platform] * 2);
}

export function noteThrottleSuccess(platform: DownloadPlatform): void {
  if (backoffMultiplier[platform] > 1) {
    backoffMultiplier[platform] = Math.max(1, Math.floor(backoffMultiplier[platform] / 2));
  }
}

async function drainQueue(platform: DownloadPlatform): Promise<void> {
  if (processing[platform]) return;
  processing[platform] = true;
  try {
    while (queues[platform].length > 0) {
      const waitMs = Math.max(0, effectiveGap(platform) - (Date.now() - lastRunAt[platform]));
      if (waitMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
      const entry = queues[platform].shift();
      if (!entry) break;
      lastRunAt[platform] = Date.now();
      try {
        const response = await entry.run();
        if (response.status === 429) {
          noteThrottleRateLimit(platform);
        } else {
          noteThrottleSuccess(platform);
        }
        entry.resolve(response);
      } catch (error) {
        entry.reject(error);
      }
    }
  } finally {
    processing[platform] = false;
    if (queues[platform].length > 0) {
      void drainQueue(platform);
    }
  }
}

export function throttledFetch(
  platform: DownloadPlatform,
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  return new Promise((resolve, reject) => {
    queues[platform].push({
      run: () => fetch(input, init),
      resolve,
      reject,
    });
    void drainQueue(platform);
  });
}

export function platformFromSource(source?: string): DownloadPlatform {
  return String(source || "modrinth").toLowerCase() === "curseforge" ? "curseforge" : "modrinth";
}
