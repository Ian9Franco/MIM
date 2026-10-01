import { DownloadProvider, DownloadTask } from "../downloadTypes";
import { resolveCompatibleVersion } from "../resolveCompatibleVersion";

export class CurseForgeProvider implements DownloadProvider {
  platform = "curseforge" as const;
  concurrencyLimit = 1;

  async resolve(task: DownloadTask): Promise<{ url: string; filename: string; hashes?: Record<string, string> }> {
    if (task.url) {
      const filename = task.url.split("/").pop() || `${task.projectId}.jar`;
      return { url: task.url, filename };
    }

    const resolveUrl = `/api/curseforge/project?projectId=${encodeURIComponent(task.projectId)}`;
    const res = await fetch(resolveUrl);
    if (!res.ok) {
        if (res.status === 429) throw new Error("RateLimited");
        throw new Error(`CurseForge Resolve Failed: ${res.status}`);
    }

    const data = await res.json();
    const wantsCompatible = !task.versionId && Boolean(task.gameVersion || task.loader);

    type ResolvedFile = {
      downloadUrl?: string;
      fileName?: string;
      hashes?: Array<{ algo: number; value: string }> | Record<string, string>;
      gameVersions?: string[];
    };
    let targetFile: ResolvedFile | null = null;

    if (wantsCompatible) {
      const resolved = await resolveCompatibleVersion({
        source: "curseforge",
        projectId: task.projectId,
        projectType: task.projectType,
        loader: task.loader,
        gameVersion: task.gameVersion,
        modName: task.modName,
      });
      task.versionId = resolved.versionId;
      task.resolvedVersionLabel = resolved.versionLabel || resolved.versionId;
    }

    if (task.versionId || wantsCompatible) {
      const projectType = task.projectType || "mod";
      const params = new URLSearchParams({
        projectId: task.projectId,
        projectType,
      });
      params.set("loader", "any");
      if (task.gameVersion) params.set("gameVersion", task.gameVersion);
      const versionsRes = await fetch(`/api/curseforge/versions?${params.toString()}`);
      if (!versionsRes.ok) {
        if (versionsRes.status === 429) throw new Error("RateLimited");
        throw new Error(`CurseForge Resolve Failed: ${versionsRes.status}`);
      }
      const versionsData = await versionsRes.json();
      const versions = (versionsData.versions || []) as Array<{
        id: string;
        versionNumber?: string;
        datePublished?: string;
        gameVersions?: string[];
        primaryFile?: { url?: string; filename?: string; hashes?: Record<string, string> };
      }>;
      const picked = task.versionId
        ? versions.find((version) => String(version.id) === String(task.versionId))
        : [...versions].sort((a, b) => Date.parse(b.datePublished || "") - Date.parse(a.datePublished || ""))[0];
      if (!picked?.primaryFile?.url) {
        throw new Error(task.versionId
          ? `No se encontró la versión fijada ${task.versionId} de ${task.modName || task.projectId}`
          : `No hay archivo para ${task.loader || "cualquier loader"} ${task.gameVersion || ""} en ${task.modName || task.projectId}`);
      }
      if (!task.resolvedVersionLabel) {
        task.resolvedVersionLabel = picked.versionNumber || picked.id;
      }
      targetFile = {
        downloadUrl: picked.primaryFile.url,
        fileName: picked.primaryFile.filename,
        hashes: picked.primaryFile.hashes,
        gameVersions: picked.gameVersions,
      };
    } else if (data.latestFiles && data.latestFiles.length > 0) {
      targetFile = data.latestFiles[0];
    } else if (data.mainFileId) {
      throw new Error(`No explicit file returned for CF project ${task.projectId}`);
    }

    if (!targetFile || !targetFile.downloadUrl) {
      throw new Error(`Third-party distribution disabled or file missing for CF project ${task.projectId}`);
    }

    const hashes: Record<string, string> = {};
    if (Array.isArray(targetFile.hashes)) {
        targetFile.hashes.forEach((h) => {
            if (h.algo === 1) hashes["sha1"] = h.value;
            if (h.algo === 2) hashes["md5"] = h.value;
        });
    } else if (targetFile.hashes) {
        Object.assign(hashes, targetFile.hashes);
    }

    const requestedGame = task.gameVersion;
    const requestedLoader = task.loader;
    let gameVersion = requestedGame || "1.20.1";
    let loader = requestedLoader || "forge";
    if (targetFile.gameVersions) {
      if (!requestedGame) {
        const gv = targetFile.gameVersions.find((v: string) => /^\d+\.\d+(\.\d+)?$/.test(v));
        if (gv) gameVersion = gv;
      }
      if (!requestedLoader) {
        const ld = targetFile.gameVersions.find((v: string) =>
          ["fabric", "forge", "neoforge", "quilt"].includes(v.toLowerCase())
        );
        if (ld) loader = ld.toLowerCase();
      }
    }

    const title = data.name || task.modName || "";
    const iconUrl = data.logo?.thumbnailUrl || data.logo?.url || "";

    task.title = title;
    task.iconUrl = iconUrl;
    task.gameVersion = gameVersion;
    task.loader = loader;

    return {
        url: targetFile.downloadUrl,
        filename: targetFile.fileName || `${task.projectId}.jar`,
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
