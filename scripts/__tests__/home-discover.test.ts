import type { ModHit } from "../../web/components/SpotlightMarquees";
import {
  DISCOVER_CACHE_KEYS,
  readDiscoverCache,
  shouldRunInitialDiscoverSearch,
  type DiscoverStorage,
} from "../../web/lib/discover/discoverCache";
import { decodeDiscoverPayload } from "../../web/lib/discover/discoverPayload";
import {
  BEDROCK_DISCOVER_ENDPOINT,
  PROVIDER_ENDPOINTS,
  buildDiscoverQueryParams,
  executeDiscoverSearch,
  interleaveDiscoverResults,
  resolveProviderEndpoint,
  type DiscoverFetch,
  type DiscoverFilters,
} from "../../web/lib/discover/discoverSearch";
import { HOME_DISCOVER_PUBLIC_KEYS } from "../../web/hooks/useHomeDiscover";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

async function assertRejects(task: () => Promise<unknown>, expectedMessage: string): Promise<void> {
  try {
    await task();
  } catch (error: unknown) {
    assert(error instanceof Error, "rejection must be an Error");
    assertEqual(error.message, expectedMessage, "unexpected rejection message");
    return;
  }
  throw new Error(`expected rejection: ${expectedMessage}`);
}

class MemoryStorage implements DiscoverStorage {
  private readonly values = new Map<string, string>();

