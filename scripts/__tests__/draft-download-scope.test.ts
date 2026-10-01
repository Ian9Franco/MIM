import assert from "node:assert/strict";
import { draftItemsForDownloadBranch } from "../../lib/fomo/draftDownloadScope";

const items = [
  { id: "1", project_id: "a", side: "client", content_type: "mod" },
  { id: "2", project_id: "b", side: "server", content_type: "mod" },
  { id: "3", project_id: "c", side: "both", content_type: "mod" },
  { id: "4", project_id: "d", content_type: "shader" },
  { id: "5", project_id: "e", content_type: "datapack" },
  { id: "6", project_id: "", side: "client", content_type: "mod" },
];

const ids = (list: typeof items) => list.map((i) => i.id);

assert.deepEqual(ids(draftItemsForDownloadBranch(items, "all")), ["1", "2", "3", "4", "5"]);

assert.deepEqual(ids(draftItemsForDownloadBranch(items, "client")), ["1", "3", "4"]);

assert.deepEqual(ids(draftItemsForDownloadBranch(items, "server")), ["2", "3", "5"]);

assert.deepEqual(ids(draftItemsForDownloadBranch(items, "both")), ["3"]);

console.log("draft-download-scope.test.ts OK");
