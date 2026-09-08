import {
  ACTIVE_DRAFT_CACHE_KEY,
  DRAFT_ITEMS_CHANGED_EVENT,
  buildDraftProjectUrl,
  changedDraftMetadata,
  collectDraftProjectIds,
  decodeHomeDrafts,
  readActiveDraft,
  writeActiveDraft,
  type DraftStorage,
} from "../../web/lib/drafts/draftContract";
import {
  fetchDraftIcons,
  fetchDraftVersions,
  resolveDraftModrinthItem,
} from "../../web/lib/drafts/draftRemote";
import { HOME_DRAFTS_PUBLIC_KEYS } from "../../web/hooks/useHomeDrafts";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
}

class MemoryStorage implements DraftStorage {
  private readonly values = new Map<string, string>();
  constructor(seed: Record<string, string> = {}) {
    for (const [key, value] of Object.entries(seed)) this.values.set(key, value);
  }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
  removeItem(key: string): void { this.values.delete(key); }
}

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
}

function testDraftDecoding(): void {
  const raw = [{
    id: "draft-1", name: "Pack", minecraft_version: "1.21.1", loader: "fabric", visibility: "private",
    draft_items: [
      { id: "item-1", project_id: "sodium", mod_name: "Sodium", content_type: "mod", side: "client" },
      { id: "invalid" },
    ],
  }];
  const drafts = decodeHomeDrafts(raw, { sodium: "https://cdn.example/sodium.png" });
  assertEqual(drafts.length, 1, "valid drafts must survive decoding");
  assertEqual(drafts[0].items?.length, 1, "invalid draft items must be discarded");
  assertEqual(drafts[0].items?.[0].icon_url, "https://cdn.example/sodium.png", "icon hydration must remain intact");
  assertEqual(drafts[0].items?.[0].game_versions?.[0], "1.21.1", "draft version must hydrate items");
  assertEqual(drafts[0].items?.[0].loaders?.[0], "fabric", "draft loader must hydrate items");
  assertEqual(collectDraftProjectIds(raw).join(","), "sodium", "icon lookup ids must come from valid rows");
}

function testActiveDraftPersistence(): void {
  const corrupt = new MemoryStorage({ [ACTIVE_DRAFT_CACHE_KEY]: "{broken" });
  assertEqual(readActiveDraft(corrupt), null, "corrupt active draft JSON must fail closed");
  const storage = new MemoryStorage();
  const draft = { id: "draft-1", name: "Pack", minecraft_version: "1.21.1", loader: "fabric", visibility: "private" };
  writeActiveDraft(storage, draft);
  assertEqual(readActiveDraft(storage)?.id, draft.id, "active draft must survive persistence reload");
  writeActiveDraft(storage, null);
  assertEqual(storage.getItem(ACTIVE_DRAFT_CACHE_KEY), null, "clearing active draft must remove the cache key");
}

function testMetadataAndEventContract(): void {
  assertEqual(
    changedDraftMetadata({ name: "New", loader: "quilt", visibility: "public" }).join(","),
    "nombre,loader,visibilidad",
    "activity metadata labels must remain stable",
  );
  assertEqual(DRAFT_ITEMS_CHANGED_EVENT, "fomo-draft-items-changed", "refresh event name must remain stable");
  assertEqual(
    buildDraftProjectUrl({ content_type: "mod", category: "mod", project_id: "unsafe/id" }),
    "https://modrinth.com/mod/unsafe%2Fid",
    "project links must encode external ids as one path segment",
  );
}

async function testRemoteDecoding(): Promise<void> {
  const requested: string[] = [];
  const fetcher = async (input: RequestInfo | URL): Promise<Response> => {
    const url = String(input);
    requested.push(url);
    if (url.includes("/v2/versions?")) {
      return jsonResponse([{ id: "ver-1", game_versions: ["1.21.1", 4], loaders: ["fabric"], dependencies: [] }]);
    }
    return jsonResponse([
      { id: "sodium", title: "Sodium", icon_url: "https://cdn.example/sodium.png" },
      { id: 4, title: "invalid" },
    ]);
  };
  const icons = await fetchDraftIcons(["sodium"], fetcher);
  assertEqual(icons.sodium, "https://cdn.example/sodium.png", "icon payload must be decoded");
  const versions = await fetchDraftVersions(["ver-1"], fetcher);
  assertEqual(versions["ver-1"].game_versions.join(","), "1.21.1", "version arrays must discard non-strings");
  assert(requested.every((url) => url.startsWith("https://api.modrinth.com/")), "Draft remote calls must stay on Modrinth");
}

async function testProjectResolution(): Promise<void> {
  const requested: string[] = [];
  const fetcher = async (input: RequestInfo | URL): Promise<Response> => {
    const url = String(input);
    requested.push(url);
    return url.includes("/version?")
      ? jsonResponse([{ id: "version-1", game_versions: ["1.21.1"], loaders: ["fabric"], dependencies: [] }])
      : jsonResponse({ id: "unsafe/id", title: "Encoded project", client_side: "required", server_side: "unsupported" });
  };
  const resolved = await resolveDraftModrinthItem({
    projectId: "unsafe/id", title: "Encoded project", author: "test", projectType: "mod", _source: "modrinth",
  }, "1.21.1", "fabric", "mod", fetcher);
  assertEqual(resolved.version?.id, "version-1", "compatible version must remain selected");
  assert(requested.some((url) => url.includes("unsafe%2Fid")), "project ids must be encoded as one path segment");

  let curseForgeCalls = 0;
  const curseForge = await resolveDraftModrinthItem({
    projectId: "cf-1", title: "CF", author: "test", projectType: "mod", _source: "curseforge",
  }, "1.21.1", "fabric", "mod", async () => {
    curseForgeCalls += 1;
    return jsonResponse({});
  });
  assertEqual(curseForgeCalls, 0, "CurseForge items must not call Modrinth resolution");
  assertEqual(curseForge.version, null, "CurseForge compatibility behavior must remain provider-local");
}

function testPublicContract(): void {
  const expected = [
    "userDrafts", "activeDraft", "setActiveDraft", "handleEnterDraftCollection",
    "createDraft", "addModToDraft", "removeModFromDraft", "recategorizeDraftItem",
    "updateDraftItemSide", "updateDraftCover", "deleteDraft", "updateDraftMetadata",
  ];
  assertEqual(HOME_DRAFTS_PUBLIC_KEYS.join(","), expected.join(","), "Draft public contract keys must remain stable");
}

async function run(): Promise<void> {
  testDraftDecoding();
  testActiveDraftPersistence();
  testMetadataAndEventContract();
  await testRemoteDecoding();
  await testProjectResolution();
  testPublicContract();
  console.log("Home Drafts contract: 19 assertions passed");
}

run().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
