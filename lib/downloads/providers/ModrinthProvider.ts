import { DownloadProvider, DownloadTask } from "../downloadTypes";
import { resolveCompatibleVersion } from "../resolveCompatibleVersion";

export class ModrinthProvider implements DownloadProvider {
  platform = "modrinth" as const;
  concurrencyLimit = 4;

  async resolve(task: DownloadTask): Promise<{ url: string; filename: string; hashes?: Record<string, string> }> {
    if (task.url) {
      const filename = task.url.split("/").pop() || `${task.projectId}.jar`;
      return { url: task.url, filename };
    }

    const wantsCompatible = !task.versionId && Boolean(task.gameVersion || task.loader);
    if (wantsCompatible) {
      const resolved = await resolveCompatibleVersion({
        source: "modrinth",
        projectId: task.projectId,
        projectType: task.projectType,
        loader: task.loader,
        gameVersion: task.gameVersion,
        modName: task.modName,
      });
      task.versionId = resolved.versionId;
      task.resolvedVersionLabel = resolved.versionLabel || resolved.versionId;
    }

    const versionUrl = task.versionId
      ? `https://api.modrinth.com/v2/version/${task.versionId}`
      : `https://api.modrinth.com/v2/project/${task.projectId}/version`;

    const res = await fetch(versionUrl);
    if (!res.ok) {
       if (res.status === 429) {
          throw new Error("RateLimited");
       }
       throw new Error(`Modrinth Resolve Failed: ${res.status}`);
    }

    const data = await res.json();
    const targetVersion = Array.isArray(data) ? data[0] : data;
    if (!targetVersion || !targetVersion.files || targetVersion.files.length === 0) {
      throw new Error(`No files found for project ${task.projectId}`);
    }

    const files = targetVersion.files as Array<{ url: string; filename: string; primary?: boolean; hashes?: Record<string, string> }>;
    const primaryFile = files.find((f) => f.primary) || files[0];
    
    const requestedGame = task.gameVersion;
    const requestedLoader = task.loader;
    let gameVersion = requestedGame || "1.20.1";
    let loader = requestedLoader || "forge";
    let title = task.modName || "";
    let iconUrl = "";

    if (!requestedGame && targetVersion.game_versions && targetVersion.game_versions.length > 0) {
      gameVersion = targetVersion.game_versions[0];
    }
    if (!requestedLoader && targetVersion.loaders && targetVersion.loaders.length > 0) {
      loader = targetVersion.loaders[0];
    }
    task.gameVersion = gameVersion;
    task.loader = loader;

    if (!task.resolvedVersionLabel) {
      task.resolvedVersionLabel = targetVersion.version_number || targetVersion.name || task.versionId;
    }

    try {
      const projectRes = await fetch(`https://api.modrinth.com/v2/project/${task.projectId}`);
      if (projectRes.ok) {
        const projectData = await projectRes.json();
        title = projectData.title || title;
        iconUrl = projectData.icon_url || iconUrl;
        task.title = title;
        task.iconUrl = iconUrl;
      }
    } catch (e) {
      console.warn("[ModrinthProvider] Failed to fetch project details:", e);
    }

    return {
      url: primaryFile.url,
      filename: primaryFile.filename,
      hashes: primaryFile.hashes
    };
  }

  async download(task: DownloadTask, url: string, filename: string, hashes?: Record<string, string>): Promise<void> {
    const res = await fetch("/api/modrinth/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        filename,
        projectId: task.projectId,
        projectType: task.projectType,
        hashes,
        iconUrl: task.iconUrl,
        loader: task.loader,
        gameVersion: task.gameVersion,
        title: task.title || task.modName
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      if (res.status === 429) throw new Error("RateLimited");
      throw new Error(errData.error || `Download failed with status ${res.status}`);
    }
  }
}
