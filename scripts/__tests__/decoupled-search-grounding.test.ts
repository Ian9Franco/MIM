import {
  MinecraftPlatformSearchProvider,
  DecoupledSearchEngine,
  searchDecoupledWeb,
  type WebSearchProvider,
} from "../../lib/intelligence/search/webSearchProvider";
import { buildProjectExplainContext } from "../../lib/intelligence/contextBuilder";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
  console.log(`✓ ${message}`);
}

async function testDecoupledSearchEngineAggregator(): Promise<void> {
  const mockProvider1: WebSearchProvider = {
    name: "mock-1",
    async search(query: string) {
      if (!query) return [];
      return [
        {
          title: "Cloth Config API",
          url: "https://modrinth.com/mod/cloth-config",
          snippet: "Config screen API for Fabric and Forge",
          source: "modrinth",
        },
      ];
    },
  };

  const mockProvider2: WebSearchProvider = {
    name: "mock-2",
    async search(query: string) {
      if (!query) return [];
      return [
        {
          title: "Cloth Config Wiki",
          url: "https://github.com/shedaniel/cloth-config/wiki",
          snippet: "Developer documentation for Cloth Config",
          source: "github",
        },
      ];
    },
  };

  const engine = new DecoupledSearchEngine([mockProvider1, mockProvider2]);
  const results = await engine.search("cloth config", { maxResults: 2 });

  assert(results.length === 2, "Aggregates results from multiple decoupled search providers");
  assert(results[0].title === "Cloth Config API", "Preserves primary search hit title");
  assert(results[1].url.includes("github.com"), "Includes secondary search source");
}

async function testContextBuilderWithWebSearchEvidence(): Promise<void> {
  const input = {
    projectId: "cloth-config",
    title: "Cloth Config",
    author: "shedaniel",
    description: "", // Sparse description to trigger search evidence
  };

  const searchResults = [
    {
      title: "Cloth Config v13",
      url: "https://modrinth.com/mod/cloth-config",
      snippet: "Configuration library required by many popular UI and gameplay mods.",
    },
  ];

  const ctx = buildProjectExplainContext(input, [], "standard", searchResults);

  const searchEvidence = ctx.evidence.find((e) => e.source === "WEB_SEARCH");
  assert(searchEvidence !== undefined, "Injects WEB_SEARCH evidence block");
  assert(searchEvidence?.label === "Web & Platform Search Grounding", "Sets correct evidence label");
  assert(searchEvidence?.content.includes("Cloth Config v13"), "Includes search result title and snippet");
  assert(ctx.userPrompt.includes("[EVIDENCE: WEB_SEARCH]"), "Renders [EVIDENCE: WEB_SEARCH] block in user prompt");
}

async function testEmptyOrInvalidQueries(): Promise<void> {
  const provider = new MinecraftPlatformSearchProvider();
  const emptyResults = await provider.search("   ");
  assert(emptyResults.length === 0, "Empty query returns empty array without throwing");

  const defaultResults = await searchDecoupledWeb("");
  assert(defaultResults.length === 0, "Default search engine handles empty query safely");
}

async function main(): Promise<void> {
  await testDecoupledSearchEngineAggregator();
  await testContextBuilderWithWebSearchEvidence();
  await testEmptyOrInvalidQueries();
  console.log("All decoupled search grounding tests passed.");
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
