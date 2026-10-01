import type { DownloadSessionManifest, DownloadTask } from "./downloadTypes";

export function buildSessionManifestFromIntents(
  intents: Array<{
    projectId: string;
    versionId?: string;
    modName?: string;
    platform: string;
  }>,
): DownloadSessionManifest {
  const entries = intents
    .filter((intent) => intent.versionId)
    .map((intent) => ({
      projectId: intent.projectId,
      versionId: String(intent.versionId),
      modName: intent.modName,
      platform: intent.platform.toLowerCase(),
    }));
  return {
    expectedCount: entries.length,
    entries,
  };
}

export type ManifestCompletionReport = {
  expectedCount: number;
  completedCount: number;
  failedCount: number;
  isComplete: boolean;
  missingEntries: DownloadSessionManifest["entries"];
};

export function evaluateManifestCompletion(
  manifest: DownloadSessionManifest | undefined,
  tasks: DownloadTask[],
): ManifestCompletionReport {
  const completed = tasks.filter((task) => task.status === "completed");
  const failed = tasks.filter((task) => task.status === "failed");
  const expectedCount = manifest?.expectedCount ?? tasks.length;

  if (!manifest || manifest.entries.length === 0) {
    return {
      expectedCount,
      completedCount: completed.length,
      failedCount: failed.length,
      isComplete: failed.length === 0 && completed.length === tasks.length,
      missingEntries: [],
    };
  }

  const completedKeys = new Set(
    completed.map((task) => `${task.platform}:${task.projectId}:${task.versionId || ""}`),
  );

  const missingEntries = manifest.entries.filter((entry) => {
    const key = `${entry.platform}:${entry.projectId}:${entry.versionId}`;
    return !completedKeys.has(key);
  });

  const isComplete =
    failed.length === 0 &&
    completed.length >= manifest.expectedCount &&
    missingEntries.length === 0;

  return {
    expectedCount: manifest.expectedCount,
    completedCount: completed.length,
    failedCount: failed.length,
    isComplete,
    missingEntries,
  };
}

export function formatManifestReport(report: ManifestCompletionReport): string {
  const lines = [
    `Esperados: ${report.expectedCount} | Completados: ${report.completedCount} | Fallidos: ${report.failedCount}`,
  ];
  if (report.missingEntries.length > 0) {
    lines.push("", "Faltantes:");
    for (const entry of report.missingEntries) {
      lines.push(`- ${entry.modName || entry.projectId} (${entry.platform}, v${entry.versionId})`);
    }
  }
  return lines.join("\n");
}
