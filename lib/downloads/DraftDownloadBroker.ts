import { calculateNextRetry, classifyNetworkError } from "@/lib/network";
import {
  DownloadIntent,
  DownloadSessionManifest,
  DownloadSessionState,
  DownloadTask,
  DownloadProvider,
  DownloadPlatform,
} from "./downloadTypes";
import { downloadEvents } from "./downloadEvents";
import { ModrinthProvider } from "./providers/ModrinthProvider";
import { CurseForgeProvider } from "./providers/CurseForgeProvider";
import {
  buildSessionManifestFromIntents,
  evaluateManifestCompletion,
  formatManifestReport,
} from "./downloadSessionManifest";
import {
  deleteDownloadSession,
  loadAllDownloadSessions,
  saveDownloadSession,
} from "@/lib/db/stores/DownloadSessionStore";

export class DraftDownloadBroker {
  private static instance: DraftDownloadBroker;

  private providers: Record<string, DownloadProvider> = {
    modrinth: new ModrinthProvider(),
    curseforge: new CurseForgeProvider(),
  };

  private sessions: Map<string, DownloadSessionState> = new Map();
  private queue: DownloadTask[] = [];
  private activeTasks: Set<string> = new Set();
  private platformActive: Record<string, number> = {
    modrinth: 0,
    curseforge: 0,
  };

  private readonly CONCURRENCY_LIMITS: Record<string, number> = {
    modrinth: 4,
    curseforge: 1,
  };

  private isProcessing = false;
  private restoreStarted = false;

  private constructor() {
    void this.restoreSessions();
  }

  public static getInstance(): DraftDownloadBroker {
    if (!DraftDownloadBroker.instance) {
      DraftDownloadBroker.instance = new DraftDownloadBroker();
    }
    return DraftDownloadBroker.instance;
  }

  public enqueueSession(
    sessionId: string,
    intents: DownloadIntent[],
    manifest?: DownloadSessionManifest,
  ): string {
    const tasks: DownloadTask[] = intents.map((intent) => ({
      ...intent,
      platform: intent.platform.toLowerCase() as DownloadPlatform,
      sessionId,
      status: "pending",
      progress: 0,
      retries: 0,
    }));

    const sessionManifest = manifest ?? buildSessionManifestFromIntents(intents);

    const session: DownloadSessionState = {
      sessionId,
      tasks,
      totalTasks: tasks.length,
      completedTasks: 0,
      failedTasks: 0,
      status: "active",
      startedAt: Date.now(),
      updatedAt: Date.now(),
      manifest: sessionManifest,
    };

    this.sessions.set(sessionId, session);
    this.queue.push(...tasks);

    downloadEvents.emit("session:started", { session });
    void this.persistSession(session);
    this.processQueue();

    return sessionId;
  }

