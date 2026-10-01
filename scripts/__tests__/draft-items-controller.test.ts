/**
 * Run: npx ts-node --transpile-only -O "{\"module\":\"CommonJS\"}" scripts/__tests__/draft-items-controller.test.ts
 */
import assert from "node:assert/strict";
import {
  buildCategoryAssignTargets,
  fingerprintCategorySide,
  mergeDraftItemFromRealtime,
  patchDraftItemsInList,
  DraftPendingMutations,
} from "../../lib/fomo/draftItemsController";

function testBuildCategoryAssignTargets() {
  const items = [
    { id: "a", side: "client", content_type: "mod" },
    { id: "b", side: "server", content_type: "mod" },
  ];
  const targets = buildCategoryAssignTargets(items.map((i) => i.id), items, "performance");
  assert.equal(targets.length, 2);
  assert.ok(targets.some((t) => t.ids.includes("a") && t.category === "client:performance"));
  assert.ok(targets.some((t) => t.ids.includes("b") && t.category === "server:performance"));
}

function testPatchDraftItemsInList() {
  const items = [
    { id: "1", category: "both:other", side: "both" as const },
    { id: "2", category: "both:other", side: "both" as const },
  ];
  const next = patchDraftItemsInList(items, ["1"], { category: "client:tech", side: "client" });
  assert.equal(next[0].category, "client:tech");
  assert.equal(next[0].side, "client");
  assert.equal(next[1].category, "both:other");
}

function testPendingMutationsEcho() {
  const pending = new DraftPendingMutations();
  const fp = fingerprintCategorySide("client:tech", "client");
  pending.track(["x"], fp);
  assert.equal(
    pending.shouldApplyRemoteUpdate("x", { category: "client:tech", side: "client" }),
    false,
  );
  assert.equal(
    pending.shouldApplyRemoteUpdate("x", { category: "client:world", side: "client" }),
    true,
  );
}

function testMergeDraftItemFromRealtime() {
  const base = [{ id: "1", category: "a" }];
  const updated = mergeDraftItemFromRealtime(base, "UPDATE", { id: "1", category: "b" });
  assert.equal(updated[0].category, "b");
  const deleted = mergeDraftItemFromRealtime(updated, "DELETE", { id: "1", category: "b" });
  assert.equal(deleted.length, 0);
}

testBuildCategoryAssignTargets();
testPatchDraftItemsInList();
testPendingMutationsEcho();
testMergeDraftItemFromRealtime();
console.log("draft-items-controller.test.ts: ok");
