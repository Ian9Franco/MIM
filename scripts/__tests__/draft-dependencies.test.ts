import assert from "node:assert/strict";
import { resolveDraftDependencies } from "../../lib/fomo/draftDependencies";

async function run() {
  const calls: string[] = [];
  const dep = (projectId: string, dependencyType = "required", versionId?: string) => ({ projectId, dependencyType, versionId, title: projectId });
  const graph: Record<string, unknown[]> = {
    root: [dep("library"), dep("optional", "optional"), dep("blocked", "incompatible")],
    library: [dep("shared"), dep("root")],
    shared: [],
  };
  const request = (async (input: string | URL | Request) => {
    const url = new URL(String(input), "http://localhost");
    calls.push(url.pathname);
    const id = url.searchParams.get("projectId")!;
    assert.ok(id in graph, `Unexpected dependency ${id}`);
    return Response.json({ versions: [{ id: id + "-v1", gameVersions: ["1.20.1"], loaders: ["Fabric"], dependencies: graph[id] }] });
  }) as typeof fetch;
  for (const source of ["modrinth", "curseforge"] as const) {
    const context = { source, version: "1.20.1", loader: "fabric" };
    const resolved = await resolveDraftDependencies({ projectId: "root" }, context, new Map(), request);
    assert.deepEqual(resolved.map(p => p.project_id), ["root", "library", "shared"]);
    assert.equal(resolved[1].version_id, "library-v1");
    assert.equal(resolved[0].dependencies[0].project_id, "library");
    await assert.rejects(resolveDraftDependencies({ projectId: "root" }, { ...context, version: "1.21" }, new Map(), request), /compatible/);
    await assert.rejects(resolveDraftDependencies({ projectId: "root", versionId: "root-v2" }, context, new Map([["root", "root-v1"]]), request), /no coincide/);
  }
  assert.ok(calls.includes("/api/curseforge/versions"));
  graph.shared = [dep("library", "required", "library-v2")];
  await assert.rejects(resolveDraftDependencies({ projectId: "root" }, { source: "modrinth", version: "1.20.1", loader: "fabric" }, new Map(), request), /incompatibles/);
  await assert.rejects(resolveDraftDependencies({ projectId: "root" }, { source: "modrinth", version: "1.20.1", loader: "fabric" }, new Map(), (async () => new Response(null, { status: 503 })) as typeof fetch), /resolver/);
  console.log("✓ Draft dependency graphs: both sources, transitive, cycles, optional, incompatible, pinned versions and failures");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
