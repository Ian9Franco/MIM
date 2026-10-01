import assert from "node:assert/strict";
import {
  buildSessionManifestFromIntents,
  evaluateManifestCompletion,
  formatManifestReport,
} from "../../lib/downloads/downloadSessionManifest";
import type { DownloadTask } from "../../lib/downloads/downloadTypes";

const manifest = buildSessionManifestFromIntents([
  { projectId: "a", versionId: "v1", platform: "modrinth", modName: "Mod A" },
  { projectId: "b", versionId: "v2", platform: "curseforge", modName: "Mod B" },
]);

assert.equal(manifest.expectedCount, 2);

const completeTasks: DownloadTask[] = [
  {
    id: "1",
    sessionId: "s",
    projectId: "a",
    versionId: "v1",
    platform: "modrinth",
    status: "completed",
    progress: 100,
    retries: 0,
  },
  {
    id: "2",
    sessionId: "s",
    projectId: "b",
    versionId: "v2",
    platform: "curseforge",
    status: "completed",
    progress: 100,
    retries: 0,
  },
];

const okReport = evaluateManifestCompletion(manifest, completeTasks);
assert.equal(okReport.isComplete, true);
assert.equal(okReport.missingEntries.length, 0);

const partialTasks: DownloadTask[] = [
  ...completeTasks.slice(0, 1),
  {
    id: "3",
    sessionId: "s",
    projectId: "b",
    versionId: "v2",
    platform: "curseforge",
    status: "failed",
    progress: 0,
    retries: 1,
    error: "network",
  },
];

const failReport = evaluateManifestCompletion(manifest, partialTasks);
assert.equal(failReport.isComplete, false);
assert.equal(failReport.missingEntries.length, 1);
assert.match(formatManifestReport(failReport), /Faltantes:/);

console.log("download-session-manifest.test.ts OK");
