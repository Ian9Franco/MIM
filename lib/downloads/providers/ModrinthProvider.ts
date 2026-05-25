import { DownloadProvider, DownloadTask } from "../downloadTypes";

export class ModrinthProvider implements DownloadProvider {
  platform = "modrinth" as const;
  concurrencyLimit = 4;

  async resolve(task: DownloadTask): Promise<{ url: string; filename: string; hashes?: Record<string, string> }> {
    if (task.url) {
      // Direct URL already known
      const filename = task.url.split("/").pop() || `${task.projectId}.jar`;
      return { url: task.url, filename };
    }

    let versionUrl = `https://api.modrinth.com/v2/project/${task.projectId}/version`;
    if (task.versionId) {
      versionUrl = `https://api.modrinth.com/v2/version/${task.versionId}`;
    }

    const res = await fetch(versionUrl);
    if (!res.ok) {
       if (res.status === 429) {
          throw new Error("RateLimited"); // Broker catches this and triggers exponential backoff
       }
       throw new Error(`Modrinth Resolve Failed: ${res.status}`);
    }

    const data = await res.json();
    
    // If we queried all versions (no versionId), data is an array
    const targetVersion = Array.isArray(data) ? data[0] : data;
    if (!targetVersion || !targetVersion.files || targetVersion.files.length === 0) {
      throw new Error(`No files found for project ${task.projectId}`);
    }

    // Try to prefer primary file, otherwise take the first
    const primaryFile = targetVersion.files.find((f: any) => f.primary) || targetVersion.files[0];
    
    // Try to resolve extra metadata asynchronously to keep version info accurate
    let gameVersion = "1.20.1";
    let loader = "forge";
    let title = task.modName || "";
    let iconUrl = "";

    if (targetVersion.game_versions && targetVersion.game_versions.length > 0) {
      gameVersion = targetVersion.game_versions[0];
    }
    if (targetVersion.loaders && targetVersion.loaders.length > 0) {
      loader = targetVersion.loaders[0];
    }
    (task as any).gameVersion = gameVersion;
    (task as any).loader = loader;

    try {
      const projectRes = await fetch(`https://api.modrinth.com/v2/project/${task.projectId}`);
      if (projectRes.ok) {
        const projectData = await projectRes.json();
        title = projectData.title || title;
        iconUrl = projectData.icon_url || iconUrl;
        (task as any).title = title;
        (task as any).iconUrl = iconUrl;
      }
    } catch (e) {
      console.warn("[ModrinthProvider] Failed to fetch project details:", e);
    }

    return {
      url: primaryFile.url,
      filename: primaryFile.filename,
      hashes: primaryFile.hashes // Hashes like sha1, sha512 for deduplication
    };
  }

  async download(task: DownloadTask, url: string, filename: string, hashes?: Record<string, string>): Promise<void> {
    // In MIM, the actual network byte streaming and saving to the local filesystem
    // is handled by our Next.js backend API (to bypass CORS and write to the Downloads folder).
    // The Broker lives in the client-side (Electron renderer), so we just call the API.
    
    const res = await fetch("/api/modrinth/download", {
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
