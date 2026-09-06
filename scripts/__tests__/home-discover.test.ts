import type { ModHit } from "../../web/components/SpotlightMarquees";
import {
  buildDiscoverQueryParams,
  interleaveDiscoverResults,
} from "../../web/hooks/useHomeDiscover";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
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

function testQueryContract(): void {
  const params = buildDiscoverQueryParams(
    {
      query: "sodium",
      projectType: "mod",
      versions: ["1.21.1", "1.20.1"],
      loaders: ["fabric", "quilt"],
      environment: "client",
      categories: ["optimization"],
      sort: "downloads",
    },
    3,
  );

  assert(params.get("q") === "sodium", "query must be preserved");
  assert(params.get("projectType") === "mod", "project type must be preserved");
  assert(params.get("loader") === "fabric,quilt", "multiple loaders must keep the API contract");
  assert(params.get("page") === "3", "page must be preserved");
  assert(params.get("pageSize") === "12", "page size must remain 12");
  assert(params.get("sort") === "downloads", "sort must be preserved");
  assert(params.get("gameVersions") === JSON.stringify(["1.21.1", "1.20.1"]), "versions must be serialized as JSON");
  assert(params.get("categories") === JSON.stringify(["optimization"]), "categories must be serialized as JSON");
  assert(params.get("environments") === JSON.stringify(["client"]), "selected environment must be serialized as a one-item array");

  const anyEnvironment = buildDiscoverQueryParams(
    {
      query: "",
      projectType: "any",
      versions: [],
      loaders: [],
      environment: "any",
      categories: [],
      sort: "newest",
    },
    1,
  );

  assert(anyEnvironment.get("loader") === "any", "empty loaders must keep the legacy any value");
  assert(anyEnvironment.get("environments") === "[]", "any environment must not add a provider filter");
}

function testInterleaveContract(): void {
  const result = interleaveDiscoverResults(
    [mod("mr-1", "modrinth"), mod("mr-2", "modrinth"), mod("mr-3", "modrinth")],
    [mod("cf-1", "curseforge"), mod("cf-2", "curseforge")],
  );

  assert(
    result.map((item) => item.projectId).join(",") === "mr-1,cf-1,mr-2,cf-2,mr-3",
    "combined source order must continue alternating providers without dropping the longer tail",
  );
}

function run(): void {
  testQueryContract();
  testInterleaveContract();
  console.log("✓ Home Discover contract tests passed");
}

run();
