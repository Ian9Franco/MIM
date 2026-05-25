import { DownloadIntent, DownloadSessionState, DownloadTask, DownloadProvider, DownloadPlatform } from "./downloadTypes";
import { downloadEvents } from "./downloadEvents";
import { ModrinthProvider } from "./providers/ModrinthProvider";
import { CurseForgeProvider } from "./providers/CurseForgeProvider";

/**
 * DraftDownloadBroker
 * 
 * Orchestrates download intentions by delegating to platform-specific providers.
 * Manages concurrency (e.g. Modrinth = 4, CurseForge = 1), rate limit retries,
 * session state, and pure event-driven progress reporting.
 * 
 * Is an application-wide Singleton to ensure only one queue exists.
 */
export class DraftDownloadBroker {
  private static instance: DraftDownloadBroker;

  private providers: Record<string, DownloadProvider> = {
    modrinth: new ModrinthProvider(),
    curseforge: new CurseForgeProvider()
  };

  // Active Sessions
  private sessions: Map<string, DownloadSessionState> = new Map();
  
  // Tasks currently queued for processing
  private queue: DownloadTask[] = [];
  
  // Tasks currently actively downloading
  private activeTasks: Set<string> = new Set();
  
  // Concurrency tracking per platform
  private platformActive: Record<string, number> = {
    modrinth: 0,
    curseforge: 0
  };

  // Concurrency rules
  private readonly CONCURRENCY_LIMITS: Record<string, number> = {
    modrinth: 4,
    curseforge: 1
  };

  private isProcessing = false;

  private constructor() {
    // Try to load persisted unfinished sessions from IndexedDB in the future
    this.restoreSessions();
  }

  public static getInstance(): DraftDownloadBroker {
    if (!DraftDownloadBroker.instance) {
      DraftDownloadBroker.instance = new DraftDownloadBroker();
    }
    return DraftDownloadBroker.instance;
  }

  /**
   * Starts a new download session from a list of intents (Manifest).
   */
  public enqueueSession(sessionId: string, intents: DownloadIntent[]): string {
    const tasks: DownloadTask[] = intents.map(intent => ({
      ...intent,
      platform: intent.platform.toLowerCase() as DownloadPlatform, // Normalize to lowercase to match CONCURRENCY_LIMITS keys
      sessionId,
      status: "pending",
      progress: 0,
      retries: 0
    }));

    const session: DownloadSessionState = {
      sessionId,
      tasks,
      totalTasks: tasks.length,
      completedTasks: 0,
      failedTasks: 0,
      status: "active",
      startedAt: Date.now(),
      updatedAt: Date.now()
    };

    this.sessions.set(sessionId, session);
    this.queue.push(...tasks);
    
    downloadEvents.emit("session:started", { session });
    
    // Save to IndexedDB (placeholder)
    this.persistSession(session);

    this.processQueue();
    
    return sessionId;
  }

  private async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (this.queue.length > 0) {
        // Find next task we can process without violating concurrency limits
        const nextTaskIndex = this.queue.findIndex(t => 
          this.platformActive[t.platform] < this.CONCURRENCY_LIMITS[t.platform]
        );

        if (nextTaskIndex === -1) {
          // All platforms are maxed out, wait a bit and break out of this loop tick.
          // In a real implementation we'd rely on task completion to re-trigger processQueue.
          break;
        }

        const task = this.queue.splice(nextTaskIndex, 1)[0];
        
        // Mark as active
        this.activeTasks.add(task.id);
        this.platformActive[task.platform]++;
        
        // Execute asynchronously
        this.executeTask(task).finally(() => {
          this.activeTasks.delete(task.id);
          this.platformActive[task.platform]--;
          this.checkSessionStatus(task.sessionId);
          this.processQueue(); // Re-trigger for next items
        });
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async executeTask(task: DownloadTask) {
    const MAX_RETRIES = 5;
    let attempt = task.retries;

    while (attempt <= MAX_RETRIES) {
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
        return; // Success, exit loop
        
      } catch (e: any) {
        if (e.message === "RateLimited" && attempt < MAX_RETRIES) {
          attempt++;
          task.retries = attempt;
          task.status = "retry_wait";
          const delayMs = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s, 16s...
          
          this.updateTask(task);
          downloadEvents.emit("task:retry", { task, attempt, delayMs });
          
          await new Promise(r => setTimeout(r, delayMs));
        } else {
          // Unrecoverable error or max retries reached
          task.status = "failed";
          task.error = e.message;
          this.updateTask(task);
          downloadEvents.emit("task:failed", { task, error: e.message });
          return;
        }
      }
    }
  }

  private updateTask(task: DownloadTask) {
    const session = this.sessions.get(task.sessionId);
    if (!session) return;
    
    const taskIdx = session.tasks.findIndex(t => t.id === task.id);
    if (taskIdx !== -1) {
      session.tasks[taskIdx] = { ...task };
    }
    
    session.updatedAt = Date.now();
    this.persistSession(session);
  }

  private checkSessionStatus(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const completed = session.tasks.filter(t => t.status === "completed").length;
    const failed = session.tasks.filter(t => t.status === "failed").length;
    const pending = session.tasks.filter(t => t.status === "pending" || t.status === "downloading" || t.status === "retry_wait").length;

    session.completedTasks = completed;
    session.failedTasks = failed;

    if (pending === 0) {
      session.status = failed > 0 ? "failed" : "completed";
      if (session.status === "completed") {
        downloadEvents.emit("session:completed", { session });
      } else {
        downloadEvents.emit("session:failed", { session, error: `${failed} tasks failed.` });
      }
    } else {
      downloadEvents.emit("session:progress", { session });
    }

    this.persistSession(session);
  }

  private persistSession(session: DownloadSessionState) {
    // TODO: Write to IndexedDB
  }

  private restoreSessions() {
    // TODO: Read from IndexedDB and re-enqueue unfinished tasks
  }

  // Public APIs for React to read state without mutation
  public getSession(sessionId: string): DownloadSessionState | undefined {
    return this.sessions.get(sessionId);
  }
}

export const downloadBroker = DraftDownloadBroker.getInstance();
