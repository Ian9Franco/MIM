import assert from "node:assert/strict";
import { draftItemPlatformUrl } from "../../lib/fomo/draftItemPlatformUrl";
import {
  buildStashEntry,
  mergePreflightFailedStash,
  formatPreflightFailureReport,
} from "../../lib/fomo/draftDownloadPreflightStash";

assert.equal(
  draftItemPlatformUrl({ project_id: "sodium", source: "modrinth", content_type: "mod" }),
  "https://modrinth.com/mod/sodium",
);
assert.equal(
  draftItemPlatformUrl({ project_id: "8894736", source: "curseforge", content_type: "mod" }),
  "https://www.curseforge.com/minecraft/mc-mods/8894736",
);

const entry = buildStashEntry(
  { id: "1", project_id: "sodium", mod_name: "Sodium", source: "modrinth", content_type: "mod" },
  "RateLimited",
);
assert.equal(entry.error, "RateLimited");
assert.ok(entry.platformUrl.includes("modrinth.com"));

const merged = mergePreflightFailedStash("Todo", "neoforge", "1.21.1", [entry]);
assert.equal(merged.entries.length, 1);

const report = formatPreflightFailureReport(
  [{ modName: "Sodium", error: "RateLimited", platformUrl: entry.platformUrl }],
  "header",
);
assert.ok(report.includes("RateLimited"));
assert.ok(report.includes("modrinth.com"));

console.log("draft-preflight-stash.test.ts: ok");
