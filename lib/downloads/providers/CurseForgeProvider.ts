import { DownloadProvider, DownloadTask } from "../downloadTypes";

export class CurseForgeProvider implements DownloadProvider {
  platform = "curseforge" as const;
  concurrencyLimit = 1; // Strict 1 request at a time

  async resolve(task: DownloadTask): Promise<{ url: string; filename: string; hashes?: Record<string, string> }> {
    if (task.url) {
      const filename = task.url.split("/").pop() || `${task.projectId}.jar`;
      return { url: task.url, filename };
    }

    // Resolving CurseForge file requires hitting our Next.js API since we need the API Key
    // which is safely stored in the backend settings.
    const resolveUrl = task.versionId 
        ? `/api/curseforge/project?projectId=${task.projectId}&fileId=${task.versionId}`
        : `/api/curseforge/project?projectId=${task.projectId}`;
    
    const res = await fetch(resolveUrl);
    if (!res.ok) {
        if (res.status === 429) throw new Error("RateLimited");
        throw new Error(`CurseForge Resolve Failed: ${res.status}`);
    }

    const data = await res.json();
    
    let targetFile = null;

    if (task.versionId && data.file) {
        targetFile = data.file;
    } else if (data.latestFiles && data.latestFiles.length > 0) {
        targetFile = data.latestFiles[0];
    } else if (data.mainFileId) {
        // Edge case: if we only have mainFileId, we might need a secondary API call
        // But let's assume the API returns the file object in this implementation.
        throw new Error(`No explicit file returned for CF project ${task.projectId}`);
    }

    if (!targetFile || !targetFile.downloadUrl) {
      // CurseForge sometimes hides downloadUrl for mods with disabled third-party distribution
      // This will be caught and could trigger a fallback.
      throw new Error(`Third-party distribution disabled or file missing for CF project ${task.projectId}`);
    }

    const hashes: Record<string, string> = {};
    if (targetFile.hashes) {
        targetFile.hashes.forEach((h: any) => {
            if (h.algo === 1) hashes["sha1"] = h.value;
            if (h.algo === 2) hashes["md5"] = h.value;
        });
    }

    // Extract gameVersion and loader from targetFile.gameVersions
    let gameVersion = "1.20.1";
    let loader = "forge";
    if (targetFile.gameVersions) {
      const gv = targetFile.gameVersions.find((v: string) => /^\d+\.\d+(\.\d+)?$/.test(v));
      if (gv) gameVersion = gv;
      
      const ld = targetFile.gameVersions.find((v: string) => 
        ["fabric", "forge", "neoforge", "quilt", "fabric/forge"].includes(v.toLowerCase())
      );
      if (ld) {
        loader = ld.toLowerCase();
        if (loader === "fabric/forge") loader = "fabric";
      }
    }

    const title = data.name || task.modName || "";
    const iconUrl = data.logo?.thumbnailUrl || data.logo?.url || "";

    (task as any).title = title;
    (task as any).iconUrl = iconUrl;
    (task as any).gameVersion = gameVersion;
    (task as any).loader = loader;

    return {
        url: targetFile.downloadUrl,
        filename: targetFile.fileName,
        hashes
    };
  }

  async download(task: DownloadTask, url: string, filename: string, hashes?: Record<string, string>): Promise<void> {
    const res = await fetch("/api/curseforge/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        filename,
        projectId: task.projectId,
        projectType: task.projectType,
        hashes,
        iconUrl: (task as any).iconUrl,
        loader: (task as any).loader,
        gameVersion: (task as any).gameVersion,
        title: (task as any).title || task.modName
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      if (res.status === 429) throw new Error("RateLimited");
      throw new Error(errData.error || `Download failed with status ${res.status}`);
    }
  }
}
