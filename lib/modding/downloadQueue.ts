import { supabase } from "@/lib/core/supabaseClient";

interface DownloadItem {
  id: string;
  name: string;
  url: string;
  platform: 'modrinth' | 'curseforge';
  status: 'pending' | 'downloading' | 'completed' | 'failed';
  bytesDownloaded: number;
  totalBytes: number;
}

export class SafeDownloader {
  private queue: DownloadItem[] = [];
  private activeDownloads = 0;
  private maxConcurrent = 2; // Maximum 2 concurrent downloads to protect Modrinth/CurseForge APIs
  private delayMs = 300;     // Delay in milliseconds between starting downloads
  
  private onProgressCallback?: (queue: DownloadItem[], progress: number, etaSeconds: number) => void;
  private startTime = 0;

  constructor(items: DownloadItem[]) {
    this.queue = items;
  }

  public onProgress(callback: (queue: DownloadItem[], progress: number, etaSeconds: number) => void) {
    this.onProgressCallback = callback;
  }

  public async start() {
    this.startTime = Date.now();
    this.processNext();
  }

  private async processNext() {
    if (this.queue.every(item => item.status === 'completed' || item.status === 'failed')) {
      // Everything is finished
      return;
    }

    while (this.activeDownloads < this.maxConcurrent) {
      const nextItem = this.queue.find(item => item.status === 'pending');
      if (!nextItem) break;

      this.activeDownloads++;
      nextItem.status = 'downloading';
      
      // Artificial delay before triggering the next request
      await new Promise(resolve => setTimeout(resolve, this.delayMs));
      
      this.downloadFile(nextItem);
    }
  }

  private async downloadFile(item: DownloadItem) {
    try {
      const endpoint = item.platform === 'curseforge' 
        ? '/api/curseforge/download' // Adjust based on your available routes
        : '/api/modrinth/download';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: item.url, 
          modId: item.id,
          platform: item.platform 
        })
      });

      if (!response.ok) throw new Error("Network response was not ok");
      
      item.status = 'completed';
    } catch (err) {
      console.error(`Error downloading ${item.name}:`, err);
      item.status = 'failed';
    } finally {
      this.activeDownloads--;
      this.updateProgress();
      this.processNext();
    }
  }

  private updateProgress() {
    const completed = this.queue.filter(i => i.status === 'completed').length;
    const total = this.queue.length;
    const percent = (completed / total) * 100;

    // Calculate dynamic ETA (Estimated Time of Arrival)
    const elapsedMs = Date.now() - this.startTime;
    const avgTimePerFile = elapsedMs / (completed || 1);
    const remainingFiles = total - completed;
    const etaSeconds = Math.round((remainingFiles * avgTimePerFile) / 1000);

    if (this.onProgressCallback) {
      this.onProgressCallback(this.queue, percent, etaSeconds);
    }
  }
}
