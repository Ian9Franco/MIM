import assert from "node:assert/strict";
import { analyzeDraftItems } from "../../lib/fomo/draftItemInsights";

async function run() {
  const insights = analyzeDraftItems([
    {
      id: "1",
      project_id: "sodium",
      source: "modrinth",
      mod_name: "Sodium",
      dependencies: [{ project_id: "fabric-api", dependency_type: "required", title: "Fabric API" }],
    },
    {
      id: "2",
      project_id: "sodium",
      source: "modrinth",
      mod_name: "Sodium",
    },
    {
      id: "3",
      project_id: "sodium-cf",
      source: "curseforge",
      mod_name: "Sodium",
    },
  ]);
  assert.equal(insights.duplicates.some((g) => g.reason === "project"), true);
  assert.equal(insights.duplicates.some((g) => g.reason === "name"), true);
  assert.equal(insights.missing.length, 1);
  assert.equal(insights.missing[0].project_id, "fabric-api");
  console.log("✓ Draft item insights: duplicates by project/name and missing required deps");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