  constructor(seed: Record<string, string> = {}) {
    for (const [key, value] of Object.entries(seed)) this.values.set(key, value);
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

function mod(projectId: string, source: string): ModHit {
  return {
    projectId,
    title: projectId,
    author: "test",
    projectType: "mod",
    _source: source,
  };
}

const BASE_FILTERS: DiscoverFilters = {
  query: "sodium",
  projectType: "mod",
  versions: ["1.21.1"],
  loaders: ["fabric"],
  environment: "client",
  categories: ["optimization"],
  sort: "downloads",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function testQuerySerialization(): void {
  const params = buildDiscoverQueryParams(
    { ...BASE_FILTERS, versions: ["1.21.1", "1.20.1"], loaders: ["fabric", "quilt"] },
    3,
  );
  assertEqual(params.get("q"), "sodium", "query must be preserved");
  assertEqual(params.get("loader"), "fabric,quilt", "loaders must retain API shape");
  assertEqual(params.get("page"), "3", "page must be preserved");
  assertEqual(params.get("pageSize"), "12", "page size must remain 12");
  assertEqual(params.get("gameVersions"), JSON.stringify(["1.21.1", "1.20.1"]), "versions must be JSON");
  assertEqual(params.get("categories"), JSON.stringify(["optimization"]), "categories must be JSON");
  assertEqual(params.get("environments"), JSON.stringify(["client"]), "environment must be an array");
}

function testDeterministicInterleave(): void {
  const result = interleaveDiscoverResults(
    [mod("mr-1", "modrinth"), mod("mr-2", "modrinth"), mod("mr-3", "modrinth")],
    [mod("cf-1", "curseforge"), mod("cf-2", "curseforge")],
  );
  assertEqual(
    result.map((item) => item.projectId).join(","),
    "mr-1,cf-1,mr-2,cf-2,mr-3",
    "combined order must alternate and preserve the longer tail",
  );
}

function testCorruptCacheJson(): void {
  const storage = new MemoryStorage({
    [DISCOVER_CACHE_KEYS.version]: "[broken",
    [DISCOVER_CACHE_KEYS.category]: "not-json",
    [DISCOVER_CACHE_KEYS.results]: "{broken",
  });
  const cache = readDiscoverCache(storage);
  assertEqual(cache.versions.length, 0, "corrupt versions must fail closed");
  assertEqual(cache.categories.length, 0, "corrupt categories must fail closed");
  assertEqual(cache.results.length, 0, "corrupt results must fail closed");
}

function testInvalidSource(): void {
  const cache = readDiscoverCache(new MemoryStorage({ [DISCOVER_CACHE_KEYS.source]: "evil" }));
  assertEqual(cache.source, "modrinth", "invalid source must fall back to Modrinth");
}

function testInvalidPage(): void {
  const cache = readDiscoverCache(new MemoryStorage({ [DISCOVER_CACHE_KEYS.page]: "-12.5" }));
  assertEqual(cache.page, 1, "invalid page must fall back to 1");
}

function testInvalidTotal(): void {
  const cache = readDiscoverCache(new MemoryStorage({ [DISCOVER_CACHE_KEYS.total]: "Infinity" }));
  assertEqual(cache.total, 0, "invalid total must fall back to 0");
}

function testInvalidPersistedFilters(): void {
  const storage = new MemoryStorage({
    [DISCOVER_CACHE_KEYS.sort]: "dangerous-sort",
    [DISCOVER_CACHE_KEYS.environment]: "outside",
    [DISCOVER_CACHE_KEYS.type]: "executable",
  });
  const cache = readDiscoverCache(storage);
  assertEqual(cache.sort, "newest", "invalid sort must use current default");
  assertEqual(cache.environment, "any", "invalid environment must fail closed");
  assertEqual(cache.projectType, "mod", "invalid project type must fail closed");
}

function testSortDefaultMigrationCompatibility(): void {
  const storage = new MemoryStorage({ [DISCOVER_CACHE_KEYS.sort]: "relevance" });
  const firstRead = readDiscoverCache(storage);
  assertEqual(firstRead.sort, "newest", "legacy relevance default must migrate to newest");
  assertEqual(storage.getItem(DISCOVER_CACHE_KEYS.sortDefaultMigration), "1", "migration marker must persist");

  storage.setItem(DISCOVER_CACHE_KEYS.sort, "relevance");
  const secondRead = readDiscoverCache(storage);
  assertEqual(secondRead.sort, "relevance", "explicit relevance must survive after migration");
}

function testMalformedCachedResults(): void {
  const storage = new MemoryStorage({
    [DISCOVER_CACHE_KEYS.results]: JSON.stringify([
      null,
      { projectId: "missing-source", title: "drop", _source: "all" },
      { projectId: "good", title: "Keep", author: "A", projectType: "mod", _source: "modrinth" },
      { projectId: "bad-arrays", title: "Keep safe fields", author: "A", projectType: "mod", _source: "curseforge", loaders: ["fabric", 4], categories: "nope" },
    ]),
  });
  const cache = readDiscoverCache(storage);
  assertEqual(cache.results.length, 2, "only valid cached ModHit items may survive");
  assertEqual(cache.results[1].loaders?.join(","), "fabric", "cached arrays must retain only strings");
  assertEqual(cache.results[1].categories?.length ?? 0, 0, "non-array categories must be discarded");
}

function testInvalidExternalModsContainer(): void {
  const payload = decodeDiscoverPayload({ mods: "not-an-array", total: 10 }, "modrinth");
  assertEqual(payload.mods.length, 0, "invalid mods container must decode to an empty list");
  assertEqual(payload.total, 10, "valid total remains usable independently");
}

function testMissingProjectId(): void {
  const payload = decodeDiscoverPayload({ mods: [{ title: "No id" }], total: 1 }, "modrinth");
  assertEqual(payload.mods.length, 0, "items without projectId must be discarded");
}

function testMissingTitle(): void {
  const payload = decodeDiscoverPayload({ mods: [{ projectId: "id" }], total: 1 }, "curseforge");
  assertEqual(payload.mods.length, 0, "items without title must be discarded");
}

function testExternalFieldValidation(): void {
  const payload = decodeDiscoverPayload({
    mods: [{
      projectId: "safe",
      title: "Safe",
      _source: "attacker-controlled",
      versionId: { bad: true },
      loaders: ["fabric", 1, null],
      categories: ["optimization", false],
      gameVersions: ["1.21.1", {}],
    }],
    total: -4,
  }, "modrinth");
  assertEqual(payload.total, 0, "negative external total must fail closed");
  assertEqual(payload.mods[0]._source, "modrinth", "external _source must never override the trusted provider");
  assertEqual(payload.mods[0].versionId, undefined, "invalid versionId must be discarded");
  assertEqual(payload.mods[0].loaders?.join(","), "fabric", "loaders must contain strings only");
  assertEqual(payload.mods[0].categories?.join(","), "optimization", "categories must contain strings only");
  assertEqual(payload.mods[0].gameVersions?.join(","), "1.21.1", "gameVersions must contain strings only");
}

async function testIndividualProviderHttpError(): Promise<void> {
  const fetcher: DiscoverFetch = async () => jsonResponse({ error: true }, 502);
  await assertRejects(
    () => executeDiscoverSearch({ source: "modrinth", pageNumber: 1, filters: BASE_FILTERS }, fetcher),
    "Error en la API de Modrinth",
  );
}

async function testAllWithModrinthFailure(): Promise<void> {
  const fetcher: DiscoverFetch = async (url) =>
    url.startsWith(PROVIDER_ENDPOINTS.modrinth)
      ? jsonResponse({ error: true }, 502)
      : jsonResponse({ mods: [{ projectId: "cf", title: "CF" }], total: 1 });
  const result = await executeDiscoverSearch({ source: "all", pageNumber: 1, filters: BASE_FILTERS }, fetcher);
  assertEqual(result.mods.map((item) => item.projectId).join(","), "cf", "CurseForge must survive Modrinth failure");
  assertEqual(result.total, 1, "partial total must come from the successful provider");
}

async function testAllWithCurseForgeFailure(): Promise<void> {
  const fetcher: DiscoverFetch = async (url) =>
    url.startsWith(PROVIDER_ENDPOINTS.curseforge)
      ? jsonResponse({ error: true }, 502)
      : jsonResponse({ mods: [{ projectId: "mr", title: "MR" }], total: 1 });
  const result = await executeDiscoverSearch({ source: "all", pageNumber: 1, filters: BASE_FILTERS }, fetcher);
  assertEqual(result.mods.map((item) => item.projectId).join(","), "mr", "Modrinth must survive CurseForge failure");
  assertEqual(result.total, 1, "partial total must come from the successful provider");
}

function testEndpointAllowlist(): void {
  assertEqual(resolveProviderEndpoint("modrinth"), PROVIDER_ENDPOINTS.modrinth, "Modrinth endpoint must be static");
  assertEqual(resolveProviderEndpoint("curseforge"), PROVIDER_ENDPOINTS.curseforge, "CurseForge endpoint must be static");
  assertEqual(resolveProviderEndpoint("chunk"), null, "Bedrock must not resolve through provider endpoint map");
  assertEqual(resolveProviderEndpoint("https://evil.example"), null, "arbitrary endpoints must be impossible");
}

async function testBedrockEndpoint(): Promise<void> {
  let requestedUrl = "";
  const fetcher: DiscoverFetch = async (url) => {
    requestedUrl = url;
    return jsonResponse({ mods: [{ projectId: "bedrock", title: "Bedrock" }], total: 1 });
  };
  const result = await executeDiscoverSearch({ source: "chunk", pageNumber: 2, filters: BASE_FILTERS }, fetcher);
  assert(requestedUrl.startsWith(BEDROCK_DISCOVER_ENDPOINT), "Bedrock search must use its static endpoint");
  assert(requestedUrl.includes("page=2"), "Bedrock page must be serialized");
  assertEqual(result.mods[0]._source, "chunk", "Bedrock payload must receive trusted chunk source");
}

function testInitialSearchCompatibility(): void {
  assert(shouldRunInitialDiscoverSearch([]), "empty cache must allow the initial automatic search");
  assert(!shouldRunInitialDiscoverSearch([mod("cached", "modrinth")]), "cached results must suppress the first automatic search");
}

function testPublicContract(): void {
  const expected = [
    "discoverQuery", "setDiscoverQuery", "discoverType", "setDiscoverType",
    "discoverVersion", "setDiscoverVersion", "discoverLoader", "setDiscoverLoader",
    "discoverEnvironment", "setDiscoverEnvironment", "discoverCategory", "setDiscoverCategory",
    "discoverSort", "setDiscoverSort", "discoverResults", "setDiscoverResults",
    "discoverLoading", "discoverPage", "setDiscoverPage", "discoverTotal",
    "discoverSource", "setDiscoverSource", "discoverError", "runDiscoverSearch",
    "handleSearchAuthor", "handleSearchMod",
  ];
  assertEqual(HOME_DISCOVER_PUBLIC_KEYS.join(","), expected.join(","), "Discover public contract keys must remain stable");
}

async function run(): Promise<void> {
  testQuerySerialization();
  testDeterministicInterleave();
  testCorruptCacheJson();
  testInvalidSource();
  testInvalidPage();
  testInvalidTotal();
  testInvalidPersistedFilters();
  testSortDefaultMigrationCompatibility();
  testMalformedCachedResults();
  testInvalidExternalModsContainer();
  testMissingProjectId();
  testMissingTitle();
  testExternalFieldValidation();
  await testIndividualProviderHttpError();
  await testAllWithModrinthFailure();
  await testAllWithCurseForgeFailure();
  testEndpointAllowlist();
  await testBedrockEndpoint();
  testInitialSearchCompatibility();
  testPublicContract();
  console.log("✓ Home Discover boundary tests passed (20 cases)");
}

void run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
