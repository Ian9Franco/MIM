import test from "node:test";
import assert from "node:assert/strict";
import { enrichDraftItemsWithIcons } from "../../lib/fomo/enrichDraftItemIcons";

test("enrichDraftItemsWithIcons leaves items that already have icons", async () => {
  const items = [{ project_id: "abc", icon_url: "https://cdn/icon.png", source: "modrinth" }];
  const result = await enrichDraftItemsWithIcons(items, async () => {
    throw new Error("should not fetch");
  });
  assert.deepEqual(result, items);
});

test("enrichDraftItemsWithIcons fills modrinth icons from batch API", async () => {
  const items = [{ project_id: "abc", source: "modrinth" }];
  const result = await enrichDraftItemsWithIcons(items, async (url) => {
    assert.match(String(url), /modrinth\/projects/);
    return {
      ok: true,
      json: async () => ({
        mods: [{ projectId: "abc", iconUrl: "https://cdn/mod.png" }],
      }),
    } as Response;
  });
  assert.equal((result[0] as { icon_url?: string }).icon_url, "https://cdn/mod.png");
});
