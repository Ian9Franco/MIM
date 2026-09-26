import assert from "node:assert/strict";
import {
  childCategoryId,
  defaultCategoryPosition,
  parseChildCategoryId,
  parseMapLayout,
  relocateCategoryLayout,
  reparentMapChild,
  resolveCategoryPositions,
  resolveItemChildId,
  withCategoryLabel,
} from "../../lib/fomo/draftMapLayout";
import {
  roundedOrthogonalD,
  routeOrthogonalPath,
  segmentHitsRect,
} from "../../lib/fomo/draftMapEdges";
import {
  chaptersFromYtDlp,
  mergeTimelineMarkers,
  parseClockToSeconds,
  parseDescriptionTimestamps,
} from "../../lib/fomo/videoTimelineMarkers";

async function run() {
  const parsed = parseMapLayout({
    categories: { core: { x: 10, y: 20 } },
    labels: { core: "Libs" },
  });
  assert.equal(parsed.categories.core.x, 10);
  assert.equal(parsed.labels.core, "Libs");
  assert.ok(parsed.categories.client);
  assert.ok(parsed.categories.server);
  assert.ok(parsed.categories.both);
  assert.equal(parsed.children.filter((child) => child.slug === "other").length, 3);

  const fromGraph = parseMapLayout({
    nodes: [
      { id: "client", x: 1, y: 2, label: "Cliente" },
      { id: "perf", parent: "client", x: 30, y: 40, label: "Rendimiento" },
    ],
    edges: [{ from: "client", to: "perf" }],
  });
  assert.equal(fromGraph.labels.client, "Cliente");
  assert.equal(fromGraph.categories.perf.x, 30);
  assert.ok(fromGraph.children.some((child) => child.id === "client:perf" && child.parent === "client"));

  assert.equal(childCategoryId("client", "performance"), "client:performance");
  assert.deepEqual(parseChildCategoryId("server:world"), { parent: "server", slug: "world" });
  assert.equal(resolveItemChildId({ side: "client", category: "performance" }), "client:performance");
  assert.equal(resolveItemChildId({ side: "both", category: "core" }), "both:core");

  const first = defaultCategoryPosition(0);
  const fifth = defaultCategoryPosition(4);
  assert.equal(first.x, 24);
  assert.ok(fifth.y > first.y);

  const positions = resolveCategoryPositions(["core", "world"], parseMapLayout({}));
  assert.ok(positions.core);
  assert.ok(positions.world);

  const labeled = withCategoryLabel(parsed, "core", "Bibliotecas");
  assert.equal(labeled.labels.core, "Bibliotecas");
  const moved = relocateCategoryLayout(
    { categories: { vehiculos: { x: 5, y: 6 } }, labels: { vehiculos: "Cars" }, children: [] },
    "vehiculos",
    "autos",
  );
  assert.equal(moved.categories.autos.x, 5);
  assert.equal(moved.labels.autos, "Cars");
  assert.equal(moved.categories.vehiculos, undefined);

  const reparented = reparentMapChild(parseMapLayout({
    children: [{ id: "client:mobs", parent: "client", slug: "mobs", label: "Fauna" }],
  }), "client:mobs", "server");
  assert.equal(reparented.ok, true);
  if (reparented.ok) {
    assert.equal(reparented.toId, "server:mobs");
    assert.ok(reparented.layout.children.some((child) => child.id === "server:mobs" && child.parent === "server"));
  }

  const clearPath = routeOrthogonalPath({ x: 50, y: 0 }, { x: 50, y: 120 }, []);
  assert.equal(clearPath.length, 2);
  const around = routeOrthogonalPath(
    { x: 40, y: 0 },
    { x: 40, y: 200 },
    [{ id: "block", x: 20, y: 60, w: 40, h: 40 }],
  );
  const svg = roundedOrthogonalD(around);
  assert.match(svg, /[MLQ]/);
  assert.equal(/C /.test(svg), false);
  assert.ok(around.some((point) => point.x < 20 || point.x > 60));
  const midHit = around.some((point, index) => {
    if (index === around.length - 1) return false;
    return segmentHitsRect(point, around[index + 1], { x: 20, y: 60, w: 40, h: 40 });
  });
  assert.equal(midHit, false);

  assert.equal(parseClockToSeconds("1", "02", "03"), 3723);
  const cuts = parseDescriptionTimestamps("0:45 - Sodium\n1:10 Spoiler: End fight\nnot a stamp");
  assert.equal(cuts[0].t, 45);
  assert.equal(cuts[0].kind, "cut");
  assert.equal(cuts[1].spoiler, true);

  const chapters = chaptersFromYtDlp([{ start_time: 0, title: "Intro" }, { start_time: 45, title: "Sodium" }]);
  const merged = mergeTimelineMarkers(chapters, cuts);
  assert.equal(merged.some((m) => m.kind === "chapter" && m.label === "Intro"), true);
  assert.equal(merged.filter((m) => m.t === 45).length, 1);
  assert.equal(merged.some((m) => m.label.includes("End fight")), true);

  console.log("✓ Draft map layout + video timeline markers");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
