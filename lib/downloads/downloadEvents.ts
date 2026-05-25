import { DownloadSessionState, DownloadTask } from "./downloadTypes";

type DownloadEventMap = {
  "session:started": { session: DownloadSessionState };
  "session:progress": { session: DownloadSessionState };
  "session:completed": { session: DownloadSessionState };
  "session:failed": { session: DownloadSessionState; error: string };
  "task:started": { task: DownloadTask };
  "task:progress": { task: DownloadTask };
  "task:completed": { task: DownloadTask };
  "task:failed": { task: DownloadTask; error: string };
  "task:retry": { task: DownloadTask; attempt: number; delayMs: number };
};

type DownloadEventCallback<T extends keyof DownloadEventMap> = (payload: DownloadEventMap[T]) => void;

class DownloadEventEmitter {
  private listeners: Map<keyof DownloadEventMap, Set<Function>> = new Map();

  on<T extends keyof DownloadEventMap>(event: T, callback: DownloadEventCallback<T>) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  off<T extends keyof DownloadEventMap>(event: T, callback: DownloadEventCallback<T>) {
    this.listeners.get(event)?.delete(callback);
  }

  emit<T extends keyof DownloadEventMap>(event: T, payload: DownloadEventMap[T]) {
    this.listeners.get(event)?.forEach(cb => {
      try {
        cb(payload);
      } catch (e) {
        console.error(`[DownloadEvents] Error in listener for ${event}:`, e);
      }
    });
  }
}

export const downloadEvents = new DownloadEventEmitter();