  private async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (this.queue.length > 0) {
        const nextTaskIndex = this.queue.findIndex(
          (t) => this.platformActive[t.platform] < this.CONCURRENCY_LIMITS[t.platform],
        );

        if (nextTaskIndex === -1) break;

        const task = this.queue.splice(nextTaskIndex, 1)[0];
        this.activeTasks.add(task.id);
        this.platformActive[task.platform]++;

        this.executeTask(task).finally(() => {
          this.activeTasks.delete(task.id);
          this.platformActive[task.platform]--;
          this.checkSessionStatus(task.sessionId);
          this.processQueue();
        });
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async executeTask(task: DownloadTask) {
    const startTimeMs = task.startedAt || Date.now();
    const retryState = {
      attemptCount: task.retries || 0,
      startTimeMs,
    };

    while (true) {
      try {
        task.status = "downloading";
        task.startedAt = Date.now();
        this.updateTask(task);
        downloadEvents.emit("task:started", { task });

        const provider = this.providers[task.platform];
        if (!provider) throw new Error(`Provider missing for platform ${task.platform}`);

        const resolved = await provider.resolve(task);
        await provider.download(task, resolved.url, resolved.filename, resolved.hashes);

        task.status = "completed";
        task.progress = 100;
        task.completedAt = Date.now();
        this.updateTask(task);
        downloadEvents.emit("task:completed", { task });
        return;
      } catch (e: unknown) {
        const err = e instanceof Error ? e : new Error(String(e));
        const status = typeof (e as { status?: unknown })?.status === "number" ? (e as { status: number }).status : undefined;
        const isRateLimit = err.message === "RateLimited" || status === 429;
        const report = classifyNetworkError({
          rawUrl: task.url || `${task.platform}://${task.projectId}`,
          error: err,
          httpStatus: isRateLimit ? 429 : status,
        });

        const decision = calculateNextRetry(retryState, report, {
          maxAttempts: 5,
          baseDelayMs: 1000,
          maxDelayMs: 30000,
          budgetMs: 120000,
        });

        if (decision.shouldRetry) {
          retryState.attemptCount += 1;
          task.retries = retryState.attemptCount;
          task.status = "retry_wait";
          const delayMs = decision.delayMs;

          this.updateTask(task);
          downloadEvents.emit("task:retry", { task, attempt: task.retries, delayMs, report });

          await new Promise((r) => setTimeout(r, delayMs));
        } else {
          task.status = "failed";
          const errorMessage = report.errorMessage || (e instanceof Error ? e.message : "Download failed");
          task.error = errorMessage;
          this.updateTask(task);
          downloadEvents.emit("task:failed", { task, error: errorMessage, report });
          return;
        }
      }
    }
  }

  private updateTask(task: DownloadTask) {
    const session = this.sessions.get(task.sessionId);
    if (!session) return;

    const taskIdx = session.tasks.findIndex((t) => t.id === task.id);
    if (taskIdx !== -1) {
      session.tasks[taskIdx] = { ...task };
    }

    session.updatedAt = Date.now();
    void this.persistSession(session);
  }

  private checkSessionStatus(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const completed = session.tasks.filter((t) => t.status === "completed").length;
    const failed = session.tasks.filter((t) => t.status === "failed").length;
    const pending = session.tasks.filter(
      (t) => t.status === "pending" || t.status === "downloading" || t.status === "retry_wait",
    ).length;

    session.completedTasks = completed;
    session.failedTasks = failed;

    if (pending === 0) {
      const report = evaluateManifestCompletion(session.manifest, session.tasks);
      session.completionMessage = formatManifestReport(report);
      if (report.isComplete) {
        session.status = "completed";
        downloadEvents.emit("session:completed", { session });
        void deleteDownloadSession(sessionId);
      } else {
        session.status = "failed";
        downloadEvents.emit("session:failed", {
          session,
          error: `${report.completedCount}/${report.expectedCount} completados, ${report.failedCount} fallidos.`,
        });
        void this.persistSession(session);
      }
    } else {
      downloadEvents.emit("session:progress", { session });
    }

    void this.persistSession(session);
  }

  private async persistSession(session?: DownloadSessionState) {
    if (!session) return;
    try {
      await saveDownloadSession(JSON.parse(JSON.stringify(session)));
    } catch (e) {
      console.warn("[DraftDownloadBroker] Failed to persist session", e);
    }
  }

  private async restoreSessions() {
    if (this.restoreStarted) return;
    this.restoreStarted = true;
    try {
      const stored = await loadAllDownloadSessions();
      let resumedPending = 0;
      for (const raw of stored) {
        const session = raw as DownloadSessionState;
        if (session.status === "completed" || session.status === "cancelled") {
          await deleteDownloadSession(session.sessionId);
          continue;
        }
        for (const task of session.tasks) {
          if (task.status === "downloading") task.status = "pending";
        }
        const pendingTasks = session.tasks.filter(
          (t) => t.status === "pending" || t.status === "retry_wait",
        );
        if (pendingTasks.length === 0) {
          await deleteDownloadSession(session.sessionId);
          continue;
        }
        session.status = "active";
        this.sessions.set(session.sessionId, session);
        this.queue.push(...pendingTasks);
        resumedPending += pendingTasks.length;
        downloadEvents.emit("session:started", { session });
      }
      if (resumedPending > 0 && typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("fomo-show-status", {
            detail: {
              text: `Cola de descarga reanudada (${resumedPending} pendientes).`,
              type: "info",
            },
          }),
        );
        this.processQueue();
      }
    } catch (e) {
      console.warn("[DraftDownloadBroker] Failed to restore sessions", e);
    }
  }

  public getSession(sessionId: string): DownloadSessionState | undefined {
    return this.sessions.get(sessionId);
  }
}

export const downloadBroker = DraftDownloadBroker.getInstance();
