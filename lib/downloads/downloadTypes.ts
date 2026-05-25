export type DownloadPlatform = "modrinth" | "curseforge";

export type DownloadStatus = "pending" | "downloading" | "completed" | "failed" | "cancelled" | "retry_wait";

export interface DownloadIntent {
  id: string; // unique ID for this download task
  projectId: string;
  versionId?: string; // Optional if we just want the latest
  platform: DownloadPlatform;
  modName?: string;
  projectType?: string; // e.g. mod, shader, resourcepack
  url?: string; // Direct URL if known beforehand
}

export interface DownloadTask extends DownloadIntent {
  sessionId: string;
  status: DownloadStatus;
  progress: number; // 0 to 100
  retries: number;
  error?: string;
  startedAt?: number;
  completedAt?: number;
}

export interface DownloadSessionState {
  sessionId: string;
  tasks: DownloadTask[];
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  status: "active" | "paused" | "completed" | "cancelled" | "failed";
  startedAt: number;
  updatedAt: number;
}

export interface DownloadProvider {
  platform: DownloadPlatform;
  concurrencyLimit: number;
  
  // Resolves project/version into a direct download URL and hashes
  resolve(task: DownloadTask): Promise<{ url: string; filename: string; hashes?: Record<string, string> }>;
  
  // Executes the actual download logic (usually calling MIM's /api/modrinth/download equivalent)
  download(task: DownloadTask, url: string, filename: string, hashes?: Record<string, string>): Promise<void>;
}
